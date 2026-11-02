import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/shop');
  await page.waitForLoadState('networkidle');

  const productsInShop = await page.$$eval('a[href^="/product/"]', els => {
    return Array.from(new Set(els.map(e => e.getAttribute('href'))));
  });

  console.log('Unique product links in shop:', productsInShop.slice(0, 10));

  for (const href of productsInShop.slice(0, 5)) {
    await page.goto('http://localhost:5173' + href);
    await page.waitForLoadState('networkidle');
    const title = await page.title();
    const buttons = await page.$$eval('button', els => els.map(b => b.innerText.trim()).filter(Boolean));
    console.log(`URL: ${href} -> Title: ${title} -> Buttons:`, buttons.slice(0, 5));
  }

  await browser.close();
  process.exit(0);
}
run();
