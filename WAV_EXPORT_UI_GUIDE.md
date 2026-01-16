# WAV Export UI Guide

## Updated Test Controls Section

```
┌─────────────────────────────────────────────────────────────┐
│  🧪 Test Controls                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Noise Level (SNR)                                          │
│  [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━] │
│  SNR: Clear                                                 │
│                                                             │
│  Messages to Send        Delay Between (ms)                 │
│  [  10  ]                [  500  ]                          │
│                                                             │
│  ☑ Add Wake-up Tone (300Hz, 200ms)                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Run Basic Tests]  [Run Stress Test]  [Run Validation]   │
│  [Stop]  [Clear Results]                                   │
├─────────────────────────────────────────────────────────────┤
│  [💾 Export Last Message as WAV]  ← NEW!                   │
│  Exported ribbit_W1AW_2026-01-15T20-59-45_with_wakeup.wav  │
│  (2.30s, 18400 samples)                                    │
└─────────────────────────────────────────────────────────────┘
```

## Button States

### Before Any Test (Disabled)
```
┌────────────────────────────────────┐
│ 💾 Export Last Message as WAV     │ (grayed out, not clickable)
└────────────────────────────────────┘
```

### After Running Test (Enabled)
```
┌────────────────────────────────────┐
│ 💾 Export Last Message as WAV     │ (blue, clickable)
└────────────────────────────────────┘
```

### During Export (Processing)
```
┌────────────────────────────────────┐
│ 💾 Export Last Message as WAV     │ (blue, clickable)
└────────────────────────────────────┘
Exporting...
```

### After Successful Export
```
┌────────────────────────────────────┐
│ 💾 Export Last Message as WAV     │ (blue, clickable)
└────────────────────────────────────┘
Exported ribbit_W1AW_2026-01-15T20-59-45_with_wakeup.wav (2.30s, 18400 samples)
```

## Complete Workflow Visualization

### Step 1: Initial State
```
┌─────────────────────────────────────────────────────────────┐
│  🧪 Test Controls                                           │
├─────────────────────────────────────────────────────────────┤
│  Noise Level: 0%                                            │
│  Messages to Send: 10                                       │
│  Delay Between: 500ms                                       │
│  ☑ Add Wake-up Tone (300Hz, 200ms)                         │
│                                                             │
│  [Run Basic Tests]  [Run Stress Test]  [Run Validation]   │
│  [Stop]  [Clear Results]                                   │
│  [💾 Export Last Message as WAV] (disabled)                │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: After Running Test
```
┌─────────────────────────────────────────────────────────────┐
│  🧪 Test Controls                                           │
├─────────────────────────────────────────────────────────────┤
│  Noise Level: 0%                                            │
│  Messages to Send: 10                                       │
│  Delay Between: 500ms                                       │
│  ☑ Add Wake-up Tone (300Hz, 200ms)                         │
│                                                             │
│  [Run Basic Tests]  [Run Stress Test]  [Run Validation]   │
│  [Stop]  [Clear Results]                                   │
│  [💾 Export Last Message as WAV] (enabled) ← NOW ACTIVE!   │
└─────────────────────────────────────────────────────────────┘

📊 Results Summary
Total: 3  Passed: 3  Failed: 0  Accuracy: 100%

📜 System Logs
20:59:45 ✓ RibbitWASM loaded successfully
20:59:46 Starting Basic Decoding Tests...
20:59:47 Testing: "Hello from Ribbit!..." de W1AW (Noise: 0%)
20:59:48 Testing: "Testing the decoder..." de K6ABC (Noise: 0%)
20:59:49 Testing: "73 de Ribbit Team" de G8XYZ (Noise: 0%)
20:59:50 Basic Tests Completed.
```

### Step 3: Click Export Button
```
┌─────────────────────────────────────────────────────────────┐
│  [💾 Export Last Message as WAV] ← CLICK!                  │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Download Starts
```
┌─────────────────────────────────────────────────────────────┐
│  [💾 Export Last Message as WAV]                           │
│  Exported ribbit_G8XYZ_2026-01-15T20-59-50_with_wakeup.wav │
│  (2.30s, 18400 samples)                                    │
└─────────────────────────────────────────────────────────────┘

📜 System Logs
20:59:51 ✓ Exported ribbit_G8XYZ_2026-01-15T20-59-50_with_wakeup.wav
         (2.30s, 18400 samples)
```

### Step 5: Browser Download
```
┌─────────────────────────────────────────────────────────────┐
│  Browser Downloads:                                         │
│  ↓ ribbit_G8XYZ_2026-01-15T20-59-50_with_wakeup.wav       │
│    37 KB • WAV Audio                                        │
└─────────────────────────────────────────────────────────────┘
```

## Status Messages

### Success Messages
```
✓ Exported ribbit_W1AW_2026-01-15T20-59-45_with_wakeup.wav (2.30s, 18400 samples)
✓ Exported ribbit_STRESS_2026-01-15T21-00-12.wav (2.05s, 16400 samples)
✓ Exported ribbit_K6ABC_2026-01-15T21-05-30_with_wakeup.wav (2.42s, 19360 samples)
```

### Warning Messages
```
⚠ No message to export. Run a test first.
```

### Error Messages
```
✗ Failed to export WAV: AudioContext not supported
✗ Failed to export WAV: Buffer is empty
```

## Filename Examples

