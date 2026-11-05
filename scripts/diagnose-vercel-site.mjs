import { chromium } from 'playwright';

async function diagnose() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const failedRequests = [];
  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), method: req.method(), error: req.failure()?.errorText });
  });
  page.on('response', res => {
    if (res.status() >= 400) {
      failedRequests.push({ url: res.url(), status: res.status() });
    }
  });
  page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));

  console.log('1. Navigating to https://sticker-club-main.vercel.app/ ...');
  await page.goto('https://sticker-club-main.vercel.app/', { waitUntil: 'networkidle' });

  // Check Product Images
  const imgData = await page.$$eval('img', els => els.map(img => ({
    src: img.src,
    alt: img.alt,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    complete: img.complete
  })));

  console.log(`Total images found: ${imgData.length}`);
  console.log('First 10 images:', imgData.slice(0, 10));

  // Check the placeholder frames or fallback divs
  const fallbackElements = await page.$$eval('.aspect-square', els => els.map(el => ({
    html: el.outerHTML.slice(0, 200),
    text: el.innerText.trim()
  })));
  console.log('Sample fallback card elements:', fallbackElements.slice(0, 5));

  console.log('Failed / 4xx / 5xx requests:', failedRequests);

  // Check env vars embedded in bundle if accessible
  const envTest = await page.evaluate(() => {
    return {
      hasSupabaseUrl: !!window.__SUPABASE_URL__ || document.body.innerHTML.includes('iarclkcnxpbbxxpfwamd'),
    };
  }).catch(() => null);
  console.log('Client environment check:', envTest);

  // 2. Test Admin Login
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@test.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'TestAdminSecret!123';
  const siteUrl = process.env.SITE_URL || 'https://sticker-club-main.vercel.app';
  console.log(`2. Navigating to ${siteUrl}/admin/login ...`);
  await page.goto(`${siteUrl}/admin/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', adminEmail);
  await page.fill('input[type="password"]', adminPassword);
  await page.click('button[type="submit"]');

  await page.waitForTimeout(4000);
  console.log('Admin URL after login:', page.url());

  const alerts = await page.locator('[role="alert"], .text-rose, .text-danger, .text-coral').allInnerTexts().catch(() => []);
  console.log('Alert messages on screen:', alerts);

  const adminBody = await page.innerText('body');
  console.log('Admin page snippet:', adminBody.slice(0, 600));

  await page.screenshot({ path: 'qa-evidence/screenshots/vercel-live-diagnosis.png', fullPage: true });

  await browser.close();
}

diagnose().catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
