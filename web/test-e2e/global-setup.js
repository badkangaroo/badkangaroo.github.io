/**
 * Global setup for Playwright E2E tests
 */

async function globalSetup() {
  console.log('Setting up E2E test environment...');

  // Check if the web server is accessible
  try {
    const response = await fetch('http://localhost:3001');
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    console.log('✓ Web server is accessible at http://localhost:3001');
  } catch (error) {
    console.error('✗ Web server is not accessible at http://localhost:3001');
    console.error('Please make sure the server is running before executing E2E tests.');
    console.error('Run: npm run dev (for HTTPS) or node server-test.js (for HTTP testing)');
    throw new Error(`Web server check failed: ${error.message}`);
  }

  // You can add additional global setup logic here
  // For example: setting up test databases, preparing test data, etc.

  console.log('E2E test environment setup complete');
}

module.exports = globalSetup;