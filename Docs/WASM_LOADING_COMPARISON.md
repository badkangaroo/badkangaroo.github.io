# WebAssembly Loading Methods: Direct vs Emscripten Wrapper

## Overview

There are two main approaches to loading and using WebAssembly modules:

1. **Direct Loading** - Manually instantiate the WASM and provide imports
2. **Emscripten Wrapper** - Use a generated JavaScript wrapper (what Ribbit uses)

## Method 1: Direct WASM Loading

### How It Works

```javascript
// Fetch the WASM file
const response = await fetch('module.wasm');
const buffer = await response.arrayBuffer();

// Define imports the WASM needs
const imports = {
    env: {
        memory: new WebAssembly.Memory({ initial: 256 }),
        abort: () => console.error('abort'),
        print: (value) => console.log(value)
    }
};

// Instantiate the WASM
const { instance } = await WebAssembly.instantiate(buffer, imports);

// Call exported functions
instance.exports.myFunction();
```

### Characteristics

**Pros:**
- ✓ Minimal JavaScript overhead
- ✓ Smaller total file size (no JS wrapper)
- ✓ Full control over imports
- ✓ Easier to understand the flow
- ✓ Good for simple modules

**Cons:**
- ✗ Manual memory management
- ✗ Must implement all runtime functions yourself
- ✗ No automatic standard library support
- ✗ Have to handle string conversions manually
- ✗ More boilerplate code
- ✗ Need to understand WASM import/export structure

### When to Use

- Simple WASM modules with few dependencies
- Performance-critical scenarios where every byte counts
- When you want full control over the runtime
- Educational purposes

## Method 2: Emscripten Wrapper (Ribbit's Approach)

### How It Works

```javascript
// The wrapper (ribbit.js) handles everything
const Module = await Module();

// Functions are auto-exported with _ prefix
Module._createEncoder();
Module._initEncoder();

// Memory is automatically managed
const buffer = Module.HEAP8.buffer;
const array = new Uint8Array(buffer, pointer, length);

// String conversions are handled
Module.ccall('myFunction', 'string', ['string'], ['hello']);
```

### What Emscripten Provides

The generated `ribbit.js` wrapper includes:

1. **Automatic Memory Management**
   - Initial memory allocation
   - Memory growth handling
   - HEAP view management (HEAP8, HEAPU8, HEAP32, etc.)

2. **Runtime Functions**
   - `malloc` / `free` - Memory allocation
   - `ccall` / `cwrap` - Function call helpers
   - String conversion (UTF-8 ↔ JavaScript)
   - Array passing utilities

3. **Standard Library Support**
   - C standard library functions (printf, etc.)
   - C++ standard library (if used)
   - Exception handling
   - File system emulation (optional)

4. **Environment Setup**
   - Proper import structure
   - Global object setup
   - Module initialization sequence
   - Error handling

5. **Optimization Helpers**
   - SIMD support
   - Threading support (if enabled)
   - Streaming compilation
   - Caching

### Characteristics

**Pros:**
- ✓ Everything works out of the box
- ✓ C/C++ standard library available
- ✓ Automatic memory management
- ✓ String/data conversion helpers
- ✓ Good for complex C/C++ code
- ✓ printf/console.log integration
- ✓ EM_ASM for inline JavaScript

**Cons:**
- ✗ Larger total file size (JS wrapper + WASM)
- ✗ More complex loading process
- ✗ Less control over the runtime
- ✗ Function names have `_` prefix
- ✗ Can be overkill for simple modules

### When to Use

- Porting existing C/C++ code (like Ribbit)
- Complex applications with many features
- Need standard library support
- Want automatic memory management
- Using Emscripten to compile

## Detailed Comparison

### File Size

**Direct Loading:**
```
module.wasm: 50KB
Total: 50KB
```

**Emscripten Wrapper:**
```
ribbit.js: 16KB (compressed wrapper)
ribbit.wasm: 103KB (includes runtime)
Total: 119KB
```

The wrapper adds overhead, but provides much more functionality.

### Memory Access

**Direct Loading:**
```javascript
// Manual memory management
const memory = instance.exports.memory;
const buffer = memory.buffer;
const view = new Uint8Array(buffer);

// Manual allocation
const ptr = instance.exports.malloc(100);
view[ptr] = 42;
instance.exports.free(ptr);
```

**Emscripten Wrapper:**
```javascript
// Automatic views
Module.HEAPU8[address] = 42;
Module.HEAP32[address >> 2] = 12345;
Module.HEAPF32[address >> 2] = 3.14;

// Managed allocation
const ptr = Module._malloc(100);
Module._free(ptr);
```

### String Handling

**Direct Loading:**
```javascript
// Manual UTF-8 encoding
function writeString(view, ptr, str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    view.set(bytes, ptr);
    view[ptr + bytes.length] = 0; // null terminator
}

// Manual decoding
function readString(view, ptr) {
    let end = ptr;
    while (view[end] !== 0) end++;
    const bytes = view.subarray(ptr, end);
    return new TextDecoder().decode(bytes);
}
```

**Emscripten Wrapper:**
```javascript
// Built-in helpers
const str = Module.UTF8ToString(ptr);
Module.stringToUTF8(str, ptr, maxLength);

// High-level API
Module.ccall('myFunc', 'string', ['string'], ['hello']);
```

### Function Imports

**Direct Loading:**
```javascript
const imports = {
    env: {
        // Must implement every import manually
        __assert_fail: (cond, file, line, func) => { /* ... */ },
        abort: () => { /* ... */ },
        emscripten_memcpy_js: (dst, src, num) => { /* ... */ },
        fd_write: (fd, iov, iovcnt, pnum) => { /* ... */ },
        // ... many more
    }
};
```

