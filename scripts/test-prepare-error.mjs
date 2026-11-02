import { chromium } from 'playwright';
import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('qa-evidence/FIXTURES_MANIFEST.json', 'utf8'));
const p4 = manifest.accounts['04'];

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.stack));

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

  console.log('--- Clicking Review Server Prices ---');
  await page.click('button:has-text("Review Server Prices")');
  await page.waitForTimeout(3000);

  const errorEl = await page.$('.text-danger');
  if (errorEl) {
    console.log('DANGER TEXT:', await errorEl.innerText());
  }

  const buttons = await page.$$eval('button', els => els.map(b => b.innerText.trim()).filter(Boolean));
  console.log('Buttons on page after review click:', buttons);

  await browser.close();
  process.exit(0);
}
run();
