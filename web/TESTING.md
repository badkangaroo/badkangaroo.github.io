# Ribbit WASM Testing Guide

This document describes the testing infrastructure for the Ribbit WebAssembly encoder/decoder.

## Test Suite Location

The main test page is located at: `web/wasm_tests.html`

## Running Tests

### Method 1: Local Web Server

1. Start a local web server in the project root:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   
   # Node.js (if you have http-server installed)
   npx http-server -p 8000
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:8000/web/wasm_tests.html
   ```

### Method 2: Direct File Access

Some browsers support opening HTML files directly, but this may not work due to CORS restrictions with WebAssembly:

```
file:///path/to/badkangaroo.github.io/web/wasm_tests.html
```

## Test Categories

### 1. WASM Module Status

This section verifies that the WebAssembly module loads correctly:
- Module fetching and instantiation
- Memory buffer initialization
- AudioContext creation
- Encoder/decoder creation

### 2. Manual Encode/Decode Test

Interactive testing allowing you to:
- **Encode a message**: Enter text and convert it to audio
- **Play the audio**: Listen to the encoded signal
- **Save as WAV**: Download the encoded audio as a WAV file
- **Load WAV file**: Upload a previously saved WAV file
- **Decode**: Process the audio and extract the original message

**Message Format:**
```
Name|Callsign|Gridsquare|Phone&=Message Text
Example: Test|KO6BVA|FN42kl|555-1234&=Hello World
```

### 3. Automated Test Suite

Three automated test modes:

#### Quick Test
- Runs 1 encode/decode cycle
- Fast verification that basic functionality works
- Takes ~1-2 seconds

#### All Tests
- Runs 5 different test cases:
  1. Basic message
  2. Different user
  3. Short message
  4. Long message
  5. Special characters
- Comprehensive coverage of common scenarios
- Takes ~5-10 seconds

#### Stress Test
- Runs 10 encode/decode cycles
- Tests reliability under repeated use
- Takes ~20-30 seconds

### 4. Test Summary

Displays cumulative results:
- Total tests run
- Tests passed
- Tests failed
- Pass rate percentage

## Understanding Test Results

### Result Types

- **✓ PASS** (Green): Test succeeded
- **✗ FAIL** (Red): Test failed
- **⚠ WARNING** (Yellow): Non-critical issue
- **ℹ INFO** (Blue): Informational message

### Common Test Failures

#### "Decoding failed - no message recovered"
- The decoder did not detect a valid message in the audio
- Possible causes:
  - Audio quality issues
  - Noise in the signal
  - Decoder synchronization problems

#### "Message mismatch"
- The decoded message doesn't match the original
- Possible causes:
  - CRC errors
  - Buffer overflow
  - Character encoding issues

#### "WASM loading failed"
- The WebAssembly module couldn't be loaded
- Possible causes:
  - File not found (check ribbit.wasm exists in web/scripts/)
  - CORS issues (use a local web server)
  - Browser compatibility

## Test WAV Files

### Generating Test Files

1. Open `wasm_tests.html`
2. Enter a test message
3. Click "Encode to Audio"
4. Click "Save as WAV"
5. The WAV file will download automatically

### Using Test Files

Test WAV files can be:
- Played in any audio player
- Shared with others for testing
- Used in automated testing scripts
- Analyzed with audio tools (Audacity, etc.)

### File Specifications

Generated WAV files have these properties:
- **Sample Rate**: 8000 Hz
- **Channels**: 1 (Mono)
- **Bit Depth**: 16-bit PCM or 32-bit Float
- **Duration**: ~2.0 seconds (16384 samples)

## Advanced Testing

### Testing with Real Audio Equipment

1. Generate a test WAV file
2. Play it through speakers/radio
3. Record with microphone/radio receiver
4. Load the recorded WAV file
5. Decode and verify

### Testing Different Messages

Try various message types:
- Short messages (< 20 characters)
- Long messages (near 256 byte limit)
- Messages with numbers
- Messages with special characters
- Unicode characters (may not work)
- Empty messages (should fail)

### Performance Testing

Monitor these metrics:
- Encoding time (should be < 100ms)
- Decoding time (varies with audio length)
- Memory usage (check browser developer tools)
- Audio quality (listen for distortion)

## Troubleshooting

### Tests Won't Start
1. Check browser console for errors (F12)
2. Verify ribbit.wasm and ribbit.js exist in web/scripts/
3. **Use a local web server** (required, not optional)
   - Run `run_tests.bat` (Windows) or `./run_tests.sh` (Linux/Mac)
   - Don't open HTML files directly (file:// protocol won't work)
4. Clear browser cache (Ctrl+Shift+R) and reload
5. Check browser compatibility (Chrome, Firefox, Edge recommended)

**Note**: If you see "Import #0 'a': module is not an object or function", see [WASM_TROUBLESHOOTING.md](WASM_TROUBLESHOOTING.md)

### Audio Doesn't Play
1. Check browser autoplay policy
2. Try clicking elsewhere on the page first
3. Check audio is not muted
4. Verify AudioContext is supported

### Decoding Always Fails
1. Check encoder is working (can you play the audio?)
2. Try the quick test first
3. Check for console errors
4. Verify audio sample rate is 8000 Hz

## Browser Compatibility

### Supported Browsers
- ✓ Chrome/Chromium 57+
- ✓ Firefox 52+
- ✓ Safari 11+
- ✓ Edge 79+

### Required Features
- WebAssembly support
- Web Audio API
- File API
- TextEncoder/TextDecoder

## Contributing Tests

When adding new tests:
1. Add test case to `testCases` array in `wasm_tests.js`
2. Follow the existing message format
3. Include a descriptive test name
4. Document expected behavior
5. Test edge cases

## Continuous Integration

Future plans:
- Automated tests via Playwright/Puppeteer
- GitHub Actions integration
- Performance benchmarking
- Cross-browser testing
- Test coverage reports

