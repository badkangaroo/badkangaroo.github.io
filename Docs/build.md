# Build Guide

## Overview

Ribbit uses Emscripten to compile C++ DSP code into WebAssembly for web browser execution. The build process creates two main output files in `web/scripts/`:

- `ribbit.js` (16KB) - JavaScript glue code and WebAssembly loader
- `ribbit.wasm` (103KB) - Compiled WebAssembly binary

## Prerequisites

### Emscripten SDK

Install the Emscripten SDK (version 4.0.8 or later):

**Windows:**
```bash
# Clone and setup emsdk
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
emsdk install latest
emsdk activate latest
```

**macOS/Linux:**
```bash
# Clone and setup emsdk
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest

# Add to your shell profile
echo 'source "/path/to/emsdk/emsdk_env.sh"' >> $HOME/.bash_profile
```

## Build Process

### Automated Build (Windows)

Run the build script:
```bash
build.bat
```

### Manual Build

1. Activate Emscripten environment:
```bash
# Windows
call emsdk\emsdk_env.bat

# macOS/Linux
source emsdk/emsdk_env.sh
```

2. Compile with Emscripten:
```bash
emcc src/ribbit/src/ribbit.cc src/ribbit/src/message_format.cc -o web/scripts/ribbit.js \
    -s WASM=1 \
    -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap','stringToUTF8','UTF8ToString','lengthBytesUTF8'] \
    -s EXPORTED_FUNCTIONS=['_malloc','_free','_createEncoder','_destroyEncoder','_createDecoder','_destroyDecoder','_feed_pointer','_feed_length','_message_pointer','_message_length','_signal_pointer','_signal_length','_payload_pointer','_payload_length','_feedDecoder','_digestFeed','_digestFeedOptimized','_initEncoder','_readEncoder','_pack_contest_message','_unpack_contest_message'] \
    -I src/ribbit/include \
    -std=c++17 \
    -O3 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=16MB \
    -s MAXIMUM_MEMORY=64MB \
    -s STACK_SIZE=1MB \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=0 \
    -s ENVIRONMENT=web \
    -s FILESYSTEM=0 \
    -s ASSERTIONS=0 \
    -s MALLOC=emmalloc \
    -msimd128 \
    --closure 0 \
    -flto
```

## Build Configuration

### Core Settings

| Setting | Value | Description |
|---------|-------|-------------|
| Language | C++17 | Modern C++ standard |
| Optimization | O3 | Maximum performance optimization |
| LTO | Enabled | Link-time optimization |
| SIMD | Enabled | SIMD instructions for parallel processing |

### Memory Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| Initial Memory | 16MB | Starting heap size |
| Maximum Memory | 64MB | Maximum heap size |
| Stack Size | 1MB | Function call stack |
| Memory Growth | Allowed | Dynamic allocation |
| Allocator | emmalloc | Lightweight malloc implementation |

### WebAssembly Settings

| Setting | Value | Description |
|---------|-------|-------------|
| WASM | Enabled | Generate WebAssembly binary |
| Modularize | Enabled | Creates Module() function |
| Environment | Web | Browser-optimized |
| Filesystem | Disabled | Not needed for this application |
| Assertions | Disabled | Removed for performance |
| Closure Compiler | Disabled | Faster builds |

## Exported Functions

### Memory Management
- `_malloc` - Allocate memory
- `_free` - Free memory

### Encoder Functions
- `_createEncoder` - Initialize encoder
- `_destroyEncoder` - Cleanup encoder
- `_initEncoder` - Initialize encoder with message
- `_readEncoder` - Read encoded signal
- `_signal_pointer` - Get signal buffer pointer
- `_signal_length` - Get signal buffer length

### Decoder Functions
- `_createDecoder` - Initialize decoder
- `_destroyDecoder` - Cleanup decoder
- `_feedDecoder` - Feed audio chunk to decoder
- `_digestFeed` - Process audio buffer
- `_digestFeedOptimized` - Optimized buffer processing
- `_feed_pointer` - Get feed buffer pointer
- `_feed_length` - Get feed buffer length
- `_payload_pointer` - Get payload buffer pointer
- `_payload_length` - Get payload buffer length

### Message Functions
- `_message_pointer` - Get message buffer pointer
- `_message_length` - Get message buffer length
- `_pack_contest_message` - Pack contest mode message
- `_unpack_contest_message` - Unpack contest mode message

### Runtime Methods
- `ccall` - Call C function from JavaScript
- `cwrap` - Wrap C function for JavaScript
- `stringToUTF8` - Convert JS string to UTF-8 bytes
- `UTF8ToString` - Convert UTF-8 bytes to JS string
- `lengthBytesUTF8` - Get UTF-8 byte length

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
- 1 main C++ source file (`ribbit.cc`)
- 1 message format source file (`message_format.cc`)
- Multiple DSP header libraries (FFT, filter, encoder, decoder, etc.)
- System libraries (libc, libc++, compiler_rt, etc.)

**Typical build times:**
- First build: ~70-110 seconds
- Subsequent builds: Much faster (due to Emscripten caching)

## Output Files

The build generates:

```
web/scripts/
├── ribbit.js      # JavaScript loader and runtime (16KB)
└── ribbit.wasm    # WebAssembly binary (103KB)
```

## Troubleshooting

### Build Fails
1. Ensure Emscripten SDK is properly installed and activated
2. Check that all source files exist in `src/ribbit/src/`
3. Verify include paths in `src/ribbit/include/`
4. Check console output for specific error messages

### Files Not Generated
1. Ensure `web/scripts/` directory exists (created automatically by build script)
2. Check write permissions in the web directory
3. Verify no antivirus software is blocking file creation

### Performance Issues
1. Enable LTO (`-flto`) for better optimization
2. Use O3 optimization level
3. Consider disabling assertions in production (`-s ASSERTIONS=0`)

## Notes

- One compiler warning exists in `polar_list_decoder.hh` regarding array bounds - this is a pre-existing issue in the upstream code and does not affect functionality
- The build system uses Emscripten's caching to speed up subsequent builds
- All required system libraries are automatically built and cached by Emscripten