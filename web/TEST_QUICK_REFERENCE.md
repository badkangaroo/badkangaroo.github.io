# Ribbit WASM Test Suite - Quick Reference

## Starting the Test Server

### Windows
```bash
run_tests.bat
```

### Linux/Mac
```bash
./run_tests.sh
```

### URL
```
http://localhost:8000/web/wasm_tests.html
```

## Test Modes

| Mode | Description | Time | Test Count |
|------|-------------|------|------------|
| **Quick Test** | Single encode/decode cycle | ~2s | 1 test |
| **All Tests** | Comprehensive test suite | ~10s | 5 tests |
| **Stress Test** | Multiple iterations | ~30s | 10 tests |
| **Manual Test** | Custom message testing | Variable | Custom |

## Message Format

```
Name|Callsign|Gridsquare|Phone&=Message
```

### Example
```
Test|KO6BVA|FN42kl|555-1234&=Hello World
```

## Quick Test Procedure

1. Click **"Run Quick Test"**
2. Wait ~2 seconds
3. Check results (green = pass, red = fail)
4. Review test summary

## Manual Test Procedure

1. Enter message in text box
2. Click **"Encode to Audio"**
3. Play audio (optional)
4. Click **"Save as WAV"** or **"Decode"**
5. Verify results

## Result Indicators

| Color | Type | Meaning |
|-------|------|---------|
| 🟢 Green | PASS | Test succeeded |
| 🔴 Red | FAIL | Test failed |
| 🟡 Yellow | WARNING | Non-critical issue |
| 🔵 Blue | INFO | Information |

## Common Commands

### View Test Page
```bash
# Browser URL
http://localhost:8000/web/wasm_tests.html
```

### View Main App
```bash
# Browser URL
http://localhost:8000/web/index.html
```

### Stop Server
```
Press Ctrl+C in terminal
```

## File Locations

```
web/
├── wasm_tests.html          # Test page
├── TESTING.md               # Full documentation
├── TEST_QUICK_REFERENCE.md  # This file
└── scripts/
    ├── wasm_tests.js        # Test logic
    ├── wav.js               # WAV encoding
    └── ribbit.wasm          # WASM module
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| F5 | Refresh page |
| F12 | Open developer console |
| Ctrl+R | Reload tests |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Page won't load | Check if server is running |
| WASM error | Clear cache and reload (Ctrl+Shift+R) |
| No audio | Click page first (autoplay policy) |
| Decode fails | Check sample rate is 8000 Hz |

## Expected Test Times

- Module load: ~1s
- Single encode: <100ms
- Single decode: ~500ms
- WAV save: <100ms
- WAV load: Variable

## Audio Specifications

- **Sample Rate**: 8000 Hz
- **Channels**: 1 (Mono)
- **Duration**: ~2.05 seconds
- **Format**: 16-bit PCM or 32-bit Float

## Test Success Criteria

✓ WASM module loads  
✓ Encoder creates audio  
✓ Audio plays correctly  
✓ WAV file saves/loads  
✓ Decoder recovers message  
✓ Message matches original  

## Getting Help

1. Check console (F12) for errors
2. Review [web/TESTING.md](TESTING.md)
3. Check [BUILD_INFO.md](../BUILD_INFO.md)
4. Review [README.md](../README.md)

## Version Info

- Test Suite Version: 1.0
- WASM Version: Check BUILD_INFO.md
- Emscripten: 4.0.8

---

**Quick Link**: http://localhost:8000/web/wasm_tests.html

