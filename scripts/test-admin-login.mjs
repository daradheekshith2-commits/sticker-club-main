import { chromium } from 'playwright';

async function run() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@test.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'TestAdminSecret!123';

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(process.env.BASE_URL || 'http://localhost:5173/admin/login');
  await page.fill('input[type="email"]', adminEmail);
  await page.fill('input[type="password"]', adminPassword);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  console.log('URL:', page.url());
  const buttons = await page.$$eval('button', els => els.map(b => b.innerText.trim()).filter(Boolean));
  console.log('Buttons:', buttons);
  const text = await page.innerText('body');
  console.log('Body snippet:\n', text.slice(0, 1000));
  await page.screenshot({ path: 'qa-evidence/screenshots/master-admin-dashboard.png' });
  await browser.close();
  process.exit(0);
}
run();
