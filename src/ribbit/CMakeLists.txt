cmake_minimum_required(VERSION 3.10)
project(RibbitRadio)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find Emscripten
if(EMSCRIPTEN)
    set(CMAKE_EXECUTABLE_SUFFIX ".js")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s WASM=1 -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap'] -s EXPORTED_FUNCTIONS=['_malloc','_free']")
    include_directories(${EMSCRIPTEN_ROOT_PATH}/system/include)
endif()

# Add source files
set(SOURCES
    src/main.cpp
    src/ribbit.cpp
)

# Create executable
add_executable(ribbit ${SOURCES})

# Include directories
target_include_directories(ribbit PRIVATE include)

# Set output directory for WebAssembly
if(EMSCRIPTEN)
    set_target_properties(ribbit PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/../../web"
    )
endif() 