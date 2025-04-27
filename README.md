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
   emcc src/ribbit/src/ribbit.cc -o web/scripts/ribbit.js -s WASM=1 -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap'] -s EXPORTED_FUNCTIONS=['_malloc','_free'] -I src/ribbit/include -std=c++17 -O2
   ```

## Development

- Web assets are served from the `web` directory
- C++ source code is in the `src/ribbit` directory
- The WebAssembly build output goes to the `web` directory
- Emscripten SDK is not included in git (see `.gitignore`)

## Coming Features

- minor updates for some of the header encoding and decoding, this is locaed in the web directory as [headerEncoder](./web/headerEncoder.html) where the script [headerEncoder.js](./web/scripts/headerEncoder.js) makes use of special bit formats that use various short bit types, nibbles (4bit), nibbits (5bits), and nibblits (6bits) to encode common numbers and letters into shorter bit formats that are shorter than bytes to save on final bit array sizes.
- this includes some unit tests so various edge cases can be discovered before the encoding/decoding can cause problems.

### Contact Logging

Saving and exporting contacts

- ADIF logging support
- Cabrillo logging support
