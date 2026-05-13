# Ribbit WebAssembly API

## Overview

The Ribbit WebAssembly API provides a simple, promise-based interface for encoding and decoding digital radio messages. This replaces the complex manual memory management with an easy-to-use API that handles everything automatically.

## Quick Start

```javascript
import { RibbitWASM } from './scripts/ribbit-wasm.js';

// One-line initialization
const ribbit = await RibbitWASM.load();

// Encode a message
const audioBuffer = await ribbit.encodeMessage("Hello World!");

// Decode audio (if you have received audio)
const decoded = await ribbit.decodeAudio(audioBuffer);
if (decoded) {
    console.log("Received:", decoded.text);
}
```

## API Reference

### RibbitWASM Class

#### `RibbitWASM.load()`
Loads and initializes the WebAssembly module.
- **Returns**: `Promise<RibbitWASM>` - Ready-to-use instance

#### `encodeMessage(text, options)`
Encodes a text message into audio.
- **Parameters**:
  - `text` (string): Message to encode
  - `options` (EncodeOptions, optional): Encoding options
- **Returns**: `Promise<Float32Array>` - Audio buffer

#### `decodeAudio(audioBuffer)`
Decodes audio data into a message.
- **Parameters**:
  - `audioBuffer` (Float32Array|ArrayBuffer): Audio data to decode
- **Returns**: `Promise<DecodeResult|null>` - Decoded message or null

#### `decodeStream(stream)`
Starts real-time decoding from an audio stream.
- **Parameters**:
  - `stream` (MediaStream): Audio stream to decode
- **Returns**: `Promise<EventTarget>` - Event emitter with 'message' and 'error' events

#### `getMemoryUsage()`
Gets current memory usage statistics.
- **Returns**: `MemoryUsage` object

#### `destroy()`
Cleans up resources and frees memory.

### EncodeOptions

```typescript
interface EncodeOptions {
    callsign?: string;    // Default: "NOCALL"
    gridsquare?: string;  // Default: "AA00aa"
    name?: string;        // Default: "" — for contest mode (type 2), split on whitespace into first / last segment for the packed header (5-bit alphabit each); see Docs/codec.md
    emergency?: boolean;  // Default: false
    ntp?: boolean;        // Default: false
    gps?: boolean;        // Default: false
    messageType?: number; // Default: 1 (chat); use 2 for contest / packed payload
}
```

For the low-level bit layout (callsign 6-bit alphanum vs names 5-bit alphabit, field order), see **[codec.md](codec.md)**.

### DecodeResult

```typescript
interface DecodeResult {
    text: string;        // Decoded message text
    callsign: string;    // Sender's callsign
    gridsquare: string;  // Sender's gridsquare
    name: string;        // Sender's name
    timestamp: Date;     // Message timestamp
    emergency: boolean;  // Emergency flag
    ntp: boolean;        // NTP flag
    gps: boolean;        // GPS flag
    confidence: number;  // Decoding confidence (0-1)
}
```

## Examples

### Basic Encoding
```javascript
const ribbit = await RibbitWASM.load();
const audio = await ribbit.encodeMessage("CQ CQ DE TESTCALL");
console.log("Encoded", audio.length, "audio samples");
```

### Advanced Encoding
```javascript
const audio = await ribbit.encodeMessage("Weather report: 72°F, clear skies", {
    callsign: "WX0ABC",
    gridsquare: "DM43jk",
    name: "Weather Station",
    emergency: false,
    messageType: 2  // Might be weather type
});
```

### Real-time Decoding
```javascript
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const decoder = await ribbit.decodeStream(stream);

decoder.addEventListener('message', (event) => {
    const msg = event.detail;
    console.log(`${msg.callsign}: ${msg.text}`);
});

decoder.addEventListener('error', (event) => {
    console.error('Decoding error:', event.detail);
});

// Stop after 5 minutes
setTimeout(() => decoder.stop(), 5 * 60 * 1000);
```

### Memory Management
```javascript
const ribbit = await RibbitWASM.load();

// Check memory usage
console.log(ribbit.getMemoryUsage());

// ... use the API ...

// Clean up when done
ribbit.destroy();
```

## Error Handling

The API throws descriptive errors for common issues:

```javascript
try {
    const ribbit = await RibbitWASM.load();
    await ribbit.encodeMessage("");  // Empty message
} catch (error) {
    console.log(error.message);  // "Message text must be a string"
}
```

## Browser Compatibility

- **WebAssembly**: All modern browsers
- **ES6 Modules**: Modern browsers (Safari 10.1+, Chrome 61+, Firefox 60+)
- **Audio API**: All modern browsers

## Files

- `ribbit-wasm.js` - Main API implementation
- `ribbit-wasm.d.ts` - TypeScript definitions
- `test_wasm_api.html` - API test page
- `example_usage.js` - Usage examples

## Migration from Legacy API

### Old Way (Complex)
```javascript
// Manual WASM loading
const module = await Module();
module._createEncoder();
module._initEncoder(messagePtr, messageLength);
// Manual memory management required
const ptr = module._malloc(size);
module._free(ptr);
```

### New Way (Simple)
```javascript
// One-line loading
const ribbit = await RibbitWASM.load();
// Automatic memory management
const audio = await ribbit.encodeMessage("Hello!");
```

## Performance

- **Memory**: Automatic management prevents leaks
- **Speed**: Optimized WASM with SIMD support where available
- **Compatibility**: Works across all modern browsers

## Testing

Run the test suite:
```bash
# Open in browser
open test_wasm_api.html
```

Or run individual examples:
```javascript
import './example_usage.js';
// Then call RibbitExamples.basicExample()
```