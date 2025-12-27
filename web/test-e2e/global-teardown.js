/**
 * Global teardown for Playwright E2E tests
 */

async function globalTeardown() {
  console.log('Tearing down E2E test environment...');

  // You can add global cleanup logic here
  // For example: stopping test databases, cleaning up test data, etc.

  console.log('E2E test environment teardown complete');
}

module.exports = globalTeardown;