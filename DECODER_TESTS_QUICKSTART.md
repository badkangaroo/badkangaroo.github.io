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

Test real-time decoding from audio played through speakers:

1. Click **Start Listening** (grant microphone permission if prompted)
2. Play a Ribbit audio file or WAV file on another device
3. Watch decoded messages appear in the "Decoded Messages" panel
4. Click **Stop Listening** when done

## 📁 WAV File Generator

Create audio files for cross-device testing:

1. Enter your test message in the text area
2. Set the callsign (e.g., W1TEST) and gridsquare (e.g., FN31pr)
3. Click **Generate & Download WAV** to create and download
4. Click **Play Audio** to preview through speakers

**Tip:** The WAV file includes a 300Hz wake-up tone for radio compatibility.

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
2. Transfer WAV file to Device B (email, cloud, USB)
3. On Device A: Start Microphone listening
4. On Device B: Play the WAV file through speakers
5. On Device A: Verify the message is decoded correctly
6. Compare decoded callsign, gridsquare, and message
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

## 📚 Additional Resources

- **Full Verification Report**: `DECODER_TESTS_VERIFICATION.md`
- **Testing Documentation**: `Docs/testing_plan.md`
- **WASM API Details**: `Docs/ribbit_wasm.md`
- **Message Format Spec**: `Docs/codec.md`

## 🎉 You're Ready!

The decoder tests are fully functional and easy to run. Just start the server and open the page in your browser. Happy testing! 🐸
