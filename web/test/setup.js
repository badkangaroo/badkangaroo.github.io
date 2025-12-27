/**
 * Jest setup file for Ribbit web app tests
 */

// Mock WebAssembly for testing
global.WebAssembly = {
  instantiate: jest.fn(),
  instantiateStreaming: jest.fn(),
  compile: jest.fn(),
  compileStreaming: jest.fn(),
  validate: jest.fn(),
  Module: jest.fn(),
  Instance: jest.fn(),
  Memory: jest.fn(),
  Table: jest.fn(),
  Global: jest.fn()
};

// Mock AudioContext and related APIs
global.AudioContext = jest.fn().mockImplementation(() => ({
  createBuffer: jest.fn(),
  createBufferSource: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    onended: null
  })),
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn()
  })),
  createScriptProcessor: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    onaudioprocess: null
  })),
  destination: {},
  state: 'running',
  resume: jest.fn().mockResolvedValue(),
  close: jest.fn()
}));

global.webkitAudioContext = global.AudioContext;

// Mock MediaDevices API
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([]),
      getAudioTracks: jest.fn().mockReturnValue([])
    })
  },
  writable: true
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock indexedDB
global.indexedDB = {
  open: jest.fn().mockReturnValue({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    onblocked: null
  }),
  deleteDatabase: jest.fn()
};

// Mock Service Worker
global.navigator.serviceWorker = {
  register: jest.fn().mockResolvedValue({
    scope: '/',
    update: jest.fn(),
    unregister: jest.fn()
  }),
  ready: Promise.resolve({
    active: {},
    waiting: null,
    controlling: {}
  })
};

// Mock fetch for WASM loading
global.fetch = jest.fn();

// Mock URL APIs for WAV file saving
global.URL = {
  createObjectURL: jest.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: jest.fn()
};

// Mock document.createElement for audio elements
const originalCreateElement = document.createElement;
document.createElement = jest.fn((tagName) => {
  if (tagName === 'a') {
    return {
      href: '',
      download: '',
      click: jest.fn(),
      style: {}
    };
  }
  if (tagName === 'audio') {
    return {
      autoplay: false,
      src: '',
      play: jest.fn().mockResolvedValue(),
      pause: jest.fn(),
      load: jest.fn()
    };
  }
  return originalCreateElement.call(document, tagName);
});

// Mock Blob
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  options,
  size: content ? content.length : 0,
  type: options?.type || ''
}));

// Mock TextEncoder and TextDecoder
global.TextEncoder = jest.fn().mockImplementation(() => ({
  encode: jest.fn((str) => {
    // Simple mock - return byte array from string length
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i) & 0xFF;
    }
    return bytes;
  })
}));

global.TextDecoder = jest.fn().mockImplementation(() => ({
  decode: jest.fn((bytes) => {
    // Simple mock - convert back to string
    let str = '';
    if (bytes instanceof Uint8Array) {
      for (let i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
      }
    }
    return str;
  })
}));

// Helper function to create mock WASM module
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

// Helper to mock the WASM loading
global.mockWasmLoad = (mockModule = createMockWasmModule()) => {
  // Mock the Module.ready promise
  global.Module = {
    ready: Promise.resolve(mockModule),
    ...mockModule
  };

  // Mock fetch for WASM file
  global.fetch.mockResolvedValue({
    ok: true,
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024))
  });
};