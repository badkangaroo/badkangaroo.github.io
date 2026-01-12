# Message Codec and Audio Transmission

## Overview

Ribbit implements a complete message encoding/decoding system that converts text messages into audio signals suitable for HF radio transmission. The system supports multiple message types and uses advanced digital signal processing techniques for reliable communication.

## Message Architecture

### Dual-Mode Design

Ribbit supports two message encoding modes:

1. **Chat Mode (Type 1)** - Human-readable UTF-8 format for general communication
2. **Contest Mode (Type 2)** - Bitwise-packed format optimized for contests and structured data

### Message Structure

All messages follow a 128+ bit structure with the following components:

| Field          | Bits     | Type       | Description                                          |
| -------------- | -------- | ---------- | ---------------------------------------------------- |
| Callsign       | 48       | alphanum   | Ham radio callsign (8 chars max)                     |
| Timestamp      | 31       | composite  | UTC time with 2-second resolution                    |
| Emergency      | 1        | boolean    | Emergency flag                                       |
| Message ID     | 80       | composite  | Unique identifier (Callsign + Timestamp + Emergency) |
| Gridsquare     | 28       | maidenhead | Location (6 chars: AA00aa)                           |
| NTP            | 1        | boolean    | NTP time sync flag                                   |
| GPS            | 1        | boolean    | GPS location flag                                    |
| Name Length    | 8        | nibbles    | FirstName(4) + LastName(4) (0-15 each)               |
| Message Length | 8        | number     | Length in bytes (0-240)                              |
| Message Type   | 2        | number     | 0=Emergency, 1=Chat, 2=Contest, 3=Other              |
| First Name     | variable | alphabit   | 5 bits per char (0-15 chars)                         |
| Last Name      | variable | alphabit   | 5 bits per char (0-15 chars)                         |
| Message        | variable | UTF-8      | Message content (8 bits per byte)                    |
| ACK Array      | variable | alphanum   | Acknowledgement data                                 |

## Encoding Formats

### Alphanum Encoding (Callsign)

6 bits per character, supporting:
- Letters: A-Z (uppercase only)
- Numbers: 0-9
- Space: represented as '/' in some contexts

**Example:** "KO6BVA" → 48 bits

### Alphabit Encoding (Names)

5 bits per character, supporting A-Z only:
- A=1, B=2, ..., Z=26
- Displayed as: First char uppercase, rest lowercase

**Example:** "Alex" → 20 bits (A=1, l=12, e=5, x=24)

### Maidenhead Gridsquare

28 bits total:
- Field: 10 bits (2 letters, AA-ZZ)
- Square: 8 bits (2 numbers, 00-99)
- Subsquare: 10 bits (2 letters, aa-zz)

**Example:** "CM87uq" → 28 bits

### Timestamp Encoding

31 bits with 2-second resolution:
- Year/Month: 10 bits (2026-2111)
- Day: 5 bits (1-31)
- Hour: 5 bits (0-23)
- Minute: 6 bits (0-59, even numbers only)
- Second: 5 bits (0-29, ×2 for 0-58 range)

**Resolution:** 2 seconds (to align with ~1.6s transmission time)

### Message ID Structure

The **Message ID** is a unique 80-bit identifier used to track and deduplicate messages, particularly in Contest Mode. It is constructed by concatenating:

1.  **Callsign** (48 bits)
2.  **Timestamp** (31 bits)
3.  **Emergency Flag** (1 bit)

**Total:** 80 bits (10 bytes)

**Purpose:**
- **Deduplication:** Receivers can identify if they've already processed a message by checking this unique ID.
- **Acknowledgements:** ACKs use this ID (or a hash of it) to confirm receipt of specific messages.
- **Persistence:** The ID remains constant even if the message is retransmitted multiple times.

**Visual Representation:**
In the Web UI, this 80-bit ID is displayed as a **20-character Hexadecimal string**. You can visualize this in:
- **Header Codec** (`headerCodec.html`): Shows the breakdown of the ID bits.
- **Message Demo** (`message_format_demo.html`): Shows the ID generated in real-time for contest messages.

