import { chromium } from 'playwright';

async function testImg() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('response', res => {
    if (res.url().includes('krishna-golden-chariot')) {
      console.log('HTTP RESPONSE for krishna-golden-chariot:', res.status(), res.url(), res.headers());
    }
  });

  page.on('requestfailed', req => {
    if (req.url().includes('krishna-golden-chariot')) {
      console.log('REQUEST FAILED for krishna-golden-chariot:', req.url(), req.failure()?.errorText);
    }
  });

  await page.goto('https://sticker-club-main.vercel.app/');

  const res = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ success: true, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = (e) => resolve({ success: false, error: 'img.onerror triggered' });
      img.src = '/Stickers/Devotion/krishna-golden-chariot.png';
    });
  });

  console.log('Image test result in page context:', res);

  // Let's also check dude-logo
  const res2 = await page.evaluate(async () => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ success: true, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = (e) => resolve({ success: false, error: 'img.onerror triggered' });
      img.src = '/Stickers/Quotes/dude-logo.png';
    });
  });
  console.log('Dude logo test result:', res2);

  await browser.close();
}
testImg();
