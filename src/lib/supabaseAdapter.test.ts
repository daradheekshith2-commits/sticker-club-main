import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSupabaseRequest, handleSupabaseMultipart } from './supabaseAdapter';
import type { Account } from '../context/AuthContext';

const customerUser: Account = {
  id: 'cust-uuid-1234',
  name: 'Customer Test',
  email: 'customer@test.local',
  role: 'CUSTOMER',
  phone: '9876543210',
};

const adminUser: Account = {
  id: 'admin-uuid-5678',
  name: 'Admin Test',
  email: 'admin@test.local',
  role: 'ADMIN',
  phone: '9876543211',
};

test('Security Area 3: Unauthenticated requests are rejected across commerce endpoints', async () => {
  const r1 = await handleSupabaseRequest('/api/orders', { method: 'POST', body: '{}' }, null);
  assert.equal(r1.status, 401);

  const r2 = await handleSupabaseRequest('/api/me/orders', { method: 'GET' }, null);
  assert.equal(r2.status, 401);

  const r3 = await handleSupabaseRequest('/api/orders/ord-1/payment/utr', { method: 'POST', body: '{}' }, null);
  assert.equal(r3.status, 401);

  const r4 = await handleSupabaseRequest('/api/me/orders/ord-1/cancel', { method: 'POST', body: '{}' }, null);
  assert.equal(r4.status, 401);

  const r5 = await handleSupabaseRequest('/api/me/passport/redeem', { method: 'POST' }, null);
  assert.equal(r5.status, 401);

  const r6 = await handleSupabaseRequest('/api/admin/orders', { method: 'GET' }, null);
  assert.equal(r6.status, 403);
});

test('Security Area 3: Admin endpoints reject customer role with 403 but allow admin role', async () => {
  const rCustOrders = await handleSupabaseRequest('/api/admin/orders', { method: 'GET' }, customerUser);
  assert.equal(rCustOrders.status, 403);

  const rCustCust = await handleSupabaseRequest('/api/admin/customers', { method: 'GET' }, customerUser);
  assert.equal(rCustCust.status, 403);

  const rCustUpload = await handleSupabaseMultipart('/api/admin/uploads/product-image', new FormData(), customerUser);
  assert.equal(rCustUpload.status, 403);

  // Admin access does not get blocked by role check (status !== 403)
  const rAdminOrders = await handleSupabaseRequest('/api/admin/orders', { method: 'GET' }, adminUser);
  assert.notEqual(rAdminOrders.status, 403);
});

test('Security Area 3: Order placement requires shipping address', async () => {
  const res = await handleSupabaseRequest(
    '/api/orders',
    {
      method: 'POST',
      body: JSON.stringify({
        paymentMethod: 'UPI',
        customLines: [{ type: 'custom-sticker', sizeId: 'medium', finishId: 'glossy', quantity: 1 }],
      }),
    },
    customerUser
  );
  assert.equal(res.status, 400);
  assert.ok(res.error?.includes('Shipping address is required'));
});

test('Security Area 3: UTR submission validates format strictly (6-30 chars, alphanumeric)', async () => {
  // Missing UTR
  const rEmpty = await handleSupabaseRequest(
    '/api/orders/ord-1/payment/utr',
    { method: 'POST', body: JSON.stringify({ utr: '' }) },
    customerUser
  );
  assert.equal(rEmpty.status, 400);

  // Too short
  const rShort = await handleSupabaseRequest(
    '/api/orders/ord-1/payment/utr',
    { method: 'POST', body: JSON.stringify({ utr: '123' }) },
    customerUser
  );
  assert.equal(rShort.status, 400);
  assert.ok(rShort.error?.includes('must be 6-30 characters'));

  // Invalid characters
  const rSpecial = await handleSupabaseRequest(
    '/api/orders/ord-1/payment/utr',
    { method: 'POST', body: JSON.stringify({ utr: 'UTR<script>alert(1)</script>' }) },
    customerUser
  );
  assert.equal(rSpecial.status, 400);
  assert.ok(rSpecial.error?.includes('must be 6-30 characters'));
});

test('Security Area 5: Multipart artwork upload rejects non-raster formats (SVG, HTML, etc.)', async () => {
  const formData = new FormData();
  const fakeSvg = new Blob(['<svg><script>alert(1)</script></svg>'], { type: 'image/svg+xml' });
  formData.append('file', fakeSvg, 'exploit.svg');

  const res = await handleSupabaseMultipart('/api/uploads/artwork', formData, customerUser);
  assert.equal(res.status, 400);
  assert.ok(res.error?.includes('Only PNG, JPEG, and WebP raster images are supported'));
});

test('Security Area 3: Payment receipt upload rejects non-raster images and missing files', async () => {
  // Missing file
  const formEmpty = new FormData();
  const rEmpty = await handleSupabaseMultipart('/api/orders/ord-1/payment/receipt', formEmpty, customerUser);
  assert.equal(rEmpty.status, 400);

  // Non-raster image (SVG/HTML)
  const formSvg = new FormData();
  const fakeSvg = new Blob(['<svg></svg>'], { type: 'image/svg+xml' });
  formSvg.append('receipt', fakeSvg, 'receipt.svg');
  const rSvg = await handleSupabaseMultipart('/api/orders/ord-1/payment/receipt', formSvg, customerUser);
  assert.equal(rSvg.status, 400);
  assert.ok(rSvg.error?.includes('Only PNG, JPEG, and WebP'));
});
