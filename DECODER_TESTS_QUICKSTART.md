# Decoder Tests - Quick Start Guide

## ✅ Status: Ready to Use

All dependencies are in place and the decoder tests page is fully functional.

## 🚀 How to Run (3 Simple Steps)

### Step 1: Start the Server

```bash
cd web
npm start
```

You should see:
```
HTTPS server running on https://10.0.1.6:8443
Also available at https://localhost:8443
```

### Step 2: Open the Test Page

Open your browser to:
```
https://localhost:8443/decoder_tests.html
```

**Note**: You'll see a security warning because of the self-signed SSL certificate. Click "Advanced" → "Proceed to localhost" to continue.

### Step 3: Run Tests

Click any of these buttons:
- **Run Basic Tests** - Quick validation (3 messages, ~10 seconds)
- **Run Stress Test** - Load testing (configurable count)
- **Run Validation Tests** - Edge cases (6 tests, ~30 seconds)
- **Run Advanced Tests** - Unicode, latency, and boundary tests (~2 minutes)

## 🎤 Microphone Live Test

Test real-time decoding from audio played through speakers or transmitted over radio:

1. Click **Start Listening** (grant microphone permission if prompted)
2. Play a Ribbit audio file or WAV file on another device
3. Watch decoded messages appear in the "Decoded Messages" panel with:
   - Callsign and gridsquare
   - Message text
   - Timestamp of reception
4. Click **Stop Listening** when done

**Features:**
- Real-time audio processing at 8kHz sample rate
- Automatic message validation (filters invalid/garbled messages)
- Debouncing to prevent duplicate detections (2-second window)
- Displays last 20 decoded messages
- Echo cancellation and noise suppression disabled for better signal detection

**Use Cases:**
- Test over-the-air signal reception from radio
- Verify cross-device decoding (play on Device B, decode on Device A)
- Validate signal quality and decoder robustness
- Test different audio sources (speakers, radio, phone)

## 📁 WAV File Generator

Create audio files for cross-device testing and radio transmission:

1. Enter your test message in the text area (up to 240 characters)
2. Set the callsign (e.g., W1TEST, max 8 characters)
3. Set the gridsquare (e.g., FN31pr, 6 characters)
4. Click **Generate & Download WAV** to create and download
5. Click **Play Audio** to preview through speakers

**WAV File Structure:**
- 300ms wake-up tone at 300Hz (for radio VOX activation)
- 100ms silence (decoder synchronization)
- Encoded Ribbit message
- 500ms tail silence (clean transmission end)
- Format: 8kHz sample rate, 16-bit mono PCM

**Filename Format:** `YYYYMMDD_HHMMSS-CALLSIGN-GRIDSQUARE.wav`

**Cross-Device Testing Workflow:**
1. Generate WAV file on Device A
2. Transfer to Device B (email, USB, cloud storage, or Bluetooth)
3. On Device A: Start microphone listening
4. On Device B: Play WAV file through speakers at moderate volume
5. On Device A: Verify message decodes correctly
6. Compare callsign, gridsquare, and message text

**Radio Testing Workflow:**
1. Generate WAV file with your message
2. Play WAV file into radio microphone or use audio interface
3. Transmit on appropriate frequency
4. Receive on another radio and decode using microphone test
5. Verify signal quality and decoder performance

## 📊 What to Expect

### Basic Tests
- **Duration**: ~10 seconds
- **Messages**: 3 predefined messages
- **Expected Result**: 100% pass rate (3/3)
- **Purpose**: Verify encoder/decoder work correctly

### Stress Tests
- **Duration**: Depends on count (default 10 messages = ~30 seconds)
- **Messages**: Random content with "STRESS" callsign
- **Expected Result**: >95% pass rate
- **Purpose**: Test memory management and performance

### Validation Tests
- **Duration**: ~30 seconds
- **Tests**: 6 edge cases (empty, long callsigns, invalid chars, etc.)
- **Expected Result**: Mix of pass/fail based on validation rules
- **Purpose**: Verify error handling

### Advanced Tests
- **Duration**: ~2 minutes
- **Tests**: 26 comprehensive scenarios including:
  - Unicode messages (Chinese, Japanese, Korean, Russian, Arabic)
  - Emoji support
  - Special characters and newlines
  - Message length boundaries (1, 50, 200, 240, 250 chars)
  - Callsign variations (short, long, with slashes, numbers)
  - Latency measurements
- **Expected Result**: >85% pass rate
- **Purpose**: Test international character support and edge cases

## 🎛️ Test Controls

