import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // Auto-accept window.confirm dialogs
  page.on('dialog', async dialog => {
    console.log(`Accepted dialog: ${dialog.message()}`);
    await dialog.accept();
  });

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@test.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'TestAdminSecret!123';
  console.log(`Logging in as Store Admin (${adminEmail})...`);
  await page.goto(process.env.BASE_URL ? `${process.env.BASE_URL}/admin/login` : 'http://localhost:5173/admin/login');
  await page.fill('input[type="email"]', adminEmail);
  await page.fill('input[type="password"]', adminPassword);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // 1. Initial orders screenshot
  await page.screenshot({ path: 'qa-evidence/screenshots/admin-orders-before-action.png' });

  // 2. Test "Mark confirmed"
  const confirmBtn = page.locator('button:has-text("Mark confirmed")').first();
  if (await confirmBtn.isVisible()) {
    console.log('Clicking "Mark confirmed"...');
    await confirmBtn.click();
    await page.waitForTimeout(3000);
    console.log('"Mark confirmed" clicked successfully!');
  } else {
    console.log('No "Mark confirmed" button visible.');
  }

  // 3. Test "💵 Mark COD Collected"
  const codBtn = page.locator('button:has-text("Mark COD Collected")').first();
  if (await codBtn.isVisible()) {
    console.log('Clicking "💵 Mark COD Collected"...');
    await codBtn.click();
    await page.waitForTimeout(3000);
    console.log('"💵 Mark COD Collected" clicked successfully!');
  } else {
    console.log('No "Mark COD Collected" button visible.');
  }

  // 4. Test "Mark cancelled"
  const cancelBtn = page.locator('button:has-text("Mark cancelled")').first();
  if (await cancelBtn.isVisible()) {
    console.log('Clicking "Mark cancelled"...');
    await cancelBtn.click();
    await page.waitForTimeout(3000);
    console.log('"Mark cancelled" clicked successfully!');
  } else {
    console.log('No "Mark cancelled" button visible.');
  }

  // Capture final screenshot
  await page.screenshot({ path: 'qa-evidence/screenshots/admin-orders-after-actions.png' });
  console.log('Final screenshot captured: admin-orders-after-actions.png');

  const bannerMessage = await page.$eval('.bg-mint\\/10, [role="alert"], p.text-mint', el => el.innerText).catch(() => null);
  console.log('Banner message on screen:', bannerMessage);

  await browser.close();
  process.exit(0);
}
run();
