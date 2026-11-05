import { chromium } from 'playwright';
import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('qa-evidence/FIXTURES_MANIFEST.json', 'utf8'));
const p4 = manifest.accounts['04'];

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const password = process.env.QA_PASSWORD || (p4.password && !p4.password.includes('REDACTED') ? p4.password : 'QaTest!defaultSecret123#');
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', p4.email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // Visit account page to view orders
  await page.goto('http://localhost:5173/account');
  await page.waitForTimeout(2000);
  console.log('Account text snippet:\n', (await page.innerText('body')).slice(0, 500));
  await page.screenshot({ path: 'qa-evidence/screenshots/persona04-orders-history.png' });

  await browser.close();
  process.exit(0);
}
run();
