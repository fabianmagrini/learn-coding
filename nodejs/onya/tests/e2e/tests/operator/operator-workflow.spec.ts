import { test, expect } from '@playwright/test';

test.describe('Operator Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to operator app
    await page.goto('http://localhost:5174');
    
    // Mock operator authentication
    // In a real scenario, this would go through proper login flow
    await page.addInitScript(() => {
      localStorage.setItem('operator-token', 'mock-operator-token');
      localStorage.setItem('operator-id', 'test-operator-123');
      localStorage.setItem('operator-role', 'OPERATOR');
    });
    
    await page.reload();
  });

  test('operator can view chat queue', async ({ page }) => {
    // Wait for operator dashboard to load
    await expect(page.getByText('Operator Dashboard')).toBeVisible();
    
    // Should see chat queue section
    await expect(page.getByText(/Chat Queue/i)).toBeVisible();
    
    // Should show pending chats (might be empty initially)
    const queueSection = page.locator('[data-testid="chat-queue"]');
    await expect(queueSection).toBeVisible();
    
    // Should show queue metrics
    await expect(page.getByText(/pending/i)).toBeVisible();
  });

  test('operator can accept a chat from queue', async ({ page }) => {
    await expect(page.getByText('Operator Dashboard')).toBeVisible();
    
    // Look for available chats in queue
    const chatItem = page.locator('[data-testid="queue-chat-item"]').first();
    
    if (await chatItem.isVisible()) {
      // Accept the chat
      const acceptButton = chatItem.getByRole('button', { name: /accept/i });
      await acceptButton.click();
      
      // Should navigate to chat interface or show chat panel
      await expect(page.getByText(/Chat with customer/i)).toBeVisible({ timeout: 5000 });
      
      // Should show customer information
      await expect(page.locator('[data-testid="customer-info"]')).toBeVisible();
    }
  });

  test('operator can send messages to customer', async ({ page }) => {
    await expect(page.getByText('Operator Dashboard')).toBeVisible();
    
    // Navigate to or open a chat (this assumes there's an active chat)
    // In a real test, you'd set up the state properly
    await page.goto('http://localhost:5174/chat/test-session-123');
    
    // Wait for chat interface
    await expect(page.getByText(/Chat with customer/i)).toBeVisible();
    
    // Send a message
    const messageInput = page.getByPlaceholder(/Type your message/i);
    await expect(messageInput).toBeVisible();
    
    await messageInput.fill('Hello! I\'m here to help you with your inquiry.');
    await messageInput.press('Enter');
    
    // Message should appear in chat
    await expect(page.getByText('Hello! I\'m here to help you with your inquiry.')).toBeVisible();
  });

  test('operator can view customer information and chat history', async ({ page }) => {
    await expect(page.getByText('Operator Dashboard')).toBeVisible();
    
    // Open a chat session
    await page.goto('http://localhost:5174/chat/test-session-123');
    
    // Should see customer information panel
    const customerInfo = page.locator('[data-testid="customer-info"]');
    await expect(customerInfo).toBeVisible();
    
    // Should show customer details
    await expect(customerInfo.getByText(/Customer:/i)).toBeVisible();
    await expect(customerInfo.getByText(/Tier:/i)).toBeVisible();
    
    // Should see chat history
    const chatHistory = page.locator('[data-testid="chat-history"]');
    await expect(chatHistory).toBeVisible();
    
    // Should show previous messages
    const messages = chatHistory.locator('[data-testid="message"]');
    await expect(messages.first()).toBeVisible();
  });

  test('operator can escalate chat to supervisor', async ({ page }) => {
    await expect(page.getByText('Operator Dashboard')).toBeVisible();
    await page.goto('http://localhost:5174/chat/test-session-123');
    
    // Look for escalation button
    const escalateButton = page.getByRole('button', { name: /escalate/i });
    await expect(escalateButton).toBeVisible();
    
    await escalateButton.click();
    
    // Should show escalation dialog
    await expect(page.getByText(/Escalate to supervisor/i)).toBeVisible();
    
    // Fill escalation reason
    const reasonInput = page.getByPlaceholder(/reason for escalation/i);
    await reasonInput.fill('Complex billing issue requiring supervisor review');
    
    // Confirm escalation
    const confirmButton = page.getByRole('button', { name: /confirm/i });
    await confirmButton.click();
    
    // Should show escalation confirmation
    await expect(page.getByText(/escalated successfully/i)).toBeVisible();
  });

  test('operator can transfer chat to another operator', async ({ page }) => {
    await expect(page.getByText('Operator Dashboard')).toBeVisible();
    await page.goto('http://localhost:5174/chat/test-session-123');
    
    // Look for transfer button
    const transferButton = page.getByRole('button', { name: /transfer/i });
    await expect(transferButton).toBeVisible();
    
    await transferButton.click();
    
    // Should show transfer dialog
    await expect(page.getByText(/Transfer chat/i)).toBeVisible();
    
    // Select target operator
    const operatorSelect = page.getByRole('combobox', { name: /select operator/i });
    await operatorSelect.click();
    await page.getByRole('option', { name: /Technical Specialist/i }).click();
    
    // Add transfer notes
    const notesInput = page.getByPlaceholder(/transfer notes/i);
    await notesInput.fill('Customer needs technical assistance with API integration');
    
    // Confirm transfer
    const confirmTransferButton = page.getByRole('button', { name: /transfer/i });
    await confirmTransferButton.click();
    
    // Should show transfer confirmation
    await expect(page.getByText(/transferred successfully/i)).toBeVisible();
  });

  test('operator can resolve and close chat', async ({ page }) => {
    await expect(page.getByText('Operator Dashboard')).toBeVisible();
    await page.goto('http://localhost:5174/chat/test-session-123');
    
    // Look for resolve button
    const resolveButton = page.getByRole('button', { name: /resolve/i });
    await expect(resolveButton).toBeVisible();
    
    await resolveButton.click();
    
    // Should show resolution dialog
    await expect(page.getByText(/Resolve chat/i)).toBeVisible();
    
    // Fill resolution details
    const resolutionInput = page.getByPlaceholder(/resolution summary/i);
    await resolutionInput.fill('Issue resolved. Customer received refund and new order was placed.');
    
    // Set customer satisfaction
    const satisfactionRating = page.getByRole('button', { name: /5 stars/i });
    await satisfactionRating.click();
    
    // Add tags
    const tagsInput = page.getByPlaceholder(/add tags/i);
    await tagsInput.fill('billing, refund, resolved');
    await tagsInput.press('Enter');
    
    // Confirm resolution
    const confirmResolveButton = page.getByRole('button', { name: /resolve chat/i });
    await confirmResolveButton.click();
    
    // Should show resolution confirmation
    await expect(page.getByText(/chat resolved successfully/i)).toBeVisible();
    
    // Should return to dashboard
    await expect(page.getByText('Operator Dashboard')).toBeVisible();
  });

  test('operator can view real-time metrics and analytics', async ({ page }) => {
    await expect(page.getByText('Operator Dashboard')).toBeVisible();
    
    // Should see metrics panel
    const metricsPanel = page.locator('[data-testid="operator-metrics"]');
    await expect(metricsPanel).toBeVisible();
    
    // Should show key metrics
    await expect(metricsPanel.getByText(/active chats/i)).toBeVisible();
    await expect(metricsPanel.getByText(/resolved today/i)).toBeVisible();
    await expect(metricsPanel.getByText(/average response time/i)).toBeVisible();
    await expect(metricsPanel.getByText(/customer satisfaction/i)).toBeVisible();
    
    // Metrics should have numeric values
    const activeChatsValue = metricsPanel.locator('[data-testid="active-chats-value"]');
    await expect(activeChatsValue).toBeVisible();
    
    const resolvedTodayValue = metricsPanel.locator('[data-testid="resolved-today-value"]');
    await expect(resolvedTodayValue).toBeVisible();
  });

  test('operator can update their status', async ({ page }) => {
    await expect(page.getByText('Operator Dashboard')).toBeVisible();
    
    // Look for status indicator
    const statusDropdown = page.getByRole('button', { name: /status/i });
    await expect(statusDropdown).toBeVisible();
    
    await statusDropdown.click();
    
    // Should see status options
    await expect(page.getByRole('option', { name: /available/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /busy/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /away/i })).toBeVisible();
    
    // Change to busy
    await page.getByRole('option', { name: /busy/i }).click();
    
    // Status should update
    await expect(page.getByText(/busy/i)).toBeVisible();
  });

  test('operator receives real-time notifications for new chats', async ({ page }) => {
    await expect(page.getByText('Operator Dashboard')).toBeVisible();
    
    // Set up to listen for notifications
    // In a real test, you'd trigger a new chat from another browser/tab
    
    // Mock a new chat notification
    await page.evaluate(() => {
      // Simulate WebSocket message for new chat
      window.dispatchEvent(new CustomEvent('new-chat-notification', {
        detail: {
          sessionId: 'new-session-456',
          customerName: 'John Doe',
          priority: 'HIGH'
        }
      }));
    });
    
    // Should see notification
    await expect(page.getByText(/new chat request/i)).toBeVisible({ timeout: 5000 });
    
    // Should show chat in queue
    const newChatItem = page.locator('[data-testid="queue-chat-item"]').filter({ hasText: 'John Doe' });
    await expect(newChatItem).toBeVisible();
  });

  test('operator dashboard is responsive on tablet', async ({ page }) => {
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await expect(page.getByText('Operator Dashboard')).toBeVisible();
    
    // Dashboard should adapt to tablet layout
    const dashboard = page.locator('[data-testid="operator-dashboard"]');
    await expect(dashboard).toBeVisible();
    
    // Metrics should be visible and properly arranged
    const metricsPanel = page.locator('[data-testid="operator-metrics"]');
    await expect(metricsPanel).toBeVisible();
    
    // Chat queue should be accessible
    const queuePanel = page.locator('[data-testid="chat-queue"]');
    await expect(queuePanel).toBeVisible();
    
    // Navigation should work on tablet
    const menuButton = page.getByRole('button', { name: /menu/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await expect(page.getByRole('navigation')).toBeVisible();
    }
  });
});