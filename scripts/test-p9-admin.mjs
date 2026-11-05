import { chromium } from 'playwright';
import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('qa-evidence/FIXTURES_MANIFEST.json', 'utf8'));
const p9 = manifest.accounts['09'];

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const password = process.env.QA_PASSWORD || (p9.password && !p9.password.includes('REDACTED') ? p9.password : 'QaTest!defaultSecret123#');
  await page.goto('http://localhost:5173/admin/login');
  await page.fill('input[type="email"]', p9.email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  console.log('URL:', page.url());
  const buttons = await page.$$eval('button', els => els.map(b => b.innerText.trim()).filter(Boolean));
  console.log('Buttons:', buttons);
  const text = await page.innerText('body');
  console.log('Body snippet:\n', text.slice(0, 500));
  await page.screenshot({ path: 'qa-evidence/screenshots/14-persona09-admin-verified.png' });
  await browser.close();
  process.exit(0);
}
run();
