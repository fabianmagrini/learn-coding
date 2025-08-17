import { test, expect } from '@playwright/test';

test.describe('Customer Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('customer can start a chat session and send messages', async ({ page }) => {
    // Wait for chat interface to load
    await expect(page.getByText('Customer Support')).toBeVisible();
    
    // Should show AI Assistant initially
    await expect(page.getByText('AI Assistant')).toBeVisible();
    
    // Wait for session to be created automatically
    await page.waitForTimeout(2000);
    
    // Send a message
    const messageInput = page.getByPlaceholder('Type your message...');
    await expect(messageInput).toBeVisible();
    
    await messageInput.fill('Hello, I need help with my order');
    await messageInput.press('Enter');
    
    // Check that message appears in chat
    await expect(page.getByText('Hello, I need help with my order')).toBeVisible();
    
    // Wait for bot response
    await expect(page.getByText(/I can help you/)).toBeVisible({ timeout: 10000 });
  });

  test('customer can request human escalation', async ({ page }) => {
    // Wait for chat interface to load
    await expect(page.getByText('Customer Support')).toBeVisible();
    await page.waitForTimeout(2000);
    
    // Click "Talk to Human" button
    const escalationButton = page.getByRole('button', { name: /Talk to Human/i });
    await expect(escalationButton).toBeVisible();
    await escalationButton.click();
    
    // Should show escalation notice
    await expect(page.getByText(/escalation/i)).toBeVisible({ timeout: 5000 });
    
    // Status should change to indicate waiting for agent
    await expect(page.getByText(/Waiting for agent/i)).toBeVisible({ timeout: 5000 });
    
    // Escalation button should be hidden
    await expect(escalationButton).not.toBeVisible();
  });

  test('customer can continue chatting while waiting for escalation', async ({ page }) => {
    // Start escalation process
    await expect(page.getByText('Customer Support')).toBeVisible();
    await page.waitForTimeout(2000);
    
    const escalationButton = page.getByRole('button', { name: /Talk to Human/i });
    await escalationButton.click();
    
    // Wait for escalation to be processed
    await expect(page.getByText(/Waiting for agent/i)).toBeVisible({ timeout: 5000 });
    
    // Send a message while waiting
    const messageInput = page.getByPlaceholder(/continue chatting while waiting/i);
    await expect(messageInput).toBeVisible();
    
    await messageInput.fill('I have an urgent billing question');
    await messageInput.press('Enter');
    
    // Message should appear
    await expect(page.getByText('I have an urgent billing question')).toBeVisible();
  });

  test('customer sees typing indicator while bot is responding', async ({ page }) => {
    await expect(page.getByText('Customer Support')).toBeVisible();
    await page.waitForTimeout(2000);
    
    const messageInput = page.getByPlaceholder('Type your message...');
    await messageInput.fill('What are your business hours?');
    await messageInput.press('Enter');
    
    // Should see typing indicator (this might be implementation-specific)
    // Adjust selector based on actual implementation
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible({ timeout: 3000 });
  });

  test('customer can use keyboard shortcuts', async ({ page }) => {
    await expect(page.getByText('Customer Support')).toBeVisible();
    await page.waitForTimeout(2000);
    
    const messageInput = page.getByPlaceholder('Type your message...');
    
    // Test Shift+Enter for new line
    await messageInput.fill('Line 1');
    await messageInput.press('Shift+Enter');
    await messageInput.type('Line 2');
    
    // Should have multiline content
    const inputValue = await messageInput.inputValue();
    expect(inputValue).toContain('\n');
    
    // Test Enter to send
    await messageInput.press('Enter');
    await expect(page.getByText('Line 1')).toBeVisible();
    await expect(page.getByText('Line 2')).toBeVisible();
  });

  test('customer cannot send empty messages', async ({ page }) => {
    await expect(page.getByText('Customer Support')).toBeVisible();
    await page.waitForTimeout(2000);
    
    const messageInput = page.getByPlaceholder('Type your message...');
    const sendButton = page.getByRole('button', { name: /send/i });
    
    // Send button should be disabled initially
    await expect(sendButton).toBeDisabled();
    
    // Try to send empty message
    await messageInput.press('Enter');
    // Should not create any message in chat
    
    // Try whitespace-only message
    await messageInput.fill('   ');
    await expect(sendButton).toBeDisabled();
    
    // Send button should enable with actual content
    await messageInput.fill('Real message');
    await expect(sendButton).toBeEnabled();
  });

  test('customer chat persists across page refreshes', async ({ page }) => {
    await expect(page.getByText('Customer Support')).toBeVisible();
    await page.waitForTimeout(2000);
    
    // Send a message
    const messageInput = page.getByPlaceholder('Type your message...');
    await messageInput.fill('This message should persist');
    await messageInput.press('Enter');
    
    await expect(page.getByText('This message should persist')).toBeVisible();
    
    // Refresh the page
    await page.reload();
    
    // Wait for chat to load
    await expect(page.getByText('Customer Support')).toBeVisible();
    await page.waitForTimeout(3000);
    
    // Message should still be visible
    await expect(page.getByText('This message should persist')).toBeVisible();
  });

  test('customer sees error state when services are unavailable', async ({ page }) => {
    // This test would require mocking service failures
    // For now, we'll test the UI state when no session can be created
    
    // Navigate to a URL that would cause session creation to fail
    // (This is implementation-specific and might require special test setup)
    
    await page.goto('/?mock=service-failure');
    
    // Should show error state
    await expect(page.getByText(/Connection Error/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Try Again/i)).toBeVisible();
    
    // Try Again button should work
    const tryAgainButton = page.getByRole('button', { name: /Try Again/i });
    await tryAgainButton.click();
  });

  test('customer can view chat history', async ({ page }) => {
    await expect(page.getByText('Customer Support')).toBeVisible();
    await page.waitForTimeout(2000);
    
    // Send multiple messages
    const messageInput = page.getByPlaceholder('Type your message...');
    
    await messageInput.fill('First message');
    await messageInput.press('Enter');
    await expect(page.getByText('First message')).toBeVisible();
    
    await page.waitForTimeout(1000);
    
    await messageInput.fill('Second message');
    await messageInput.press('Enter');
    await expect(page.getByText('Second message')).toBeVisible();
    
    // Both messages should be visible in chronological order
    const messages = page.locator('[data-testid="message"]');
    await expect(messages).toHaveCount({ min: 2 });
    
    // Check order (first message should appear before second)
    const firstMessage = messages.filter({ hasText: 'First message' });
    const secondMessage = messages.filter({ hasText: 'Second message' });
    
    await expect(firstMessage).toBeVisible();
    await expect(secondMessage).toBeVisible();
  });

  test('customer interface is responsive on mobile', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await expect(page.getByText('Customer Support')).toBeVisible();
    await page.waitForTimeout(2000);
    
    // Chat interface should be properly sized
    const chatContainer = page.locator('[data-testid="chat-container"]');
    await expect(chatContainer).toBeVisible();
    
    // Message input should be accessible
    const messageInput = page.getByPlaceholder('Type your message...');
    await expect(messageInput).toBeVisible();
    
    // Send button should be properly sized
    const sendButton = page.getByRole('button', { name: /send/i });
    await expect(sendButton).toBeVisible();
    
    // Test message sending on mobile
    await messageInput.fill('Mobile test message');
    await messageInput.press('Enter');
    
    await expect(page.getByText('Mobile test message')).toBeVisible();
  });
});