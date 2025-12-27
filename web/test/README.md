# Ribbit Testing Suite

This directory contains the comprehensive testing suite for the Ribbit web application and WASM API.

## Test Structure

```
test/
├── setup.js              # Jest global setup and mocks
├── ribbit-wasm.test.js   # Unit tests for RibbitWASM API
└── message-codec.test.js # Unit tests for MessageCodec

test-e2e/
├── global-setup.js       # Playwright global setup
├── global-teardown.js    # Playwright global teardown
├── app.spec.js          # E2E tests for main web app
└── wasm-api.spec.js     # E2E tests for WASM API functionality
```

## Running Tests

### Unit Tests (Jest)

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test ribbit-wasm.test.js
```

### End-to-End Tests (Playwright)

**Note**: E2E tests require a web server to be running to serve the application and WebAssembly files.

```bash
# Start the test server (runs on http://localhost:3001)
npm run server:test

# In another terminal, run E2E tests
npm run test:e2e

# Or run all tests (unit + E2E)
npm run test:all

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run tests in specific browser
npx playwright test --project=chromium

# Run specific test file
npx playwright test wasm-api.spec.js

# Debug mode with browser visible
npm run test:e2e:debug
```

#### Server Requirements

E2E tests automatically start a test server, but you can also start it manually:

```bash
# Test server (HTTP, no SSL certificates needed)
npm run server:test

# Development server (HTTPS with SSL certificates)
npm run dev
```

The tests will check server availability and provide clear error messages if the server is not running.

## Test Categories

### Unit Tests

- **RibbitWASM API**: Tests for the main WASM wrapper class
  - Module loading and initialization
  - Message encoding/decoding
  - Memory management
  - Error handling

- **MessageCodec**: Tests for message encoding/decoding logic
  - Bit stream generation
  - Message formatting
  - Encoding/decoding roundtrips

### End-to-End Tests

- **Web App**: Tests for the complete user interface
  - Page loading and initialization
  - User interactions (typing, clicking)
  - Message sending workflow
  - Responsive design
  - Error handling

- **WASM API**: Tests for WASM functionality in browser
  - Module loading in browser environment
  - Encoding performance and correctness
  - Memory leak prevention
  - Cross-browser compatibility

## Test Environment Setup

### Prerequisites

1. **Node.js**: Version 18 or higher
2. **Web Server**: The app needs to be served from a web server for E2E tests

### Installation

```bash
# Install dependencies
npm install

# For E2E tests, browsers will be installed automatically
npx playwright install
```

### Configuration

- **Jest**: Configured in `package.json` under the `jest` key
- **Playwright**: Configured in `playwright.config.js`

## Writing Tests

### Unit Tests (Jest)

```javascript
import { RibbitWASM } from '../scripts/ribbit-wasm.js';

describe('RibbitWASM', () => {
  let ribbit;

  beforeEach(async () => {
    ribbit = await RibbitWASM.load();
  });

  test('should encode messages', async () => {
    const audio = await ribbit.encodeMessage('Test');
    expect(audio).toBeInstanceOf(Float32Array);
  });
});
```

### E2E Tests (Playwright)

```javascript
import { test, expect } from '@playwright/test';

test('should load application', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Ribbit');
});
```

## Mocking

The test suite includes comprehensive mocking for:

- **WebAssembly**: Mock WASM module and memory
- **Audio APIs**: AudioContext, MediaDevices, etc.
- **Browser APIs**: localStorage, indexedDB, Service Worker
- **Network**: fetch API for WASM loading

See `test/setup.js` for mock implementations.

## Continuous Integration

Tests are configured to run in CI environments:

- **Jest**: Runs unit tests with coverage reporting
- **Playwright**: Runs E2E tests across multiple browsers
- **Parallel Execution**: Tests run in parallel for faster execution
- **Artifact Collection**: Screenshots, videos, and traces on failure

## Debugging Tests

### Jest Debugging

```bash
# Run with debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run specific test with verbose output
npm test -- --verbose ribbit-wasm.test.js
```

### Playwright Debugging

```bash
# Run with debug mode
npx playwright test --debug

# Run with headed browser
npx playwright test --headed

# Generate trace for debugging
npx playwright test --trace on
```

## Test Coverage

Jest is configured to collect coverage from:

- `scripts/ribbit-wasm.js`
- `scripts/messageCodec.js`
- Other JavaScript files in the scripts directory

Coverage reports are generated in `coverage/` directory.

## Browser Support Testing

E2E tests run against multiple browsers:

- **Chromium**: Latest version
- **Firefox**: Latest version
- **WebKit**: Latest version (Safari)
- **Mobile**: Chrome on Pixel 5, Safari on iPhone 12

## Performance Testing

The test suite includes basic performance checks:

- Encoding/decoding speed
- Memory usage monitoring
- Large message handling
- Concurrent operation handling

## Troubleshooting

### Common Issues

1. **Server not running**: E2E tests require a web server
   ```bash
   # Check if server is running
   curl -I http://localhost:3001/

   # Start test server
   npm run server:test
   ```

2. **WASM loading failures**: Ensure WebAssembly files are accessible
   ```bash
   curl -I http://localhost:3001/scripts/ribbit.wasm
   ```

3. **Audio context issues**: Some browsers block audio until user interaction
4. **Memory issues**: Ensure proper cleanup in tests
5. **Timing issues**: Use appropriate timeouts for async operations

### Debug Tips

1. **Check browser console**: Look for JavaScript errors during test execution
2. **Enable verbose logging**: Set `DEBUG=true` environment variable
3. **Use test isolation**: Run tests individually to isolate issues
   ```bash
   npx playwright test --grep "specific test name"
   ```
4. **Check network tab**: Ensure WASM files are loading properly
5. **Server logs**: Check server output for any errors
6. **Manual testing**: Open the app manually in browser to verify functionality

### Server Issues

If you encounter server-related issues:

```bash
# Check server status
node test/health-check.js

# Kill any existing servers
pkill -f "node server"

# Start fresh server
npm run server:test
```

### Port Conflicts

If port 3001 is in use:

```bash
# Find what's using the port
lsof -i :3001

# Use a different port
PORT=3002 npm run server:test
# Then update playwright.config.js baseURL accordingly
```

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Include appropriate test descriptions
3. Add tests for both success and error cases
4. Update this README if adding new test categories
5. Ensure tests run in CI environment