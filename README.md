# Ribbit Radio

A WebAssembly-based radio communication application.

## Project Structure

```
.
├── web/           # Web assets served to clients
│   ├── index.html
│   ├── ribbit.webmanifest
│   └── assets/    # Images and other static assets
└── src/           # Source code
    └── ribbit/    # C++ source code
        ├── src/   # Implementation files
        ├── include/ # Header files
        └── build/  # Build directory
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
   emcc src/ribbit/src/ribbit.cc -o web/scripts/ribbit.js ^
       -s WASM=1 ^
       -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap'] ^
       -s EXPORTED_FUNCTIONS=['_malloc','_free','_createEncoder','_destroyEncoder','_createDecoder','_destroyDecoder','_feed_pointer','_feed_length','_message_pointer','_message_length','_signal_pointer','_signal_length','_payload_pointer','_payload_length','_feedDecoder','_digestFeed','_initEncoder','_readEncoder'] ^
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

## Coming Features

- minor updates for some of the header encoding and decoding, this is locaed in the web directory as [headerEncoder](./web/headerEncoder.html) where the script [headerEncoder.js](./web/scripts/headerEncoder.js) makes use of special bit formats that use various short bit types, nibbles (4bit), nibbits (5bits), and nibblits (6bits) to encode common numbers and letters into shorter bit formats that are shorter than bytes to save on final bit array sizes.
- this includes some unit tests so various edge cases can be discovered before the encoding/decoding can cause problems.

### Contact Logging

Saving and exporting contacts

- ADIF logging support
- Cabrillo logging support
