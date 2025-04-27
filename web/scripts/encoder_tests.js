"use strict";
import { Encoder } from './encoder.js';

// Simple assertion function
function assert(condition, message) {
    const resultsDiv = document.getElementById('testResults');
    const result = document.createElement('div');
    if (condition) {
        result.textContent = `PASS: ${message}`;
        result.className = 'pass';
        console.log(`PASS: ${message}`);
    } else {
        result.textContent = `FAIL: ${message}`;
        result.className = 'fail';
        console.error(`FAIL: ${message}`);
    }
    resultsDiv.appendChild(result);
}

document.addEventListener('DOMContentLoaded', () => {
    const resultsDiv = document.getElementById('testResults');
    resultsDiv.innerHTML = ''; // Clear "Running tests..."

    console.log("Starting Encoder tests...");

    let encoder;

    // Test 1: Encoder Initialization
    try {
        encoder = new Encoder();
        assert(encoder instanceof Encoder, "Encoder instance created successfully.");
        assert(encoder.version === 0, "Initial version is 0.");
        assert(!!encoder.versionInput, "versionInput element found.");
        assert(!!encoder.gridsquareInput, "gridsquareInput element found.");
        assert(!!encoder.nameInput, "nameInput element found.");
        // Add checks for other elements if needed
    } catch (e) {
        assert(false, `Encoder initialization failed: ${e.message}`);
        console.error(e);
        return; // Stop tests if initialization fails
    }

    // Test 2: Version Input Validation
    console.log("Testing Version Input...");
    const versionInput = encoder.versionInput;
    const versionBits = encoder.versionBitResult;

    // Valid input
    versionInput.value = '5';
    versionInput.dispatchEvent(new Event('input'));
    assert(versionInput.style.backgroundColor === 'white', "Version '5': Background is white.");
    assert(encoder.version === '5', "Version '5': encoder.version updated.");
    assert(versionBits.value === '0101', "Version '5': versionBits updated correctly."); // 5 is 0101 in binary

    versionInput.value = '15';
    versionInput.dispatchEvent(new Event('input'));
    assert(versionInput.style.backgroundColor === 'white', "Version '15': Background is white.");
    assert(encoder.version === '15', "Version '15': encoder.version updated.");
    assert(versionBits.value === '1111', "Version '15': versionBits updated correctly."); // 15 is F -> 1111

    // Invalid input - text
    versionInput.value = 'abc';
    versionInput.dispatchEvent(new Event('input'));
    assert(versionInput.style.backgroundColor === 'red', "Version 'abc': Background is red.");
    assert(versionBits.value === 'numbers only.', "Version 'abc': Error message shown.");

    // Invalid input - too high
    versionInput.value = '16';
    versionInput.dispatchEvent(new Event('input'));
    assert(versionInput.style.backgroundColor === 'red', "Version '16': Background is red.");
    assert(versionBits.value === 'version must be less than 16.', "Version '16': Error message shown.");

    // Test 3: Gridsquare Input Validation
    console.log("Testing Gridsquare Input...");
    const gridInput = encoder.gridsquareInput;
    const gridBits = encoder.gridsquareBitResult;

    // Valid input
    gridInput.value = 'FN42kl';
    gridInput.dispatchEvent(new Event('input'));
    assert(gridInput.style.backgroundColor === 'white', "Gridsquare 'FN42kl': Background is white.");
    assert(encoder.gridsquare === 'FN42kl', "Gridsquare 'FN42kl': encoder.gridsquare updated.");
    // F=00110, N=01110 -> 00110, 01110
    // 4=0100, 2=0010 -> 0100, 0010
    // k=K=01011, l=L=01100 -> 01011, 01100
    assert(gridBits.value === '00110, 01110, 0100, 0010, 01011, 01100', "Gridsquare 'FN42kl': gridsquareBits updated correctly.");

    // Invalid input - wrong format
    gridInput.value = 'FN42KL'; // Uppercase locator
    gridInput.dispatchEvent(new Event('input'));
    assert(gridInput.style.backgroundColor === 'red', "Gridsquare 'FN42KL': Background is red.");
    assert(gridBits.value === 'invalid gridsquare.', "Gridsquare 'FN42KL': Error message shown.");

    gridInput.value = 'FN4Xkl'; // Non-digit square
    gridInput.dispatchEvent(new Event('input'));
    assert(gridInput.style.backgroundColor === 'red', "Gridsquare 'FN4Xkl': Background is red.");
    assert(gridBits.value === 'invalid gridsquare.', "Gridsquare 'FN4Xkl': Error message shown.");

    gridInput.value = 'F42kl'; // Too short
    gridInput.dispatchEvent(new Event('input'));
    assert(gridInput.style.backgroundColor === 'red', "Gridsquare 'F42kl': Background is red.");
    assert(gridBits.value === 'invalid gridsquare.', "Gridsquare 'F42kl': Error message shown.");

    // Test 4: Name Input Validation
    console.log("Testing Name Input...");
    const nameInput = encoder.nameInput;
    const nameBits = encoder.nameBitResult;

    // Valid input
    nameInput.value = 'Test';
    nameInput.dispatchEvent(new Event('input'));
    assert(nameInput.style.backgroundColor === 'white', "Name 'Test': Background is white.");
    assert(encoder.name === 'Test', "Name 'Test': encoder.name updated.");
    // T=10100, E=00101, S=10011, T=10100
    assert(nameBits.value === '10100, 00101, 10011, 10100', "Name 'Test': nameBits updated correctly.");

    // Invalid input - contains numbers
    nameInput.value = 'Test1';
    nameInput.dispatchEvent(new Event('input'));
    assert(nameInput.style.backgroundColor === 'red', "Name 'Test1': Background is red.");
    assert(nameBits.value === 'letters only.', "Name 'Test1': Error message shown.");

    // Invalid input - contains symbols
    nameInput.value = 'Test!';
    nameInput.dispatchEvent(new Event('input'));
    assert(nameInput.style.backgroundColor === 'red', "Name 'Test!': Background is red.");
    assert(nameBits.value === 'letters only.', "Name 'Test!': Error message shown.");

    console.log("Encoder tests finished.");
}); 