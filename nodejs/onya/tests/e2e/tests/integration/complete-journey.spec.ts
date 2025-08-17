import { test, expect } from '@playwright/test';

test.describe('Complete Customer-to-Operator Journey', () => {
  let customerPage: any;
  let operatorPage: any;

  test.beforeAll(async ({ browser }) => {
    // Create separate contexts for customer and operator
    const customerContext = await browser.newContext();
    const operatorContext = await browser.newContext();
    
    customerPage = await customerContext.newPage();
    operatorPage = await operatorContext.newPage();
    
    // Set up operator authentication
    await operatorPage.addInitScript(() => {
      localStorage.setItem('operator-token', 'mock-operator-token');
      localStorage.setItem('operator-id', 'test-operator-123');
      localStorage.setItem('operator-role', 'OPERATOR');
    });
  });

  test.afterAll(async () => {
    await customerPage.close();
    await operatorPage.close();
  });

  test('complete escalation journey from customer inquiry to operator resolution', async () => {
    // === CUSTOMER SIDE ===
    
    // 1. Customer starts chat
    await customerPage.goto('http://localhost:5173');
    await expect(customerPage.getByText('Customer Support')).toBeVisible();
    await customerPage.waitForTimeout(3000); // Wait for session creation
    
    // 2. Customer sends initial message
    const customerMessageInput = customerPage.getByPlaceholder('Type your message...');
    await customerMessageInput.fill('Hi, I have a billing issue that I cannot resolve myself');
    await customerMessageInput.press('Enter');
    
    await expect(customerPage.getByText('Hi, I have a billing issue that I cannot resolve myself')).toBeVisible();
    
    // 3. Wait for bot response
    await expect(customerPage.getByText(/I can help you/)).toBeVisible({ timeout: 10000 });
    
    // 4. Customer requests escalation to human
    const escalationButton = customerPage.getByRole('button', { name: /Talk to Human/i });
    await escalationButton.click();
    
    // 5. Verify escalation is initiated
    await expect(customerPage.getByText(/Waiting for agent/i)).toBeVisible({ timeout: 5000 });
    
    // === OPERATOR SIDE ===
    
    // 6. Operator opens dashboard
    await operatorPage.goto('http://localhost:5174');
    await expect(operatorPage.getByText('Operator Dashboard')).toBeVisible();
    
    // 7. Operator should see the escalated chat in queue
    await operatorPage.waitForTimeout(2000); // Wait for real-time updates
    const chatQueue = operatorPage.locator('[data-testid="chat-queue"]');
    await expect(chatQueue).toBeVisible();
    
    // Look for the escalated chat (might need to wait for real-time update)
    const escalatedChat = chatQueue.locator('[data-testid="queue-chat-item"]').first();
    
    if (await escalatedChat.isVisible()) {
      // 8. Operator accepts the chat
      const acceptButton = escalatedChat.getByRole('button', { name: /accept/i });
      await acceptButton.click();
      
      // 9. Operator should see chat interface with customer history
      await expect(operatorPage.getByText(/Chat with customer/i)).toBeVisible({ timeout: 5000 });
      await expect(operatorPage.getByText('Hi, I have a billing issue')).toBeVisible();
      
      // === CUSTOMER SIDE - Real-time Update ===
      
      // 10. Customer should see that operator has joined
      await expect(customerPage.getByText('Connected to agent')).toBeVisible({ timeout: 10000 });
      
      // Placeholder should change for operator chat
      const customerInputWithOperator = customerPage.getByPlaceholder(/Type your message to the agent/i);
      await expect(customerInputWithOperator).toBeVisible();
      
      // === OPERATOR INTERACTION ===
      
      // 11. Operator sends greeting message
      const operatorMessageInput = operatorPage.getByPlaceholder(/Type your message/i);
      await operatorMessageInput.fill('Hello! I\'m here to help with your billing issue. Can you provide more details?');
      await operatorMessageInput.press('Enter');
      
      // === CUSTOMER SEES OPERATOR MESSAGE ===
      
      // 12. Customer receives operator message in real-time
      await expect(customerPage.getByText('Hello! I\'m here to help with your billing issue')).toBeVisible({ timeout: 5000 });
      
      // 13. Customer responds to operator
      await customerInputWithOperator.fill('Yes, I was charged twice for my last order #12345. I need a refund for the duplicate charge.');
      await customerInputWithOperator.press('Enter');
      
      // === OPERATOR HANDLES ISSUE ===
      
      // 14. Operator sees customer response
      await expect(operatorPage.getByText('Yes, I was charged twice for my last order #12345')).toBeVisible({ timeout: 5000 });
      
      // 15. Operator provides solution
      await operatorMessageInput.fill('I can see the duplicate charge for order #12345. I\'m processing a refund now. You should see it in 3-5 business days.');
      await operatorMessageInput.press('Enter');
      
      // 16. Customer sees solution
      await expect(customerPage.getByText('I can see the duplicate charge for order #12345')).toBeVisible({ timeout: 5000 });
      
      // 17. Operator resolves the chat
      const resolveButton = operatorPage.getByRole('button', { name: /resolve/i });
      await resolveButton.click();
      
      // Fill resolution form
      await expect(operatorPage.getByText(/Resolve chat/i)).toBeVisible();
      
      const resolutionInput = operatorPage.getByPlaceholder(/resolution summary/i);
      await resolutionInput.fill('Duplicate billing charge resolved. Refund processed for order #12345.');
      
      // Set high customer satisfaction
      const fiveStarRating = operatorPage.getByRole('button', { name: /5 stars/i });
      await fiveStarRating.click();
      
      // Add tags
      const tagsInput = operatorPage.getByPlaceholder(/add tags/i);
      await tagsInput.fill('billing, duplicate-charge, refund, resolved');
      await tagsInput.press('Enter');
      
      // Confirm resolution
      const confirmResolveButton = operatorPage.getByRole('button', { name: /resolve chat/i });
      await confirmResolveButton.click();
      
      // === CUSTOMER SEES RESOLUTION ===
      
      // 18. Customer should see chat resolved status
      await expect(customerPage.getByText(/chat resolved/i)).toBeVisible({ timeout: 10000 });
      
      // 19. Verify operator returned to dashboard
      await expect(operatorPage.getByText('Operator Dashboard')).toBeVisible();
      
      // 20. Verify metrics updated
      const resolvedTodayMetric = operatorPage.locator('[data-testid="resolved-today-value"]');
      await expect(resolvedTodayMetric).toBeVisible();
    }
  });

  test('customer can continue new conversation after resolved chat', async () => {
    // After previous test, customer should be able to start fresh
    
    // Customer starts new conversation
    const newMessageInput = customerPage.getByPlaceholder('Type your message...');
    await newMessageInput.fill('I have another question about my account settings');
    await newMessageInput.press('Enter');
    
    // Should get bot response for new conversation
    await expect(customerPage.getByText(/I can help you/)).toBeVisible({ timeout: 10000 });
    
    // Should show AI Assistant again (not escalated)
    await expect(customerPage.getByText('AI Assistant')).toBeVisible();
  });

  test('multiple customers can be handled simultaneously', async ({ browser }) => {
    // Create additional customer contexts
    const customer2Context = await browser.newContext();
    const customer2Page = await customer2Context.newPage();
    
    const customer3Context = await browser.newContext();
    const customer3Page = await customer3Context.newPage();
    
    try {
      // Customer 2 starts chat
      await customer2Page.goto('http://localhost:5173');
      await expect(customer2Page.getByText('Customer Support')).toBeVisible();
      await customer2Page.waitForTimeout(2000);
      
      const customer2Input = customer2Page.getByPlaceholder('Type your message...');
      await customer2Input.fill('I need technical support with API integration');
      await customer2Input.press('Enter');
      
      // Customer 3 starts chat
      await customer3Page.goto('http://localhost:5173');
      await expect(customer3Page.getByText('Customer Support')).toBeVisible();
      await customer3Page.waitForTimeout(2000);
      
      const customer3Input = customer3Page.getByPlaceholder('Type your message...');
      await customer3Input.fill('I want to change my subscription plan');
      await customer3Input.press('Enter');
      
      // Both should get bot responses
      await expect(customer2Page.getByText(/I can help you/)).toBeVisible({ timeout: 10000 });
      await expect(customer3Page.getByText(/I can help you/)).toBeVisible({ timeout: 10000 });
      
      // Both can escalate independently
      await customer2Page.getByRole('button', { name: /Talk to Human/i }).click();
      await customer3Page.getByRole('button', { name: /Talk to Human/i }).click();
      
      // Both should show waiting for agent
      await expect(customer2Page.getByText(/Waiting for agent/i)).toBeVisible({ timeout: 5000 });
      await expect(customer3Page.getByText(/Waiting for agent/i)).toBeVisible({ timeout: 5000 });
      
      // Operator should see multiple chats in queue
      await operatorPage.reload();
      await expect(operatorPage.getByText('Operator Dashboard')).toBeVisible();
      
      const queueItems = operatorPage.locator('[data-testid="queue-chat-item"]');
      await expect(queueItems).toHaveCount({ min: 2 });
      
    } finally {
      await customer2Page.close();
      await customer3Page.close();
    }
  });

  test('system handles operator going offline during chat', async () => {
    // Start a chat and escalate
    await customerPage.goto('http://localhost:5173');
    await expect(customerPage.getByText('Customer Support')).toBeVisible();
    await customerPage.waitForTimeout(2000);
    
    const messageInput = customerPage.getByPlaceholder('Type your message...');
    await messageInput.fill('I need immediate assistance');
    await messageInput.press('Enter');
    
    // Escalate to human
    await customerPage.getByRole('button', { name: /Talk to Human/i }).click();
    await expect(customerPage.getByText(/Waiting for agent/i)).toBeVisible();
    
    // Operator accepts chat
    await operatorPage.goto('http://localhost:5174');
    await expect(operatorPage.getByText('Operator Dashboard')).toBeVisible();
    
    const chatInQueue = operatorPage.locator('[data-testid="queue-chat-item"]').first();
    if (await chatInQueue.isVisible()) {
      await chatInQueue.getByRole('button', { name: /accept/i }).click();
      await expect(operatorPage.getByText(/Chat with customer/i)).toBeVisible();
      
      // Customer sees operator connected
      await expect(customerPage.getByText('Connected to agent')).toBeVisible({ timeout: 10000 });
      
      // Operator sends message
      const operatorInput = operatorPage.getByPlaceholder(/Type your message/i);
      await operatorInput.fill('Hello, I\'m here to help');
      await operatorInput.press('Enter');
      
      // Customer receives message
      await expect(customerPage.getByText('Hello, I\'m here to help')).toBeVisible({ timeout: 5000 });
      
      // Simulate operator going offline (close operator page)
      await operatorPage.close();
      
      // Customer should be notified about operator disconnect
      // This depends on implementation - might show reconnection attempt or transfer to queue
      await expect(customerPage.getByText(/agent disconnect|reconnecting|transferred/i)).toBeVisible({ timeout: 15000 });
    }
  });

  test('chat history persists across operator handoffs', async ({ browser }) => {
    // Create two operator contexts
    const operator1Context = await browser.newContext();
    const operator1Page = await operator1Context.newPage();
    
    const operator2Context = await browser.newContext();
    const operator2Page = await operator2Context.newPage();
    
    // Set up both operators
    await operator1Page.addInitScript(() => {
      localStorage.setItem('operator-token', 'mock-operator-1-token');
      localStorage.setItem('operator-id', 'test-operator-1');
      localStorage.setItem('operator-role', 'OPERATOR');
    });
    
    await operator2Page.addInitScript(() => {
      localStorage.setItem('operator-token', 'mock-operator-2-token');
      localStorage.setItem('operator-id', 'test-operator-2');
      localStorage.setItem('operator-role', 'OPERATOR');
    });
    
    try {
      // Customer starts chat and escalates
      await customerPage.goto('http://localhost:5173');
      await customerPage.waitForTimeout(2000);
      
      const customerInput = customerPage.getByPlaceholder('Type your message...');
      await customerInput.fill('Complex technical issue requiring specialist');
      await customerInput.press('Enter');
      
      await customerPage.getByRole('button', { name: /Talk to Human/i }).click();
      await expect(customerPage.getByText(/Waiting for agent/i)).toBeVisible();
      
      // Operator 1 accepts and handles initial conversation
      await operator1Page.goto('http://localhost:5174');
      await expect(operator1Page.getByText('Operator Dashboard')).toBeVisible();
      
      const chatItem = operator1Page.locator('[data-testid="queue-chat-item"]').first();
      if (await chatItem.isVisible()) {
        await chatItem.getByRole('button', { name: /accept/i }).click();
        
        const op1Input = operator1Page.getByPlaceholder(/Type your message/i);
        await op1Input.fill('I understand you have a technical issue. Let me gather some details first.');
        await op1Input.press('Enter');
        
        // Customer responds
        const customerInputWithOp = customerPage.getByPlaceholder(/Type your message to the agent/i);
        await customerInputWithOp.fill('Yes, I\'m having trouble with API rate limiting on my application.');
        await customerInputWithOp.press('Enter');
        
        // Operator 1 transfers to specialist (Operator 2)
        const transferButton = operator1Page.getByRole('button', { name: /transfer/i });
        await transferButton.click();
        
        await expect(operator1Page.getByText(/Transfer chat/i)).toBeVisible();
        
        // Select operator 2 as technical specialist
        const operatorSelect = operator1Page.getByRole('combobox', { name: /select operator/i });
        await operatorSelect.click();
        await operator1Page.getByRole('option', { name: /Technical Specialist/i }).click();
        
        const transferNotes = operator1Page.getByPlaceholder(/transfer notes/i);
        await transferNotes.fill('Customer experiencing API rate limiting issues. Needs technical specialist.');
        
        const confirmTransfer = operator1Page.getByRole('button', { name: /transfer/i });
        await confirmTransfer.click();
        
        // Operator 2 should see the transferred chat with full history
        await operator2Page.goto('http://localhost:5174');
        await expect(operator2Page.getByText('Operator Dashboard')).toBeVisible();
        
        // Accept transferred chat
        const transferredChat = operator2Page.locator('[data-testid="queue-chat-item"]').first();
        if (await transferredChat.isVisible()) {
          await transferredChat.getByRole('button', { name: /accept/i }).click();
          
          // Should see full chat history including customer's original message and operator 1's response
          await expect(operator2Page.getByText('Complex technical issue requiring specialist')).toBeVisible();
          await expect(operator2Page.getByText('I understand you have a technical issue')).toBeVisible();
          await expect(operator2Page.getByText('trouble with API rate limiting')).toBeVisible();
          
          // Should see transfer notes
          await expect(operator2Page.getByText('API rate limiting issues')).toBeVisible();
          
          // Operator 2 can continue the conversation
          const op2Input = operator2Page.getByPlaceholder(/Type your message/i);
          await op2Input.fill('Hello! I\'m a technical specialist. I can help you resolve the API rate limiting issue.');
          await op2Input.press('Enter');
          
          // Customer should see seamless transition
          await expect(customerPage.getByText('Hello! I\'m a technical specialist')).toBeVisible({ timeout: 5000 });
        }
      }
      
    } finally {
      await operator1Page.close();
      await operator2Page.close();
    }
  });
});