### Noise Level Slider
- **Range**: 0-100% (0 = clear signal, 100 = maximum noise)
- **Purpose**: Test decoder robustness under noisy conditions
- **Recommendation**: Start with 0%, then try 25%, 50%, 75%

### Messages to Send
- **Range**: 1-1000
- **Default**: 10
- **Recommendation**: Start with 10-50 for quick tests

### Delay Between (ms)
- **Range**: 0-5000ms
- **Default**: 500ms
- **Purpose**: Allows decoder to settle between tests
- **Recommendation**: Keep at 500ms for reliable results

## 📈 Reading the Results

### Summary Stats
- **Total**: Number of tests run
- **Passed**: Tests where decoded message matched original
- **Failed**: Tests where decoding failed or didn't match
- **Accuracy**: Pass rate percentage

### Individual Results
Each test shows:
- **Test #**: Sequential test number
- **Status Badge**: PASS (green) or FAIL (red)
- **Original**: The message that was encoded
- **Decoded**: What the decoder extracted (or "None" if failed)
- **Validation**: Whether the message passed application-level validation

### System Logs
Real-time log of:
- WASM initialization
- Test execution progress
- Errors and warnings
- Timestamps for debugging

## 🔍 Verification Checklist

Run this quick checklist to verify everything works:

1. ✅ **Server starts without errors**
   ```bash
   cd web && npm start
   ```

2. ✅ **Page loads in browser**
   - Navigate to `https://localhost:8443/decoder_tests.html`
   - Accept SSL certificate warning
   - Page displays with title "🐸 Ribbit Decoding Stress Tests"

3. ✅ **WASM initializes**
   - Check System Logs section
   - Should see: "✓ RibbitWASM loaded successfully"
   - Buttons should be enabled (not grayed out)

4. ✅ **Basic tests pass**
   - Click "Run Basic Tests"
   - Wait ~10 seconds
   - Should see: "3 Total, 3 Passed, 0 Failed, 100% Accuracy"

5. ✅ **Noise testing works**
   - Set noise slider to 50%
   - Click "Run Basic Tests"
   - Should see: Lower accuracy (70-90%)

6. ✅ **Validation catches errors**
   - Click "Run Validation Tests"
   - Should see: Mix of PASS and FAIL results
   - Empty messages and invalid callsigns should FAIL

## 🐛 Troubleshooting

### "Port 8443 already in use"
**Solution**: Another server is running. Either:
- Stop the other server: `lsof -ti:8443 | xargs kill`
- Use a different port: `PORT=8444 npm start`

### "WASM failed to load"
**Possible causes**:
1. Missing `ribbit.wasm` file
   - Check: `ls web/scripts/ribbit.wasm`
   - Solution: Run `build.bat` to rebuild WASM

