import { chromium } from 'playwright';

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  console.log('1. Checking Homepage for Gaming and BTS theme sections...');
  await page.goto('https://sticker-club-main.vercel.app/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  const gamingHeading = await page.locator('text="Gaming Theme"').first().isVisible();
  const btsHeading = await page.locator('text="BTS & K-Pop Theme"').first().isVisible();
  console.log('Homepage Gaming section visible?:', gamingHeading);
  console.log('Homepage BTS section visible?:', btsHeading);

  console.log('2. Checking /vibes for Gaming and BTS cards...');
  await page.goto('https://sticker-club-main.vercel.app/vibes', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const gamingVibeCard = await page.locator('h2:has-text("Gaming & GTA")').isVisible();
  const btsVibeCard = await page.locator('h2:has-text("BTS & K-Pop")').isVisible();
  console.log('Vibes page Gaming card visible?:', gamingVibeCard);
  console.log('Vibes page BTS card visible?:', btsVibeCard);

  console.log('3. Checking /shop for Shuffle button & randomized stickers...');
  await page.goto('https://sticker-club-main.vercel.app/shop?category=stickers', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const shuffleBtn = await page.locator('button:has-text("Shuffle")').isVisible();
  console.log('Shop Shuffle button visible?:', shuffleBtn);

  // Check first 5 product titles
  const titlesVisit1 = await page.locator('article h2, article h3').allInnerTexts();
  console.log('Visit 1 top 5 items:', titlesVisit1.slice(0, 5));

  // Re-visit (simulate new visit)
  await page.goto('https://sticker-club-main.vercel.app/shop?category=stickers', { waitUntil: 'networkidle' });
  const titlesVisit2 = await page.locator('article h2, article h3').allInnerTexts();
  console.log('Visit 2 top 5 items:', titlesVisit2.slice(0, 5));

  // Click Shuffle button
  if (shuffleBtn) {
    await page.click('button:has-text("Shuffle")');
    await page.waitForTimeout(500);
    const titlesAfterShuffle = await page.locator('article h2, article h3').allInnerTexts();
    console.log('After clicking Shuffle top 5 items:', titlesAfterShuffle.slice(0, 5));
  }

  await page.screenshot({ path: 'qa-evidence/screenshots/vercel-bts-gaming-shuffle.png', fullPage: true });
  console.log('Screenshot saved to qa-evidence/screenshots/vercel-bts-gaming-shuffle.png');
  await browser.close();
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
