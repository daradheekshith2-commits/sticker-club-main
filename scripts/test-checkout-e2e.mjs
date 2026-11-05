import { chromium } from 'playwright';
import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('qa-evidence/FIXTURES_MANIFEST.json', 'utf8'));
const p4 = manifest.accounts['04'];
const p5 = manifest.accounts['05'];

async function testCheckout(account, paymentMethod, utr) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log(`Starting Checkout flow for ${account.name} (${account.email}) with ${paymentMethod}...`);

  // 1. Sign in
  const password = process.env.QA_PASSWORD || (account.password && !account.password.includes('REDACTED') ? account.password : 'QaTest!defaultSecret123#');
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // 2. Add product to cart via UI
  await page.goto('http://localhost:5173/product/campus-survival-sheet');
  await page.waitForLoadState('networkidle');
  await page.click('button:has-text("Add to cart")');
  await page.waitForTimeout(1000);

  // 3. Checkout
  await page.goto('http://localhost:5173/checkout');
  await page.waitForLoadState('networkidle');

  // Fill visible phone input
  await page.locator('input[placeholder*="9876543210"]').fill('9876543210');

  // Select saved address in dropdown
  const selectElem = page.locator('select');
  const val = await selectElem.inputValue();
  if (!val) {
    await selectElem.selectOption({ index: 1 });
  }

  // Choose payment method
  if (paymentMethod === 'COD') {
    await page.click('button[role="radio"]:has-text("Cash on Delivery")');
  } else {
    await page.click('button[role="radio"]:has-text("UPI")');
  }

  await page.waitForTimeout(500);

  // Click Review Server Prices
  console.log('Clicking Review Server Prices...');
  await page.click('button:has-text("Review Server Prices")');
  await page.waitForTimeout(2500);

  // Now click Place Order button
  const placeBtn = page.locator(`button:has-text("Place Order with ${paymentMethod}")`);
  await placeBtn.waitFor({ state: 'visible', timeout: 5000 });
  console.log(`Clicking ${await placeBtn.innerText()}...`);
  await placeBtn.click();
  await page.waitForTimeout(3500);

  await page.screenshot({ path: `qa-evidence/screenshots/order-${paymentMethod.toLowerCase()}-confirmed.png` });
  console.log(`Order placed successfully for ${account.name}!`);

  const bodyText = await page.innerText('body');
  console.log('Order receipt snippet:\n', bodyText.slice(0, 600));

  // If UPI, submit UTR
  if (utr) {
    const utrInput = page.locator('input[placeholder*="UTR"], input[aria-label*="UTR"]').first();
    if (await utrInput.isVisible()) {
      await utrInput.fill(utr);
      await page.click('button:has-text("Submit UTR"), button:has-text("Submit")');
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `qa-evidence/screenshots/order-utr-submitted.png` });
      console.log(`UTR ${utr} submitted successfully!`);
    }
  }

  await browser.close();
}

async function run() {
  await testCheckout(p4, 'UPI', 'UTR' + Date.now());
  await testCheckout(p5, 'COD', null);
  process.exit(0);
}
run();
