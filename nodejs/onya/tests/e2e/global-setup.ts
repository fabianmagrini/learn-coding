import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...');
  
  // Start a browser instance for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for services to be ready
    console.log('⏳ Waiting for services to be ready...');
    
    // Check shared services health
    await page.goto('http://localhost:3000/health', { timeout: 30000 });
    await page.waitForSelector('text=healthy', { timeout: 10000 });
    console.log('✅ Shared services ready');

    // Check customer BFF health
    await page.goto('http://localhost:3001/health', { timeout: 10000 });
    console.log('✅ Customer BFF ready');

    // Check operator BFF health  
    await page.goto('http://localhost:3002/health', { timeout: 10000 });
    console.log('✅ Operator BFF ready');

    // Check customer app
    await page.goto('http://localhost:5173', { timeout: 10000 });
    await page.waitForSelector('[data-testid="chat-container"], text=Customer Support', { timeout: 10000 });
    console.log('✅ Customer app ready');

    // Check operator app
    await page.goto('http://localhost:5174', { timeout: 10000 });
    await page.waitForSelector('[data-testid="operator-dashboard"], text=Operator Dashboard', { timeout: 10000 });
    console.log('✅ Operator app ready');

    console.log('🎉 All services are ready for E2E testing!');

  } catch (error) {
    console.error('❌ Service readiness check failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;