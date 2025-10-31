# Ribbit Radio

![Version](https://img.shields.io/badge/version-0.1.1-blue)
![Status](https://img.shields.io/badge/status-development-orange)
![C++](https://img.shields.io/badge/C++-17-00599C?logo=cplusplus)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript)
![WebAssembly](https://img.shields.io/badge/WebAssembly-WASM-654FF0?logo=webassembly)
![Emscripten](https://img.shields.io/badge/Emscripten-4.0.8-8B9DC3?logo=emscripten)
![Web Audio API](https://img.shields.io/badge/Web%20Audio%20API-supported-FF6B6B)
![PWA](https://img.shields.io/badge/PWA-ready-4285F4?logo=pwa)

A WebAssembly-based digital radio communication application supporting real-time messaging over audio signals. Ribbit uses advanced DSP (Digital Signal Processing) algorithms to encode/decode messages into audio waveforms suitable for transmission via radio, speakers, or any audio medium.

## Current Project Status

**Version**: 0.1.1 (Development)  
**Status**: Production-ready core functionality with active development on advanced features

### ✅ Completed Features

- **WebAssembly Encoder/Decoder**: High-performance C++ signal processing compiled to WASM
- **Dual-Mode Messaging**:
  - **Chat Mode**: UTF-8 free-form messaging (`Name|Callsign|Gridsquare|Phone&=Message`)
  - **Contest Mode**: Bitwise-packed structured format (40-60% smaller, includes timestamps)
- **Real-time Audio Processing**: 8kHz sample rate, real-time encoding/decoding
- **Web Audio API Integration**: Browser-based audio I/O
- **IndexedDB Storage**: Persistent message history
- **Service Worker**: Offline support with caching
- **PWA Support**: Installable web app with manifest
- **Visual Codec Tools**: Interactive message encoding/decoding visualization
- **Comprehensive Test Suite**: Automated testing with WAV file support
- **GPS Integration**: Automatic gridsquare calculation
- **Theme Support**: Multiple color schemes
- **Message Format Validation**: Input sanitization and error handling

### 🚧 In Progress / Planned Features

- ACK array implementation for contest mode
- Contest mode UI integration in main application
- Message acknowledgment tracking
- Statistics dashboard
- ADIF/Cabrillo logging export
- QSO mode for automatic contact logging

## Project Structure

```text
.
├── build.bat              # Windows build script (auto-installs Emscripten)
├── run_tests.bat          # Windows test server launcher
├── run_tests.sh           # Linux/Mac test server launcher
├── README.md              # This file
├── Docs/                  # Comprehensive documentation
│   ├── BITWISE_ENCODING_ANALYSIS.md
│   ├── CODEC_INTEGRATION_COMPLETE.md
│   ├── DUAL_MODE_MESSAGE_ARCHITECTURE.md
│   ├── IMPLEMENTATION_COMPLETE.md
│   └── ... (20+ documentation files)
├── web/                   # Web assets served to clients
│   ├── index.html         # Main application
│   ├── messageCodec.html  # Visual message encoder/decoder
│   ├── headerCodec.html   # Header field codec
│   ├── wasm_tests.html    # Test suite interface
│   ├── settings-page.html # Settings interface
│   ├── ribbit.webmanifest # PWA manifest
│   ├── sw.js              # Service worker (offline support)
│   ├── scripts/           # JavaScript modules
│   │   ├── ribbit.js      # Emscripten WASM wrapper
│   │   ├── ribbit.wasm    # Compiled WebAssembly binary (~105KB)
│   │   ├── index.js        # Main application logic
│   │   ├── message_format.js # Message format handler
│   │   ├── wasm_tests.js   # Test suite
│   │   └── ...
│   ├── styles/            # CSS stylesheets
│   ├── assets/            # Icons and images
│   └── scraps/            # Development/testing files
└── src/                   # C++ source code
    └── ribbit/
        ├── src/
        │   ├── ribbit.cc           # Main WASM bindings
        │   ├── message_format.cc   # Message packing/unpacking
        │   ├── decode.cc           # Decoder implementation
        │   └── dsp/                # Digital Signal Processing library
        │       ├── encoder.hh     # Signal encoder
        │       ├── decoder.hh     # Signal decoder
        │       ├── polar_*.hh     # Polar codes (error correction)
        │       └── ... (60+ DSP headers)
        └── include/
            └── message_format.hh  # Message format definitions
```

## Building

### Prerequisites

- Git
- Windows environment (for build.bat)
- C++17 compatible compiler
- Emscripten SDK 4.0.8 (automatically installed by build.bat)

### Quick Build (Windows)

1. Open Command Prompt or PowerShell
2. Navigate to the project directory
3. Run the build script:

   ```bash
   .\build.bat
   ```

The script will:

- Automatically download and set up Emscripten SDK if not present
- Compile the C++ code to WebAssembly
- Output the files to the `web` directory:
  - `ribbit.js` - JavaScript glue code
  - `ribbit.wasm` - WebAssembly binary

### Manual Emscripten Setup

If you prefer manual setup or are not using Windows, follow these steps:

1. Clone Emscripten SDK:

   ```bash
   git clone https://github.com/emscripten-core/emsdk.git
   cd emsdk
   ```

2. Install and activate latest version:

   ```bash
   ./emsdk install latest
   ./emsdk activate latest
   ```

3. Set up environment variables:

   ```bash

   # On Windows (PowerShell)
   .\emsdk_env.ps1

   # On Windows (Command Prompt)
   .\emsdk_env.bat

   # On Linux/macOS
   source ./emsdk_env.sh
   ```

4. Verify installation:

   ```bash
   emcc --version
   ```

5. Manual compilation:

   ```bash
   emcc src/ribbit/src/ribbit.cc src/ribbit/src/message_format.cc -o web/scripts/ribbit.js ^
       -s WASM=1 ^
       -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap','stringToUTF8','UTF8ToString','lengthBytesUTF8'] ^
       -s EXPORTED_FUNCTIONS=['_malloc','_free','_createEncoder','_destroyEncoder','_createDecoder','_destroyDecoder','_feed_pointer','_feed_length','_message_pointer','_message_length','_signal_pointer','_signal_length','_payload_pointer','_payload_length','_feedDecoder','_digestFeed','_initEncoder','_readEncoder','_pack_contest_message','_unpack_contest_message'] ^
       -I src/ribbit/include ^
       -std=c++17 ^
       -O3 ^
       -s ALLOW_MEMORY_GROWTH=1 ^
       -s INITIAL_MEMORY=16MB ^
       -s MAXIMUM_MEMORY=64MB ^
       -s STACK_SIZE=1MB ^
       -s MODULARIZE=1 ^
       -s EXPORT_ES6=0 ^
       -s ENVIRONMENT=web ^
       -s FILESYSTEM=0 ^
       -s ASSERTIONS=0 ^
       -s MALLOC=emmalloc ^
       -msimd128 ^
       --closure 0 ^
       -flto
   ```

   **Note**: The build includes both `ribbit.cc` and `message_format.cc` to support dual-mode messaging. The `EXPORTED_RUNTIME_METHODS` includes string conversion functions required for message format handling.

### Build Optimization Features

The build script uses the following optimizations:

- **-O3**: Maximum optimization level for performance
- **-flto**: Link-time optimization for better code generation
- **-msimd128**: SIMD (Single Instruction Multiple Data) support for parallel processing
- **ALLOW_MEMORY_GROWTH=1**: Dynamic memory allocation
- **INITIAL_MEMORY=16MB**: Starting memory allocation
- **MAXIMUM_MEMORY=64MB**: Maximum allowed memory
- **STACK_SIZE=1MB**: Stack size for function calls
- **MODULARIZE=1**: Creates a module for better integration
- **ENVIRONMENT=web**: Optimized for web browser environment
- **FILESYSTEM=0**: Disables filesystem support (not needed)
- **ASSERTIONS=0**: Removes runtime assertions for smaller size
- **MALLOC=emmalloc**: Lightweight malloc implementation

## Development

- Web assets are served from the `web` directory
- C++ source code is in the `src/ribbit` directory
- The WebAssembly build output goes to the `web` directory
- Emscripten SDK is not included in git (see `.gitignore`)

## Testing

A comprehensive test suite is available to verify encoder/decoder functionality.

### Quick Start

**Windows:**

```bash
run_tests.bat
```

**Linux/Mac:**

```bash
./run_tests.sh
```

Then open your browser to: `http://localhost:8000/web/wasm_tests.html`

### Test Features

- Manual encode/decode testing with custom messages
- Automated test suite with multiple test cases
- WAV file generation and verification
- Stress testing with multiple iterations
- Real-time result display with pass/fail indicators

See [web/TESTING.md](web/TESTING.md) for detailed testing documentation.

## 🎨 Visual Message Codec

**Try it now**: `http://localhost:8000/web/messageCodec.html` ⭐

Interactive encoder/decoder that shows:

- **Binary visualization** (1s and 0s, color-coded by field)
- **Hex encoding/decoding** (copy/paste friendly)
- **Mode comparison** (see efficiency gains)
- **Round-trip verification** (encode → decode → verify)

Perfect for learning how Ribbit packs data for radio transmission!

**Quick Start**: [CODEC_QUICK_START.md](CODEC_QUICK_START.md) | **Details**: [CODEC_INTEGRATION_COMPLETE.md](CODEC_INTEGRATION_COMPLETE.md)

## Message Formats

Ribbit now supports **dual-mode messaging**:

### Chat Mode (Type 1) 💬

- Current UTF-8 format: `"Name|Callsign|Gridsquare|Phone&=Message"`
- Simple, flexible, any UTF-8 characters
- Best for casual conversations

### Contest Mode (Type 2) 🏆

- Bitwise-packed efficient format
- **40-60% smaller** than chat mode
- **Includes UTC timestamp** (31 bits, 2-sec resolution, auto-updated)
- **Timestamp visualization** - See Year/Month, Day, Hour, Minute, Second bits
- Room for ACK arrays (20+ ACKs possible)
- Best for contests, structured communications
- **ACK/QSO ready** - Callsign + timestamp for contact confirmation

**Example Savings**: "Hello from Ribbit!" is **37% smaller** in Contest mode (52 → 33 bytes)

**Full Details**: [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)

## Known Issues & Bugs

### 🐛 Confirmed Bugs

1. **Overflow Buffer Bug** (`src/ribbit/src/ribbit.cc:196`)
   - **Location**: `digestFeed()` function, line 196
   - **Issue**: `overflow[i] = overflow[i];` is a no-op that doesn't copy data correctly
   - **Impact**: May cause data loss or corruption when processing audio chunks
   - **Status**: Needs investigation and fix
   - **Severity**: Medium (may affect decoder reliability)

2. **Memory Cleanup**
   - **Location**: `web/scripts/message_format.js` - `RibbitMessageFormat` class
   - **Issue**: `cleanup()` method exists but may not be called in all error paths
   - **Impact**: Potential memory leaks with repeated encode/decode operations
   - **Status**: Should add automatic cleanup on page unload
   - **Severity**: Low (memory grows slowly)

3. **Service Worker Cache Versioning**
   - **Location**: `web/sw.js`
   - **Issue**: Cache version `'ribbit-cache-v1'` is hardcoded and may not invalidate old caches
   - **Impact**: Users may see stale versions after updates
   - **Status**: Should implement cache versioning strategy
   - **Severity**: Low (affects updates)

4. **Error Handling in Message Decoding**
   - **Location**: `web/scripts/index.js` - `fetchDecoded()` function
   - **Issue**: Some malformed messages may not be handled gracefully
   - **Impact**: Could cause UI errors or incomplete error messages
   - **Status**: Most cases handled, but edge cases may exist
   - **Severity**: Low (rare edge cases)

### ⚠️ Potential Issues

1. **Audio Buffer Size Mismatch**
   - Web Audio API provides power-of-2 buffer sizes (e.g., 2048), decoder expects 160-sample chunks
   - Current implementation handles this with overflow buffer, but may have edge cases
   - **Recommendation**: Add unit tests for various buffer sizes

2. **Concurrent Encode/Decode**
   - No explicit locking mechanism if encoder and decoder run simultaneously
   - **Recommendation**: Add state checks or queue system

3. **Large Message Handling**
   - Messages near 256-byte limit may not be validated early enough
   - **Recommendation**: Add pre-encoding length validation

## Optimization Opportunities

### 🚀 Performance Optimizations

1. **Web Workers for Audio Processing** (High Priority)
   - Move audio processing to Web Worker to prevent UI blocking
   - **Expected Impact**: Smoother UI, better real-time performance
   - **Complexity**: Medium
   - **Files to Modify**: `web/scripts/index.js`, create `web/scripts/audio-worker.js`

2. **Lazy WASM Loading** (Medium Priority)
   - Load WASM module only when needed, not on page load
   - **Expected Impact**: Faster initial page load, reduced memory usage
   - **Complexity**: Low
   - **Files to Modify**: `web/scripts/index.js`

3. **Message Queuing/Batching** (Medium Priority)
   - Queue multiple messages for batch processing
   - **Expected Impact**: Better throughput for rapid message sending
   - **Complexity**: Medium
   - **Files to Modify**: `web/scripts/index.js`, `web/scripts/messages.js`

4. **Optimize Bit Manipulation** (Low Priority)
   - Current bit manipulation in `message_format.cc` uses loops
   - Could use SIMD operations or lookup tables for common operations
   - **Expected Impact**: 10-20% faster encoding/decoding
   - **Complexity**: High
   - **Files to Modify**: `src/ribbit/src/message_format.cc`

5. **Memory Pooling** (Low Priority)
   - Reuse buffers instead of allocating/deallocating for each message
   - **Expected Impact**: Reduced GC pressure, faster message processing
   - **Complexity**: Medium
   - **Files to Modify**: `web/scripts/message_format.js`, `src/ribbit/src/ribbit.cc`

### 💾 Memory Optimizations

1. **Reduce Static Buffer Sizes** (If possible)
   - Current buffers: FEED_LENGTH=2048, SIGNAL_LENGTH=16384, PAYLOAD_LENGTH=256
   - Evaluate if sizes can be reduced without affecting functionality
   - **Expected Impact**: Lower memory footprint
   - **Complexity**: Medium (requires performance testing)

2. **Cleanup Unused WASM Memory**
   - Explicitly free temporary buffers after use
   - **Expected Impact**: Lower peak memory usage
   - **Complexity**: Low
   - **Files to Modify**: `web/scripts/message_format.js`

### 📦 Bundle Size Optimizations

1. **WASM Size Reduction**
   - Current WASM: ~105KB
   - Investigate removing unused DSP functions if not needed
   - **Expected Impact**: Smaller download, faster loading
   - **Complexity**: High (requires careful dependency analysis)

2. **Code Splitting**
   - Separate contest mode codec into separate module
   - **Expected Impact**: Faster initial load if contest mode not needed
   - **Complexity**: Medium

### 🔧 Code Quality Improvements

1. **TypeScript Migration** (Long-term)
   - Add type safety to JavaScript codebase
   - **Expected Impact**: Fewer runtime errors, better IDE support
   - **Complexity**: High

2. **Unit Test Coverage**
   - Increase test coverage beyond integration tests
   - Add tests for edge cases, error conditions
   - **Expected Impact**: Higher code reliability
   - **Complexity**: Medium

3. **Error Recovery**
   - Add automatic retry for failed decode operations
   - **Expected Impact**: Better resilience to noisy signals
   - **Complexity**: Medium

## Next Steps & Roadmap

### Immediate (Next Sprint)

1. **Fix Overflow Buffer Bug**
   - Investigate `digestFeed()` overflow handling
   - Add unit tests for buffer boundary conditions
   - Fix the no-op assignment on line 196

2. **Contest Mode UI Integration**
   - Add mode selector to main application
   - Integrate contest mode encoding/decoding in `index.js`
   - Add UI for contest mode message fields (timestamp, flags, etc.)

3. **Memory Cleanup Enhancement**
   - Ensure `cleanup()` is called on page unload
   - Add error handling to ensure cleanup happens in all paths

### Short-term (Next Month)

1. **ACK Array Implementation**
   - Design ACK array structure (room for 20+ ACKs)
   - Implement packing/unpacking logic
   - Add UI for ACK management

2. **Statistics Dashboard**
   - Message counts, success rates
   - Encoding/decoding performance metrics
   - Bandwidth usage statistics

3. **Web Workers for Audio**
   - Offload audio processing to Web Worker
   - Improve UI responsiveness

### Long-term (Next Quarter)

1. **ADIF/Cabrillo Logging**
   - Export contact logs in standard formats
   - Import from existing log files
   - Integration with popular logging software

2. **QSO Mode**
   - Automatic contact logging
   - Duplicate detection
   - Contest logging features

3. **Performance Monitoring**
   - Real-time performance metrics
   - Bottleneck identification
   - Performance profiling tools

### Contact Logging

Saving and exporting contacts:

- **ADIF logging support** - Standard Amateur Data Interchange Format
- **Cabrillo logging support** - Contest logging format
- **CSV export** - For spreadsheet compatibility
- **Integration** - Direct export to popular logging software

## Contributing

When reporting bugs or implementing optimizations:

1. **Bug Reports**: Include reproduction steps, expected vs actual behavior, browser/OS info
2. **Optimizations**: Include performance benchmarks before/after, explain trade-offs
3. **Code Changes**: Follow existing code style, add tests for new features
4. **Documentation**: Update relevant docs when adding features

## Resources & Documentation

- **Quick Start**: [Docs/CODEC_QUICK_START.md](Docs/CODEC_QUICK_START.md)
- **Architecture**: [Docs/DUAL_MODE_MESSAGE_ARCHITECTURE.md](Docs/DUAL_MODE_MESSAGE_ARCHITECTURE.md)
- **Testing Guide**: [web/TESTING.md](web/TESTING.md)
- **Troubleshooting**: [web/WASM_TROUBLESHOOTING.md](web/WASM_TROUBLESHOOTING.md)
- **Message Format Spec**: [web/HeaderReadme.md](web/HeaderReadme.md)