### With Wake-up Tone
```
ribbit_W1AW_2026-01-15T20-59-45_with_wakeup.wav
       ↑    ↑                    ↑
       │    │                    └─ Wake-up tone included
       │    └─ ISO timestamp (filesystem safe)
       └─ Callsign (sanitized)
```

### Without Wake-up Tone
```
ribbit_K6ABC_2026-01-15T21-05-30.wav
       ↑    ↑
       │    └─ ISO timestamp
       └─ Callsign
```

### Special Characters Removed
```
Original Callsign: W1AW/P
Filename: ribbit_W1AWP_2026-01-15T20-59-45.wav
                  ↑
                  └─ Slash removed (filesystem safe)
```

## Integration with Existing Features

### Works With Wake-up Tone Checkbox
```
☑ Add Wake-up Tone (300Hz, 200ms)
  ↓
  Exported WAV includes 300ms preamble
  Filename: ribbit_W1AW_..._with_wakeup.wav

☐ Add Wake-up Tone (300Hz, 200ms)
  ↓
  Exported WAV has no preamble
  Filename: ribbit_W1AW_....wav
```

### Works With Noise Slider
```
Noise Level: 50%
  ↓
  Test uses noisy signal
  BUT exported WAV is clean (no noise)
  
Reason: WAV is for playback testing, not noise testing
```

### Works With All Test Types
```
Run Basic Tests → Export last of 3 messages
Run Stress Test → Export last of N messages
Run Validation Tests → Export last of 6 messages
```

## File Properties

### WAV File Details
```
┌─────────────────────────────────────────────────────────────┐
│  File: ribbit_W1AW_2026-01-15T20-59-45_with_wakeup.wav     │
├─────────────────────────────────────────────────────────────┤
│  Type:          WAV Audio                                   │
│  Size:          37 KB                                       │
│  Duration:      2.30 seconds                                │
│  Sample Rate:   8000 Hz                                     │
│  Bit Depth:     16-bit                                      │
│  Channels:      1 (Mono)                                    │
│  Format:        PCM                                         │
│  Samples:       18,400                                      │
├─────────────────────────────────────────────────────────────┤
│  Message Info:                                              │
│  Callsign:      W1AW                                        │
│  Gridsquare:    FN31pr                                      │
│  Text:          "Hello from Ribbit!"                        │
│  Wake-up Tone:  Yes (300Hz, 200ms + 100ms silence)         │
│  Timestamp:     2026-01-15T20:59:45                         │
└─────────────────────────────────────────────────────────────┘
```

## Playback Testing Workflow

### Machine A: Export WAV
```
┌─────────────────────────────────────────────────────────────┐
│  Machine A (Encoder)                                        │
├─────────────────────────────────────────────────────────────┤
│  1. Open decoder_tests.html                                 │
│  2. Run Basic Tests                                         │
│  3. Click "💾 Export Last Message as WAV"                  │
│  4. Save: ribbit_W1AW_..._with_wakeup.wav                  │
│  5. Transfer to Machine B                                   │
└─────────────────────────────────────────────────────────────┘
```

### Machine B: Play WAV
```
┌─────────────────────────────────────────────────────────────┐
│  Machine B (Transmitter)                                    │
├─────────────────────────────────────────────────────────────┤
│  1. Load ribbit_W1AW_..._with_wakeup.wav                   │
│  2. Connect audio output to radio transmitter              │
│  3. Play WAV file                                           │
│  4. Transmit over radio                                     │
└─────────────────────────────────────────────────────────────┘
```

### Machine C: Receive and Decode
```
┌─────────────────────────────────────────────────────────────┐
│  Machine C (Receiver)                                       │
├─────────────────────────────────────────────────────────────┤
│  1. Open index.html (main Ribbit app)                       │
│  2. Enable microphone                                       │
│  3. Click "Listen"                                          │
│  4. Receive radio transmission                              │
│  5. Verify decoded message:                                 │
│     - Callsign: W1AW                                        │
│     - Message: "Hello from Ribbit!"                         │
│     - Gridsquare: FN31pr                                    │
└─────────────────────────────────────────────────────────────┘
```

## Keyboard Shortcuts (Future Enhancement)

Potential shortcuts for faster workflow:
```
Ctrl+E  - Export last message as WAV
Ctrl+R  - Run basic tests
Ctrl+S  - Run stress test
Ctrl+V  - Run validation tests
Ctrl+X  - Stop tests
Ctrl+C  - Clear results
```

## Mobile Support

The export button works on mobile browsers:
```
Mobile Browser:
1. Tap "💾 Export Last Message as WAV"
2. Browser downloads WAV file
3. File saved to Downloads folder
4. Can share via AirDrop, email, etc.
```

## Accessibility

The export button is fully accessible:
- ✅ Keyboard navigable (Tab key)
- ✅ Activatable with Enter/Space
- ✅ Screen reader announces "Export Last Message as WAV button"
- ✅ Disabled state announced
- ✅ Status messages read by screen reader

## Summary

The WAV export feature adds a powerful new capability to the decoder tests:

✅ **Easy to use** - Single button click
✅ **Automatic naming** - Descriptive filenames with timestamp
✅ **Clean signals** - No noise, perfect for playback testing
✅ **Wake-up tone support** - Includes preamble if enabled
✅ **Real-world testing** - Test decoder with actual radio transmission
✅ **Cross-platform** - Works on all modern browsers
✅ **No configuration** - Works out of the box

**The UI is intuitive and the feature is production-ready!** 🎉