Example: `KO6BVA...` → `4B4F36425641...`

## Message Types

### Type 0: Emergency
- Priority routing
- Reserved for future use
- May include automatic forwarding

### Type 1: Chat
- General conversation
- UTF-8 text with separators
- Format: `Name|Callsign|Gridsquare|Phone&=Message`

### Type 2: Contest
- Bitwise-packed for efficiency
- Optimized for structured data
- Supports acknowledgement arrays

### Type 3: Other
- Extensibility reserved
- Future use

## Audio Transmission

### Signal Characteristics

- **Modulation**: Phase-Shift Keying (PSK)
- **Sample Rate**: 8000 Hz
- **Duration**: ~2.0 seconds (16384 samples)
- **Bandwidth**: Narrowband for HF radio
- **Channels**: Mono

### DSP Processing Pipeline

#### Encoding (Text → Audio):
1. **Message Encoding**: Text to bitstream
2. **Forward Error Correction**: Add redundancy
3. **Interleaving**: Spread errors across time
4. **Modulation**: Bits to phase changes
5. **Pulse Shaping**: Reduce bandwidth
6. **Digital-to-Analog**: Create audio waveform

#### Decoding (Audio → Text):
1. **Analog-to-Digital**: Sample audio
2. **Synchronization**: Find signal timing
3. **Demodulation**: Phase changes to bits
4. **Deinterleaving**: Reorder bits
5. **Error Correction**: Fix errors
6. **Message Decoding**: Bitstream to text

### Key DSP Algorithms

- **FFT**: Frequency domain analysis
- **Hilbert Transform**: Analytic signal generation
- **Phase Detection**: PSK demodulation
- **Viterbi Algorithm**: Error correction (future)
- **Root-raised Cosine**: Pulse shaping

## JavaScript API

### MessageCodec Class

The `MessageCodec` class provides a high-level JavaScript API for encoding and decoding Ribbit messages. It handles all the complex bit manipulation and encoding rules automatically.

#### Importing and Instantiation

```javascript
// ES6 import (recommended)
import { MessageCodec } from './scripts/messageCodec.js';

// Create codec instance
const codec = new MessageCodec();

// Alternative: Direct script loading
// <script src="./scripts/messageCodec.js"></script>
const codec = new window.MessageCodec();
```

### Core API Methods

#### Encoding Workflow

**Individual Field Encoding** (Advanced Usage):

```javascript
// Create a codec instance
const codec = new MessageCodec();

// Encode individual fields (for custom workflows)
const timestampBits = codec.GetTimestampBitStream(new Date());
const callsignBits = codec.GetCallsignBitStream("KO6BVA");
const gridsquareBits = codec.GetGridsquareBitStream("CM87uq");
const emergencyBit = codec.GetEmergencyBit(false);

// Encode names (alphabit: A-Z only, auto-capitalized)
const firstNameBits = codec.GetNameBitStream("Alex");    // 4 chars → 20 bits
const lastNameBits = codec.GetNameBitStream("Okita");    // 5 chars → 25 bits

// Encode message content (UTF-8)
const messageBits = codec.GetMessageBitStream("Hello World! 🌍");

// Combine into complete bitstream (manual approach)
let bitstream = callsignBits + timestampBits + emergencyBits + gridsquareBits +
                firstNameBits + lastNameBits + messageBits;
```

**Complete Message Encoding** (Recommended):

```javascript
const codec = new MessageCodec();

// Encode complete message with automatic field handling
const bitstream = codec.EncodeMessage({
    callsign: "KO6BVA",           // Required: 8 char max, A-Z 0-9 space
    timestamp: new Date(),        // Optional: defaults to now
    gridsquare: "CM87uq",         // Required: 6 char Maidenhead format
    emergency: false,             // Optional: default false
    ntp: true,                    // Optional: NTP time sync flag
    gps: true,                    // Optional: GPS location flag
    messageType: 1,               // Optional: 0=Emergency, 1=Chat, 2=Contest, 3=Other
    firstName: "Alex",            // Optional: 15 char max, A-Z only
    lastName: "Okita",            // Optional: 15 char max, A-Z only
    message: "Testing Ribbit! 📡" // Optional: 240 bytes max UTF-8
});

// Result: Complete bitstream ready for audio encoding
console.log("Encoded bitstream length:", bitstream.length, "bits");
```

