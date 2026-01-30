# Ribbit Radio

![Version](https://img.shields.io/badge/version-0.1.2-blue)
![Status](https://img.shields.io/badge/status-development-orange)
![C++](https://img.shields.io/badge/C++-17-00599C?logo=cplusplus)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript)
![WebAssembly](https://img.shields.io/badge/WebAssembly-WASM-654FF0?logo=webassembly)
![Emscripten](https://img.shields.io/badge/Emscripten-4.0.8-8B9DC3?logo=emscripten)
![Web Audio API](https://img.shields.io/badge/Web%20Audio%20API-supported-FF6B6B)
![PWA](https://img.shields.io/badge/PWA-ready-4285F4?logo=pwa)

A WebAssembly-based digital radio communication application supporting real-time messaging over audio signals. Ribbit uses advanced DSP (Digital Signal Processing) algorithms to encode/decode messages into audio waveforms suitable for transmission via radio, speakers, or any audio medium.

## Current Project Status

**Version**: 0.1.2 (Development)
**Status**: Production-ready core functionality with active development on advanced features

### ✅ Completed Features

- **WebAssembly Encoder/Decoder**: High-performance C++ signal processing compiled to WASM (~103KB)
- **Friendly WASM API**: New `RibbitWASM` class with promise-based interface for easy integration
- **Dual-Mode Messaging**:
  - **Chat Mode**: UTF-8 free-form messaging (`Name|Callsign|Gridsquare&=Message`)
  - **Contest Mode**: Bitwise-packed structured format (40-60% smaller, includes timestamps)
- **Real-time Audio Processing**: 8kHz sample rate, continuous audio streaming for message detection
- **Web Audio API Integration**: Browser-based audio I/O with automatic context management
- **IndexedDB Storage**: Persistent message history with automatic restoration
- **Service Worker**: Offline support with caching
- **PWA Support**: Installable web app with manifest
- **Visual Codec Tools**: Interactive message encoding/decoding visualization
- **Comprehensive Test Suite**:
  - Automated testing with multiple test scenarios
  - **Microphone Live Test**: Real-time decoding from audio input
  - **WAV File Generator**: Create audio files for cross-device and radio testing
  - Cross-device validation and over-the-air testing
- **GPS Integration**: Automatic gridsquare calculation from coordinates
- **Theme Support**: Multiple color schemes (Ribbit Light, Ribbit Dark, World Radio League)
- **Message Format Validation**: Input sanitization, error handling, and duplicate detection
- **Optimized Audio Processing**: New `digestFeedOptimized()` function with improved memory management, 50% fewer memory copies, and bounds checking (toggle in System Settings)
- **Smart Decode Error Handling**: Debounced error messages prevent UI spam from invalid signals
- **Wake-up Tone**: 300Hz preamble for radio VOX activation

### 🚧 In Progress / Planned Features

- Enhanced message validation and error recovery
- ACK array implementation for contest mode
- Contest mode UI integration in main application
- Message acknowledgment tracking
- Statistics dashboard
- ADIF/Cabrillo logging export
- QSO mode for automatic contact logging
- Performance monitoring and profiling tools

## Project Structure

```text
.
├── build.bat              # Windows build script (auto-installs Emscripten)
├── run_tests.bat          # Windows test server launcher
├── run_tests.sh           # Linux/Mac test server launcher
├── README.md              # This file
├── Docs/                  # Comprehensive documentation
├── Docs/                  # Comprehensive documentation
│   ├── codec.md             # Codec & Message Architecture
│   ├── quick_start.md       # Quick Start Guide
│   ├── ribbit_wasm.md       # WASM Implementation Details
│   └── ...
├── web/                   # Web assets served to clients
│   ├── index.html         # Main application (v0.1.2)
│   ├── messageCodec.html  # Visual message encoder/decoder
│   ├── headerCodec.html   # Header field codec
│   ├── wasm_tests.html    # Test suite interface
│   ├── decoder_tests.html # Live microphone testing & WAV generator
│   ├── settings-page.html # Settings interface
│   ├── ribbit.webmanifest # PWA manifest
│   ├── sw.js              # Service worker (offline support)
│   ├── scripts/           # JavaScript modules
│   │   ├── ribbit.js      # Emscripten WASM wrapper
│   │   ├── ribbit.wasm    # Compiled WebAssembly binary (~103KB)
│   │   ├── ribbit-wasm.js # Friendly WASM API wrapper
│   │   ├── index.js        # Main application logic
│   │   ├── message_format.js # Message format handler
│   │   ├── messageCodec.js # Message encoding/decoding API
│   │   ├── decoder_tests.js # Live testing implementation
│   │   ├── wasm_tests.js   # Test suite
│   │   ├── wav.js          # WAV file utilities
│   │   └── ...
│   ├── styles/            # CSS stylesheets
│   ├── assets/            # Icons and images
│   └── test/              # Test files
│       ├── test-e2e/      # End-to-end tests (Playwright)
│       └── setup.js       # Test configuration
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
- The WebAssembly build output goes to the `web/scripts` directory
- Emscripten SDK is not included in git (see `.gitignore`)

### Developer-Friendly WASM API

Ribbit now includes a modern, promise-based WASM API that makes integration simple:

```javascript
// Import the friendly API
import { RibbitWASM } from './scripts/ribbit-wasm.js';

// One-line initialization
const ribbit = await RibbitWASM.load();

// Encode a message
const audioBuffer = await ribbit.encodeMessage("Hello World!", {
    callsign: "W1AW",
    gridsquare: "FN31pr",
    name: "John"
});

// Decode audio
const decoded = await ribbit.decodeAudio(audioBuffer);
console.log("Received:", decoded.text);

// Cleanup when done
ribbit.destroy();
```

**Key Features:**
- Automatic memory management (no manual malloc/free)
- Promise-based async API
- TypeScript definitions included
- Error handling built-in
- Simple encode/decode methods

See [Docs/README_WASM_API.md](Docs/README_WASM_API.md) for complete API documentation.

## Testing

A comprehensive test suite is available to verify encoder/decoder functionality, including automated tests, live microphone testing, WAV file generation for cross-device validation, and end-to-end browser testing.

### Quick Start

**Windows:**

```bash
run_tests.bat
```

**Linux/Mac:**

```bash
./run_tests.sh
```

Then open your browser to:
- **WASM Tests**: `http://localhost:8000/web/wasm_tests.html`
- **Decoder Tests**: `https://localhost:8443/decoder_tests.html` (requires HTTPS server)

### Test Features

**Automated Testing:**
- Manual encode/decode testing with custom messages
- Automated test suite with multiple test cases
- Stress testing with configurable iterations (1-1000 messages)
- Real-time result display with pass/fail indicators
- Noise simulation for robustness testing (0-100% noise levels)
- Performance benchmarking

**Live Testing (decoder_tests.html):**
- **Microphone Live Test**: Real-time decoding from audio input
  - Test over-the-air signal reception from radio
  - Cross-device testing (play on Device B, decode on Device A)
  - Automatic message validation with duplicate detection
  - Live message display with timestamps (last 20 messages)
  - Smart debouncing (2-second window prevents duplicates)
- **WAV File Generator**: Create audio files for testing
  - Includes 300Hz wake-up tone for radio VOX activation
  - Configurable message, callsign, and gridsquare
  - Audio playback preview
  - Automatic filename generation with timestamp
  - Cross-device and radio transmission testing
  - Standard format: 8kHz, 16-bit mono PCM WAV

**End-to-End Testing:**
- Playwright-based browser automation
- Cross-browser compatibility testing
- User workflow validation
- Performance monitoring

**Documentation:**
- [Docs/DECODER_TESTS.md](Docs/DECODER_TESTS.md) - Complete decoder tests documentation
- [Docs/DECODER_TESTS_NEW_FEATURES.md](Docs/DECODER_TESTS_NEW_FEATURES.md) - New features overview
- [Docs/testing_plan.md](Docs/testing_plan.md) - Comprehensive testing strategy

## 🎨 Visual Tools & Demos

### 1. Visual Message Codec
**URL**: `http://localhost:8000/web/messageCodec.html` ⭐

Interactive encoder/decoder that shows:
- **Binary visualization** (1s and 0s, color-coded by field)
- **Hex encoding/decoding** (copy/paste friendly)
- **Mode comparison** (see efficiency gains between Chat and Contest modes)
- **Round-trip verification** (encode → decode → verify)
- **Field-by-field breakdown** (callsign, timestamp, gridsquare, etc.)

### 2. Message Format Demo (WASM Verification)
**URL**: `http://localhost:8000/web/message_format_demo.html` 🐸

A complete end-to-end demo of the Ribbit message format using the **actual WebAssembly binary**.
- **Verify Message IDs**: See the unique 80-bit ID generated in real-time
- **Test Contest Mode**: Toggle between Chat (UTF-8) and Contest (Packed) modes
- **Compare Efficiency**: See exact byte savings (40-60% smaller in Contest mode)
- **Live Encoding/Decoding**: Test with your own messages

### 3. Decoder Tests & Live Testing
**URL**: `https://localhost:8443/decoder_tests.html` 🎤

Complete testing environment with:
- **Automated Tests**: Run predefined test suites with noise simulation
- **Microphone Live Test**: Real-time decoding from audio input
- **WAV File Generator**: Create portable test files for cross-device testing
- **Performance Metrics**: Track success rates and decoding accuracy

> [!NOTE]
> All tools require a local HTTP server to run (due to WASM security restrictions).
> Run: `python3 -m http.server 8000` or use the provided test scripts.

**Quick Start**: [Docs/quick_start.md](Docs/quick_start.md) | **Details**: [Docs/codec.md](Docs/codec.md)

## Message Formats

Ribbit now supports **dual-mode messaging**:

### Chat Mode (Type 1) 💬

- Current UTF-8 format: `"Name|Callsign|Gridsquare&=Message"`
- Simple, flexible, any UTF-8 characters
- Best for casual conversations

### Contest Mode (Type 2) 🏆

- Bitwise-packed efficient format
- **40-60% smaller** than chat mode
- **Includes UTC timestamp** (31 bits, 2-sec resolution, auto-updated)
- **Timestamp visualization** - See Year/Month, Day, Hour, Minute, Second bits
- **Unique Message ID (80-bit Hex)** - Callsign + Timestamp + Emergency flag for deduplication
- Room for ACK arrays (20+ ACKs possible)
- Best for contests, structured communications
- **ACK/QSO ready** - Callsign + timestamp for contact confirmation

**Example Savings**: "Hello from Ribbit!" is **37% smaller** in Contest mode (52 → 33 bytes)

**Full Details**: [Docs/ribbit_wasm.md](Docs/ribbit_wasm.md)

## Known Issues & Bugs

### 🐛 Confirmed Bugs

1. **Service Worker Cache Versioning**
   - **Location**: `web/sw.js`
   - **Issue**: Cache version `'ribbit-cache-v1'` is hardcoded and may not invalidate old caches
   - **Impact**: Users may see stale versions after updates
   - **Status**: Should implement cache versioning strategy
   - **Severity**: Low (affects updates)

2. **Audio Context State Management**
   - **Location**: `web/scripts/index.js` - `RibbitApp` class
   - **Issue**: Audio context suspension/resumption could be more robust
   - **Impact**: Occasional audio playback issues on mobile browsers
   - **Status**: Improved with user interaction handlers, but edge cases may exist
   - **Severity**: Low (rare edge cases)

### ⚠️ Potential Issues

1. **Audio Buffer Size Mismatch**
   - Web Audio API provides power-of-2 buffer sizes (e.g., 2048), decoder expects 160-sample chunks
   - Current implementation handles this with overflow buffer in `digestFeedOptimized()`
   - **Recommendation**: Add unit tests for various buffer sizes

2. **Concurrent Encode/Decode**
   - No explicit locking mechanism if encoder and decoder run simultaneously
   - Current implementation suspends listening during transmission
   - **Recommendation**: Add state checks or queue system for edge cases

3. **Large Message Handling**
   - Messages near 256-byte limit may not be validated early enough
   - **Recommendation**: Add pre-encoding length validation

4. **IndexedDB Error Handling**
   - Some edge cases in database initialization may not be fully handled
   - **Recommendation**: Add more comprehensive error recovery

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
   - **Note**: Already partially implemented with `RibbitWASM.load()`

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
   - **Files to Modify**: `web/scripts/ribbit-wasm.js`, `src/ribbit/src/ribbit.cc`
   - **Note**: Partially implemented in `digestFeedOptimized()`

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
   - **Files to Modify**: `web/scripts/ribbit-wasm.js`
   - **Status**: Already implemented in `RibbitWASM` class

### 📦 Bundle Size Optimizations

1. **WASM Size Reduction**
   - Current WASM: ~103KB
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
   - **Note**: TypeScript definitions already exist for WASM API (`ribbit-wasm.d.ts`)

2. **Unit Test Coverage**
   - Increase test coverage beyond integration tests
   - Add tests for edge cases, error conditions
   - **Expected Impact**: Higher code reliability
   - **Complexity**: Medium
   - **Status**: Test infrastructure in place with Jest and Playwright

3. **Error Recovery**
   - Add automatic retry for failed decode operations
   - **Expected Impact**: Better resilience to noisy signals
   - **Complexity**: Medium
   - **Status**: Smart debouncing already implemented

## Next Steps & Roadmap

### Immediate (Next Sprint)

1. **Enhanced Error Handling**
   - Improve decode error messages with more context
   - Add retry logic for transient failures
   - Better validation feedback in UI

2. **Contest Mode UI Integration**
   - Add mode selector to main application
   - Integrate contest mode encoding/decoding in `index.js`
   - Add UI for contest mode message fields (timestamp, flags, etc.)

3. **Performance Monitoring**
   - Add real-time performance metrics display
   - Track encoding/decoding times
   - Monitor memory usage patterns

### Short-term (Next Month)

1. **ACK Array Implementation**
   - Design ACK array structure (room for 20+ ACKs)
   - Implement packing/unpacking logic
   - Add UI for ACK management

2. **Statistics Dashboard**
   - Message counts, success rates
   - Encoding/decoding performance metrics
   - Bandwidth usage statistics
   - Signal quality indicators

3. **Web Workers for Audio**
   - Offload audio processing to Web Worker
   - Improve UI responsiveness
   - Better handling of concurrent operations

4. **Enhanced Testing**
   - Expand E2E test coverage
   - Add performance regression tests
   - Cross-browser automated testing

### Long-term (Next Quarter)

1. **ADIF/Cabrillo Logging**
   - Export contact logs in standard formats
   - Import from existing log files
   - Integration with popular logging software

2. **QSO Mode**
   - Automatic contact logging
   - Duplicate detection
   - Contest logging features
   - Real-time QSO tracking

3. **Performance Monitoring**
   - Real-time performance metrics
   - Bottleneck identification
   - Performance profiling tools
   - Automated performance testing

4. **Advanced Features**
   - Message compression
   - Multiple modulation schemes
   - Adaptive data rates
   - Optional encryption layer

### Contact Logging

Saving and exporting contacts:

- **ADIF logging support** - Standard Amateur Data Interchange Format
- **Cabrillo logging support** - Contest logging format
- **CSV export** - For spreadsheet compatibility
- **Integration** - Direct export to popular logging software

## AI Agent & Developer Guidance

This project has specific constraints to ensure offline reliability and portability. Please read the **[AgentGuidance](AgentGuidance/README.md)** before writing code.

- **[Code Style](AgentGuidance/CODE_STYLE.md)**: Keep changes minimal and focused.
- **[Offline First](AgentGuidance/OFFLINE_FIRST.md)**: **NO external CDNs** or runtime dependencies allowed.
- **[Documentation](AgentGuidance/DOCUMENTATION.md)**: Must be maintained for offline reading.

## Contributing

When reporting bugs or implementing optimizations:

1. **Bug Reports**: Include reproduction steps, expected vs actual behavior, browser/OS info
2. **Optimizations**: Include performance benchmarks before/after, explain trade-offs
3. **Code Changes**: Follow existing code style, add tests for new features
4. **Documentation**: Update relevant docs when adding features

## Resources & Documentation

- **Quick Start**: [Docs/quick_start.md](Docs/quick_start.md) - Get started in 5 minutes
- **Architecture**: [Docs/codec.md](Docs/codec.md) - Message format and encoding details
- **WASM API**: [Docs/README_WASM_API.md](Docs/README_WASM_API.md) - Friendly WASM API documentation
- **WASM Implementation**: [Docs/ribbit_wasm.md](Docs/ribbit_wasm.md) - Technical WASM details
- **Testing Guide**: [Docs/testing_plan.md](Docs/testing_plan.md) - Comprehensive testing strategy
- **Decoder Tests**: [Docs/DECODER_TESTS.md](Docs/DECODER_TESTS.md) - Live testing documentation
- **New Features**: [Docs/DECODER_TESTS_NEW_FEATURES.md](Docs/DECODER_TESTS_NEW_FEATURES.md) - Latest additions
- **Build Guide**: [Docs/build.md](Docs/build.md) - Compilation and build process
- **Release Plan**: [Docs/RELEASE_PLAN.md](Docs/RELEASE_PLAN.md) - Future development roadmap
