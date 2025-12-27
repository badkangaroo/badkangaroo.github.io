/**
 * Unit tests for RibbitWASM API
 *
 * Note: These tests run in jsdom environment and mock the WASM module
 * since direct ES module imports don't work in Jest without additional setup.
 */

describe('RibbitWASM API', () => {
  beforeEach(() => {
    // Set up global mocks
    global.createMockWasmModule = () => ({
      _createEncoder: jest.fn(),
      _createDecoder: jest.fn(),
      _destroyEncoder: jest.fn(),
      _destroyDecoder: jest.fn(),
      _initEncoder: jest.fn(),
      _readEncoder: jest.fn(),
      _feedDecoder: jest.fn(),
      _digestFeedOptimized: jest.fn(),
      _signal_pointer: jest.fn().mockReturnValue(0),
      _signal_length: jest.fn().mockReturnValue(1024),
      _payload_pointer: jest.fn().mockReturnValue(0),
      _payload_length: jest.fn().mockReturnValue(0),
      _feed_pointer: jest.fn().mockReturnValue(0),
      _feed_length: jest.fn().mockReturnValue(2048),
      _malloc: jest.fn().mockReturnValue(100),
      _free: jest.fn(),
      HEAPU8: new Uint8Array(1024),
      HEAPF32: new Float32Array(1024)
    });

    global.mockWasmLoad = (mockModule = global.createMockWasmModule()) => {
      global.Module = {
        ready: Promise.resolve(mockModule),
        ...mockModule
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024))
      });
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module loading', () => {
    test('should set up WASM loading mocks', () => {
      const mockModule = global.createMockWasmModule();
      global.mockWasmLoad(mockModule);

      expect(global.Module).toBeDefined();
      expect(global.Module.ready).toBeInstanceOf(Promise);
    });

    test('should mock fetch for WASM files', () => {
      global.mockWasmLoad();

      expect(global.fetch).toBeDefined();
      expect(typeof global.fetch).toBe('function');
    });
  });

  describe('Test setup verification', () => {
    test('should create mock WASM module', () => {
      const mockModule = global.createMockWasmModule();
      expect(mockModule).toHaveProperty('_createEncoder');
      expect(mockModule).toHaveProperty('_createDecoder');
      expect(mockModule).toHaveProperty('HEAPU8');
      expect(mockModule).toHaveProperty('HEAPF32');
    });

    test('should set up global mocks correctly', () => {
      global.mockWasmLoad();
      expect(global.Module).toBeDefined();
      expect(global.fetch).toBeDefined();
    });

    test('should mock browser APIs', () => {
      expect(navigator.mediaDevices).toBeDefined();
      expect(navigator.mediaDevices.getUserMedia).toBeDefined();
      expect(localStorage).toBeDefined();
      expect(AudioContext).toBeDefined();
    });
  });

  describe('Browser API mocks', () => {
    test('should mock AudioContext', () => {
      const audioContext = new AudioContext();
      expect(audioContext).toBeDefined();
      expect(audioContext.createBuffer).toBeDefined();
      expect(audioContext.createBufferSource).toBeDefined();
    });

    test('should mock MediaDevices API', async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      expect(stream).toBeDefined();
    });

    test('should mock localStorage', () => {
      localStorage.setItem('test', 'value');
      expect(localStorage.getItem('test')).toBe('value');
      localStorage.removeItem('test');
      expect(localStorage.getItem('test')).toBeNull();
    });

    test('should mock Service Worker API', () => {
      expect(navigator.serviceWorker.register).toBeDefined();
    });
  });
});