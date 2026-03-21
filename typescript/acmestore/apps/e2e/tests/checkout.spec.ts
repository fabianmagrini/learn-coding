import { test, expect } from '@playwright/test';

test.describe('Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('acme-cart'));
    await page.reload();
  });

  test('should show empty cart message on checkout with no items', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.getByText('Your cart is empty.')).toBeVisible();
  });

  test('should show checkout summary after adding items', async ({ page }) => {
    await page.waitForSelector('[data-testid="product-card"]');
    await page.getByRole('button', { name: 'Add to Cart' }).first().click();
    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Total')).toBeVisible();
  });

  test('should display correct item in summary', async ({ page }) => {
    await page.waitForSelector('[data-testid="product-card"]');
    await page.getByRole('button', { name: 'Add to Cart' }).first().click();
    await page.goto('/checkout');
    await expect(page.getByText('Wireless Headphones × 1')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('$79.99')).toBeVisible();
  });

  test('should place order and show confirmation', async ({ page }) => {
    await page.waitForSelector('[data-testid="product-card"]');
    await page.getByRole('button', { name: 'Add to Cart' }).first().click();
    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Place Order' }).click();
    await expect(page.getByText('Order Placed!')).toBeVisible();
  });

  test('should clear cart after placing order', async ({ page }) => {
    await page.waitForSelector('[data-testid="product-card"]');
    await page.getByRole('button', { name: 'Add to Cart' }).first().click();
    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Place Order' }).click();
    await expect(page.getByText('Order Placed!')).toBeVisible();
    // badge should be gone
    await expect(page.getByLabel('Open cart')).not.toContainText('1');
  });

  test('continue shopping navigates to home', async ({ page }) => {
    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Continue Shopping' }).click();
    await expect(page).toHaveURL('/');
  });
});
