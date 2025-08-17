import { test, expect } from '@playwright/test';

test.describe('Performance and Load Testing', () => {
  test('customer app loads within acceptable time limits', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:5173');
    
    // Wait for main interface to be interactive
    await expect(page.getByText('Customer Support')).toBeVisible();
    await page.waitForTimeout(1000); // Wait for session creation
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    // Check that critical elements are loaded
    await expect(page.getByPlaceholder('Type your message...')).toBeVisible();
    await expect(page.getByRole('button', { name: /Talk to Human/i })).toBeVisible();
  });

  test('operator app loads within acceptable time limits', async ({ page }) => {
    // Set up operator authentication
    await page.addInitScript(() => {
      localStorage.setItem('operator-token', 'mock-operator-token');
      localStorage.setItem('operator-id', 'test-operator-123');
      localStorage.setItem('operator-role', 'OPERATOR');
    });
    
    const startTime = Date.now();
    
    await page.goto('http://localhost:5174');
    
    // Wait for dashboard to be interactive
    await expect(page.getByText('Operator Dashboard')).toBeVisible();
    await page.waitForTimeout(1000); // Wait for data loading
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    // Check that critical elements are loaded
    await expect(page.locator('[data-testid="chat-queue"]')).toBeVisible();
    await expect(page.locator('[data-testid="operator-metrics"]')).toBeVisible();
  });

  test('message sending response time is acceptable', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.getByText('Customer Support')).toBeVisible();
    await page.waitForTimeout(2000);
    
    const messageInput = page.getByPlaceholder('Type your message...');
    
    // Measure message send time
    const startTime = Date.now();
    
    await messageInput.fill('Test message for response time');
    await messageInput.press('Enter');
    
    // Wait for message to appear
    await expect(page.getByText('Test message for response time')).toBeVisible();
    
    const sendTime = Date.now() - startTime;
    
    // Message should appear within 1 second
    expect(sendTime).toBeLessThan(1000);
    
    // Measure bot response time
    const botResponseStart = Date.now();
    
    // Wait for bot response
    await expect(page.getByText(/I can help you/)).toBeVisible({ timeout: 10000 });
    
    const botResponseTime = Date.now() - botResponseStart;
    
    // Bot should respond within 5 seconds
    expect(botResponseTime).toBeLessThan(5000);
  });

  test('system handles multiple concurrent chat sessions', async ({ browser }) => {
    const numberOfSessions = 5;
    const contexts: any[] = [];
    const pages: any[] = [];
    
    try {
      // Create multiple customer sessions
      for (let i = 0; i < numberOfSessions; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        contexts.push(context);
        pages.push(page);
        
        await page.goto('http://localhost:5173');
        await expect(page.getByText('Customer Support')).toBeVisible();
      }
      
      // Wait for all sessions to initialize
      await Promise.all(pages.map(page => page.waitForTimeout(2000)));
      
      // Send messages from all sessions simultaneously
      const startTime = Date.now();
      
      const messagePromises = pages.map((page, index) => {
        const messageInput = page.getByPlaceholder('Type your message...');
        return messageInput.fill(`Message from session ${index + 1}`).then(() => {
          return messageInput.press('Enter');
        });
      });
      
      await Promise.all(messagePromises);
      
      const allMessagesSentTime = Date.now() - startTime;
      
      // All messages should be sent within 3 seconds
      expect(allMessagesSentTime).toBeLessThan(3000);
      
      // Verify all messages appeared
      const verificationPromises = pages.map((page, index) => {
        return expect(page.getByText(`Message from session ${index + 1}`)).toBeVisible();
      });
      
      await Promise.all(verificationPromises);
      
      // Wait for bot responses to all sessions
      const botResponsePromises = pages.map(page => {
        return expect(page.getByText(/I can help you/)).toBeVisible({ timeout: 15000 });
      });
      
      const botResponseStart = Date.now();
      await Promise.all(botResponsePromises);
      const allBotResponsesTime = Date.now() - botResponseStart;
      
      // All bot responses should arrive within 10 seconds
      expect(allBotResponsesTime).toBeLessThan(10000);
      
    } finally {
      // Clean up
      await Promise.all(contexts.map(context => context.close()));
    }
  });

  test('escalation workflow performance under load', async ({ browser }) => {
    const numberOfCustomers = 3;
    const contexts: any[] = [];
    const customerPages: any[] = [];
    
    // Create operator context
    const operatorContext = await browser.newContext();
    const operatorPage = await operatorContext.newPage();
    
    await operatorPage.addInitScript(() => {
      localStorage.setItem('operator-token', 'mock-operator-token');
      localStorage.setItem('operator-id', 'test-operator-123');
      localStorage.setItem('operator-role', 'OPERATOR');
    });
    
    try {
      // Create multiple customer sessions
      for (let i = 0; i < numberOfCustomers; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        contexts.push(context);
        customerPages.push(page);
        
        await page.goto('http://localhost:5173');
        await expect(page.getByText('Customer Support')).toBeVisible();
        await page.waitForTimeout(2000);
        
        // Send initial message
        const messageInput = page.getByPlaceholder('Type your message...');
        await messageInput.fill(`Urgent issue from customer ${i + 1}`);
        await messageInput.press('Enter');
      }
      
      // All customers escalate simultaneously
      const escalationStart = Date.now();
      
      const escalationPromises = customerPages.map(page => {
        const escalationButton = page.getByRole('button', { name: /Talk to Human/i });
        return escalationButton.click();
      });
      
      await Promise.all(escalationPromises);
      
      const escalationTime = Date.now() - escalationStart;
      
      // All escalations should complete within 5 seconds
      expect(escalationTime).toBeLessThan(5000);
      
      // Verify all customers see waiting status
      const waitingPromises = customerPages.map(page => {
        return expect(page.getByText(/Waiting for agent/i)).toBeVisible({ timeout: 5000 });
      });
      
      await Promise.all(waitingPromises);
      
      // Operator should see all escalated chats in queue
      await operatorPage.goto('http://localhost:5174');
      await expect(operatorPage.getByText('Operator Dashboard')).toBeVisible();
      await operatorPage.waitForTimeout(3000); // Wait for real-time updates
      
      const queueItems = operatorPage.locator('[data-testid="queue-chat-item"]');
      await expect(queueItems).toHaveCount({ min: numberOfCustomers });
      
    } finally {
      await Promise.all(contexts.map(context => context.close()));
      await operatorContext.close();
    }
  });

  test('real-time messaging performance', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.getByText('Customer Support')).toBeVisible();
    await page.waitForTimeout(2000);
    
    const messageInput = page.getByPlaceholder('Type your message...');
    
    // Send multiple messages in quick succession
    const messages = [
      'First rapid message',
      'Second rapid message', 
      'Third rapid message',
      'Fourth rapid message',
      'Fifth rapid message'
    ];
    
    const sendStart = Date.now();
    
    for (const message of messages) {
      await messageInput.fill(message);
      await messageInput.press('Enter');
      await page.waitForTimeout(100); // Small delay between messages
    }
    
    const allMessagesSent = Date.now() - sendStart;
    
    // Should send all messages within 3 seconds
    expect(allMessagesSent).toBeLessThan(3000);
    
    // Verify all messages are visible
    for (const message of messages) {
      await expect(page.getByText(message)).toBeVisible();
    }
    
    // Check message order is preserved
    const messageElements = await page.locator('[data-testid="message"]').all();
    
    for (let i = 0; i < messages.length; i++) {
      const messageText = await messageElements[i].textContent();
      expect(messageText).toContain(messages[i]);
    }
  });

  test('large message handling performance', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.getByText('Customer Support')).toBeVisible();
    await page.waitForTimeout(2000);
    
    // Create a large message (1000 characters)
    const largeMessage = 'A'.repeat(1000);
    
    const messageInput = page.getByPlaceholder('Type your message...');
    
    const sendStart = Date.now();
    
    await messageInput.fill(largeMessage);
    await messageInput.press('Enter');
    
    // Large message should appear quickly
    await expect(page.getByText(largeMessage)).toBeVisible();
    
    const sendTime = Date.now() - sendStart;
    
    // Should handle large message within 2 seconds
    expect(sendTime).toBeLessThan(2000);
  });

  test('operator dashboard updates performance', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('operator-token', 'mock-operator-token');
      localStorage.setItem('operator-id', 'test-operator-123');
      localStorage.setItem('operator-role', 'OPERATOR');
    });
    
    await page.goto('http://localhost:5174');
    await expect(page.getByText('Operator Dashboard')).toBeVisible();
    
    // Measure how quickly metrics load
    const metricsStart = Date.now();
    
    await expect(page.locator('[data-testid="operator-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-queue"]')).toBeVisible();
    
    const metricsLoadTime = Date.now() - metricsStart;
    
    // Dashboard components should load within 3 seconds
    expect(metricsLoadTime).toBeLessThan(3000);
    
    // Check for specific metric values
    await expect(page.locator('[data-testid="active-chats-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="resolved-today-value"]')).toBeVisible();
  });

  test('memory usage remains stable during extended chat session', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.getByText('Customer Support')).toBeVisible();
    await page.waitForTimeout(2000);
    
    const messageInput = page.getByPlaceholder('Type your message...');
    
    // Send many messages to test memory usage
    for (let i = 0; i < 20; i++) {
      await messageInput.fill(`Test message number ${i + 1}`);
      await messageInput.press('Enter');
      await page.waitForTimeout(500);
    }
    
    // Check that all messages are still visible (DOM not overloaded)
    await expect(page.getByText('Test message number 1')).toBeVisible();
    await expect(page.getByText('Test message number 20')).toBeVisible();
    
    // Page should still be responsive
    await messageInput.fill('Final responsiveness test');
    await messageInput.press('Enter');
    
    await expect(page.getByText('Final responsiveness test')).toBeVisible();
  });

  test('network resilience and reconnection', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.getByText('Customer Support')).toBeVisible();
    await page.waitForTimeout(2000);
    
    // Send a message to establish connection
    const messageInput = page.getByPlaceholder('Type your message...');
    await messageInput.fill('Testing network resilience');
    await messageInput.press('Enter');
    
    await expect(page.getByText('Testing network resilience')).toBeVisible();
    
    // Simulate network interruption
    await page.context().setOffline(true);
    
    // Try to send message while offline
    await messageInput.fill('This should queue');
    await messageInput.press('Enter');
    
    // Should show some indication of connectivity issue
    // (This depends on implementation - might show retry mechanism)
    
    // Restore network
    await page.context().setOffline(false);
    
    // Message should eventually send when connection restored
    await expect(page.getByText('This should queue')).toBeVisible({ timeout: 10000 });
  });
});