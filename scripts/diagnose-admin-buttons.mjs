import { chromium } from 'playwright';

async function testButtons() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
  });

  page.on('pageerror', err => {
    console.error('[PAGE ERROR]', err);
  });

  page.on('requestfailed', req => {
    console.error('[REQUEST FAILED]', req.method(), req.url(), req.failure()?.errorText);
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      console.error(`[HTTP ${res.status()}]`, res.request().method(), res.url());
    }
  });

  // Handle dialogs
  page.on('dialog', async dialog => {
    console.log(`[DIALOG] ${dialog.type()}: "${dialog.message()}"`);
    await dialog.accept();
    console.log('[DIALOG] Accepted.');
  });

  console.log('1. Logging in as stickitup@gmail.com...');
  await page.goto('http://localhost:5173/admin/login');
  await page.fill('input[type="email"]', 'stickitup@gmail.com');
  await page.fill('input[type="password"]', 'Iloveyou3000');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);
  console.log('2. Logged in! Current URL:', page.url());

  // Find a COD order that has "Mark COD Collected"
  const codButtons = page.locator('button:has-text("Mark COD Collected")');
  const countCod = await codButtons.count();
  console.log(`Found ${countCod} "Mark COD Collected" button(s).`);

  if (countCod > 0) {
    console.log('Clicking the first "💵 Mark COD Collected" button...');
    await codButtons.first().click();
    await page.waitForTimeout(4000);
  }

  // Find "Mark confirmed" button
  const confirmButtons = page.locator('button:has-text("Mark confirmed")');
  const countConfirm = await confirmButtons.count();
  console.log(`Found ${countConfirm} "Mark confirmed" button(s).`);

  if (countConfirm > 0) {
    console.log('Clicking the first "Mark confirmed" button...');
    await confirmButtons.first().click();
    await page.waitForTimeout(4000);
  }

  // Find "Mark cancelled" button
  const cancelButtons = page.locator('button:has-text("Mark cancelled")');
  const countCancel = await cancelButtons.count();
  console.log(`Found ${countCancel} "Mark cancelled" button(s).`);

  if (countCancel > 0) {
    console.log('Clicking the first "Mark cancelled" button...');
    await cancelButtons.first().click();
    await page.waitForTimeout(4000);
  }

  // Check if error message is displayed on UI
  const errorAlert = await page.locator('.text-rose, [role="alert"], .text-coral').allInnerTexts().catch(() => []);
  console.log('Error alerts on page:', errorAlert);

  const banner = await page.locator('.border-mint, .border-coral, .text-mint').allInnerTexts().catch(() => []);
  console.log('Banner/status texts on page:', banner);

  await page.screenshot({ path: 'qa-evidence/screenshots/admin-buttons-test-result.png', fullPage: true });

  await browser.close();
}

testButtons().catch(err => {
  console.error('Fatal script error:', err);
  process.exit(1);
});
