# Wake-up Tone Feature - Decoder Tests

## Summary

Added a checkbox control to enable/disable the wake-up tone in the decoder tests page.

## Changes Made

### 1. HTML (`web/decoder_tests.html`)

**Added checkbox control:**
```html
<div class="control-group">
    <label for="useWakeupTone">
        <input type="checkbox" id="useWakeupTone" checked>
        Add Wake-up Tone (300Hz, 200ms)
    </label>
</div>
```

**Added CSS styling:**
```css
input[type="checkbox"] {
    width: 18px;
    height: 18px;
    margin-right: 8px;
    cursor: pointer;
    vertical-align: middle;
}

label:has(input[type="checkbox"]) {
    display: flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
}
```

### 2. JavaScript (`web/scripts/decoder_tests.js`)

**Added UI element reference:**
```javascript
this.elements = {
    // ... existing elements
    useWakeupTone: document.getElementById('useWakeupTone'),
    // ...
};
```

**Updated test workflow:**
```javascript
// 1. Encode
const audioBuffer = await this.ribbit.encodeMessage(text, {...});

// 2. Add wake-up tone if enabled
let processedBuffer = audioBuffer;
if (this.elements.useWakeupTone.checked) {
    processedBuffer = this.addWakeupTone(audioBuffer);
}

// 3. Add noise if requested
let testBuffer = processedBuffer;
if (noiseLevel > 0) {
    testBuffer = this.addNoise(processedBuffer, noiseLevel);
}

// 4. Decode
const decoded = await this.ribbit.decodeAudio(testBuffer);
```

**Added `addWakeupTone()` method:**
```javascript
addWakeupTone(buffer) {
    // Add a wake-up tone to ensure radio transmitters open the channel
    // Tone: 300Hz for 200ms, then 100ms silence
    const sampleRate = 8000;
    const toneFreq = 300;
    const toneDuration = 0.2; // 200ms
    const silenceDuration = 0.1; // 100ms

    const toneSamples = Math.floor(toneDuration * sampleRate);
    const silenceSamples = Math.floor(silenceDuration * sampleRate);
    const totalExtraSamples = toneSamples + silenceSamples;

    const extendedBuffer = new Float32Array(totalExtraSamples + buffer.length);

    // Generate 300Hz wake-up tone
    for (let i = 0; i < toneSamples; i++) {
        extendedBuffer[i] = Math.sin(2 * Math.PI * toneFreq * i / sampleRate);
    }

    // Copy original encoded message audio after tone and silence
    extendedBuffer.set(buffer, totalExtraSamples);

    return extendedBuffer;
}
```

## What is the Wake-up Tone?

The wake-up tone is a **300Hz sine wave** that plays for **200ms**, followed by **100ms of silence**, before the actual encoded message.

### Purpose
- **Radio Transmitter Activation**: Many radio transmitters (especially VOX-activated ones) need a moment to "wake up" and open the channel
- **Squelch Opening**: Helps receivers open their squelch circuits before the data transmission begins
- **Signal Conditioning**: Gives the audio path time to stabilize before critical data arrives

### Technical Details
- **Frequency**: 300Hz (well within voice band, easy for radios to pass)
- **Duration**: 200ms tone + 100ms silence = 300ms total preamble
- **Sample Rate**: 8000Hz (matches the encoded message sample rate)
- **Samples**: 1600 tone samples + 800 silence samples = 2400 total samples
- **Waveform**: Pure sine wave (smooth, no harmonics)
- **Phase**: Ends at zero crossing (60 complete cycles at 300Hz)

## Usage

### Default Behavior
The checkbox is **checked by default**, meaning the wake-up tone is enabled for all tests.

### To Disable
Simply uncheck the "Add Wake-up Tone (300Hz, 200ms)" checkbox before running tests.

### When to Use
- ✅ **Enable** when testing with real radio equipment
- ✅ **Enable** when simulating real-world transmission conditions
- ✅ **Enable** when testing VOX-activated transmitters
- ❌ **Disable** when testing pure decoder performance
- ❌ **Disable** when measuring encoding/decoding speed
- ❌ **Disable** when the extra 300ms is not desired

## Impact on Tests

### With Wake-up Tone Enabled
- **Audio Length**: +300ms (2400 samples) per message
- **Total Test Time**: Slightly longer due to extra audio
- **Realism**: More realistic for radio transmission scenarios
- **Decoder**: Should ignore the tone and decode the message correctly

### With Wake-up Tone Disabled
- **Audio Length**: Original encoded message only
- **Total Test Time**: Faster (300ms less per message)
- **Realism**: Pure digital signal, no preamble
- **Decoder**: Receives message immediately

## Example Test Scenarios

### Scenario 1: Radio Equipment Testing
```
✅ Enable Wake-up Tone
✅ Add 25% Noise
Run Basic Tests
→ Simulates real radio transmission with VOX activation
```

### Scenario 2: Pure Performance Testing
```
❌ Disable Wake-up Tone
❌ No Noise (0%)
Run Stress Test (1000 messages)
→ Measures raw encoder/decoder performance
```

### Scenario 3: Robustness Testing
```
✅ Enable Wake-up Tone
✅ Add 50% Noise
Run Validation Tests
→ Tests decoder resilience with realistic conditions
```

## Compatibility

The wake-up tone implementation matches the production code in `web/scripts/index.js`, ensuring consistent behavior between:
- Main application transmission
- Test suite validation
- Real-world radio usage

## Notes

- The decoder should **ignore** the wake-up tone and only decode the actual message
- The tone is prepended **before** noise is added (if noise testing is enabled)
- The tone uses the same sample rate (8000Hz) as the encoded message
- The implementation is identical to the production code for consistency

## Testing

To verify the feature works:

1. **Start the server**: `npm start` in `web/` directory
2. **Open the page**: `https://localhost:8443/decoder_tests.html`
3. **Check the checkbox**: Should be checked by default
4. **Run Basic Tests**: Should pass with 100% accuracy
5. **Uncheck the checkbox**: Disable wake-up tone
6. **Run Basic Tests again**: Should still pass with 100% accuracy
7. **Compare timing**: Tests with wake-up tone take ~300ms longer per message

## Future Enhancements

Possible improvements:
- Add configurable tone frequency (200Hz - 500Hz)
- Add configurable tone duration (100ms - 500ms)
- Add configurable silence duration (0ms - 200ms)
- Add visual indicator showing when tone is playing
- Add option to save WAV files with/without wake-up tone
- Add statistics showing impact on test duration

## Conclusion

The wake-up tone feature is now fully integrated into the decoder tests page, providing users with control over whether to include the radio-friendly preamble in their test transmissions. This makes the tests more flexible and realistic for different testing scenarios.