**Emscripten Wrapper:**
```javascript
// All handled internally by ribbit.js
// You don't see or manage these imports
```

### Function Exports

**Direct Loading:**
```javascript
// Functions exported exactly as named
exports.createEncoder();
exports.feedDecoder();
exports.feed_pointer();
```

**Emscripten Wrapper:**
```javascript
// Functions prefixed with underscore
Module._createEncoder();
Module._feedDecoder();
Module._feed_pointer();
```

## Why Ribbit Uses Emscripten Wrapper

### Complex C++ Codebase

Ribbit's C++ code uses:
- C++ standard library (templates, vectors, etc.)
- DSP classes with complex templates
- Standard math functions
- printf for debugging
- Dynamic memory allocation

All of these require runtime support that Emscripten provides.

### EM_ASM Integration

The Ribbit code uses `EM_ASM` for callbacks:

```cpp
// In ribbit.cc
EM_ASM({ encoderCreated($0); }, (int)encoder);
EM_ASM({ fetchDecoded($0); }, outputresult);
```

These allow C++ to call JavaScript functions directly. With direct loading, you'd need to:
1. Export the C++ function
2. Call it from JavaScript
3. Pass callbacks through function pointers
4. Much more complex!

### Standard Library Usage

Ribbit uses standard C/C++ features:

```cpp
#include <stdio.h>      // printf
#include <algorithm>    // std::min
#include <cmath>        // sqrt, sin, cos
```

Direct WASM loading would require:
- Implementing all these functions in JavaScript
- Or compiling a custom libc
- Much more work!

## Performance Comparison

### Load Time

**Direct Loading:**
- Faster initial load (smaller file)
- Instant instantiation

**Emscripten Wrapper:**
- Slightly slower load (larger files)
- ~100ms initialization overhead
- Caching helps on subsequent loads

### Runtime Performance

Both methods have similar runtime performance:
- WASM code executes at near-native speed
- JavaScript wrapper overhead is minimal
- Main performance is in the WASM code itself

### Memory Usage

**Direct Loading:**
- Lower base memory (no runtime)
- Manual management = potential leaks

**Emscripten Wrapper:**
- Higher base memory (~1-2MB runtime)
- Automatic management = safer
- Memory growth handled automatically

## Migration Example

Here's how the Ribbit test code changed:

### Before (Attempted Direct Loading - FAILED)

```javascript
const wasmImports = {
    env: {
        __assert_fail: () => {},
        abort: () => {},
        // ... 10+ more functions
    }
};

const response = await fetch('ribbit.wasm');
const buffer = await response.arrayBuffer();
const { instance } = await WebAssembly.instantiate(buffer, {
    env: wasmImports,
    wasi_snapshot_preview1: wasmImports
});

// ERROR: Import #0 "a": module is not an object or function
// The WASM expects specific import structure we can't easily provide
```

### After (Using Emscripten - WORKS)

```javascript
// Load the wrapper
const Module = await Module();

// Everything just works
Module._createEncoder();
Module._createDecoder();

const feedPtr = Module._feed_pointer();
const buffer = Module.HEAP8.buffer;
```

## Build Configuration Impact

### For Direct Loading

Would need to compile with:
```bash
emcc code.c -o module.wasm \
    -s STANDALONE_WASM=1 \      # No JS wrapper
    -s EXPORTED_FUNCTIONS=[]    # Manual exports only
```

### For Emscripten Wrapper (Current)

Compiled with:
```bash
emcc code.cc -o ribbit.js \
    -s WASM=1 \                 # Generate WASM + JS
    -s MODULARIZE=1 \           # Module() function
    -s EXPORTED_FUNCTIONS=[...] # Auto-wrapped exports
```

## When Would You Use Direct Loading?

Direct loading makes sense for:

1. **Simple calculations** - No standard library needed
   ```c
   // Simple module
   int add(int a, int b) { return a + b; }
   int multiply(int a, int b) { return a * b; }
   ```

2. **No memory allocation** - Fixed buffers only
   ```c
   // No malloc/free needed
   static float buffer[1024];
   ```

3. **Rust/AssemblyScript** - Languages with their own runtimes
   ```rust
   // Rust has its own memory management
   #[no_mangle]
   pub extern "C" fn process(data: i32) -> i32 {
       data * 2
   }
   ```

4. **Size-critical scenarios** - Every KB matters
   - IoT devices
   - Embedded systems
   - Ultra-fast loading required

## Conclusion

**Ribbit uses the Emscripten wrapper because:**

1. ✓ Complex C++ codebase with DSP algorithms
2. ✓ Needs C++ standard library (templates, STL)
3. ✓ Uses EM_ASM for JavaScript callbacks
4. ✓ Requires printf for debugging
5. ✓ Needs dynamic memory allocation
6. ✓ Benefits from automatic memory management
7. ✓ The ~16KB wrapper overhead is acceptable

**The wrapper provides:**
- Automatic standard library support
- Memory management
- String conversions
- JavaScript integration
- Error handling
- Much less manual code

For a complex audio processing application like Ribbit, the Emscripten wrapper is the right choice. The overhead is minimal compared to the functionality it provides.

## Further Reading

- [Emscripten Documentation](https://emscripten.org/)
- [WebAssembly.org](https://webassembly.org/)
- [MDN WebAssembly Guide](https://developer.mozilla.org/en-US/docs/WebAssembly)
- Our docs: [BUILD_INFO.md](BUILD_INFO.md), [WASM_TROUBLESHOOTING.md](web/WASM_TROUBLESHOOTING.md)

