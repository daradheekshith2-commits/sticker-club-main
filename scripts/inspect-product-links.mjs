import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/product/campus-survival-sheet');
  await page.waitForLoadState('networkidle');
  console.log('Title:', await page.title());
  const buttons = await page.$$eval('button', els => els.map(b => b.innerText.trim()).filter(Boolean));
  console.log('Buttons:', buttons);
  await browser.close();
  process.exit(0);
}
run();
