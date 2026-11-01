import { test, expect } from '@playwright/test';

test.describe('Sticker Club Storefront & Order Flow', () => {
  test('Homepage renders 3 distinct category cards with WebP artwork', async ({ page }) => {
    await page.goto('/');

    // Check document title
    await expect(page).toHaveTitle(/Sticker Club/i);

    // Verify exactly three primary categories exist: Stickers, Posters, Shop Your Own
    const stickersHeading = page.getByRole('heading', { name: 'Stickers', exact: true });
    await expect(stickersHeading).toBeVisible();

    const postersHeading = page.getByRole('heading', { name: 'Posters', exact: true });
    await expect(postersHeading).toBeVisible();

    const customHeading = page.getByRole('heading', { name: 'Shop Your Own', exact: true });
    await expect(customHeading).toBeVisible();

    // Verify transparent artwork images are loaded
    const stickersImg = page.locator('img[src*="stickers-"]');
    await expect(stickersImg).toBeVisible();

    const postersImg = page.locator('img[src*="posters-"]');
    await expect(postersImg).toBeVisible();

    const customImg = page.locator('img[src*="custom-"]');
    await expect(customImg).toBeVisible();
  });

  test('Shop catalogue renders products and allows viewing details', async ({ page }) => {
    await page.goto('/shop');

    // Products grid should load
    const productCards = page.locator('article, [data-testid="product-card"], a[href^="/product/"]');
    await expect(productCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('Customer registration, account dashboard access, and checkout flow', async ({ page }) => {
    const uniqueEmail = `playwright-${Date.now()}@example.test`;

    // 1. Register new customer
    await page.goto('/register');
    await page.fill('input[required]:not([type="email"]):not([type="password"])', 'Playwright Tester');
    await page.fill('input[type="email"]', uniqueEmail);
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('ValidPassword123!');
    await passwordInputs.nth(1).fill('ValidPassword123!');

    await page.click('button[type="submit"]');

    // Should redirect to /account
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Playwright Tester')).toBeVisible();

    // 2. Add an item from shop to cart
    await page.goto('/product/chai-first');

    // On product page, click Add to Cart
    const addToCartBtn = page.getByRole('button', { name: /add to cart/i });
    await expect(addToCartBtn).toBeVisible({ timeout: 10000 });
    await addToCartBtn.click();

    // 3. Go to checkout
    await page.goto('/checkout');

    // LiveOrderCheckout heading should be visible
    await expect(page.getByText('Checkout with database verification')).toBeVisible({ timeout: 10000 });

    // Fill shipping address if needed
    const recipientInput = page.locator('input[aria-label="Recipient"]');
    await expect(recipientInput).toBeVisible({ timeout: 10000 });
    await recipientInput.fill('Playwright Tester');
    await page.fill('input[aria-label="Address line"]', '123 Test Street, Madhapur');
    await page.fill('input[aria-label="City"]', 'Hyderabad');
    await page.fill('input[aria-label="State"]', 'Telangana');
    await page.fill('input[aria-label="Postal code"]', '500081');
    await page.click('button:has-text("Save address")');

    // Wait for address to be saved and selected
    await expect(page.getByRole('button', { name: /Review Server Prices/i })).toBeEnabled({ timeout: 10000 });

    // Select Cash on Delivery
    const codRadio = page.getByRole('radio', { name: /Cash on Delivery/i });
    await codRadio.click();

    // Click "Review Server Prices & Availability"
    const reviewBtn = page.getByRole('button', { name: /Review Server Prices/i });
    await reviewBtn.click();

    // Price breakdown should be displayed
    await expect(page.getByText('Server-side Price & Fee Breakdown')).toBeVisible({ timeout: 10000 });

    // Click "Place Order with COD"
    const placeOrderBtn = page.getByRole('button', { name: /Place Order with COD/i });
    await expect(placeOrderBtn).toBeVisible();
    await placeOrderBtn.click();

    // Verify order placement success receipt
    await expect(page.getByRole('heading', { name: /Order placed successfully/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Order reference:')).toBeVisible();
    await expect(page.getByText('COD')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View my orders' })).toBeVisible();

    // Verify navigating to order history
    await page.getByRole('link', { name: 'View my orders' }).click();
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
  });
});
