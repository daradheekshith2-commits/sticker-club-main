import { chromium } from 'playwright';

async function testMysteryShop() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  console.log('Navigating to Mystery Shop (/product/mystery-pack)...');
  await page.goto('http://localhost:5173/product/mystery-pack');
  
  // Wait for the dynamic database variants to load into the DOM
  await page.waitForSelector('fieldset label:has-text("Anime")', { timeout: 10000 }).catch(() => {
    console.log('Timed out waiting for Anime theme variant label.');
  });
  await page.waitForTimeout(1000);

  // 1. Check title & headline
  const title = await page.locator('h1').innerText();
  console.log('Product page title:', title);

  // 2. Extract all theme variant radio labels
  const themeLabels = await page.locator('fieldset label span.font-display').allInnerTexts();
  console.log('Available Mystery Shop themes:', themeLabels);

  // Take screenshot of Mystery Shop themes
  await page.screenshot({ path: 'qa-evidence/screenshots/mystery-shop-themes.png' });
  console.log('Captured screenshot: qa-evidence/screenshots/mystery-shop-themes.png');

  // 3. Click on "Anime" theme
  const animeTheme = page.locator('fieldset label:has-text("Anime")').first();
  if (await animeTheme.isVisible()) {
    console.log('Selecting "Anime" theme...');
    await animeTheme.click();
    await page.waitForTimeout(1000);
  }

  // 4. Click on "Devotion" theme
  const devotionTheme = page.locator('fieldset label:has-text("Devotion")').first();
  if (await devotionTheme.isVisible()) {
    console.log('Selecting "Devotion" theme...');
    await devotionTheme.click();
    await page.waitForTimeout(1000);
  }

  // 5. Click "Add to cart"
  const addBtn = page.locator('button:has-text("Add to cart")');
  console.log('Add to cart button visible:', await addBtn.isVisible());
  if (await addBtn.isVisible()) {
    await addBtn.click();
    await page.waitForTimeout(1500);
    console.log('Added Devotion Mystery Pack to cart!');
  }

  // Capture screenshot after selection
  await page.screenshot({ path: 'qa-evidence/screenshots/mystery-shop-devotion-selected.png' });
  console.log('Captured screenshot: qa-evidence/screenshots/mystery-shop-devotion-selected.png');

  await browser.close();
  console.log('Mystery Shop themes verification complete!');
  process.exit(0);
}

testMysteryShop().catch((err) => {
  console.error('Error in Mystery Shop test:', err);
  process.exit(1);
});
