import { chromium } from 'playwright';
import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('qa-evidence/FIXTURES_MANIFEST.json', 'utf8'));
const p4 = manifest.accounts['04'];

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', p4.email);
  await page.fill('input[type="password"]', p4.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto('http://localhost:5173/product/campus-survival-sheet');
  await page.waitForLoadState('networkidle');
  await page.click('button:has-text("Add to cart")');
  await page.waitForTimeout(1000);

  await page.goto('http://localhost:5173/checkout');
  await page.waitForLoadState('networkidle');

  await page.locator('input[placeholder*="9876543210"]').fill('9876543210');
  await page.selectOption('select', { index: 1 });
  await page.waitForTimeout(500);

  await page.click('button:has-text("Review Server Prices")');
  await page.waitForTimeout(2500);

  const errorText = await page.$eval('[role="alert"]', el => el.innerText).catch(() => null);
  console.log('ALERT TEXT:', errorText);
  await page.screenshot({ path: 'qa-evidence/screenshots/checkout-error-diagnose.png' });
  await browser.close();
  process.exit(0);
}
run();