#### Decoding Workflow

**Complete Message Decoding**:

```javascript
const codec = new MessageCodec();

// Decode from bitstream to structured data
const decodedMessage = codec.DecodeMessage(bitstream);

// Result object contains all message fields
console.log(decodedMessage);
/*
{
    callsign: "KO6BVA",
    timestamp: 2024-12-26T10:30:00.000Z,
    gridsquare: "CM87uq",
    emergency: false,
    ntp: true,
    gps: true,
    messageType: 1,
    firstName: "Alex",
    lastName: "Okita",
    message: "Testing Ribbit! 📡"
}
*/
```

**Field-by-Field Decoding** (Advanced):

```javascript
// Decode individual components
const callsign = codec.BitStreamToCallsign(bitstream.substring(0, 48));
const timestamp = codec.BitStreamToTimestamp(bitstream.substring(48, 79));
const emergency = codec.BitStreamToEmergency(bitstream.substring(79, 80));
const gridsquare = codec.BitStreamToGridsquare(bitstream.substring(80, 108));

// Names require length information first
const nameLengths = codec.BitStreamToNameLength(bitstream.substring(110, 118));
const firstNameStart = 118;
const firstNameBits = bitstream.substring(firstNameStart,
    firstNameStart + nameLengths.firstNameLength * 5);
const firstName = codec.BitStreamToName(firstNameBits);
```

### Utility Functions

#### Bitstream and Byte Conversion

```javascript
// Convert bitstream to byte array for transmission/storage
const bytes = codec.BitStreamToBytes(bitstream);
console.log("Message size:", bytes.length, "bytes");

// Convert byte array back to bitstream
const recoveredBits = codec.BytesToBitStream(bytes);
console.log("Bitstream integrity:", bitstream === recoveredBits);
```

#### Message Type Utilities

```javascript
// Get human-readable message type name
console.log(codec.GetMessageTypeName(0)); // "Emergency"
console.log(codec.GetMessageTypeName(1)); // "Chat"
console.log(codec.GetMessageTypeName(2)); // "Contest"
console.log(codec.GetMessageTypeName(3)); // "Other"
```

### Integration with WebAssembly

#### Complete Audio Encoding Pipeline

```javascript
import { MessageCodec } from './scripts/messageCodec.js';

// 1. Create codec and encode message
const codec = new MessageCodec();
const bitstream = codec.EncodeMessage({
    callsign: "KO6BVA",
    gridsquare: "CM87uq",
    message: "Hello from Ribbit!"
});

// 2. Load WASM module
const module = await Module();

// 3. Initialize encoder
module._createEncoder();

// 4. Convert bitstream to bytes and allocate memory
const messageBytes = codec.BitStreamToBytes(bitstream);
const messagePtr = module._malloc(messageBytes.length);
module.HEAPU8.set(messageBytes, messagePtr);

// 5. Encode to audio signal
module._initEncoder(messagePtr, messageBytes.length);
module._readEncoder();

// 6. Extract audio buffer
const signalPtr = module._signal_pointer();
const signalLength = module._signal_length();
const audioBuffer = module.HEAPF32.slice(
    signalPtr / 4,
    (signalPtr + signalLength * 4) / 4
);

// 7. Play or save the audio
playAudioBuffer(audioBuffer);

// 8. Cleanup
module._free(messagePtr);
```

#### Complete Audio Decoding Pipeline

**Important**: Ribbit requires continuous audio streaming for real-time message detection. The `onaudioprocess` callback fires repeatedly (typically 43 times per second) to provide a continuous stream of audio data. Messages can arrive at any time from other users, so your application must maintain this audio processing loop.

