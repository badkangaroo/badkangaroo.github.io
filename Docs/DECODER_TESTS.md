# Decoder Tests Documentation

Comprehensive documentation for the Ribbit decoder tests page, including automated tests, microphone live testing, and WAV file generation.

---

## Quick Start

### Getting Started (3 Steps)

**Step 1: Start the Server**
```bash
cd web
npm start
```

You should see:
```
HTTPS server running on https://10.0.1.6:8443
Also available at https://localhost:8443
```

**Step 2: Open the Test Page**
```
https://localhost:8443/decoder_tests.html
```

> **Note**: Accept the SSL certificate warning (self-signed cert) by clicking "Advanced" → "Proceed to localhost"

**Step 3: Run Tests**

| Button | Duration | Purpose |
|--------|----------|---------|
| **Run Basic Tests** | ~10s | Quick validation (3 messages) |
| **Run Stress Test** | ~30s | Load testing (configurable count) |
| **Run Validation Tests** | ~30s | Edge cases (6 tests) |
| **Run Advanced Tests** | ~2min | Unicode, emoji, boundaries (26 tests) |

### 1-Minute Verification
```
1. ✅ Start server: npm start
2. ✅ Open: https://localhost:8443/decoder_tests.html
3. ✅ Click "Run Basic Tests"
4. ✅ Wait ~10 seconds
5. ✅ Verify: 3 Total, 3 Passed, 100% Accuracy
```

---

## Features Overview

The decoder tests page provides a complete testing environment for the Ribbit codec:

### Automated Tests
1. **Basic Tests** - Predefined messages with known callsigns and gridsquares
2. **Stress Tests** - Configurable number of messages (1-1000) with random content
3. **Validation Tests** - Edge cases: empty messages, long callsigns, invalid chars, null bytes
4. **Advanced Tests** - Unicode (Chinese, Japanese, Korean, Russian, Arabic), emoji, length boundaries

### Live Testing
5. **Microphone Live Test** - Real-time decoding from audio input
6. **WAV File Generator** - Create audio files for cross-device and radio testing

### Test Controls
7. **Noise Simulation** - Add configurable noise (0-100%) to test robustness
8. **Wake-up Tone** - Optional 300Hz preamble for radio VOX activation

---

## Test Controls

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

### Wake-up Tone Checkbox
- **Default**: Checked (enabled)
- **Parameters**: 300Hz tone for 200ms + 100ms silence
- **Purpose**: Simulates radio VOX activation preamble

**When to Enable:**
- ✅ Testing with real radio equipment
- ✅ Simulating real-world transmission conditions
- ✅ Testing VOX-activated transmitters

**When to Disable:**
- ❌ Testing pure decoder performance
- ❌ Measuring encoding/decoding speed

---

## Expected Results

### Basic Tests (3 messages)
- **Expected**: 100% pass rate with no noise
- **Messages**:
  1. "Hello from Ribbit!" (W1AW, FN31pr)
  2. "Testing the decoder robustness." (K6ABC, CM87um)
  3. "73 de Ribbit Team" (G8XYZ, IO91lk)

### Stress Tests
- **Expected**: >95% pass rate with low noise
- **Messages**: Random text with "STRESS" callsign

### Validation Tests (6 edge cases)
- Empty Messages: Should FAIL
- Long Callsigns (>20 chars): Should FAIL
- Invalid Characters: Should FAIL
- Garbage Data (500 chars): Should PASS
- Null Bytes: Should FAIL
- Non-Printable (>10%): Should FAIL

### Noise Impact
| Noise Level | Expected Pass Rate |
|-------------|-------------------|
| 0% | >99% |
| 25% | ~90% |
| 50% | ~70% |
| 75% | ~40% |

---

## Microphone Live Test

### What It Does
Captures audio from your computer's microphone in real-time and decodes any Ribbit signals it detects. Perfect for testing signal reception from another device or radio transmission.

### How to Use
1. Click **"Start Listening"** button
2. Grant microphone permission when prompted
3. Play a Ribbit signal from another device or radio
4. Watch decoded messages appear in real-time
5. Click **"Stop Listening"** when done

### Features
- **Real-time processing** at 8kHz sample rate
- **Automatic validation** filters out invalid/garbled messages
- **Smart debouncing** prevents duplicate detections (2-second window)
- **Live message display** shows last 20 decoded messages with:
  - Callsign (highlighted badge)
  - Gridsquare
  - Message text
  - Reception timestamp

### Technical Details
- Uses Web Audio API with ScriptProcessor (2048 sample buffer)
- Audio settings optimized for signal detection:
  - Echo cancellation: OFF
  - Noise suppression: OFF
  - Auto gain control: OFF
- Processes audio in chunks for efficient real-time decoding

