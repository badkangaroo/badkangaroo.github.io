@echo off
REM Check if emsdk exists, if not clone it
if not exist emsdk (
    echo Cloning Emscripten SDK...
    git clone https://github.com/emscripten-core/emsdk.git
    cd emsdk
    call emsdk install latest
    call emsdk activate latest
    cd ..
) else (
    echo Emscripten SDK found
)

REM Setup Emscripten environment
call emsdk\emsdk_env.bat

REM Create web directory if it doesn't exist
if not exist web mkdir web

REM Compile directly to WebAssembly
call emcc src/ribbit/src/ribbit.cc -o web/ribbit.js ^
    -s WASM=1 ^
    -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap'] ^
    -s EXPORTED_FUNCTIONS=['_malloc','_free'] ^
    -I src/ribbit/include ^
    -std=c++17 ^
    -O2

REM Check if build was successful
if %ERRORLEVEL% EQU 0 (
    echo Build successful! Files are in the web directory.
) else (
    echo Build failed with error code %ERRORLEVEL%
) 