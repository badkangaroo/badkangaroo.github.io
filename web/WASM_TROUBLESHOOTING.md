# WASM Loading Troubleshooting Guide

## Common WASM Loading Errors

### Error: "Import #0 'a': module is not an object or function"

**Cause**: Trying to load the WASM file directly instead of using the Emscripten Module wrapper.

**Solution**: The test page now correctly loads `ribbit.js` which handles WASM loading internally.

**What Changed**:
- ✓ Added `<script src="scripts/ribbit.js"></script>` before the test script
- ✓ Updated test code to use `Module()` API
- ✓ Changed all function calls to use underscore prefix (e.g., `_createEncoder()`)

### Error: "Failed to fetch ribbit.wasm"

**Cause**: File not found or incorrect path.

**Solution**: 
1. Verify files exist:
   ```bash
   ls web/scripts/ribbit.*
   ```
   Should show: `ribbit.js` and `ribbit.wasm`

2. Check you're using a web server (not file://)

### Error: "WASM streaming compile failed"

**Cause**: Incorrect MIME type when serving WASM file.

**Solution**: Use a proper web server that sets correct MIME types:
```bash
# Use our test runner
run_tests.bat  # Windows
./run_tests.sh # Linux/Mac
```

### Error: "Module is not defined"

**Cause**: `ribbit.js` didn't load before `wasm_tests.js`.

**Solution**: Check script loading order in HTML:
```html
<script src="scripts/wav.js"></script>
<script src="scripts/ribbit.js"></script>  <!-- Must be before wasm_tests.js -->
<script src="scripts/wasm_tests.js"></script>
```

## WASM Module API

The Emscripten-compiled WASM module exports functions with underscore prefixes:

### Memory Pointers
```javascript
Module._feed_pointer()      // Get feed buffer pointer
Module._feed_length()        // Get feed buffer length
Module._message_pointer()    // Get message buffer pointer
Module._message_length()     // Get message buffer length
Module._signal_pointer()     // Get signal buffer pointer
Module._signal_length()      // Get signal buffer length
Module._payload_pointer()    // Get payload buffer pointer
Module._payload_length()     // Get payload buffer length
```

### Encoder Functions
```javascript
Module._createEncoder()      // Create encoder instance
Module._destroyEncoder()     // Destroy encoder instance
Module._initEncoder()        // Initialize encoder with message
Module._readEncoder()        // Read encoded signal
```

### Decoder Functions
```javascript
Module._createDecoder()      // Create decoder instance
Module._destroyDecoder()     // Destroy decoder instance
Module._digestFeed()         // Process audio chunk
```

## Loading the Module

### Correct Way (Current Implementation)
```javascript
// Wait for Module to be available
const moduleInstance = await Module();

// Access functions
moduleInstance._createEncoder();
moduleInstance._createDecoder();

// Get buffer pointers
const feedPtr = moduleInstance._feed_pointer();
const feedLen = moduleInstance._feed_length();
```

### Incorrect Way (Don't Do This)
```javascript
// DON'T try to load WASM directly
const response = await fetch('ribbit.wasm');
const wasmBinary = await response.arrayBuffer();
const result = await WebAssembly.instantiate(wasmBinary, ...); // ❌ Wrong!
```

## Callbacks Required

The Module expects these global callbacks to be defined:

```javascript
window.encoderCreated = (ptr) => { /* Called when encoder is created */ };
window.decoderCreated = (ptr) => { /* Called when decoder is created */ };
window.encoderDestroyed = () => { /* Called when encoder is destroyed */ };
window.decoderDestroyed = () => { /* Called when decoder is destroyed */ };
window.readEncoded = (length) => { /* Called when signal is ready */ };
window.fetchDecoded = (result) => { /* Called when message is decoded */ };
window.encoderCreatedError = () => { /* Called if encoder creation fails */ };
window.encoderReadError = () => { /* Called if encoder read fails */ };
```

## Memory Access

Access WASM memory through the Module's HEAP views:

```javascript
const memory = moduleInstance.HEAP8.buffer;

// Create typed array views
const feedBuffer = new Float32Array(memory, feedPtr, feedLen);
const messageBuffer = new Uint8Array(memory, msgPtr, msgLen);
```

## Build Configuration

The WASM module is compiled with these settings (from `build.bat`):

```bash
-s MODULARIZE=1        # Creates Module() function
-s EXPORT_ES6=0        # Uses var Module = ... format
-s ENVIRONMENT=web     # Web browser environment
-s EXPORTED_FUNCTIONS=[_malloc, _free, _createEncoder, ...]
```

## Testing the Fix

1. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Restart the web server**
3. **Reload the test page**: http://localhost:8000/web/wasm_tests.html
4. **Check console for errors** (F12)

### Expected Console Output
```
Loading Ribbit WASM module...
✓ WASM module loaded successfully
Feed buffer: 2048 samples
Message buffer: 256 bytes
Signal buffer: 16384 samples
Payload buffer: 256 bytes
AudioContext created (8000 Hz)
✓ Encoder and decoder created
```

## Still Having Issues?

1. **Check browser console** (F12) for detailed error messages
2. **Verify file locations**:
   ```
   web/
   ├── wasm_tests.html
   └── scripts/
       ├── ribbit.js (15KB)
       ├── ribbit.wasm (103KB)
       ├── wav.js
       └── wasm_tests.js
   ```

3. **Rebuild WASM** if files are old:
   ```bash
   build.bat  # Windows
   ```

4. **Try a different browser** (Chrome, Firefox, Edge recommended)

5. **Check WASM support**:
   ```javascript
   console.log('WebAssembly supported:', typeof WebAssembly === 'object');
   ```

## Browser Compatibility

WASM and Module loading require:
- ✓ Chrome/Chromium 57+
- ✓ Firefox 52+
- ✓ Safari 11+
- ✓ Edge 79+

## Related Documentation

- [TESTING.md](TESTING.md) - Main testing guide
- [BUILD_INFO.md](../BUILD_INFO.md) - Build configuration details
- [README.md](../README.md) - Project overview