```javascript
// 1. Load WASM module and initialize decoder
const module = await Module();
module._createDecoder();
const messageCodec = new MessageCodec();

// 2. Set up continuous audio input (microphone)
const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
        echoCancellation: false,    // Critical: preserve radio signal
        noiseSuppression: false,    // Critical: don't filter the signal
        autoGainControl: false,     // Critical: maintain original levels
        sampleRate: 8000           // Required: Ribbit processes at 8000 Hz
    }
});

const audioContext = new AudioContext({ sampleRate: 8000 });
const source = audioContext.createMediaStreamSource(stream);

// 3. Create continuous audio processing loop
const processor = audioContext.createScriptProcessor(2048, 1, 1);

// This callback fires continuously while audio is streaming
processor.onaudioprocess = (event) => {
    const inputBuffer = event.inputBuffer;
    const audioData = inputBuffer.getChannelData(0); // Mono channel

    // Feed this audio chunk to WASM decoder immediately
    const audioPtr = module._malloc(audioData.length * 4);
    module.HEAPF32.set(audioData, audioPtr / 4);

    // Feed audio chunk to decoder (must be called for every chunk)
    module._feedDecoder(audioPtr, audioData.length);

    // Process any complete chunks in decoder buffer
    const result = module._digestFeedOptimized(); // Use optimized version

    module._free(audioPtr);

    // Check if a message was successfully decoded
    if (result >= 0) {
        // Extract the decoded message
        const messagePtr = module._message_pointer();
        const messageLength = module._message_length();

        if (messageLength > 0) {
            const messageBytes = module.HEAPU8.slice(messagePtr, messagePtr + messageLength);
            const bitstream = messageCodec.BytesToBitStream(messageBytes);
            const decodedMessage = messageCodec.DecodeMessage(bitstream);

            console.log("📡 Message received:", decodedMessage);
            handleReceivedMessage(decodedMessage);
        }
    }
    // If result < 0, no complete message was found in this chunk
    // Continue processing - more audio chunks will arrive soon
};

// 4. Connect the audio processing chain
source.connect(processor);
processor.connect(audioContext.destination);

// Audio processing continues indefinitely until stopped
// Messages can arrive at any time during this continuous stream
```

#### Continuous Streaming Requirements

**Why Continuous Processing Matters:**

- **Asynchronous Messages**: Other users can transmit at any time
- **Real-time Detection**: Messages are detected within ~46ms (one audio chunk)
- **No Gaps**: Missing even one audio chunk could lose a message
- **Always Listening**: The application must maintain the audio stream

**Buffer Management Details:**

- **Web Audio API**: Provides 2048-sample chunks (~256ms at 8000 Hz)
- **Decoder Input**: Expects 160-sample chunks (20ms processing units)
- **Automatic Buffering**: Internal overflow buffer handles size differences
- **Memory Safety**: Each chunk is processed and memory freed immediately

**Best Practices:**

```javascript
// Handle audio context suspension (browsers suspend inactive contexts)
async function ensureAudioActive() {
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log("🎧 Audio context resumed - listening for messages");
    }
}

// Resume on user interaction
document.addEventListener('click', ensureAudioActive);
document.addEventListener('touchstart', ensureAudioActive);

// Monitor audio levels for debugging
processor.onaudioprocess = (event) => {
    const audioData = event.inputBuffer.getChannelData(0);
    const rms = Math.sqrt(audioData.reduce((sum, sample) => sum + sample * sample, 0) / audioData.length);

    if (rms < 0.01) {
        console.warn("⚠️ Audio level very low - check microphone/radio connection");
    }

    // Continue with normal processing...
};
```

### Error Handling and Validation

#### Input Validation

```javascript
const codec = new MessageCodec();

try {
    // This will throw an error - invalid gridsquare
    const bitstream = codec.EncodeMessage({
        callsign: "KO6BVA",
        gridsquare: "INVALID",  // Wrong format
        message: "Test"
    });
} catch (error) {
    console.error("Encoding failed:", error.message);
    // Handle validation error
}

try {
    // This will throw an error - bitstream too short
    const decoded = codec.DecodeMessage("101010");
} catch (error) {
    console.error("Decoding failed:", error.message);
    // Handle decoding error
}
```

#### Best Practices

```javascript
const codec = new MessageCodec();

// 1. Validate inputs before encoding
function validateMessageData(data) {
    if (!data.callsign || data.callsign.length > 8) {
        throw new Error("Callsign must be 1-8 characters");
    }
    if (!data.gridsquare || !/^[A-R]{2}[0-9]{2}[A-X]{2}$/i.test(data.gridsquare)) {
        throw new Error("Invalid gridsquare format (AA00aa)");
    }
    if (data.message && new TextEncoder().encode(data.message).length > 240) {
        throw new Error("Message too long (240 bytes max)");
    }
    return true;
}

// 2. Use try-catch for robust error handling
async function encodeAndTransmit(messageData) {
    try {
        validateMessageData(messageData);
        const bitstream = codec.EncodeMessage(messageData);
        const audioBuffer = await encodeToAudio(bitstream);
        await transmitAudio(audioBuffer);
        console.log("Message transmitted successfully");
    } catch (error) {
        console.error("Transmission failed:", error.message);
        // Show user-friendly error message
        showError("Failed to send message: " + error.message);
    }
}

// 3. Check message integrity after decoding
function validateDecodedMessage(decoded) {
    if (!decoded.callsign || !decoded.gridsquare) {
        throw new Error("Invalid message format");
    }
    if (decoded.timestamp > new Date()) {
        console.warn("Message timestamp is in the future");
    }
    return decoded;
}
```

### Performance Considerations

- **Encoding**: ~1-5ms for typical messages
- **Decoding**: ~10-50ms depending on message complexity
- **Memory**: Minimal heap allocation, suitable for real-time use
- **Threading**: Safe for use in Web Workers for background processing

### Advanced Usage Patterns

#### Streaming Message Processing

```javascript
class MessageStreamer {
    constructor(codec) {
        this.codec = codec;
        this.buffer = '';
        this.onMessage = null;
    }

    addBits(bitstream) {
        this.buffer += bitstream;

        // Try to extract complete messages
        while (this.buffer.length >= 128) { // Minimum message size
            try {
                const message = this.codec.DecodeMessage(this.buffer);
                this.buffer = this.buffer.slice(message.bitLength);
                if (this.onMessage) {
                    this.onMessage(message);
                }
            } catch (error) {
                // Not enough data for complete message
                break;
            }
        }
    }
}
```

#### Contest Mode Extensions

```javascript
// Contest mode supports additional features
const contestMessage = codec.EncodeMessage({
    callsign: "KO6BVA",
    gridsquare: "CM87uq",
    messageType: 2,  // Contest mode
    message: "CQ WW", // Can be longer in contest mode
    // Additional contest fields can be added here
});

// Contest mode bitstream will be optimized for efficiency
```

This API provides a complete toolkit for building Ribbit-compatible applications, from simple chat clients to complex contest logging systems.

## WebAssembly Integration

### Audio Encoding

```javascript
// Initialize encoder
module._createEncoder();

// Encode message to audio signal
module._initEncoder(messagePtr, messageLength);
const signalLength = module._readEncoder();

// Get audio buffer
const signalPtr = module._signal_pointer();
const audioBuffer = module.HEAPF32.subarray(
    signalPtr / 4,
    (signalPtr + signalLength * 4) / 4
);
```

### Audio Decoding

```javascript
// Initialize decoder
module._createDecoder();

// Feed audio samples
module._feedDecoder(audioPtr, audioLength);

// Process and decode
const result = module._digestFeed();

// Get decoded message
const messagePtr = module._message_pointer();
const messageLength = module._message_length();
const message = module.UTF8ToString(messagePtr, messageLength);
```

## Transmission Protocol

### Message Lifecycle

1. **Composition**: User creates message
2. **Encoding**: Text → bits → audio signal
3. **Transmission**: Audio played through radio
4. **Propagation**: HF radio wave transmission
5. **Reception**: Remote station receives audio
6. **Decoding**: Audio → bits → text
7. **Display**: Message shown to user

### Error Handling

- **CRC Checksums**: Detect corrupted messages
- **Forward Error Correction**: Recover from bit errors
- **Interleaving**: Spread burst errors
- **Synchronization**: Maintain timing lock
- **Fallback Modes**: Graceful degradation

### Performance Characteristics

- **Encoding Time**: < 100ms
- **Decoding Time**: ~1-2 seconds
- **Reliability**: 90-95% success rate in good conditions
- **Range**: Hundreds to thousands of miles (HF dependent)

## Contest Mode Details

### Packed Format Advantages

- **Efficiency**: ~70-80% space utilization
- **Structure**: Fixed fields, no delimiters
- **Speed**: Faster encoding/decoding
- **ACK Support**: Built-in acknowledgement arrays

### Field Layout

```
Base Header (120 bits):
├── Callsign: 48 bits
├── Timestamp: 31 bits
├── Emergency: 1 bit
├── Gridsquare: 28 bits
├── NTP: 1 bit
├── GPS: 1 bit
├── Name Length: 8 bits
├── Message Length: 8 bits
└── Message Type: 2 bits

Variable Data:
├── First Name: 0-75 bits (5 bits × 0-15 chars)
├── Last Name: 0-75 bits (5 bits × 0-15 chars)
├── Message: 0-1920 bits (8 bits × 0-240 bytes)
└── ACK Array: 0-1920 bits (variable)
```

### ACK System

Contest mode supports message acknowledgements:
- **Format**: Callsign + Timestamp pairs
- **Purpose**: Confirm message receipt
- **Size**: Variable, trades with message space

## Limitations and Constraints

### Message Size Limits

- **Callsign**: 8 characters max
- **Gridsquare**: Valid Maidenhead format only
- **Names**: 15 letters max each (A-Z only)
- **Message**: 240 bytes max (UTF-8)
- **Timestamp**: 2026-2111 range, 2-second resolution

### Technical Constraints

- **Audio Sample Rate**: Fixed at 8000 Hz
- **Transmission Time**: ~2 seconds
- **Bandwidth**: Narrowband HF
- **Modulation**: PSK only (currently)
- **Error Correction**: Basic (FEC planned)

### Character Encoding

- **Callsign**: Alphanum (A-Z, 0-9)
- **Names**: Alphabit (A-Z only, cased on display)
- **Message**: Full UTF-8 support
- **Gridsquare**: Maidenhead standard (AA00aa)

## Future Enhancements

### Planned Features

- **Viterbi Decoding**: Improved error correction
- **Multiple Modulation Schemes**: QAM, FSK options
- **Adaptive Rate**: Variable data rates
- **Compression**: Message compression
- **Authentication**: Message signing
- **Encryption**: Optional encryption layer

### Extended Message Types

- **Type 0 (Emergency)**: Priority routing, automatic forwarding
- **Type 3 (Other)**: Plugin system for custom formats

## Implementation Notes

### Bit Ordering

- All multi-byte fields: big-endian
- Bitstreams: MSB first
- Arrays: Sequential packing

### Memory Management

- WebAssembly heap: 16-64MB allocation
- Buffer reuse: Minimize allocations
- Cleanup: Explicit memory management

### Cross-Platform Compatibility

- **Browsers**: Chrome, Firefox, Safari, Edge
- **Audio**: Web Audio API
- **Files**: WAV export/import
- **Network**: Local server required (CORS)

## Testing and Validation

### Test Vectors

- Known message → bitstream → audio → bitstream → message
- Edge cases: Min/max lengths, special characters
- Error conditions: Corrupted audio, timing errors

### Performance Benchmarks

- Encoding/decoding speed
- Memory usage patterns
- Success rates vs. SNR
- Cross-browser compatibility

### Field Testing

- Real HF radio transmission
- Various propagation conditions
- Different radio equipment
- Long-distance communication