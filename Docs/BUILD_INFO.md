# Build Information

## Emscripten SDK Version

**Version**: 4.0.8 (latest as of October 2025)
**Compiler**: emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 4.0.8
**Commit**: 70404efec4458b60b953bc8f1529f2fa112cdfd1

## Build Output

The build produces two main files in `web/scripts/`:

- `ribbit.js` (16KB) - JavaScript glue code for WebAssembly
- `ribbit.wasm` (103KB) - Compiled WebAssembly binary

## Compilation Flags

### Core Settings

- **Language**: C++17 (`-std=c++17`)
- **Optimization**: Level 3 (`-O3`) - Maximum performance optimization
- **LTO**: Enabled (`-flto`) - Link-time optimization for cross-module optimizations
- **SIMD**: Enabled (`-msimd128`) - SIMD instructions for parallel processing

### Memory Configuration

- **Initial Memory**: 16MB
- **Maximum Memory**: 64MB  
- **Stack Size**: 1MB
- **Memory Growth**: Allowed (dynamic allocation)
- **Allocator**: emmalloc (lightweight malloc implementation)

### WebAssembly Settings

- **WASM**: Enabled (`-s WASM=1`)
- **Modularize**: Enabled (`-s MODULARIZE=1`) - Creates module for easier integration
- **Environment**: Web (`-s ENVIRONMENT=web`) - Optimized for browser
- **Filesystem**: Disabled (`-s FILESYSTEM=0`) - Not needed for this application
- **Assertions**: Disabled (`-s ASSERTIONS=0`) - Removed for smaller size and better performance
- **Closure Compiler**: Disabled (`--closure 0`) - Faster builds

### Exported Functions

The following C++ functions are exported to JavaScript:

**Memory Management:**
- `_malloc` - Allocate memory
- `_free` - Free memory

**Encoder Functions:**
- `_createEncoder` - Initialize encoder
- `_destroyEncoder` - Cleanup encoder
- `_initEncoder` - Initialize encoder with message
- `_readEncoder` - Read encoded signal
- `_signal_pointer` - Get signal buffer pointer
- `_signal_length` - Get signal buffer length

**Decoder Functions:**
- `_createDecoder` - Initialize decoder
- `_destroyDecoder` - Cleanup decoder
- `_feedDecoder` - Feed audio chunk to decoder
- `_digestFeed` - Process audio buffer
- `_feed_pointer` - Get feed buffer pointer
- `_feed_length` - Get feed buffer length
- `_payload_pointer` - Get payload buffer pointer
- `_payload_length` - Get payload buffer length

**Message Functions:**
- `_message_pointer` - Get message buffer pointer
- `_message_length` - Get message buffer length

**Runtime Methods:**
- `ccall` - Call C function from JavaScript
- `cwrap` - Wrap C function for JavaScript

## Code Fixes Applied

### Complex Number Class Enhancements

Fixed compilation errors in `src/ribbit/src/dsp/complex.hh`:

1. **Added `value_type` typedef** - Required for template metaprogramming
2. **Added compound assignment operators**:
   - `operator+=` - Complex addition assignment
   - `operator-=` - Complex subtraction assignment
   - `operator*=` - Complex multiplication assignment
   - `operator/=` - Complex division assignment
   - `operator*=` (scalar) - Scalar multiplication assignment
   - `operator/=` (scalar) - Scalar division assignment

These additions ensure compatibility with modern C++ template code and DSP operations used in the FFT, Hilbert transform, and phase-shift keying implementations.

## Build Performance

The build process compiles:
- 1 main C++ source file
- Multiple DSP header libraries (FFT, filter, encoder, decoder, etc.)
- System libraries (libc, libc++, compiler_rt, etc.)
- Total compilation time: ~70-110 seconds (first build with caching)
- Subsequent builds: Much faster due to Emscripten's caching system

## Notes

- One compiler warning exists in `polar_list_decoder.hh` regarding array bounds - this is a pre-existing issue in the upstream code and does not affect functionality
- The build system uses Emscripten's caching to speed up subsequent builds
- All required system libraries are automatically built and cached by Emscripten

