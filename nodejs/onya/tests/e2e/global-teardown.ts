import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up after E2E tests...');
  
  // Add any cleanup logic here
  // For example, clearing test data, stopping mock services, etc.
  
  console.log('✅ E2E test cleanup complete');
}

export default globalTeardown;