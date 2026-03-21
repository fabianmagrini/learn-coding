import { test, expect } from '@playwright/test';

test.describe('Product Listing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
  });

  test('should display product cards', async ({ page }) => {
    const cards = page.locator('[data-testid="product-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    await expect(cards).toHaveCount(4);
  });

  test('should navigate to product detail on click', async ({ page }) => {
    await page.getByText('Wireless Headphones').first().click();
    await expect(page).toHaveURL(/\/products\/1/);
    await expect(page.getByRole('heading', { name: 'Wireless Headphones' })).toBeVisible();
  });

  test('should show product price on detail page', async ({ page }) => {
    await page.getByText('Wireless Headphones').first().click();
    await expect(page.getByText('$79.99')).toBeVisible();
  });

  test('should navigate back to listing from detail page', async ({ page }) => {
    await page.getByText('Wireless Headphones').first().click();
    await page.getByRole('link', { name: /back to products/i }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
  });

  test('should show not-found message for unknown product id', async ({ page }) => {
    await page.goto('/products/does-not-exist');
    await expect(page.getByText('Product not found.')).toBeVisible({ timeout: 10_000 });
  });
});
