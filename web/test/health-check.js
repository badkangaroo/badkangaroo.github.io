#!/usr/bin/env node

/**
 * Health check script for Ribbit web server
 * Used to verify server is running before E2E tests
 */

const http = require('http');

const SERVER_URL = 'http://localhost:3001';
const TIMEOUT = 5000; // 5 seconds

function checkServer() {
  return new Promise((resolve, reject) => {
    const url = new URL(SERVER_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: '/',
      method: 'HEAD',
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log('✓ Server is running and responding at', SERVER_URL);
        resolve(true);
      } else {
        reject(new Error(`Server responded with status: ${res.statusCode}`));
      }
    });

    req.on('error', (err) => {
      reject(new Error(`Cannot connect to server: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Server connection timeout'));
    });

    req.end();
  });
}

async function main() {
  try {
    await checkServer();
    process.exit(0);
  } catch (error) {
    console.error('✗ Server health check failed:', error.message);
    console.error('\nTo start the test server:');
    console.error('  npm run server:test');
    console.error('\nOr for development server:');
    console.error('  npm run dev');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkServer };