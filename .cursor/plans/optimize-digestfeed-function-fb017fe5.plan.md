<!-- fb017fe5-d60a-4b45-a4a1-749768e0ce28 3648b82b-6ca7-456a-9721-97751a650ce2 -->
# Add Optimized digestFeed() Function with HTML Toggle

## Current Issues

1. **Bug**: Lines 195-196 have a no-op assignment `overflow[i] = overflow[i];`
2. **Inefficiency**: Manual loops instead of optimized memory operations (`memcpy`/`std::copy`)
3. **Redundant copies**: Data copied overflow→chunk→decoder when decoder can be fed directly from overflow
4. **Logic complexity**: Overflow handling has convoluted conditional paths
5. **Memory safety**: No explicit bounds checking

## Solution Strategy

### Approach: Create New Function + Feature Flag

- Create `digestFeedOptimized()` function alongside existing `digestFeed()`
- Add HTML checkbox toggle in System Settings to switch between versions
- Store preference in localStorage
- Update JavaScript to call appropriate function based on toggle state

### Optimized Function Design:

- Process existing overflow data first, extracting and processing full 160-sample chunks
- Combine remaining overflow with new feed data
- Use optimized memory operations (`std::copy` for type safety)
- Feed decoder directly from buffer when possible (avoid intermediate chunk copy when possible)
- Add bounds assertions for safety in debug builds

## Implementation Plan

### 1. C++ Changes (`src/ribbit/src/ribbit.cc`)

#### Add `digestFeedOptimized()` function after `digestFeed()`:

- Implement optimized algorithm using `std::copy` instead of manual loops
- Process overflow: Extract all complete 160-sample chunks efficiently
- Process feed data: Combine with overflow, minimize intermediate copies
- Feed decoder directly from overflow when `over == CHUNK_LENGTH`
- Add assertion: `assert(over >= 0 && over < CHUNK_LENGTH)` after overflow processing

### 2. Build Configuration (`build.bat`)

- Add `_digestFeedOptimized` to `EXPORTED_FUNCTIONS` array (line 24)

### 3. HTML Changes (`web/index.html`)

- Add checkbox in System Settings section (after line 243, before "Logs:" section):
        - Label: "Use Optimized Digest Function"
        - Checkbox ID: `useOptimizedDigest`
        - Info text explaining the optimization

### 4. JavaScript Changes

#### `web/scripts/settings.js`:

- Add `useOptimizedDigest` to `saveSettings()` function (save to localStorage)
- Load `useOptimizedDigest` from localStorage in `openSettings` event handler

#### `web/scripts/index.js`:

- Read `useOptimizedDigest` preference from localStorage
- Conditionally call `wasmExports["digestFeed"]()` or `wasmExports["digestFeedOptimized"]()` based on flag (line 457)

#### `web/scripts/wasm_tests.js`:

- Read `useOptimizedDigest` preference from localStorage
- Conditionally call `wasmExports._digestFeed()` or `wasmExports._digestFeedOptimized()` based on flag (line 296)

### Key Algorithm Flow (Optimized):

```
1. Process overflow: Extract all complete 160-sample chunks using std::copy
2. For each chunk in feed:
   a. Fill overflow up to 160 samples
   b. When overflow reaches 160:
      * Feed decoder directly from overflow (minimize copies)
      * Reset overflow counter
   c. Continue until feed is exhausted
3. Any remaining partial data stays in overflow for next call
```

### Performance Benefits:

- Eliminates redundant no-op assignment
- Reduces memory copies by ~50% (fewer intermediate steps)
- Uses optimized std::copy instead of manual loops
- Simpler control flow reduces branch mispredictions
- Maintains same functionality with improved safety
- Allows A/B testing between old and new implementations

### To-dos

- [ ] Analyze current digestFeed() logic flow and identify all memory operations
- [ ] Design simplified algorithm for overflow+feed processing with minimal copies
- [ ] Implement optimized overflow chunk extraction using std::copy
- [ ] Implement feed data processing with direct decoder feeding
- [ ] Add bounds assertions and validation for overflow counter
- [ ] Verify function handles edge cases: empty overflow, full chunks, partial remainder