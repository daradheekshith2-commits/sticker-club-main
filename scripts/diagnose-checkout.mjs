import { chromium } from 'playwright';
import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('qa-evidence/FIXTURES_MANIFEST.json', 'utf8'));
const p4 = manifest.accounts['04'];

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', p4.email);
  await page.fill('input[type="password"]', p4.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  await page.goto('http://localhost:5173/product/campus-survival-sheet');
  await page.waitForLoadState('networkidle');
  await page.click('button:has-text("Add to cart")');
  await page.waitForTimeout(1000);

  await page.goto('http://localhost:5173/checkout');
  await page.waitForLoadState('networkidle');

  // Fill visible phone input
  const telInput = page.locator('input[placeholder*="9876543210"]');
  await telInput.fill('9876543210');

  // Select first address in dropdown if not selected
  const selectElem = page.locator('select');
  const val = await selectElem.inputValue();
  console.log('Current selected address ID:', val);
  if (!val) {
    await selectElem.selectOption({ index: 1 });
  }

  await page.waitForTimeout(500);

  const reviewBtn = page.locator('button:has-text("Review Server Prices")');
  console.log('Review button disabled before click?', await reviewBtn.isDisabled());

  await reviewBtn.click();
  await page.waitForTimeout(2500);

  const placeBtn = page.locator('button:has-text("Place Order")');
  console.log('Place Order button visible?', await placeBtn.isVisible());
  if (await placeBtn.isVisible()) {
    console.log('Place Order button disabled?', await placeBtn.isDisabled());
    await placeBtn.click();
    await page.waitForTimeout(3000);
    console.log('Placed order! Current text in body:\n', (await page.innerText('body')).slice(0, 500));
    await page.screenshot({ path: 'qa-evidence/screenshots/07-persona04-upi-order-success.png' });
  }

  await browser.close();
  process.exit(0);
}
run();