### Recommended Settings
- **Volume**: 50-75% on playback device
- **Distance**: 1-3 feet for initial testing
- **Environment**: Quiet room recommended

### Use Cases
- ✅ Test over-the-air signal reception from radio
- ✅ Verify cross-device decoding (play on Device B, decode on Device A)
- ✅ Validate signal quality at various distances
- ✅ Test different audio sources (speakers, radio, phone)

---

## WAV File Generator

### What It Does
Creates downloadable WAV audio files containing encoded Ribbit messages. These files can be played on any device, transmitted over radio, or used for testing.

### How to Use
1. Enter your message (up to 240 characters)
2. Set callsign (max 8 characters, e.g., W1TEST)
3. Set gridsquare (6 characters, e.g., FN31pr)
4. Click **"Generate & Download WAV"**
5. Optional: Click **"Play Audio"** to preview

### WAV File Structure
```
┌─────────────────────────────────────┐
│ 300ms - 300Hz Wake-up Tone          │ ← Radio VOX activation
├─────────────────────────────────────┤
│ 100ms - Silence                     │ ← Decoder synchronization
├─────────────────────────────────────┤
│ Variable - Encoded Ribbit Message   │ ← Your message
├─────────────────────────────────────┤
│ 500ms - Tail Silence                │ ← Clean transmission end
└─────────────────────────────────────┘
```

### File Format
```
Format:         WAV (RIFF)
Sample Rate:    8000 Hz
Bit Depth:      16-bit PCM
Channels:       1 (Mono)
```

### Filename Format
```
YYYYMMDD_HHMMSS-CALLSIGN-GRIDSQUARE.wav

Examples:
- 20260115_143022-W1TEST-FN31PR.wav
- 20260115_150530-K6ABC-CM87UM.wav
```

### File Sizes
| Duration | Samples | File Size |
|----------|---------|-----------|
| 1 second | 8,000 | ~16 KB |
| 2 seconds | 16,000 | ~32 KB |
| 2.3s (typical) | 18,400 | ~37 KB |

**With wake-up tone**: +2,400 samples (~5 KB)

---

## Cross-Device Testing Workflow

### Complete Testing Process

**Step 1: Generate WAV File (Device A)**
```
1. Open decoder_tests.html
2. Enter message: "Testing cross-device decoding 73!"
3. Set callsign: W1TEST
4. Set gridsquare: FN31pr
5. Click "Generate & Download WAV"
```

**Step 2: Transfer File to Device B**
- Email attachment
- Cloud storage (Dropbox, Google Drive)
- USB drive
- Bluetooth file transfer
- Local network share

**Step 3: Start Listening (Device A)**
```
1. Click "Start Listening"
2. Grant microphone permission
3. Position Device A to receive audio
```

**Step 4: Play WAV File (Device B)**
```
1. Open WAV file in any audio player
2. Set volume to 50-75%
3. Play the file
4. Position Device B 1-3 feet from Device A
```

**Step 5: Verify Decoding (Device A)**
```
1. Watch "Decoded Messages" panel
2. Verify message appears with:
   ✓ Callsign: W1TEST
   ✓ Gridsquare: FN31pr
   ✓ Text: "Testing cross-device decoding 73!"
```

**Step 6: Test Variations**
- Try different distances (1ft, 3ft, 6ft, 10ft)
- Test different volumes (25%, 50%, 75%, 100%)
- Test in different environments

---

## Radio Testing Workflow

### Transmitting Ribbit Signals Over Radio

**Step 1: Generate WAV File**
```
1. Create message with your callsign
2. Include gridsquare for location
3. Keep message under 200 characters
4. Download WAV file
```

**Step 2: Prepare Radio**
```
1. Ensure proper amateur radio licensing
2. Select appropriate frequency
3. Set radio to appropriate mode (FM/SSB)
4. Adjust audio input levels
5. Enable VOX or use PTT
```

**Step 3: Transmit**
```
1. Monitor frequency (ensure clear)
2. Play WAV file into radio microphone
3. Or use audio interface for direct connection
4. Wake-up tone activates VOX automatically
```

**Step 4: Receive and Decode**
```
1. On receiving station: Open decoder_tests.html
2. Click "Start Listening"
3. Tune radio to transmission frequency
4. Adjust audio output to computer microphone
5. Watch for decoded message
```

---

## Testing Scenarios

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

### Scenario 4: Cross-Device Testing (5 minutes)
```
1. On Device A: Generate WAV file
2. Transfer to Device B
3. On Device A: Start microphone listening
4. On Device B: Play WAV at 50-75% volume
5. Verify message decodes correctly
```

### Scenario 5: Radio Transmission (15 minutes)
```
1. Generate WAV with your callsign
2. Connect audio interface to radio
3. Monitor frequency for clear channel
4. Transmit WAV file
5. Receive on second radio
6. Decode using microphone test
7. Verify message accuracy
```

