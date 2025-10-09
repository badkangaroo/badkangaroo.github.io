# WebAssembly Loading Methods - Visual Comparison

## Architecture Diagrams

### Method 1: Direct WASM Loading

```
┌─────────────────────────────────────────────┐
│           Your JavaScript Code              │
│                                             │
│  fetch('module.wasm')                       │
│  WebAssembly.instantiate(buffer, imports)  │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │  Imports Object (You Create)       │    │
│  │  ┌──────────────────────────────┐  │    │
│  │  │ env: {                       │  │    │
│  │  │   memory: WebAssembly.Memory │  │    │
│  │  │   abort: () => {...}         │  │    │
│  │  │   malloc: () => {...}        │  │    │
│  │  │   free: () => {...}          │  │    │
│  │  │   // You implement all of    │  │    │
│  │  │   // these manually          │  │    │
│  │  │ }                            │  │    │
│  │  └──────────────────────────────┘  │    │
│  └────────────────────────────────────┘    │
│                    │                        │
│                    ▼                        │
│         ┌────────────────────┐             │
│         │   module.wasm      │             │
│         │   (50-100KB)       │             │
│         │                    │             │
│         │  - Your C/C++ code │             │
│         │  - Minimal runtime │             │
│         │  - Expects imports │             │
│         └────────────────────┘             │
│                    │                        │
│                    ▼                        │
│         ┌────────────────────┐             │
│         │ Exported Functions │             │
│         │                    │             │
│         │ .myFunction()      │             │
│         │ .calculate()       │             │
│         │ .process()         │             │
│         └────────────────────┘             │
└─────────────────────────────────────────────┘

Total: ~50KB
Complexity: HIGH (manual work)
Control: FULL
```

### Method 2: Emscripten Wrapper (Ribbit)

```
┌──────────────────────────────────────────────────────┐
│              Your JavaScript Code                    │
│                                                      │
│  const Module = await Module();                     │
│  Module._createEncoder();                           │
│                                                      │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│          ribbit.js (Emscripten Wrapper)              │
│                    (~16KB)                           │
│                                                      │
│  ┌────────────────────────────────────────────┐     │
│  │  Automatic Features:                       │     │
│  │  • Memory management (HEAP8, HEAP32, etc.) │     │
│  │  • String conversions (UTF8ToString)       │     │
│  │  • Function wrappers (ccall, cwrap)        │     │
│  │  • Error handling                          │     │
│  │  • Standard library support                │     │
│  │  • Import management                       │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  ┌────────────────────────────────────────────┐     │
│  │  Built-in Imports (Provided for you):     │     │
│  │  {                                         │     │
│  │    a: {  // minified "env"                │     │
│  │      b: __assert_fail,                    │     │
│  │      c: abort,                            │     │
│  │      d: emscripten_resize_heap,           │     │
│  │      e: fd_write,                         │     │
│  │      f: emscripten_memcpy_js,             │     │
│  │      // 20+ more functions                │     │
│  │    }                                       │     │
│  │  }                                         │     │
│  └────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│              ribbit.wasm (~103KB)                    │
│                                                      │
│  ┌────────────────────────────────────────────┐     │
│  │  Your C++ Code:                            │     │
│  │  • DSP algorithms                          │     │
│  │  • Encoder/decoder logic                   │     │
│  │  • Message processing                      │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  ┌────────────────────────────────────────────┐     │
│  │  Emscripten Runtime:                       │     │
│  │  • C standard library (libc)               │     │
│  │  • C++ standard library (libc++)           │     │
│  │  • Math functions (libm)                   │     │
│  │  • Memory allocator (emmalloc)             │     │
│  │  • Exception handling                      │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  ┌────────────────────────────────────────────┐     │
│  │  Exported Functions (with _ prefix):      │     │
│  │  • _createEncoder()                        │     │
│  │  • _initEncoder()                          │     │
│  │  • _readEncoder()                          │     │
│  │  • _createDecoder()                        │     │
│  │  • _digestFeed()                           │     │
│  │  • _malloc(), _free()                      │     │
│  │  • 10+ more functions                      │     │
│  └────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘

Total: ~119KB (16KB JS + 103KB WASM)
Complexity: LOW (automatic)
Control: MODERATE
```

