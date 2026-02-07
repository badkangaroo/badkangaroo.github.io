/**
 * E2E tests for Ribbit WASM API functionality
 */

import { test, expect } from '@playwright/test';

// Shared state to track WASM initialization status
let wasmInitialized = false;
let wasmInitError = null;

test.describe('Ribbit WASM API', () => {
  // Helper function to ensure settings are complete
  const ensureSettingsComplete = async (page) => {
    await page.evaluate(() => {
      localStorage.setItem('callsign', 'TESTCALL');
      localStorage.setItem('name', 'Test User');
      localStorage.setItem('gridsquare', 'AA00aa');
    });
  };

  test('should load WASM API test page', async ({ page }) => {
    // Ensure settings are complete before testing
    await ensureSettingsComplete(page);
    
    await page.goto('/test_wasm_api.html');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that test elements are present
    await expect(page.locator('#status')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Ribbit WASM API Test');
  });

  test('should initialize WASM module in test page', async ({ page }) => {
    // Ensure settings are complete before testing WASM
    await ensureSettingsComplete(page);
    
    try {
      await page.goto('/test_wasm_api.html');

      // Wait for WASM to initialize (check status element)
      await page.waitForFunction(() => {
        const status = document.getElementById('status');
        if (!status) return false;
        const text = status.textContent || '';
        return text.includes('Ready') || text.includes('Failed');
      }, { timeout: 30000 });

      // Check if initialization succeeded
      const statusText = await page.locator('#status').textContent();
      if (statusText && statusText.includes('Failed')) {
        throw new Error(`WASM initialization failed: ${statusText}`);
      }

      // Click the load test button
      await page.click('button:has-text("Run Load Test")');

      // Wait for test to complete
      await page.waitForSelector('#load-test-result.success', { timeout: 10000 });

      // Check that test passed
      const resultText = await page.locator('#load-test-result pre').textContent();
      expect(resultText).toContain('✓ WASM loaded successfully');

      // Mark WASM as initialized on success
      wasmInitialized = true;
      wasmInitError = null;
    } catch (error) {
      // Mark WASM initialization as failed
      wasmInitialized = false;
      wasmInitError = error.message;
      throw error; // Re-throw to fail the test
    }
  });

  // Skip all subsequent tests if WASM initialization failed
  test.beforeEach(async ({ page }, testInfo) => {
    // Allow the WASM initialization test to run
    if (testInfo.title === 'should initialize WASM module in test page') {
      return;
    }

    // Skip all other tests if WASM failed to initialize
    if (wasmInitError !== null && !wasmInitialized) {
      test.skip(true, `Skipping test because WASM initialization failed: ${wasmInitError}`);
    }
  });

  test('should encode messages', async ({ page }) => {
    // Ensure settings are complete before testing encoding
    await ensureSettingsComplete(page);
    
    await page.goto('/test_wasm_api.html');

    // Wait for WASM to load
    await page.click('button:has-text("Run Load Test")');
    await page.waitForSelector('#load-test-result.success');

    // Set test message
    await page.fill('#test-message', 'E2E test message');

    // Click encode test
    await page.click('button:has-text("Run Encode Test")');

    // Wait for encoding to complete
    await page.waitForSelector('#encode-test-result.success', { timeout: 10000 });

    // Check results
    const resultText = await page.locator('#encode-test-result pre').textContent();
    expect(resultText).toContain('✓ Message encoded successfully');
    expect(resultText).toContain('Original: "E2E test message"');
    expect(resultText).toContain('Audio length');
  });

  test('should handle round-trip encoding/decoding', async ({ page }) => {
    // Ensure settings are complete before testing encoding/decoding
    await ensureSettingsComplete(page);
    
    await page.goto('/test_wasm_api.html');

    // Wait for WASM to load
    await page.click('button:has-text("Run Load Test")');
    await page.waitForSelector('#load-test-result.success');

    // Click round-trip test
    await page.click('button:has-text("Run Round-trip Test")');

    // Wait for test to complete
    await page.waitForSelector('#roundtrip-test-result.success', { timeout: 15000 });

    // Check results
    const resultText = await page.locator('#roundtrip-test-result pre').textContent();
    expect(resultText).toContain('✓ Round-trip test setup complete');
    expect(resultText).toContain('Audio buffer created');
  });

  test('should handle memory management', async ({ page }) => {
    // Ensure settings are complete before testing WASM functions
    await ensureSettingsComplete(page);
    
    await page.goto('/test_wasm_api.html');

    // Wait for WASM to load
    await page.click('button:has-text("Run Load Test")');
    await page.waitForSelector('#load-test-result.success');

    // Click memory test
    await page.click('button:has-text("Run Memory Test")');

    // Wait for test to complete
    await page.waitForSelector('#memory-test-result.success', { timeout: 20000 });

    // Check results
    const resultText = await page.locator('#memory-test-result pre').textContent();
    expect(resultText).toContain('✓ Memory test completed');
    expect(resultText).toContain('Memory management appears to be working');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Ensure settings are complete before testing WASM functions
    await ensureSettingsComplete(page);
    
    await page.goto('/test_wasm_api.html');

    // Try to run tests without loading WASM first
    await page.click('#encode-test-result + button');

    // Should show error
    await page.waitForSelector('#encode-test-result.error', { timeout: 5000 });

    const resultText = await page.locator('#encode-test-result pre').textContent();
    expect(resultText).toContain('WASM not loaded yet');
  });

  test('should work across different browsers', async ({ page, browserName }) => {
    // Ensure settings are complete before testing WASM functions
    await ensureSettingsComplete(page);
    
    await page.goto('/test_wasm_api.html');

    // Basic functionality should work in all browsers
    await page.click('#load-test-result + button');
    await page.waitForSelector('#load-test-result.success', { timeout: 15000 });

    // Log which browser we're testing
    console.log(`Testing WASM API in ${browserName}`);

    const resultText = await page.locator('#load-test-result pre').textContent();
    expect(resultText).toContain('✓ WASM loaded successfully');
  });

  test('should handle large messages', async ({ page }) => {
    // Ensure settings are complete before testing encoding
    await ensureSettingsComplete(page);
    
    await page.goto('/test_wasm_api.html');

    // Wait for WASM to load
    await page.click('#load-test-result + button');
    await page.waitForSelector('#load-test-result.success');

    // Create a large message
    const largeMessage = 'A'.repeat(200); // 200 character message
    await page.fill('#test-message', largeMessage);

    // Try to encode
    await page.click('#encode-test-result + button');

    // Should handle it gracefully (either succeed or show appropriate error)
    await page.waitForFunction(() => {
      const result = document.querySelector('#encode-test-result');
      return result && (result.classList.contains('success') || result.classList.contains('error'));
    }, { timeout: 15000 });

    const resultText = await page.locator('#encode-test-result pre').textContent();
    // Should either succeed or fail gracefully
    expect(resultText).toMatch(/✓ Message encoded successfully|✗ Encode test failed/);
  });

  test('should handle special characters in messages', async ({ page }) => {
    // Ensure settings are complete before testing encoding
    await ensureSettingsComplete(page);
    
    await page.goto('/test_wasm_api.html');

    // Wait for WASM to load
    await page.click('#load-test-result + button');
    await page.waitForSelector('#load-test-result.success');

    // Test with special characters
    const specialMessage = 'Hello 🌍! Special chars: àáâãäå, ñ, ü';
    await page.fill('#test-message', specialMessage);

    // Try to encode
    await page.click('#encode-test-result + button');

    // Should handle UTF-8 encoding
    await page.waitForSelector('#encode-test-result.success', { timeout: 10000 });

    const resultText = await page.locator('#encode-test-result pre').textContent();
    expect(resultText).toContain('✓ Message encoded successfully');
  });

  test('should provide performance metrics', async ({ page }) => {
    // Ensure settings are complete before testing encoding
    await ensureSettingsComplete(page);
    
    await page.goto('/test_wasm_api.html');

    // Wait for WASM to load
    await page.click('#load-test-result + button');
    await page.waitForSelector('#load-test-result.success');

    // Run encode test
    await page.fill('#test-message', 'Performance test message');
    await page.click('#encode-test-result + button');

    await page.waitForSelector('#encode-test-result.success');

    // Check that performance timing is included
    const resultText = await page.locator('#encode-test-result pre').textContent();
    expect(resultText).toContain('Encoding time');
    expect(resultText).toMatch(/Encoding time: \d+\.\d+ms/);
  });

  test('should require settings before encoding messages in main app', async ({ page }) => {
    // Clear settings to simulate incomplete setup
    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Settings should be visible
    const settings = page.locator('#settings');
    await expect(settings).toBeVisible();

    // Try to encode a message without completing settings
    const textarea = page.locator('#textarea');
    await textarea.fill('Test message');

    const encodeButton = page.locator('#encodebutton');
    await encodeButton.click();

    // Wait a bit for any error messages or settings to appear
    await page.waitForTimeout(1000);

    // Either settings should still be visible, or an error message should appear
    const settingsStillVisible = await settings.isVisible();
    const bodyText = await page.locator('body').textContent();
    const hasSettingsError = bodyText.includes('settings') || 
                            bodyText.includes('callsign') || 
                            bodyText.includes('gridsquare') ||
                            bodyText.includes('Please complete');

    // Settings should be visible or error should be shown
    expect(settingsStillVisible || hasSettingsError).toBe(true);
  });
});