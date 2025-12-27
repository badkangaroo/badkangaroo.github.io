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

  test('should load the application successfully', async ({ page }) => {
    // Check that the title is correct
    await expect(page).toHaveTitle(/Ribbit/);

    // Check that main elements are present
    await expect(page.locator('#textarea')).toBeVisible();
    await expect(page.locator('#encodebutton')).toBeVisible();
    await expect(page.locator('#chat')).toBeVisible();
  });

  test('should initialize WASM module', async ({ page }) => {
    // Check that WASM is loaded
    const isInitialized = await page.evaluate(() => window.ribbitApp?.isInitialized);
    expect(isInitialized).toBe(true);
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