## Data Flow Comparison

### Direct Loading: Calling a Function

```
JavaScript                    WASM Module
───────────                   ────────────

Step 1: Prepare data
┌────────────────────┐
│ const data = [1,2] │
│ const ptr = malloc │
│ writeData(ptr)     │
└────────────────────┘
        │
        ▼
Step 2: Call WASM
┌────────────────────┐        ┌──────────────┐
│ instance.exports   │───────▶│ myFunction() │
│  .myFunction(ptr)  │        │              │
└────────────────────┘        │ Process data │
                              │              │
Step 3: Get result            │ Return ptr   │
                              └──────────────┘
        │                             │
        ▼                             │
┌────────────────────┐◀───────────────┘
│ const result =     │
│  readData(ptr)     │
│ free(ptr)          │
└────────────────────┘

YOU MUST:
• Allocate memory
• Copy data
• Handle strings
• Free memory
• Parse results
```

### Emscripten Wrapper: Calling a Function

```
JavaScript                Emscripten Wrapper      WASM Module
───────────               ──────────────────      ────────────

Step 1: Simple call
┌────────────────┐
│ Module._func() │────────▶  Automatic:          ┌──────────┐
└────────────────┘           • Memory setup      │ function │
                             • Data conversion   │          │
                             • Call WASM   ─────▶│ Process  │
                             • Parse result      │          │
                             • Cleanup    ◀──────│ Return   │
                                  │              └──────────┘
                                  ▼
┌────────────────┐
│ Returns result │
└────────────────┘

WRAPPER HANDLES:
• Memory allocation
• Data copying
• String conversion
• Memory cleanup
• Error handling
```

## Memory Management Comparison

### Direct Loading

```
JavaScript Memory Space        WASM Memory Space
───────────────────────        ─────────────────

┌─────────────────┐           ┌─────────────────┐
│ Your JS Objects │           │ Linear Memory   │
│                 │           │                 │
│ const data = {} │           │ [byte array]    │
│                 │           │                 │
│ You must:       │           │ You manage:     │
│ • Create buffer │───copy───▶│ • Allocate      │
│ • Copy manually │           │ • Track pointers│
│ • Parse results │◀──copy────│ • Free manually │
│ • Handle errors │           │ • Handle growth │
└─────────────────┘           └─────────────────┘

      Error-prone               Manual work
```

### Emscripten Wrapper

```
JavaScript Memory Space        Wrapper Views         WASM Memory Space
───────────────────────        ─────────────        ─────────────────

┌─────────────────┐           ┌─────────────┐     ┌─────────────────┐
│ Your JS Objects │           │ HEAP8       │     │ Linear Memory   │
│                 │           │ HEAPU8      │     │                 │
│ const data = {} │           │ HEAP16      │────▶│ [byte array]    │
│                 │           │ HEAP32      │     │                 │
│ Module.ccall()  │──auto────▶│ HEAPF32     │     │ Auto-managed    │
│                 │           │ HEAPF64     │     │ • malloc/free   │
│ Module.cwrap()  │           │             │     │ • Growth        │
│                 │◀──auto────│ Converters  │     │ • Tracking      │
└─────────────────┘           └─────────────┘     └─────────────────┘

    Easy to use            Automatic views          Automatic mgmt
```

## String Handling Comparison

### Direct Loading - Manual UTF-8

```
JavaScript String: "Hello"
        │
        ▼
┌─────────────────────────────────────┐
│ Manual Encoding (You Write This):  │
│                                     │
│ 1. const encoder = new TextEncoder()│
│ 2. const bytes = encoder.encode()  │
│ 3. const ptr = malloc(bytes.length)│
│ 4. for (let i...) memory[ptr+i]=.. │
│ 5. memory[ptr+bytes.length] = 0    │
└─────────────────────────────────────┘
        │
        ▼
WASM Memory: [72,101,108,108,111,0]
        │
        ▼
┌─────────────────────────────────────┐
│ Manual Decoding (You Write This):  │
│                                     │
│ 1. let end = ptr                    │
│ 2. while (memory[end] !== 0) end++ │
│ 3. const bytes = memory[ptr..end]  │
│ 4. const decoder = new TextDecoder()│
│ 5. const str = decoder.decode()    │
└─────────────────────────────────────┘
        │
        ▼
JavaScript String: "Hello"

~20 lines of code
```

