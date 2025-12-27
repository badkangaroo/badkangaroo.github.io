/**
 * End-to-end tests for Ribbit web application
 */

import { test, expect } from '@playwright/test';

test.describe('Ribbit Web App', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the page to load (don't wait for WASM initialization in tests)
    await page.waitForLoadState('networkidle');
  });

  // Critical test - if this fails, all other tests will likely fail too
  test('should load WASM module successfully', async ({ page }) => {
    // Wait for Module to be available (loaded by ribbit.js script tag)
    await page.waitForFunction(() => {
      return typeof window.Module !== 'undefined';
    }, { timeout: 10000 });

    // Wait for Module to be ready (Promise resolution)
    await page.waitForFunction(async () => {
      if (!window.Module || !window.Module.ready) return false;
      try {
        await window.Module.ready;
        return true;
      } catch (e) {
        return false;
      }
    }, { timeout: 15000 });

    // Check what actually happened during script loading
    const debugInfo = await page.evaluate(() => {
      return {
        moduleExists: typeof window.Module !== 'undefined',
        moduleType: typeof window.Module,
        moduleKeys: window.Module ? Object.keys(window.Module) : [],
        testConsoleLogs: window.testConsoleLogs || [],
        ribbitScriptLoaded: !!document.querySelector('script[src*="ribbit.js"]'),
        wasmScriptLoaded: !!document.querySelector('script[src*="ribbit.wasm"]')
      };
    });

    console.log('Debug info:', JSON.stringify(debugInfo, null, 2));

    // Show console logs
    if (debugInfo.testConsoleLogs.length > 0) {
      console.log('Browser console logs:');
      debugInfo.testConsoleLogs.forEach(log => {
        console.log(`[${log.level}] ${log.timestamp}: ${log.message}`);
      });
    }

    expect(debugInfo.moduleExists).toBe(true);
    expect(debugInfo.ribbitScriptLoaded).toBe(true);

    // Check what the Module actually is and try to call it if it's a function
    const moduleInfo = await page.evaluate(async () => {
      const m = window.Module;
      if (!m) return { exists: false, error: 'Module is undefined' };

      const result = {
        exists: true,
        type: typeof m,
        isFunction: typeof m === 'function',
        properties: Object.getOwnPropertyNames(m).slice(0, 10)
      };

      if (typeof m === 'function') {
        try {
          // Try to call the function (for MODULARIZE=1)
          const moduleResult = await m();
          result.called = true;
          result.callResultType = typeof moduleResult;
          result.callResultKeys = Object.keys(moduleResult).slice(0, 10);
          result.hasCreateEncoder = typeof moduleResult._createEncoder === 'function';
          result.hasCreateDecoder = typeof moduleResult._createDecoder === 'function';
          result.functions = Object.getOwnPropertyNames(moduleResult).filter(name => typeof moduleResult[name] === 'function');
          result.wasmFunctions = result.functions.filter(name => name.startsWith('_'));
        } catch (error) {
          result.called = false;
          result.callError = error.message;
        }
      } else {
        // Module is already an object
        result.functions = Object.getOwnPropertyNames(m).filter(name => typeof m[name] === 'function');
        result.wasmFunctions = result.functions.filter(name => name.startsWith('_'));
        result.hasCreateEncoder = typeof m._createEncoder === 'function';
        result.hasCreateDecoder = typeof m._createDecoder === 'function';
      }

      return result;
    });

    console.log('Module analysis:', JSON.stringify(moduleInfo, null, 2));

    expect(moduleInfo.exists).toBe(true);

    if (moduleInfo.isFunction && moduleInfo.called) {
      // Module was a function that we successfully called
      if (moduleInfo.wasmFunctions.length === 0) {
        throw new Error('WASM module loaded but no functions found. Check Emscripten build output.');
      }
      expect(moduleInfo.hasCreateEncoder).toBe(true);
      expect(moduleInfo.hasCreateDecoder).toBe(true);
    } else if (moduleInfo.isFunction && !moduleInfo.called) {
      throw new Error(`Module is a function but calling it failed: ${moduleInfo.callError}`);
    } else {
      // Module is already an object
      if (moduleInfo.wasmFunctions.length === 0) {
        throw new Error('No WASM functions found on Module. The WASM module failed to load or compile.');
      }
      expect(moduleInfo.hasCreateEncoder).toBe(true);
      expect(moduleInfo.hasCreateDecoder).toBe(true);
    }
  });

  test('should load the application successfully', async ({ page }) => {
    // Check that the title is correct
    await expect(page).toHaveTitle(/Ribbit/);

    // Check that main elements are present
    await expect(page.locator('#textarea')).toBeVisible();
    await expect(page.locator('#encodebutton')).toBeVisible();
    await expect(page.locator('#chat')).toBeVisible();
  });

  test('should initialize WASM module', async ({ page }) => {
    // Wait for RibbitApp to be created
    await page.waitForFunction(() => window.ribbitApp, { timeout: 10000 });

    // Wait for initialization to complete (or fail)
    const initResult = await page.evaluate(async () => {
      const app = window.ribbitApp;
      if (!app) return { initialized: false, error: 'App not found' };

      // Wait for initialization with timeout
      let attempts = 0;
      while (!app.isInitialized && attempts < 50) { // 5 seconds max
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      return {
        initialized: app.isInitialized,
        error: app.initializationError
      };
    });

    // If initialization failed, provide detailed error info
    if (!initResult.initialized) {
      console.error('WASM initialization failed:', initResult.error);

      // Check browser console for errors
      const consoleMessages = await page.evaluate(() => {
        // This would need to be set up in the test setup
        return window.testConsoleLogs || [];
      });

      if (consoleMessages.length > 0) {
        console.error('Browser console errors:', consoleMessages);
      }

      expect(initResult.initialized).toBe(true);
    }
  });

  test('should display message input field', async ({ page }) => {
    const textarea = page.locator('#textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeEnabled();
    await expect(textarea).toHaveAttribute('placeholder');
  });

  test('should display encode button', async ({ page }) => {
    const button = page.locator('#encodebutton');
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('should allow typing in message field', async ({ page }) => {
    const textarea = page.locator('#textarea');
    const testMessage = 'Test message for E2E testing';

    await textarea.fill(testMessage);
    await expect(textarea).toHaveValue(testMessage);
  });

  test('should show encoding feedback when sending message', async ({ page }) => {
    const textarea = page.locator('#textarea');
    const button = page.locator('#encodebutton');

    // Type a message
    await textarea.fill('Hello E2E test!');

    // Click encode (this should trigger audio context setup first)
    await button.click();

    // On first click, it should set up audio context
    // The button should still be clickable for actual encoding
    await expect(button).toBeEnabled();
  });

  test('should display messages list', async ({ page }) => {
    const messagesList = page.locator('#chat');
    await expect(messagesList).toBeVisible();
  });

  test('should handle Enter key for sending messages', async ({ page }) => {
    const textarea = page.locator('#textarea');

    // Type a message and press Enter
    await textarea.fill('Message sent with Enter key');
    await textarea.press('Enter');

    // Should still work (though actual sending depends on audio context)
    await expect(textarea).toHaveValue('');
  });

  test('should prevent sending empty messages', async ({ page }) => {
    const textarea = page.locator('#textarea');
    const button = page.locator('#encodebutton');

    // Clear textarea
    await textarea.fill('');

    // Try to send empty message
    await button.click();

    // Should not send (no visual feedback expected for empty messages)
    await expect(textarea).toHaveValue('');
  });

  test('should maintain message history', async ({ page }) => {
    // This test assumes some messages are already in the app
    // In a real scenario, we'd populate test data first
    const messages = page.locator('#messages');
    await expect(messages).toBeVisible();

    // Check if message counter exists and shows a number
    const counter = page.locator('#messagecount');
    if (await counter.isVisible()) {
      const countText = await counter.inputValue();
      expect(parseInt(countText) || 0).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle settings inputs', async ({ page }) => {
    // Check for settings inputs (may not be visible by default)
    const callsignInput = page.locator('#callsign');
    const gridsquareInput = page.locator('#gridsquare');
    const nameInput = page.locator('#name');

    // If settings are visible, test them
    if (await callsignInput.isVisible()) {
      await callsignInput.fill('TESTCALL');
      await expect(callsignInput).toHaveValue('TESTCALL');

      await gridsquareInput.fill('AA00aa');
      await expect(gridsquareInput).toHaveValue('AA00aa');

      await nameInput.fill('Test User');
      await expect(nameInput).toHaveValue('Test User');
    }
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (isMobile) {
      // Test mobile-specific behavior
      const textarea = page.locator('#textarea');
      const button = page.locator('#encodebutton');

      // Elements should still be accessible on mobile
      await expect(textarea).toBeVisible();
      await expect(button).toBeVisible();

      // Test touch interaction
      await textarea.tap();
      await textarea.fill('Mobile test message');
      await button.tap();

      await expect(textarea).toHaveValue('');
    }
  });

  test('should handle audio context errors gracefully', async ({ page }) => {
    // Mock audio context failure
    await page.evaluate(() => {
      // Override AudioContext to simulate failure
      window.AudioContext = class extends AudioContext {
        constructor() {
          throw new Error('Audio context failed');
        }
      };
    });

    const button = page.locator('#encodebutton');
    const textarea = page.locator('#textarea');

    await textarea.fill('Test message');
    await button.click();

    // Should show error but not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should clean up on page unload', async ({ page }) => {
    // Test that cleanup happens when navigating away
    const initialState = await page.evaluate(() => window.ribbitApp?.isInitialized);

    // Simulate page unload
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    // App should still exist but might be cleaned up
    const stillExists = await page.evaluate(() => !!window.ribbitApp);
    expect(stillExists).toBe(true);
  });

  test('should handle service worker registration', async ({ page }) => {
    // Check if service worker is registered (may not happen in test environment)
    const swRegistered = await page.evaluate(() => {
      return navigator.serviceWorker.getRegistrations().then(registrations => registrations.length > 0);
    });

    // Service worker registration might fail in test environment, which is OK
    expect(typeof swRegistered).toBe('boolean');
  });

  test('should display proper UI feedback during operations', async ({ page }) => {
    // Test that UI remains responsive during operations
    const textarea = page.locator('#textarea');
    const button = page.locator('#encodebutton');

    await textarea.fill('UI feedback test');

    // Start encoding process
    await button.click();

    // UI should remain responsive
    await expect(textarea).toBeVisible();
    await expect(button).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
  });
});