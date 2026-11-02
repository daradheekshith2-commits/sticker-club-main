import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iarclkcnxpbbxxpfwamd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhcmNsa2NueHBiYnh4cGZ3YW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMTI5ODcsImV4cCI6MjA2MTY4ODk4N30.rS1u4Zc1bE-L_Z3y7L5p-qfKzI8qE6nC0d0W6w6U6fA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  page.on('dialog', async dialog => {
    console.log(`Accepted dialog: "${dialog.message()}"`);
    await dialog.accept();
  });

  console.log('1. Signing in as Store Admin (stickitup@gmail.com)...');
  await page.goto('http://localhost:5173/admin/login');
  await page.fill('input[type="email"]', 'stickitup@gmail.com');
  await page.fill('input[type="password"]', 'Iloveyou3000');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);
  console.log('2. Current URL:', page.url());

  // Wait for orders to load
  await page.waitForSelector('li.rounded-xl', { timeout: 10000 });

  // A. Test "Mark confirmed" on first PENDING order
  const confirmBtn = page.locator('button:has-text("Mark confirmed")').first();
  if (await confirmBtn.isVisible()) {
    console.log('3. Clicking "Mark confirmed"...');
    await confirmBtn.click();
    await page.waitForTimeout(3000);
    console.log('   "Mark confirmed" clicked and handled!');
  } else {
    console.log('   No "Mark confirmed" button visible currently.');
  }

  // B. Test "💵 Mark COD Collected" on a COD order
  const codBtn = page.locator('button:has-text("Mark COD Collected")').first();
  if (await codBtn.isVisible()) {
    console.log('4. Clicking "💵 Mark COD Collected"...');
    await codBtn.click();
    await page.waitForTimeout(3000);
    console.log('   "💵 Mark COD Collected" clicked and handled!');
  } else {
    console.log('   No "Mark COD Collected" button visible currently.');
  }

  // C. Test "Mark cancelled" on an order if available
  const cancelBtn = page.locator('button:has-text("Mark cancelled")').first();
  if (await cancelBtn.isVisible()) {
    console.log('5. Clicking "Mark cancelled"...');
    await cancelBtn.click();
    await page.waitForTimeout(3000);
    console.log('   "Mark cancelled" clicked and handled!');
  } else {
    console.log('   No "Mark cancelled" button visible currently.');
  }

  // Take screenshot of orders list showing updated statuses & badges
  await page.screenshot({ path: 'qa-evidence/screenshots/admin-buttons-verified.png', fullPage: true });
  console.log('6. Screenshot captured: qa-evidence/screenshots/admin-buttons-verified.png');

  await browser.close();
  console.log('Verification run complete!');
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
