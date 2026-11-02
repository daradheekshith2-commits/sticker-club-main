import { chromium } from 'playwright';

async function verifyLive() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('Navigating to https://sticker-club-main.vercel.app/ ...');
  await page.goto('https://sticker-club-main.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Check stickers section
  const stickers = await page.$$eval('section[aria-labelledby="featured-stickers"] article', arts => {
    return arts.map(a => ({
      title: a.querySelector('h3, h2')?.textContent?.trim(),
      hasImg: !!a.querySelector('img'),
      imgSrc: a.querySelector('img')?.src,
      naturalWidth: a.querySelector('img')?.naturalWidth,
    }));
  });
  console.log('Featured Stickers:', stickers);

  // Check posters section
  const posters = await page.$$eval('section[aria-labelledby="featured-posters"] article', arts => {
    return arts.map(a => ({
      title: a.querySelector('h3, h2')?.textContent?.trim(),
      hasImg: !!a.querySelector('img'),
      imgSrc: a.querySelector('img')?.src,
      naturalWidth: a.querySelector('img')?.naturalWidth,
    }));
  });
  console.log('Featured Posters:', posters);

  // Capture screenshot of both sections
  await page.screenshot({ path: 'qa-evidence/screenshots/vercel-stickers-and-posters-verified.png', fullPage: false });
  console.log('Screenshot saved: qa-evidence/screenshots/vercel-stickers-and-posters-verified.png');

  await browser.close();
}

verifyLive().catch(console.error);
