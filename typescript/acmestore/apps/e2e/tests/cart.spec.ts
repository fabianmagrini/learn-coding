import { test, expect } from '@playwright/test';

test.describe('Cart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('acme-cart'));
    await page.reload();
  });

  test('should add item to cart and update badge', async ({ page }) => {
    await page.waitForSelector('[data-testid="product-card"]');
    await page.getByRole('button', { name: 'Add to Cart' }).first().click();
    await expect(page.getByLabel('Open cart')).toContainText('1');
  });

  test('should open cart drawer', async ({ page }) => {
    await page.getByRole('button', { name: 'Open cart' }).click();
    await expect(page.getByRole('dialog', { name: 'Shopping cart' })).toBeVisible();
  });

  test('should show empty cart message', async ({ page }) => {
    await page.getByRole('button', { name: 'Open cart' }).click();
    await expect(page.getByText('Your cart is empty.')).toBeVisible();
  });

  test('should close cart drawer', async ({ page }) => {
    await page.getByRole('button', { name: 'Open cart' }).click();
    await page.getByRole('button', { name: 'Close cart' }).click();
    await expect(page.getByRole('dialog', { name: 'Shopping cart' })).not.toBeVisible();
  });

  test('should show item count in cart heading after adding items', async ({ page }) => {
    await page.waitForSelector('[data-testid="product-card"]');
    await page.getByRole('button', { name: 'Add to Cart' }).first().click();
    await page.getByRole('button', { name: 'Open cart' }).click();
    await expect(page.getByText('Your Cart (1)')).toBeVisible();
  });
});
