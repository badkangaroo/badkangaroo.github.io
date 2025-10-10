# Emscripten Runtime Methods Export Fix

## Problem
When using `MODULARIZE=1` in Emscripten, many runtime helper functions are not automatically available. This caused errors like:
```
TypeError: this.Module.stringToUTF8 is not a function
```

## Solution
Add string utility functions to `EXPORTED_RUNTIME_METHODS` in `build.bat`:

```batch
-s EXPORTED_RUNTIME_METHODS=['ccall','cwrap','stringToUTF8','UTF8ToString','lengthBytesUTF8']
```

## Runtime Methods Exported

| Method | Purpose | Usage in Ribbit |
|--------|---------|----------------|
| `ccall` | Call C++ functions with type conversion | General WASM function calls |
| `cwrap` | Wrap C++ functions for repeated use | Function wrappers |
| `stringToUTF8` | Write JS string to WASM memory as UTF-8 | Passing strings to C++ (callsign, names, messages) |
| `UTF8ToString` | Read UTF-8 string from WASM memory | Getting strings from C++ |
| `lengthBytesUTF8` | Calculate UTF-8 byte length | Buffer size calculations |

## How It Works

### Before Export (Error)
```javascript
// Trying to use stringToUTF8 without export
Module.stringToUTF8(text, bufferPtr, maxLength);
// ❌ Error: Module.stringToUTF8 is not a function
```

### After Export (Working)
```javascript
// Now stringToUTF8 is available on the Module
Module.stringToUTF8(text, bufferPtr, maxLength);
// ✅ Works! String is written to WASM memory
```

## Example Usage in message_format.js

```javascript
// Encode a contest message
encodeContestMode(data) {
    const callsignPtr = this.Module._malloc(9);
    
    // Write string to WASM memory (now works!)
    this.Module.stringToUTF8(data.callsign, callsignPtr, 9);
    
    // Call C++ function
    const bytesWritten = this.Module._pack_contest_message(
        this.outputBufferPtr,
        callsignPtr,
        // ... other params
    );
    
    this.Module._free(callsignPtr);
    return bytesWritten;
}
```

## Common Emscripten Runtime Methods

Here are other useful methods you might need to export in the future:

| Method | Purpose |
|--------|---------|
| `getValue` | Read value from WASM memory |
| `setValue` | Write value to WASM memory |
| `allocate` | Allocate memory array |
| `intArrayFromString` | Convert string to int array |
| `ALLOC_NORMAL` | Memory allocation constant |
| `addFunction` | Add JS function to function table |
| `removeFunction` | Remove JS function from table |
| `FS` | File system API (if enabled) |

## When to Add More Exports

Add methods to `EXPORTED_RUNTIME_METHODS` when you see errors like:
- `Module.X is not a function`
- `Module.X is undefined`
- When using Emscripten utilities in JavaScript

## Important Notes

1. **Only export what you need** - Each export increases WASM size slightly
2. **String functions are essential** - Most JS↔C++ interactions need these
3. **Memory management** - Always pair `_malloc` with `_free`
4. **UTF-8 encoding** - All C++ strings should be UTF-8 encoded

## Testing the Fix

1. **Build**: `build.bat`
2. **Serve**: `run_tests.bat` or `python -m http.server`
3. **Open**: `http://localhost:8000/web/message_format_demo.html`
4. **Test**: Click "Encode Message" button
5. **Verify**: No errors in console, hex output appears

## Related Files

- `build.bat` - Build configuration with exports
- `web/scripts/message_format.js` - Uses string functions
- `web/message_format_demo.html` - Test page
- `src/ribbit/include/message_format.hh` - C++ interface
- `src/ribbit/src/message_format.cc` - C++ implementation

## References

- [Emscripten Runtime API](https://emscripten.org/docs/api_reference/preamble.js.html)
- [Interacting with Code](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html)
- [MODULARIZE Settings](https://emscripten.org/docs/getting_started/FAQ.html#what-does-modularize-do-and-why-do-i-need-it)

