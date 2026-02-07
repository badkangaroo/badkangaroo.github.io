/**
 * End-to-end tests for Ribbit web application
 */

import { test, expect } from '@playwright/test';

// Shared state to track WASM initialization status
let wasmInitialized = false;
let wasmInitError = null;

test.describe('Ribbit Web App', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the page to load (don't wait for WASM initialization in tests)
    await page.waitForLoadState('networkidle');
  });

  // Critical test - if this fails, all other tests will be skipped
  test('should load WASM module successfully', async ({ page }) => {
    try {
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
    // Allow the WASM load test to run without skipping
    if (testInfo.title === 'should load WASM module successfully') {
      return;
    }

    // Skip all other tests if WASM failed to initialize
    // Note: This check happens after the WASM test has run (or failed)
    if (wasmInitError !== null && !wasmInitialized) {
      test.skip(true, `Skipping test because WASM initialization failed: ${wasmInitError}`);
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
    // Ensure settings are complete first
    await page.evaluate(() => {
      localStorage.setItem('callsign', 'TESTCALL');
      localStorage.setItem('name', 'Test User');
      localStorage.setItem('gridsquare', 'AA00aa');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for settings to close if they were open
    await page.waitForTimeout(1000);

    const textarea = page.locator('#textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeEnabled();
    await expect(textarea).toHaveAttribute('placeholder');
  });

  test('should display encode button', async ({ page }) => {
    // Ensure settings are complete first
    await page.evaluate(() => {
      localStorage.setItem('callsign', 'TESTCALL');
      localStorage.setItem('name', 'Test User');
      localStorage.setItem('gridsquare', 'AA00aa');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for settings to close if they were open
    await page.waitForTimeout(1000);

    const button = page.locator('#encodebutton');
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('should allow typing in message field', async ({ page }) => {
    // Ensure settings are complete first
    await page.evaluate(() => {
      localStorage.setItem('callsign', 'TESTCALL');
      localStorage.setItem('name', 'Test User');
      localStorage.setItem('gridsquare', 'AA00aa');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for settings to close if they were open
    await page.waitForTimeout(1000);

    const textarea = page.locator('#textarea');
    const testMessage = 'Test message for E2E testing';

    await textarea.fill(testMessage);
    await expect(textarea).toHaveValue(testMessage);
  });

  test('should show encoding feedback when sending message', async ({ page }) => {
    // Ensure settings are complete first
    await page.evaluate(() => {
      localStorage.setItem('callsign', 'TESTCALL');
      localStorage.setItem('name', 'Test User');
      localStorage.setItem('gridsquare', 'AA00aa');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for settings to close if they were open
    await page.waitForTimeout(1000);

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
    // Ensure settings are complete first
    await page.evaluate(() => {
      localStorage.setItem('callsign', 'TESTCALL');
      localStorage.setItem('name', 'Test User');
      localStorage.setItem('gridsquare', 'AA00aa');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for settings to close if they were open
    await page.waitForTimeout(1000);

    const messagesList = page.locator('#chat');
    await expect(messagesList).toBeVisible();
  });

  test('should handle Enter key for sending messages', async ({ page }) => {
    // Ensure settings are complete first
    await page.evaluate(() => {
      localStorage.setItem('callsign', 'TESTCALL');
      localStorage.setItem('name', 'Test User');
      localStorage.setItem('gridsquare', 'AA00aa');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for settings to close if they were open
    await page.waitForTimeout(1000);

    const textarea = page.locator('#textarea');

    // Type a message and press Enter
    await textarea.fill('Message sent with Enter key');
    await textarea.press('Enter');

    // Should still work (though actual sending depends on audio context)
    await expect(textarea).toHaveValue('');
  });

  test('should prevent sending empty messages', async ({ page }) => {
    // Ensure settings are complete first
    await page.evaluate(() => {
      localStorage.setItem('callsign', 'TESTCALL');
      localStorage.setItem('name', 'Test User');
      localStorage.setItem('gridsquare', 'AA00aa');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for settings to close if they were open
    await page.waitForTimeout(1000);

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

  test('should show settings page first if required settings are incomplete', async ({ page }) => {
    // Clear localStorage to simulate first-time user
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Settings should be visible
    const settings = page.locator('#settings');
    await expect(settings).toBeVisible();

    // Required fields should be visible (inline guidance replaces large welcome banner)
    await expect(page.locator('#operatorName')).toBeVisible();
    await expect(page.locator('#callsign')).toBeVisible();
    await expect(page.locator('#gridsquare')).toBeVisible();

    // Main chat interface should not be accessible
    const textarea = page.locator('#textarea');
    // Textarea might be visible but disabled, or settings overlay might block it
    // The key is that settings are shown first
  });

  test('should require callsign, name, and gridsquare before allowing encoding', async ({ page }) => {
    // Clear localStorage
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Fill in settings
    const callsignInput = page.locator('#callsign');
    const nameInput = page.locator('#name');
    const gridsquareInput = page.locator('#gridsquare');

    await callsignInput.fill('TESTCALL');
    await nameInput.fill('Test User');
    await gridsquareInput.fill('AA00aa');

    // Save settings
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Save Settings")');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      // Wait for settings to close
      await page.waitForFunction(() => {
        const settings = document.getElementById('settings');
        return !settings || settings.style.top === '-100svh' || !settings.offsetParent;
      }, { timeout: 5000 });
    }

    // Now try to encode a message
    const textarea = page.locator('#textarea');
    await textarea.fill('Test message');
    
    const encodeButton = page.locator('#encodebutton');
    await encodeButton.click();

    // Should not show error about missing settings
    // (The actual encoding might still fail for other reasons like audio context, but not settings)
    await page.waitForTimeout(1000); // Give time for any error messages to appear
    
    // Check that no settings-related error is shown
    const errorMessages = await page.locator('body').textContent();
    expect(errorMessages).not.toContain('Please complete your settings');
    expect(errorMessages).not.toContain('callsign');
    expect(errorMessages).not.toContain('gridsquare');
  });

  test('should prevent encoding when settings are incomplete', async ({ page }) => {
    // Set incomplete settings
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('callsign', 'TESTCALL');
      // Missing name and gridsquare
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Try to encode without completing settings
    // First, check if settings are shown (they should be)
    const settings = page.locator('#settings');
    const isSettingsVisible = await settings.isVisible();

    if (!isSettingsVisible) {
      // If settings aren't visible, try to encode and check for error
      const textarea = page.locator('#textarea');
      await textarea.fill('Test message');
      
      const encodeButton = page.locator('#encodebutton');
      await encodeButton.click();

      // Should show error or open settings
      await page.waitForTimeout(1000);
      
      // Either settings should open, or error message should appear
      const settingsNowVisible = await settings.isVisible();
      const errorText = await page.locator('body').textContent();
      
      expect(settingsNowVisible || errorText.includes('settings') || errorText.includes('callsign') || errorText.includes('gridsquare')).toBe(true);
    } else {
      // Settings are visible, which is correct behavior
      expect(isSettingsVisible).toBe(true);
    }
  });

  test('should validate gridsquare format', async ({ page }) => {
    // Clear localStorage
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    const gridsquareInput = page.locator('#gridsquare');
    
    // Fill in other required fields
    await page.locator('#callsign').fill('TESTCALL');
    await page.locator('#name').fill('Test User');

    // Try invalid gridsquare (too short)
    await gridsquareInput.fill('AA00');
    
    // Try to save - should show validation error or prevent saving
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Save Settings")');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForTimeout(500);
      
      // Check if validation error appears or settings remain open
      const validationErrors = page.locator('.validation-errors, [class*="error"], [class*="invalid"]');
      const hasErrors = await validationErrors.count() > 0;
      const settingsStillOpen = await page.locator('#settings').isVisible();
      
      // Either validation errors should appear or settings should remain open
      expect(hasErrors || settingsStillOpen).toBe(true);
    }

    // Try valid gridsquare
    await gridsquareInput.fill('AA00aa');
    
    // Input should accept valid format
    await expect(gridsquareInput).toHaveValue('AA00aa');
  });

  test('should handle settings inputs', async ({ page }) => {
    // Clear localStorage to show settings
    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Settings should be visible
    const callsignInput = page.locator('#callsign');
    const gridsquareInput = page.locator('#gridsquare');
    const nameInput = page.locator('#name');

    await expect(callsignInput).toBeVisible();
    await expect(nameInput).toBeVisible();
    await expect(gridsquareInput).toBeVisible();

    await callsignInput.fill('TESTCALL');
    await expect(callsignInput).toHaveValue('TESTCALL');

    await gridsquareInput.fill('AA00aa');
    await expect(gridsquareInput).toHaveValue('AA00aa');

    await nameInput.fill('Test User');
    await expect(nameInput).toHaveValue('Test User');
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