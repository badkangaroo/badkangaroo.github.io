# WASM Loading Fix - Summary

## Problem

The test page was failing to load the WASM module with this error:
```
TypeError: WebAssembly.instantiate(): Import #0 "a": module is not an object or function
```

## Root Cause

The test code was trying to load the WASM file directly using `WebAssembly.instantiate()`, but the Emscripten build creates a specific module structure that requires using the JavaScript wrapper (`ribbit.js`).

## Files Fixed

### 1. `web/wasm_tests.html`
**Changed**: Added script tag to load ribbit.js
```html
<!-- Before -->
<script src="scripts/wav.js"></script>
<script src="scripts/wasm_tests.js"></script>

<!-- After -->
<script src="scripts/wav.js"></script>
<script src="scripts/ribbit.js"></script>      <!-- Added -->
<script src="scripts/wasm_tests.js"></script>
```

### 2. `web/scripts/wasm_tests.js`
**Changed**: Updated WASM loading to use Emscripten Module API

**Before** (Manual WASM instantiation):
```javascript
const wasmImports = { /* custom imports */ };
const response = await fetch('./scripts/ribbit.wasm');
const wasmBinary = await response.arrayBuffer();
const result = await WebAssembly.instantiate(wasmBinary, {
    env: wasmImports,
    wasi_snapshot_preview1: wasmImports
});
wasmExports = result.instance.exports;
```

**After** (Using Module API):
```javascript
// Set up required callbacks
window.encoderCreated = () => { /* ... */ };
window.decoderCreated = () => { /* ... */ };
// ... other callbacks ...

// Load the Module
const moduleInstance = await Module();
wasmExports = moduleInstance;
```

**Changed**: All function calls now use underscore prefix
```javascript
// Before
wasmExports.createEncoder();
wasmExports.initEncoder();
wasmExports.digestFeed();

// After
moduleInstance._createEncoder();
moduleInstance._initEncoder();
moduleInstance._digestFeed();
```

## Documentation Added

1. **`web/WASM_TROUBLESHOOTING.md`** - Comprehensive troubleshooting guide
   - Common errors and solutions
   - Correct vs incorrect loading methods
   - Module API reference
   - Required callbacks

2. **Updated `web/TESTING.md`** - Added troubleshooting note
   - Clarified that web server is required (not optional)
   - Added link to troubleshooting guide

## Why This Fix Works

### Emscripten Module System

When you build with `-s MODULARIZE=1`, Emscripten creates:

1. **`ribbit.js`** - JavaScript wrapper that:
   - Handles WASM instantiation
   - Sets up imports correctly
   - Manages memory
   - Exports functions with underscore prefix

2. **`ribbit.wasm`** - The actual WebAssembly binary
   - Uses minified import names (e.g., "a" instead of "env")
   - Requires specific import structure

### Module() Function

The `Module()` function (from ribbit.js):
- Returns a Promise
- Resolves when WASM is ready
- Provides all exported functions
- Manages HEAP memory views

## Testing the Fix

1. **Clear browser cache**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. **Start the test server**:
   ```bash
   run_tests.bat  # Windows
   ./run_tests.sh # Linux/Mac
   ```
3. **Open test page**: http://localhost:8000/web/wasm_tests.html
4. **Check console**: Should see "✓ WASM module loaded successfully"

## Expected Output

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

## Key Takeaways

1. ✓ Always use `ribbit.js` to load the WASM module
2. ✓ Call functions with underscore prefix (`_functionName`)
3. ✓ Set up required callbacks before loading
4. ✓ Use a web server (MIME types matter)
5. ✓ Access memory via `Module.HEAP8.buffer`

## Related Build Settings

From `build.bat`:
```bash
-s MODULARIZE=1         # Creates Module() function
-s EXPORT_ES6=0         # var Module = ... format
-s ENVIRONMENT=web      # Browser environment
-s EXPORTED_FUNCTIONS=[ # List all functions
    '_malloc', '_free',
    '_createEncoder', '_createDecoder',
    # ... etc
]
```

## Status

✅ **FIXED** - The test page now correctly loads and uses the WASM module through the Emscripten Module API.

## Additional Resources

- [web/WASM_TROUBLESHOOTING.md](web/WASM_TROUBLESHOOTING.md) - Detailed troubleshooting
- [web/TESTING.md](web/TESTING.md) - Testing guide
- [BUILD_INFO.md](BUILD_INFO.md) - Build configuration

