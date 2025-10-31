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

REM Compile directly to WebAssembly with optimized settings
call emcc src/ribbit/src/ribbit.cc src/ribbit/src/message_format.cc -o web/scripts/ribbit.js ^
    -s WASM=1 ^
    -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap','stringToUTF8','UTF8ToString','lengthBytesUTF8'] ^
    -s EXPORTED_FUNCTIONS=['_malloc','_free','_createEncoder','_destroyEncoder','_createDecoder','_destroyDecoder','_feed_pointer','_feed_length','_message_pointer','_message_length','_signal_pointer','_signal_length','_payload_pointer','_payload_length','_feedDecoder','_digestFeed','_digestFeedOptimized','_initEncoder','_readEncoder','_pack_contest_message','_unpack_contest_message'] ^
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

REM Check if build was successful
if %ERRORLEVEL% EQU 0 (
    echo Build successful! Files are in the web directory.
) else (
    echo Build failed with error code %ERRORLEVEL%
) 