2. CORS or security error
   - Solution: Use HTTPS server (not file://)
   - Make sure you're accessing via `https://localhost:8443`

### "Tests never start"
**Possible causes**:
1. WASM not initialized
   - Check System Logs for "WASM loaded successfully"
   - If missing, check browser console for errors

2. JavaScript module error
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Common issue: Missing `messageCodec.js`

### "All tests fail"
**Possible causes**:
1. Encoder/decoder mismatch
   - Solution: Rebuild WASM with `build.bat`
   - Clear browser cache and reload

2. Validation too strict
   - Check browser console for validation errors
   - Compare validation logic with `index.js`

### "Microphone test not working"
**Possible causes**:
1. Microphone permission denied
   - Solution: Check browser address bar for permission icon
   - Click and allow microphone access
   - Reload page if needed

2. Wrong audio device selected
   - Solution: Check browser settings for default microphone
   - Try different microphone if available

3. Audio context suspended
   - Solution: Click "Start Listening" again
   - Browser may require user interaction first

### "WAV file doesn't decode"
**Possible causes**:
1. Volume too low
   - Solution: Increase speaker volume to 50-75%
   - Move devices closer together

2. Background noise interference
   - Solution: Test in quieter environment
   - Reduce distance between devices

3. Audio quality issues
   - Solution: Use better speakers/audio output
   - Avoid Bluetooth speakers (latency issues)
   - Use wired connection if possible

### "No messages appearing in decoded list"
**Possible causes**:
1. Signal too weak
   - Solution: Increase volume or move closer
   - Check microphone is working (test with other apps)

2. Message validation failing
   - Solution: Check System Logs for validation errors
   - Verify callsign and message format are valid

3. Debouncing window active
   - Solution: Wait 2 seconds between transmissions
   - Messages within 2 seconds are filtered as duplicates

## 📝 Test Scenarios

### Scenario 1: Quick Smoke Test (1 minute)
```
1. Start server
2. Open decoder_tests.html
3. Click "Run Basic Tests"
4. Verify 100% pass rate
```

### Scenario 2: Robustness Test (5 minutes)
```
1. Set noise to 0%, run Basic Tests → expect 100%
2. Set noise to 25%, run Basic Tests → expect >90%
3. Set noise to 50%, run Basic Tests → expect >70%
4. Set noise to 75%, run Basic Tests → expect >40%
```

### Scenario 3: Load Test (10 minutes)
```
1. Set "Messages to Send" to 100
2. Set "Delay Between" to 100ms
3. Click "Run Stress Test"
4. Monitor memory usage in DevTools
5. Verify >95% pass rate
```

### Scenario 4: Edge Case Validation (2 minutes)
```
1. Click "Run Validation Tests"
2. Verify these FAIL:
   - Empty Messages
   - Long Callsigns
   - Invalid Characters
   - Null Bytes
   - Non-Printable
3. Verify "Garbage Data" PASSES (500 chars is valid)
```

### Scenario 5: Cross-Device Testing (5 minutes)
```
1. On Device A: Generate a WAV file with a custom message
   - Message: "Testing cross-device decoding 73!"
   - Callsign: W1TEST
   - Gridsquare: FN31pr
2. Transfer WAV file to Device B (email, cloud, USB, Bluetooth)
3. On Device A: Start Microphone listening
4. On Device B: Play the WAV file through speakers at 50-75% volume
5. On Device A: Watch for decoded message in "Decoded Messages" panel
6. Verify decoded message matches:
   - Callsign: W1TEST
   - Gridsquare: FN31pr
   - Text: "Testing cross-device decoding 73!"
7. Try different distances and volumes to test robustness
```

### Scenario 6: Advanced International Test (3 minutes)
```
1. Click "Run Advanced Tests"
2. Verify Unicode messages decode correctly:
   - Chinese: 你好世界
   - Japanese: こんにちは
   - Emoji: 🐸 73! 👋
3. Verify latency measurement is displayed
4. Check message length boundary tests
```

## 🎯 Success Criteria

The decoder tests are working correctly if:

✅ Basic tests achieve 100% pass rate with 0% noise
✅ Stress tests achieve >95% pass rate with 0% noise
✅ Validation tests correctly identify invalid messages
✅ Accuracy degrades gracefully with increased noise
✅ No memory leaks during extended stress tests
✅ System logs show no errors or warnings
✅ Microphone test successfully decodes WAV files played from another device
✅ WAV file generator creates valid files that decode correctly
✅ Cross-device testing works reliably at moderate speaker volumes

## 📚 Additional Resources

- **Full Verification Report**: `DECODER_TESTS_VERIFICATION.md`
- **Testing Documentation**: `Docs/testing_plan.md`
- **WASM API Details**: `Docs/ribbit_wasm.md`
- **Message Format Spec**: `Docs/codec.md`

## 💡 Best Practices

### For Microphone Testing:
- Use a quiet environment to minimize background noise
- Position devices 1-3 feet apart for initial testing
- Set speaker volume to 50-75% for optimal signal strength
- Avoid Bluetooth speakers (they introduce latency and compression)
- Use wired speakers or built-in device speakers for best results
- Wait 2 seconds between transmissions (debouncing window)

### For WAV File Generation:
- Keep messages under 200 characters for faster transmission
- Use standard ASCII characters when possible (better compatibility)
- Test Unicode messages separately to verify support
- Include your actual callsign for radio testing
- Use accurate gridsquare for location-based testing
- Store WAV files in a dedicated folder for organization

### For Cross-Device Testing:
- Test on same device first (generate + play + decode)
- Use cloud storage for easy file transfer (Dropbox, Google Drive)
- Test with different device combinations (laptop ↔ phone, etc.)
- Try various distances: 1 foot, 3 feet, 6 feet, 10 feet
- Test in different environments (quiet room, office, outdoors)
- Document successful configurations for future reference

### For Radio Testing:
- Ensure proper amateur radio licensing before transmitting
- Start with low power and short transmissions
- Use appropriate frequency for your license class
- Monitor frequency before transmitting
- Include your callsign in the message for identification
- Test receive-only first before transmitting
- Adjust audio levels to avoid overdriving radio input

## 🎉 You're Ready!

The decoder tests are fully functional and easy to run. Just start the server and open the page in your browser. Happy testing! 🐸
