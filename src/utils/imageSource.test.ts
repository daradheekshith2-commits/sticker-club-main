import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_UPLOAD_BYTES, NOT_DIRECT_IMAGE_MESSAGE, validateImageFile, validateImageUrl } from './imageSource';
import { createObjectUrlRegistry } from './objectUrls';

test('the exact customer-facing wording is preserved', () => {
  assert.equal(
    NOT_DIRECT_IMAGE_MESSAGE,
    "This link doesn't appear to be a direct image. Upload the image file or paste a publicly accessible image URL. (Pinterest page links open a web page, not the image itself.)",
  );
});

test('accepts http(s) links to images, including image CDNs', () => {
  for (const u of [
    'https://example.com/poster.jpg',
    'http://example.com/a.png?w=1200',
    'https://cdn.example.org/images/abc', // no extension: allowed, the browser will check
    'https://i.pinimg.com/736x/aa/bb/cc/image.jpg', // Pinterest's image CDN is a real image
    '  https://example.com/space-trimmed.webp  ',
  ]) {
    const r = validateImageUrl(u);
    assert.ok(r.ok, u);
  }
});

test('a web address without https:// is completed, not rejected', () => {
  const a = validateImageUrl('example.com/a.jpg');
  assert.ok(a.ok && a.url === 'https://example.com/a.jpg');
  const b = validateImageUrl('i.pinimg.com/736x/aa/image.jpg');
  assert.ok(b.ok && b.url === 'https://i.pinimg.com/736x/aa/image.jpg');
  const c = validateImageUrl('//cdn.example.org/x.png');
  assert.ok(c.ok && c.url === 'https://cdn.example.org/x.png');
  // a bare Pinterest pin address is still recognised as a page
  const pin = validateImageUrl('in.pinterest.com/pin/1082623198501539240/');
  assert.ok(!pin.ok && pin.reason === 'page');
});

test('non-web pastes get a tip that says what was pasted', () => {
  const tip = (s: string) => {
    const r = validateImageUrl(s);
    assert.ok(!r.ok && r.reason === 'scheme' && r.message === NOT_DIRECT_IMAGE_MESSAGE, s);
    return r.ok ? '' : r.hint ?? '';
  };
  assert.match(tip('C:\\Users\\me\\pic.jpg'), /file on your computer/);
  assert.match(tip('D:/photos/pic.png'), /file on your computer/);
  assert.match(tip('file:///C:/pic.jpg'), /file on your computer/);
  assert.match(tip('data:image/jpeg;base64,/9j/4AAQ'), /image data/);
  assert.match(tip('blob:https://www.google.com/1234-abcd'), /temporary link/);
  assert.match(tip('ftp://example.com/a.jpg'), /Only http/);
});

test('rejects empty, malformed and non-http links', () => {
  const cases: [string, string][] = [
    ['', 'empty'],
    ['not a url', 'invalid'],
    ['C:\\Users\\me\\Downloads\\pic.jpg', 'scheme'],
    ['ftp://example.com/a.jpg', 'scheme'],
    ['javascript:alert(1)', 'scheme'],
    ['data:image/png;base64,AAAA', 'scheme'],
    ['file:///C:/pic.jpg', 'scheme'],
    ['https://nohost/a.jpg', 'invalid'],
  ];
  for (const [input, reason] of cases) {
    const r = validateImageUrl(input);
    assert.ok(!r.ok && r.reason === reason, `${input} → ${JSON.stringify(r)}`);
    if (!r.ok && reason !== 'empty') assert.equal(r.message, NOT_DIRECT_IMAGE_MESSAGE, 'invalid links use the exact message');
  }
});

test('Pinterest pins and Google result pages are treated as pages, not images', () => {
  for (const u of [
    'https://in.pinterest.com/pin/1082623198501539240/', // the agreed negative test case
    'https://www.pinterest.com/pin/123456789/',
    'https://in.pinterest.com/pin/987/',
    'https://pin.it/abc123',
    'https://www.google.com/search?q=poster&tbm=isch',
    'https://www.google.co.in/imgres?imgurl=https://x.com/a.jpg',
    'https://share.google/abc',
  ]) {
    const r = validateImageUrl(u);
    assert.ok(!r.ok && r.reason === 'page', u);
    if (!r.ok) assert.equal(r.message, NOT_DIRECT_IMAGE_MESSAGE);
  }
  // An ordinary Google-hosted image file is not a results page.
  assert.ok(validateImageUrl('https://lh3.googleusercontent.com/abc=w800').ok);
});

test('file checks: type, size and empty files', () => {
  assert.deepEqual(validateImageFile({ name: 'a.jpg', type: 'image/jpeg', size: 2000 }), { ok: true });
  assert.ok(validateImageFile({ name: 'a.webp', type: 'image/webp', size: 2000 }).ok);
  assert.ok(!validateImageFile({ name: 'a.gif', type: 'image/gif', size: 2000 }).ok);
  assert.ok(!validateImageFile({ name: 'a.pdf', type: 'application/pdf', size: 2000 }).ok);
  assert.ok(!validateImageFile({ name: 'big.png', type: 'image/png', size: MAX_UPLOAD_BYTES + 1 }).ok);
  assert.ok(!validateImageFile({ name: 'zero.png', type: 'image/png', size: 0 }).ok);
});

test('object URL registry only revokes when the last user releases it', () => {
  const revoked: string[] = [];
  let n = 0;
  const reg = createObjectUrlRegistry(() => `blob:test/${++n}`, (u) => revoked.push(u));
  const url = reg.create(new Blob(['x']));
  reg.retain(url); // e.g. the cart keeps it too
  reg.release(url); // builder lets go
  assert.deepEqual(revoked, []);
  assert.equal(reg.count(url), 1);
  reg.release(url); // cart lets go
  assert.deepEqual(revoked, [url]);
  reg.release(url); // extra release is harmless
  reg.retain('blob:unknown'); // unknown URLs are ignored
  assert.equal(reg.count('blob:unknown'), 0);
  assert.deepEqual(revoked, [url]);
});
