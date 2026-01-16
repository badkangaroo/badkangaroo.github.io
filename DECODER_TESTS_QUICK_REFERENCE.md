# Decoder Tests - Quick Reference Card

## 🚀 Getting Started (30 seconds)

```bash
cd web && npm start
```
Open: `https://localhost:8443/decoder_tests.html`

---

## 🧪 Test Buttons

| Button | Duration | Purpose |
|--------|----------|---------|
| **Run Basic Tests** | ~10s | Quick validation (3 messages) |
| **Run Stress Test** | ~30s | Load testing (configurable count) |
| **Run Validation Tests** | ~30s | Edge cases (6 tests) |
| **Run Advanced Tests** | ~2min | Unicode, emoji, boundaries (26 tests) |

---

## 🎤 Microphone Test (Live Decoding)

### Quick Start
1. Click **"Start Listening"**
2. Play Ribbit audio from another device
3. Watch decoded messages appear
4. Click **"Stop Listening"** when done

### Settings
- **Volume**: 50-75% on playback device
- **Distance**: 1-3 feet for initial testing
- **Environment**: Quiet room recommended
- **Debounce**: 2 seconds between messages

---

## 📁 WAV File Generator

### Quick Start
1. Enter message (max 240 chars)
2. Set callsign (e.g., W1TEST)
3. Set gridsquare (e.g., FN31pr)
4. Click **"Generate & Download WAV"**
5. Optional: Click **"Play Audio"** to preview

### File Format
- **Wake-up tone**: 300ms @ 300Hz
- **Silence**: 100ms
- **Message**: Variable length
- **Tail**: 500ms silence
- **Format**: 8kHz, 16-bit mono PCM

### Filename
`YYYYMMDD_HHMMSS-CALLSIGN-GRIDSQUARE.wav`

---

## 🔄 Cross-Device Testing (5 minutes)

```
Device A (Decoder)          Device B (Player)
─────────────────          ─────────────────
1. Generate WAV    ──────→  2. Receive file
                            3. Open in player
4. Start Listening ←──────  5. Play at 50-75% volume
6. Verify decode
```

### Transfer Methods
- Email attachment
- Cloud storage (Dropbox, Google Drive)
- USB drive
- Bluetooth
- Local network

---

## 📻 Radio Testing

### Transmit
1. Generate WAV with your callsign
2. Play into radio microphone
3. Transmit on appropriate frequency
4. Wake-up tone activates VOX

### Receive
1. Start microphone listening
2. Tune radio to frequency
3. Adjust audio output level
4. Watch for decoded messages

---

## 🎛️ Test Controls

| Control | Range | Default | Purpose |
|---------|-------|---------|---------|
| **Noise Level** | 0-100% | 0% | Add noise to test robustness |
| **Messages to Send** | 1-1000 | 10 | Number of test messages |
| **Delay Between** | 0-5000ms | 500ms | Time between tests |

---

## 📊 Expected Results

| Test Type | Pass Rate | Duration |
|-----------|-----------|----------|
| Basic (0% noise) | 100% | ~10s |
| Basic (25% noise) | >90% | ~10s |
| Basic (50% noise) | >70% | ~10s |
| Stress (0% noise) | >95% | ~30s |
| Validation | Mixed | ~30s |
| Advanced | >85% | ~2min |

---

## 🐛 Quick Troubleshooting

### Microphone Not Working
- ✅ Check browser permissions (address bar icon)
- ✅ Verify microphone in system settings
- ✅ Click "Start Listening" again

### WAV File Doesn't Decode
- ✅ Increase volume to 50-75%
- ✅ Move devices closer (1-3 feet)
- ✅ Reduce background noise
- ✅ Avoid Bluetooth speakers

### No Messages Appearing
- ✅ Check signal strength (volume/distance)
- ✅ Wait 2 seconds between transmissions
- ✅ Verify message format is valid

### Tests Failing
- ✅ Rebuild WASM: `build.bat`
- ✅ Clear browser cache
- ✅ Reload page

---

## 💡 Pro Tips

### For Best Results
- 🎯 Test on same device first
- 🎯 Use wired speakers (not Bluetooth)
- 🎯 Start with 0% noise
- 🎯 Keep messages under 200 characters
- 🎯 Use quiet environment

### For Radio Testing
- 📻 Ensure proper licensing
- 📻 Start with low power
- 📻 Monitor before transmitting
- 📻 Include callsign in message
- 📻 Adjust audio levels carefully

---

## 📚 Full Documentation

| Document | Purpose |
|----------|---------|
| **DECODER_TESTS_QUICKSTART.md** | Complete quick start guide |
| **DECODER_TESTS_VERIFICATION.md** | Technical verification report |
| **DECODER_TESTS_NEW_FEATURES.md** | Detailed feature overview |
| **README.md** | Project overview |

---

## ✅ Quick Verification

Run this 1-minute test to verify everything works:

```
1. ✅ Start server: npm start
2. ✅ Open: https://localhost:8443/decoder_tests.html
3. ✅ Click "Run Basic Tests"
4. ✅ Wait ~10 seconds
5. ✅ Verify: 3 Total, 3 Passed, 100% Accuracy
```

If this passes, you're ready to go! 🎉

---

## 🆘 Need Help?

1. Check **System Logs** section on the page
2. Open browser DevTools (F12) → Console tab
3. Review **DECODER_TESTS_QUICKSTART.md** for detailed instructions
4. Check **Troubleshooting** section in documentation

---

**Quick Reference Version**: 1.0  
**Last Updated**: January 15, 2026  
**Features**: Automated Tests, Microphone Live Test, WAV File Generator
