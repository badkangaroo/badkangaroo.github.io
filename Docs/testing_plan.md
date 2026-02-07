# Ribbit Testing Plan

## Executive Summary

This document outlines a comprehensive testing strategy for the Ribbit WebAssembly module and web application. Given the unique challenges of testing WebAssembly code and its JavaScript integration, we need a multi-layered approach that ensures reliability, performance, and cross-platform compatibility.

## Testing Objectives

- **Reliability**: Ensure WASM functions work correctly across all supported platforms
- **Performance**: Maintain consistent encoding/decoding speeds and memory usage
- **Compatibility**: Verify functionality across browsers and devices
- **Developer Experience**: Provide fast feedback during development
- **User Experience**: Ensure the web app works seamlessly in real-world conditions

## Testing Architecture

### 1. Unit Testing Layer

#### WASM Function Testing
**Framework**: Custom WASM test runner with JavaScript harness
**Scope**: Test individual WASM exports and internal functions
**Challenges**:
- WASM memory management testing
- Cross-compilation validation
- SIMD instruction testing

**Implementation Strategy**:
```javascript
// test/wasm_test_runner.js
class WASMTestRunner {
  async testEncoderInitialization() {
    const module = await loadRibbitWASM();
    const encoderPtr = module._createEncoder();

    // Test memory allocation
    expect(encoderPtr).toBeGreaterThan(0);

    // Test encoder state
    const state = module._getEncoderState(encoderPtr);
    expect(state).toBe(ENCODER_READY);
  }
}
```

#### JavaScript API Testing
**Framework**: Jest with custom WASM mocks
**Scope**: Test the RibbitWASM wrapper class and message classes
**Tools**:
- Jest for test runner and assertions
- Custom WASM module mocks for isolated testing
- Memory leak detection utilities

### 2. Integration Testing Layer

#### WASM-JavaScript Integration
**Framework**: Jest with real WASM modules
**Scope**: Test the complete API workflow
**Test Cases**:
- Message encoding/decoding roundtrips
- Memory management correctness
- Error handling and recovery
- Performance benchmarks

**Example Test Structure**:
```javascript
// test/integration/encoding.test.js
describe('Message Encoding Integration', () => {
  let ribbit;

  beforeAll(async () => {
    ribbit = await RibbitWASM.load();
  });

  test('encodes and decodes simple message', async () => {
    const original = "Hello World!";
    const audioBuffer = await ribbit.encodeMessage(original);
    const decoded = await ribbit.decodeAudio(audioBuffer);

    expect(decoded.text).toBe(original);
    expect(decoded.confidence).toBeGreaterThan(0.9);
  });

  test('handles memory cleanup', async () => {
    const initialMemory = ribbit.getMemoryUsage();
    await ribbit.encodeMessage("Test message");
    const finalMemory = ribbit.getMemoryUsage();

    expect(finalMemory).toBeLessThanOrEqual(initialMemory * 1.1);
  });
});
```

#### Web App Integration
**Framework**: Jest + Testing Library
**Scope**: Test React-like components and user interactions
**Tools**:
- React Testing Library for component testing
- Custom hooks for WASM state management
- Mock Service Worker for API testing

### 3. End-to-End Testing Layer

#### Browser-Based E2E Testing
**Framework**: Playwright
**Scope**: Full user workflows in real browsers
**Test Scenarios**:
- Complete message sending workflow
- Settings configuration
- Audio playback/recording
- Offline functionality
- Mobile responsiveness

**Example E2E Test**:
```javascript
// test/e2e/message_workflow.spec.js
test('user can send and receive messages', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Setup user
  await page.fill('[data-testid="callsign-input"]', 'TESTCALL');
  await page.fill('[data-testid="gridsquare-input"]', 'AA00aa');
  await page.click('[data-testid="setup-complete"]');

  // Send message
  await page.fill('[data-testid="message-input"]', 'Hello from E2E test!');
  await page.click('[data-testid="send-button"]');

  // Verify encoding
  await expect(page.locator('[data-testid="encoding-indicator"]')).toBeVisible();
  await expect(page.locator('[data-testid="encoding-indicator"]')).toBeHidden();

  // Verify audio generation
  const audioElements = page.locator('audio');
  await expect(audioElements).toHaveCount(1);
});
```

#### Cross-Browser Testing
**Platforms**: Chrome, Firefox, Safari, Edge
**Automation**: Playwright with BrowserStack or Sauce Labs
**Focus Areas**:
- WASM loading and execution
- Audio API compatibility
- WebRTC functionality
- Service Worker support

### 4. Performance Testing Layer

#### Benchmark Testing
**Framework**: Custom benchmark suite with Tachometer
**Metrics**:
- Encoding/decoding throughput
- Memory usage patterns
- CPU utilization
- Load times

