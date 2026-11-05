import { chromium } from 'playwright';
import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('qa-evidence/FIXTURES_MANIFEST.json', 'utf8'));
const p9 = manifest.accounts['09'];

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const password = process.env.QA_PASSWORD || (p9.password && !p9.password.includes('REDACTED') ? p9.password : 'QaTest!defaultSecret123#');
  await page.goto('http://localhost:5173/admin/login');
  await page.fill('input[type="email"]', p9.email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // Tab 1: Orders & Payments
  await page.click('button:has-text("Orders & Payments")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'qa-evidence/screenshots/15-admin-orders-tab.png' });
  console.log('Orders tab captured');

  // Tab 2: Customers Directory
  await page.click('button:has-text("Customers Directory")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'qa-evidence/screenshots/16-admin-customers-tab.png' });
  console.log('Customers tab captured');

  // Tab 3: Product Catalogue
  await page.click('button:has-text("Product Catalogue")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'qa-evidence/screenshots/17-admin-products-tab.png' });
  console.log('Products tab captured');

  // Tab 4: Inventory Management
  await page.click('button:has-text("Inventory Management")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'qa-evidence/screenshots/18-admin-inventory-tab.png' });
  console.log('Inventory tab captured');

  // Tab 5: Passport & Rewards
  await page.click('button:has-text("Passport & Rewards")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'qa-evidence/screenshots/19-admin-passport-tab.png' });
  console.log('Passport tab captured');

  await browser.close();
  process.exit(0);
}
run();