### Emscripten Wrapper - Automatic

```
JavaScript String: "Hello"
        │
        ▼
┌─────────────────────────────────┐
│ Module.stringToUTF8(str, ptr)  │  One line!
└─────────────────────────────────┘
        │
        ▼
WASM Memory: [72,101,108,108,111,0]
        │
        ▼
┌─────────────────────────────────┐
│ Module.UTF8ToString(ptr)        │  One line!
└─────────────────────────────────┘
        │
        ▼
JavaScript String: "Hello"

2 lines of code
```

## Build Output Comparison

### Direct Loading Build

```bash
$ emcc code.c -o module.wasm -s STANDALONE_WASM=1

Output:
├── module.wasm  (50KB)
└── (nothing else)

Usage:
const response = await fetch('module.wasm');
const buffer = await response.arrayBuffer();
// ... manual setup ...
```

### Emscripten Wrapper Build (Current)

```bash
$ emcc code.cc -o ribbit.js -s WASM=1 -s MODULARIZE=1

Output:
├── ribbit.js    (16KB)  ← Loader + runtime
└── ribbit.wasm  (103KB) ← Code + stdlib

Usage:
<script src="ribbit.js"></script>
const Module = await Module();
// Everything ready to use!
```

## Performance Impact

```
Loading Speed:
Direct:    ████░░░░░░ (faster, smaller)
Wrapper:   ██████░░░░ (slightly slower, larger files)

Development Speed:
Direct:    ██░░░░░░░░ (much slower, manual work)
Wrapper:   ██████████ (instant, automatic)

Runtime Speed:
Direct:    ██████████ (native WASM speed)
Wrapper:   ██████████ (native WASM speed, minimal overhead)

Memory Usage:
Direct:    ████░░░░░░ (lower base, manual management)
Wrapper:   ████████░░ (higher base, automatic management)

Debugging:
Direct:    ███░░░░░░░ (harder, manual tracking)
Wrapper:   ████████░░ (easier, built-in tools)
```

## Summary: Why Ribbit Uses the Wrapper

```
┌─────────────────────────────────────────────────────┐
│                  Ribbit's Needs                     │
├─────────────────────────────────────────────────────┤
│ ✓ Complex C++ DSP algorithms                       │
│ ✓ Standard library (templates, STL, math)          │
│ ✓ Dynamic memory allocation                        │
│ ✓ JavaScript callbacks (EM_ASM)                    │
│ ✓ printf debugging                                 │
│ ✓ String handling                                  │
│ ✓ Error handling                                   │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│            Emscripten Wrapper Provides              │
├─────────────────────────────────────────────────────┤
│ ✓ All standard libraries included                  │
│ ✓ Automatic memory management                      │
│ ✓ Built-in helper functions                        │
│ ✓ JavaScript integration                           │
│ ✓ Console output support                           │
│ ✓ UTF-8 conversions                                │
│ ✓ Exception handling                               │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
              Result: Perfect Match!

Cost: +16KB JavaScript wrapper
Benefit: 100+ hours of development time saved
         Automatic features worth thousands of lines of code
```

## Quick Reference

| Feature | Direct Loading | Emscripten Wrapper |
|---------|---------------|-------------------|
| **File Size** | Smaller (~50KB) | Larger (~119KB) |
| **Setup Code** | 50-100 lines | 3 lines |
| **Memory Mgmt** | Manual | Automatic |
| **Strings** | Manual encoding | Built-in helpers |
| **Stdlib** | None | Full C/C++ stdlib |
| **Debugging** | Harder | Easier |
| **Best For** | Simple modules | Complex C/C++ apps |
| **Ribbit?** | ❌ Too complex | ✅ Perfect fit |

---

**Bottom Line**: For a complex DSP application like Ribbit with C++ code, templates, standard library usage, and JavaScript callbacks, the Emscripten wrapper is essential. The 16KB overhead is negligible compared to the functionality it provides.