**Implementation**:
```javascript
// test/performance/benchmarks.js
const benchmarks = {
  async encodeMessageBenchmark() {
    const ribbit = await RibbitWASM.load();
    const testMessage = "CQ CQ DE TESTCALL TESTCALL";

    return tachometer({
      name: 'Message Encoding',
      size: 'small',
      async setup() {
        return { ribbit, message: testMessage };
      },
      async benchmark({ ribbit, message }) {
        await ribbit.encodeMessage(message);
      }
    });
  }
};
```

#### Memory Leak Testing
**Tools**: Chrome DevTools Protocol, custom memory monitors
**Detection**:
- Heap growth monitoring
- WASM memory allocation tracking
- Garbage collection pressure testing

### 5. Compatibility Testing Layer

#### Platform Matrix
- **Desktop**: Windows, macOS, Linux
- **Mobile**: iOS Safari, Android Chrome
- **Browsers**: Latest 2 versions + current ESR
- **WASM Support**: Check for required features (SIMD, threads if used)

#### Feature Detection Testing
**Implementation**:
```javascript
// test/compatibility/feature_detection.test.js
describe('WebAssembly Feature Support', () => {
  test('WASM is supported', () => {
    expect(typeof WebAssembly).toBe('object');
  });

  test('SIMD support detected', async () => {
    const hasSIMD = await checkSIMDSupport();
    expect(hasSIMD).toBeDefined();
  });

  test('Audio API available', () => {
    expect(typeof AudioContext).toBe('function');
  });
});
```

## Testing Infrastructure

### CI/CD Integration

#### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit

  wasm-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm run build:wasm
      - run: npm run test:wasm

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm run build
      - run: npm run test:e2e

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run test:perf
```

### Test Data Management

#### Test Assets
- Sample audio files for decoding tests
- Known-good message encodings
- Performance baseline data
- Cross-browser compatibility matrices

#### Test Utilities
```javascript
// test/utils/test_helpers.js
export class RibbitTestHelpers {
  static createMockAudioBuffer(length = 1024) {
    return new Float32Array(length).fill(0.1);
  }

  static createTestMessage(options = {}) {
    return {
      text: options.text || "Test message",
      callsign: options.callsign || "TESTCALL",
      gridsquare: options.gridsquare || "AA00aa",
      timestamp: Date.now(),
      ...options
    };
  }

  static async measurePerformance(fn, iterations = 100) {
    const times = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      times.push(performance.now() - start);
    }
    return {
      average: times.reduce((a, b) => a + b) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      p95: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]
    };
  }
}
```

## Test Organization

### Directory Structure
```
test/
├── unit/
│   ├── wasm/           # Direct WASM function tests
│   ├── api/            # JavaScript API tests
│   └── utils/          # Helper function tests
├── integration/
│   ├── encoding/       # Encoding workflow tests
│   ├── decoding/       # Decoding workflow tests
│   └── memory/         # Memory management tests
├── e2e/
│   ├── workflows/      # User journey tests
│   └── compatibility/  # Cross-platform tests
├── performance/
│   ├── benchmarks/     # Performance benchmarks
│   └── memory/         # Memory usage tests
└── utils/
    ├── helpers.js      # Test utilities
    └── fixtures/       # Test data
```

### Test Categories by Maturity

#### Smoke Tests (Must Pass)
- WASM module loads successfully
- Basic encoding/decoding works
- Memory doesn't leak in simple cases
- Web app renders without errors

#### Regression Tests (Block Release)
- All previously working functionality
- Performance doesn't degrade >10%
- Memory usage stays within bounds
- Cross-browser compatibility maintained

#### Feature Tests (New Functionality)
- New API endpoints work correctly
- Error handling works as expected
- Edge cases handled properly

## Success Metrics

### Test Coverage
- **Unit Tests**: >90% line coverage for JavaScript code
- **Integration Tests**: All major workflows covered
- **E2E Tests**: Critical user journeys automated
- **Performance Tests**: Benchmarks run regularly with alerts

### Quality Gates
- All tests pass on main branch
- Performance regressions blocked
- Security scans pass
- Accessibility scores maintained

### Monitoring and Alerting
- Test flakiness detection
- Performance regression alerts
- Browser compatibility monitoring
- Memory leak detection in CI

## Implementation Timeline

### Phase 1: Foundation (Week 1-2)
- Set up Jest and Playwright
- Create basic test structure
- Implement unit tests for existing API

### Phase 2: Integration (Week 3-4)
- Build WASM test harness
- Create integration test suite
- Set up CI/CD pipeline

### Phase 3: Enhancement (Week 5-6)
- Add performance testing
- Implement cross-browser testing
- Create comprehensive test utilities

### Phase 4: Optimization (Week 7-8)
- Performance optimization based on benchmarks
- Test reliability improvements
- Documentation and training

## Conclusion

This testing plan provides a robust foundation for ensuring Ribbit's reliability and performance as we implement the new friendly WASM API. By layering our testing approach from unit tests through E2E workflows, we can catch issues early and maintain confidence in our releases.

The key insight is that WebAssembly testing requires special consideration for memory management, performance characteristics, and cross-platform compatibility. Our multi-layered approach ensures we catch issues at the appropriate level while maintaining fast feedback for developers.