---

## Troubleshooting

### Server Issues

**"Port 8443 already in use"**
- Stop the other server: `lsof -ti:8443 | xargs kill`
- Use a different port: `PORT=8444 npm start`

### WASM Issues

**"WASM failed to load"**
- Check file exists: `ls web/scripts/ribbit.wasm`
- Rebuild WASM: Run `build.bat`
- Use HTTPS server (not file://)
- Access via `https://localhost:8443`

### Test Issues

**"Tests never start"**
- Check System Logs for "WASM loaded successfully"
- Open browser DevTools (F12) and check Console tab

**"All tests fail"**
- Rebuild WASM with `build.bat`
- Clear browser cache and reload

### Microphone Issues

**"Microphone permission denied"**
- Check browser address bar for permission icon
- Click and allow microphone access
- Reload page if needed

**"No messages appearing"**
- Increase speaker volume to 50-75%
- Move devices closer (1-3 feet)
- Check microphone is working (test with other apps)
- Wait 2 seconds between transmissions (debouncing)

### WAV File Issues

**"WAV file doesn't decode"**
- Increase volume to 50-75%
- Reduce background noise
- Move devices closer together
- Avoid Bluetooth speakers (use wired)

**"Audio sounds distorted"**
- Reduce volume (may be clipping)
- Try different audio output device

---

## Technical Reference

### Dependencies
```
web/scripts/
├── decoder_tests.js    (Test implementation)
├── ribbit-wasm.js      (WASM API wrapper)
├── messageCodec.js     (Message encoding/decoding)
├── ribbit.js           (Emscripten glue code)
├── ribbit.wasm         (WebAssembly binary)
└── wav.js              (WAV file utilities)
```

### Server Configuration
- **Server**: Express.js HTTPS server (`web/server.js`)
- **Port**: 8443 (configurable via PORT env var)
- **SSL**: Requires `localhost.pem` and `localhost-key.pem`

### Message Validation Logic
Both tests and production use identical validation:
- ✓ Required fields present (callsign, text)
- ✓ No null bytes
- ✓ Callsign format valid (alphanumeric + /, max 20 chars)
- ✓ Text length valid (1-1000 chars)
- ✓ Less than 10% non-printable characters
- ✓ No replacement characters (�)

### Performance Characteristics

**Encoding Performance**
- Time per message: ~10-50ms
- Audio output: ~2 seconds per message (16,384 samples @ 8kHz)

**Decoding Performance**
- Time per decode: ~50-200ms
- Microphone latency: ~100-200ms from input to decode

**Memory Usage**
- With WASM loaded: ~10-20MB
- Per message buffer: ~130KB
- Display limit: Last 20 decoded messages

### Browser Requirements
- Chrome/Edge 88+
- Firefox 121+
- Safari 15.4+
- Modern mobile browsers

**Required APIs**: Web Audio API, Blob API, ES6 Modules, WASM

---

## Best Practices

### For Microphone Testing
- 🎯 Use a quiet environment to minimize background noise
- 🎯 Position devices 1-3 feet apart for initial testing
- 🎯 Set speaker volume to 50-75% for optimal signal strength
- 🎯 Avoid Bluetooth speakers (they introduce latency)
- 🎯 Use wired speakers or built-in device speakers
- 🎯 Wait 2 seconds between transmissions (debouncing window)

### For WAV File Generation
- 🎯 Keep messages under 200 characters for faster transmission
- 🎯 Use standard ASCII characters when possible
- 🎯 Include your actual callsign for radio testing
- 🎯 Use accurate gridsquare for location-based testing

### For Radio Testing
- 📻 Ensure proper amateur radio licensing before transmitting
- 📻 Start with low power and short transmissions
- 📻 Use appropriate frequency for your license class
- 📻 Monitor frequency before transmitting
- 📻 Include callsign in message for identification
- 📻 Adjust audio levels to avoid overdriving radio input

---

## Success Criteria

The decoder tests are working correctly if:

✅ Basic tests achieve 100% pass rate with 0% noise  
✅ Stress tests achieve >95% pass rate with 0% noise  
✅ Validation tests correctly identify invalid messages  
✅ Accuracy degrades gracefully with increased noise  
✅ No memory leaks during extended stress tests  
✅ Microphone test successfully decodes WAV files from another device  
✅ WAV file generator creates valid files that decode correctly  
✅ Cross-device testing works reliably at moderate volumes  

---

## Additional Resources

- **WASM API Details**: `Docs/ribbit_wasm.md`
- **Message Format Spec**: `Docs/codec.md`
- **Testing Plan**: `Docs/testing_plan.md`

---

**Version**: 1.0  
**Last Updated**: January 2026  
**Features**: Automated Tests, Microphone Live Test, WAV File Generator, Wake-up Tone
