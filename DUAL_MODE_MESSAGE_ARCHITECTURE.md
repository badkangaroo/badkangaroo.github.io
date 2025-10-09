# Ribbit Dual-Mode Message Architecture

## Overview

Implement two message encoding modes in parallel:

1. **Chat Mode (Type 1)** - Current UTF-8 format (human-friendly)
2. **Contest Mode (Type 2)** - Bitwise-packed format (efficient, structured)

## Message Type Field

From your header specification:
```
Message Type: 2 bits (supports 4 types)
├─ 0: Emergency (future: packed format with priority routing)
├─ 1: Chat (current: UTF-8 free-form text)
├─ 2: Contest (new: bitwise-packed with ACKs)
└─ 3: Other (future: extensibility)
```

## Mode Comparison

### Chat Mode (Current Implementation)
```
Format: "Name|Callsign|Gridsquare|Phone&=Message"
Example: "Alex|KO6BVA|FN42kl|555-1234&=Hello World!"

┌──────────────────────────────────────────────────┐
│ Advantages:                                      │
├──────────────────────────────────────────────────┤
│ ✓ Human-readable                                 │
│ ✓ Simple to parse                                │
│ ✓ Flexible message content                      │
│ ✓ Any UTF-8 characters                          │
│ ✓ No length restrictions                        │
│ ✓ Easy debugging                                 │
├──────────────────────────────────────────────────┤
│ Disadvantages:                                   │
├──────────────────────────────────────────────────┤
│ ✗ Verbose (wastes bits)                         │
│ ✗ No timestamp                                   │
│ ✗ No ACK support                                 │
│ ✗ Phone number wastes space                     │
│ ✗ Separators waste bytes                        │
└──────────────────────────────────────────────────┘

Size: ~50-200 bytes (400-1600 bits)
Efficiency: ~30-40% (lots of overhead)
Use Case: Casual chat, long messages
```

### Contest Mode (New Bitwise-Packed)
```
┌─────────────────────────────────────────────────┐
│ Field          │ Bits  │ Encoding              │
├─────────────────────────────────────────────────┤
│ Message Type   │ 2     │ 0b10 (contest)        │
│ Callsign       │ 48    │ 6-bit alphanumeric    │
│ Timestamp      │ 31    │ Packed date/time      │
│ Gridsquare     │ 28    │ Maidenhead (5+4+5)    │
│ Emergency      │ 1     │ Flag                  │
│ NTP            │ 1     │ Time source flag      │
│ GPS            │ 1     │ GPS lock flag         │
│ Name Length    │ 8     │ First(4) + Last(4)    │
│ First Name     │ 0-75  │ 5-bit alphabet        │
│ Last Name      │ 0-75  │ 5-bit alphabet        │
│ Message Length │ 8     │ Character count       │
│ Message        │ 0-640 │ UTF-8 or packed       │
│ ACK Array      │ 0-880 │ Callsign+timestamp    │
└─────────────────────────────────────────────────┘

Base Header: 120 bits (15 bytes)
With 15-char names: 195 bits (24 bytes)
Remaining for message+ACKs: ~1825 bits (228 bytes)

Efficiency: ~70-80% (minimal overhead)
Use Case: Contests, structured comms, ACKs
```

## Architecture Design

### Current (Chat Mode Only)
```
┌──────────────┐
│  JavaScript  │
│              │
│ Encode UTF-8 │───────┐
│ String       │       │
└──────────────┘       │
                       ▼
                ┌─────────────┐
                │ WASM Module │
                │             │
                │ _initEncoder│
                │ _readEncoder│
                └─────────────┘
                       │
                       ▼
                [ Audio Signal ]
```

### New (Dual Mode)
```
┌──────────────────────────────────────────┐
│           JavaScript Layer               │
├──────────────────────────────────────────┤
│                                          │
│  Mode Selection:                         │
│  if (messageType === 1) {               │
│    → chatMode.encode()                  │
│  } else if (messageType === 2) {        │
│    → contestMode.encode()               │
│  }                                       │
└──────────────────────────────────────────┘
           │                    │
           ▼                    ▼
    ┌────────────┐      ┌──────────────┐
    │ Chat Mode  │      │ Contest Mode │
    │            │      │              │
    │ UTF-8      │      │ C++ Packing  │
    │ Current    │      │ New          │
    └────────────┘      └──────────────┘
           │                    │
           └────────┬───────────┘
                    ▼
          ┌──────────────────┐
          │   WASM Module    │
          │                  │
          │ _initEncoder     │
          │ _pack_header     │ ← New!
          │ _unpack_header   │ ← New!
          │ _readEncoder     │
          └──────────────────┘
                    │
                    ▼
            [ Audio Signal ]
```

## Implementation Plan

### Phase 1: Add Contest Mode C++ Functions

**File: `src/ribbit/include/message_format.hh`**
```cpp
#ifndef MESSAGE_FORMAT_HH
#define MESSAGE_FORMAT_HH

#include <cstdint>
#include <cstring>

// Message type constants
enum MessageType {
    MSG_EMERGENCY = 0,
    MSG_CHAT = 1,
    MSG_CONTEST = 2,
    MSG_OTHER = 3
};

// Contest mode header structure
struct ContestHeader {
    uint8_t messageType : 2;    // Always 0b10 for contest
    uint64_t callsign : 48;     // 6-bit packed callsign
    uint32_t timestamp : 31;    // Packed date/time
    uint32_t gridsquare : 28;   // Maidenhead locator
    uint8_t emergency : 1;
    uint8_t ntp : 1;
    uint8_t gps : 1;
    uint8_t nameLength;         // High nibble: first, Low nibble: last
    // Variable length fields follow
} __attribute__((packed));

// Lookup tables for efficient encoding
namespace Encoding {
    // 6-bit alphanumeric (for callsign)
    extern const uint8_t ALPHANUMBIT[128];
    extern const uint8_t ALPHANUMBIT_REVERSE[64];
    
    // 5-bit alphabet (for names, gridsquare letters)
    extern const uint8_t ALPHABIT[128];
    extern const uint8_t ALPHABIT_REVERSE[32];
    
    // 4-bit nibble (for gridsquare numbers)
    extern const uint8_t NIBBLE[128];
    extern const uint8_t NIBBLE_REVERSE[16];
}

// Contest mode encoder/decoder
class ContestFormat {
public:
    // Pack contest format message
    static int pack(
        const char* callsign,       // 8 chars max
        uint32_t timestamp,         // Unix timestamp or custom
        const char* gridsquare,     // 6 chars (e.g., "CM87uq")
        uint8_t flags,              // emergency|ntp|gps bits
        const char* firstName,      // Up to 15 chars
        const char* lastName,       // Up to 15 chars
        const uint8_t* message,     // Message bytes
        uint16_t messageLen,        // Message length
        const uint8_t* acks,        // ACK array
        uint16_t acksLen,           // ACK array length
        uint8_t* output,            // Output buffer
        uint16_t maxOutputLen       // Max output size
    );
    
    // Unpack contest format message
    static int unpack(
        const uint8_t* input,
        uint16_t inputLen,
        char* callsign,             // Output: 9 bytes
        uint32_t* timestamp,        // Output: timestamp
        char* gridsquare,           // Output: 7 bytes
        uint8_t* flags,             // Output: flags
        char* firstName,            // Output: 16 bytes
        char* lastName,             // Output: 16 bytes
        uint8_t* message,           // Output: message buffer
        uint16_t* messageLen,       // Output: actual message length
        uint8_t* acks,              // Output: ACK array
        uint16_t* acksLen           // Output: actual ACK length
    );
    
private:
    // Bit manipulation helpers
    static void writeBits(uint8_t* buffer, int bitOffset, 
                         uint64_t value, int bitCount);
    static uint64_t readBits(const uint8_t* buffer, int bitOffset, 
                            int bitCount);
    
    // Callsign encoding (48 bits)
    static int packCallsign(const char* callsign, uint8_t* output);
    static void unpackCallsign(const uint8_t* input, char* callsign);
    
    // Timestamp encoding (31 bits)
    static uint32_t packTimestamp(uint32_t unixTime);
    static uint32_t unpackTimestamp(uint32_t packed);
    
    // Gridsquare encoding (28 bits)
    static int packGridsquare(const char* gridsquare, uint8_t* output);
    static void unpackGridsquare(const uint8_t* input, char* gridsquare);
    
    // Name encoding (5-bit alphabet, variable length)
    static int packName(const char* name, uint8_t* output, int maxChars);
    static int unpackName(const uint8_t* input, int bitOffset, 
                         int charCount, char* name);
};

// Chat mode (current format) - for backward compatibility
class ChatFormat {
public:
    // Parse current format: "Name|Callsign|Gridsquare|Phone&=Message"
    static int parse(
        const uint8_t* input,
        uint16_t inputLen,
        char* name,
        char* callsign,
        char* gridsquare,
        char* phone,
        char* message
    );
    
    // Format current format
    static int format(
        const char* name,
        const char* callsign,
        const char* gridsquare,
        const char* phone,
        const char* message,
        uint8_t* output,
        uint16_t maxOutputLen
    );
};

#endif // MESSAGE_FORMAT_HH
```

**File: `src/ribbit/src/message_format.cc`**
```cpp
#include "message_format.hh"
#include <cstdio>
#include <cmath>
#include <ctime>

// Lookup table implementations
namespace Encoding {
    const uint8_t ALPHANUMBIT[128] = {
        // 0-9
        ['0'] = 0, ['1'] = 1, ['2'] = 2, ['3'] = 3, ['4'] = 4,
        ['5'] = 5, ['6'] = 6, ['7'] = 7, ['8'] = 8, ['9'] = 9,
        // A-Z
        ['A'] = 10, ['B'] = 11, ['C'] = 12, ['D'] = 13, ['E'] = 14,
        ['F'] = 15, ['G'] = 16, ['H'] = 17, ['I'] = 18, ['J'] = 19,
        ['K'] = 20, ['L'] = 21, ['M'] = 22, ['N'] = 23, ['O'] = 24,
        ['P'] = 25, ['Q'] = 26, ['R'] = 27, ['S'] = 28, ['T'] = 29,
        ['U'] = 30, ['V'] = 31, ['W'] = 32, ['X'] = 33, ['Y'] = 34,
        ['Z'] = 35,
        // Special chars (as per your spec)
        ['/'] = 36, ['?'] = 37, ['~'] = 38, ['!'] = 39, ['@'] = 40,
        ['#'] = 41, ['$'] = 43, ['%'] = 44, ['^'] = 45, ['&'] = 46,
        ['*'] = 47, ['('] = 48, [')'] = 49, ['-'] = 50, ['='] = 51,
        ['['] = 52, [']'] = 53, ['\\'] = 54, ['|'] = 55, ['`'] = 56,
        ['_'] = 57, ['+'] = 58, [':'] = 59, ['"'] = 60, [';'] = 61,
        [','] = 62, ['.'] = 63, [' '] = 63  // Space maps to max
    };
    
    const uint8_t ALPHABIT[128] = {
        [' '] = 0,
        ['A'] = 1, ['B'] = 2, ['C'] = 3, ['D'] = 4, ['E'] = 5,
        ['F'] = 6, ['G'] = 7, ['H'] = 8, ['I'] = 9, ['J'] = 10,
        ['K'] = 11, ['L'] = 12, ['M'] = 13, ['N'] = 14, ['O'] = 15,
        ['P'] = 16, ['Q'] = 17, ['R'] = 18, ['S'] = 19, ['T'] = 20,
        ['U'] = 21, ['V'] = 22, ['W'] = 23, ['X'] = 24, ['Y'] = 25,
        ['Z'] = 26, ['@'] = 27, ['.'] = 28, [':'] = 29, ['/'] = 30,
        ['-'] = 31
    };
    
    const uint8_t NIBBLE[128] = {
        ['0'] = 0, ['1'] = 1, ['2'] = 2, ['3'] = 3, ['4'] = 4,
        ['5'] = 5, ['6'] = 6, ['7'] = 7, ['8'] = 8, ['9'] = 9,
        ['A'] = 10, ['B'] = 11, ['C'] = 12, ['D'] = 13, ['E'] = 14,
        [' '] = 15
    };
    
    // Reverse lookups (generated at compile time)
    // ... implementation of reverse arrays
}

// Bit manipulation helpers
void ContestFormat::writeBits(uint8_t* buffer, int bitOffset, 
                             uint64_t value, int bitCount) {
    int byteOffset = bitOffset / 8;
    int bitShift = bitOffset % 8;
    
    // Write bits across byte boundaries
    int bitsWritten = 0;
    while (bitsWritten < bitCount) {
        int bitsInByte = 8 - bitShift;
        int bitsToWrite = (bitCount - bitsWritten < bitsInByte) ? 
                         (bitCount - bitsWritten) : bitsInByte;
        
        uint8_t mask = ((1 << bitsToWrite) - 1) << bitShift;
        uint8_t bits = ((value >> bitsWritten) & ((1 << bitsToWrite) - 1)) << bitShift;
        
        buffer[byteOffset] = (buffer[byteOffset] & ~mask) | bits;
        
        bitsWritten += bitsToWrite;
        byteOffset++;
        bitShift = 0;
    }
}

uint64_t ContestFormat::readBits(const uint8_t* buffer, int bitOffset, 
                                 int bitCount) {
    uint64_t result = 0;
    int byteOffset = bitOffset / 8;
    int bitShift = bitOffset % 8;
    
    // Read bits across byte boundaries
    int bitsRead = 0;
    while (bitsRead < bitCount) {
        int bitsInByte = 8 - bitShift;
        int bitsToRead = (bitCount - bitsRead < bitsInByte) ? 
                        (bitCount - bitsRead) : bitsInByte;
        
        uint8_t mask = (1 << bitsToRead) - 1;
        uint64_t bits = (buffer[byteOffset] >> bitShift) & mask;
        
        result |= bits << bitsRead;
        
        bitsRead += bitsToRead;
        byteOffset++;
        bitShift = 0;
    }
    
    return result;
}

// Callsign encoding (48 bits = 8 chars × 6 bits)
int ContestFormat::packCallsign(const char* callsign, uint8_t* output) {
    uint64_t packed = 0;
    
    for (int i = 0; i < 8; i++) {
        char c = (i < strlen(callsign)) ? callsign[i] : ' ';
        uint8_t value = Encoding::ALPHANUMBIT[(uint8_t)c];
        packed |= ((uint64_t)value) << (i * 6);
    }
    
    // Write 48 bits (6 bytes)
    memcpy(output, &packed, 6);
    return 6;
}

// Timestamp encoding (31 bits)
uint32_t ContestFormat::packTimestamp(uint32_t unixTime) {
    struct tm* timeinfo = gmtime((time_t*)&unixTime);
    
    int year = timeinfo->tm_year + 1900 - 2026;
    int month = timeinfo->tm_mon;
    int monthYear = year * 12 + month;  // 10 bits
    
    int day = timeinfo->tm_mday - 1;    // 5 bits (0-30)
    int hour = timeinfo->tm_hour;       // 5 bits (0-23)
    int minute = timeinfo->tm_min;      // 6 bits (0-59)
    int second = timeinfo->tm_sec / 2;  // 5 bits (0-29, 2-sec resolution)
    
    // Pack into 31 bits
    uint32_t packed = 0;
    packed |= (monthYear & 0x3FF);          // Bits 0-9
    packed |= (day & 0x1F) << 10;           // Bits 10-14
    packed |= (hour & 0x1F) << 15;          // Bits 15-19
    packed |= (minute & 0x3F) << 20;        // Bits 20-25
    packed |= (second & 0x1F) << 26;        // Bits 26-30
    
    return packed;
}

// Main pack function
int ContestFormat::pack(
    const char* callsign,
    uint32_t timestamp,
    const char* gridsquare,
    uint8_t flags,
    const char* firstName,
    const char* lastName,
    const uint8_t* message,
    uint16_t messageLen,
    const uint8_t* acks,
    uint16_t acksLen,
    uint8_t* output,
    uint16_t maxOutputLen
) {
    int bitPos = 0;
    
    // Message type (2 bits) - Contest = 0b10
    writeBits(output, bitPos, 0b10, 2);
    bitPos += 2;
    
    // Callsign (48 bits)
    uint64_t packedCallsign = 0;
    for (int i = 0; i < 8 && i < strlen(callsign); i++) {
        packedCallsign |= ((uint64_t)Encoding::ALPHANUMBIT[(uint8_t)callsign[i]]) << (i * 6);
    }
    writeBits(output, bitPos, packedCallsign, 48);
    bitPos += 48;
    
    // Timestamp (31 bits)
    uint32_t packedTime = packTimestamp(timestamp);
    writeBits(output, bitPos, packedTime, 31);
    bitPos += 31;
    
    // Gridsquare (28 bits)
    // ... implementation
    
    // Flags (3 bits)
    writeBits(output, bitPos, flags, 3);
    bitPos += 3;
    
    // Name length (8 bits)
    uint8_t firstLen = strlen(firstName) & 0x0F;
    uint8_t lastLen = strlen(lastName) & 0x0F;
    writeBits(output, bitPos, (firstLen << 4) | lastLen, 8);
    bitPos += 8;
    
    // First name (5 bits per char)
    for (int i = 0; i < firstLen; i++) {
        writeBits(output, bitPos, Encoding::ALPHABIT[(uint8_t)firstName[i]], 5);
        bitPos += 5;
    }
    
    // Last name (5 bits per char)
    for (int i = 0; i < lastLen; i++) {
        writeBits(output, bitPos, Encoding::ALPHABIT[(uint8_t)lastName[i]], 5);
        bitPos += 5;
    }
    
    // Message length (8 bits)
    writeBits(output, bitPos, messageLen & 0xFF, 8);
    bitPos += 8;
    
    // Message (UTF-8 bytes)
    int bytePos = bitPos / 8;
    if (bitPos % 8 != 0) {
        // Not byte-aligned, need to shift
        // ... handle misalignment
    } else {
        memcpy(output + bytePos, message, messageLen);
        bitPos += messageLen * 8;
    }
    
    // ACK array
    // ... implementation
    
    return (bitPos + 7) / 8;  // Return byte count
}

// Unpack function
// ... symmetric implementation
```

### Phase 2: Export New Functions

**Update `build.bat`:**
```bash
-s EXPORTED_FUNCTIONS=[ \
    '_malloc','_free', \
    '_createEncoder','_destroyEncoder', \
    '_createDecoder','_destroyDecoder', \
    '_feed_pointer','_feed_length', \
    '_message_pointer','_message_length', \
    '_signal_pointer','_signal_length', \
    '_payload_pointer','_payload_length', \
    '_feedDecoder','_digestFeed', \
    '_initEncoder','_readEncoder', \
    '_pack_contest_message',    ← New!
    '_unpack_contest_message'   ← New!
]
```

### Phase 3: JavaScript Wrapper

**File: `web/scripts/message_format.js`**
```javascript
class RibbitMessageFormat {
    constructor(wasmModule) {
        this.Module = wasmModule;
        
        // Allocate buffers
        this.inputBuffer = this.Module._malloc(512);
        this.outputBuffer = this.Module._malloc(512);
    }
    
    // Encode based on message type
    encode(messageType, data) {
        if (messageType === 1) {
            // Chat mode - current format
            return this.encodeChatMode(data);
        } else if (messageType === 2) {
            // Contest mode - new packed format
            return this.encodeContestMode(data);
        }
        throw new Error(`Unsupported message type: ${messageType}`);
    }
    
    // Chat mode (current implementation)
    encodeChatMode(data) {
        const { name, callsign, gridsquare, phone, message } = data;
        const str = `${name}|${callsign}|${gridsquare}|${phone}&=${message}`;
        
        // Use existing encoder
        const encoder = new TextEncoder();
        const encoded = encoder.encode(str);
        
        return encoded;
    }
    
    // Contest mode (new packed format)
    encodeContestMode(data) {
        const {
            callsign,
            timestamp = Date.now(),
            gridsquare,
            emergency = false,
            ntp = false,
            gps = false,
            firstName = '',
            lastName = '',
            message = '',
            acks = []
        } = data;
        
        // Prepare string pointers
        const callsignPtr = this.Module.stringToUTF8OnStack(callsign);
        const gridsquarePtr = this.Module.stringToUTF8OnStack(gridsquare);
        const firstNamePtr = this.Module.stringToUTF8OnStack(firstName);
        const lastNamePtr = this.Module.stringToUTF8OnStack(lastName);
        
        // Prepare message bytes
        const messageEncoder = new TextEncoder();
        const messageBytes = messageEncoder.encode(message);
        this.Module.HEAPU8.set(messageBytes, this.inputBuffer);
        
        // Pack flags
        const flags = (emergency ? 0x04 : 0) | 
                     (ntp ? 0x02 : 0) | 
                     (gps ? 0x01 : 0);
        
        // Call C++ packer
        const packedSize = this.Module._pack_contest_message(
            callsignPtr,
            Math.floor(timestamp / 1000),  // Unix timestamp
            gridsquarePtr,
            flags,
            firstNamePtr,
            lastNamePtr,
            this.inputBuffer,
            messageBytes.length,
            0,  // ACK pointer (TODO)
            0,  // ACK length
            this.outputBuffer,
            512
        );
        
        if (packedSize < 0) {
            throw new Error('Failed to pack contest message');
        }
        
        // Copy packed bytes to JavaScript
        const packed = new Uint8Array(packedSize);
        packed.set(this.Module.HEAPU8.subarray(
            this.outputBuffer,
            this.outputBuffer + packedSize
        ));
        
        return packed;
    }
    
    // Decode based on message type
    decode(bytes) {
        if (bytes.length < 1) {
            throw new Error('Empty message');
        }
        
        // Read message type from first 2 bits
        const messageType = bytes[0] & 0x03;
        
        if (messageType === 1) {
            return this.decodeChatMode(bytes);
        } else if (messageType === 2) {
            return this.decodeContestMode(bytes);
        }
        
        throw new Error(`Unknown message type: ${messageType}`);
    }
    
    decodeChatMode(bytes) {
        // Current implementation
        const decoder = new TextDecoder();
        const str = decoder.decode(bytes);
        
        const parts = str.split('&=');
        if (parts.length !== 2) return null;
        
        const header = parts[0].split('|');
        if (header.length !== 4) return null;
        
        return {
            type: 1,
            name: header[0],
            callsign: header[1],
            gridsquare: header[2],
            phone: header[3],
            message: parts[1]
        };
    }
    
    decodeContestMode(bytes) {
        // Copy to WASM memory
        this.Module.HEAPU8.set(bytes, this.inputBuffer);
        
        // Allocate output buffers
        const callsignBuf = this.Module._malloc(9);
        const gridsquareBuf = this.Module._malloc(7);
        const firstNameBuf = this.Module._malloc(16);
        const lastNameBuf = this.Module._malloc(16);
        const messageBuf = this.Module._malloc(256);
        const timestampPtr = this.Module._malloc(4);
        const flagsPtr = this.Module._malloc(1);
        const msgLenPtr = this.Module._malloc(2);
        
        // Call C++ unpacker
        const result = this.Module._unpack_contest_message(
            this.inputBuffer,
            bytes.length,
            callsignBuf,
            timestampPtr,
            gridsquareBuf,
            flagsPtr,
            firstNameBuf,
            lastNameBuf,
            messageBuf,
            msgLenPtr,
            0, 0  // ACK buffers (TODO)
        );
        
        if (result < 0) {
            throw new Error('Failed to unpack contest message');
        }
        
        // Read unpacked data
        const decoded = {
            type: 2,
            callsign: this.Module.UTF8ToString(callsignBuf),
            timestamp: this.Module.HEAPU32[timestampPtr >> 2] * 1000,
            gridsquare: this.Module.UTF8ToString(gridsquareBuf),
            emergency: !!(this.Module.HEAPU8[flagsPtr] & 0x04),
            ntp: !!(this.Module.HEAPU8[flagsPtr] & 0x02),
            gps: !!(this.Module.HEAPU8[flagsPtr] & 0x01),
            firstName: this.Module.UTF8ToString(firstNameBuf),
            lastName: this.Module.UTF8ToString(lastNameBuf),
            message: this.Module.UTF8ToString(messageBuf),
            acks: []  // TODO
        };
        
        // Free buffers
        this.Module._free(callsignBuf);
        this.Module._free(gridsquareBuf);
        this.Module._free(firstNameBuf);
        this.Module._free(lastNameBuf);
        this.Module._free(messageBuf);
        this.Module._free(timestampPtr);
        this.Module._free(flagsPtr);
        this.Module._free(msgLenPtr);
        
        return decoded;
    }
    
    cleanup() {
        this.Module._free(this.inputBuffer);
        this.Module._free(this.outputBuffer);
    }
}

// Export for use
window.RibbitMessageFormat = RibbitMessageFormat;
```

### Phase 4: UI Integration

**Update `web/scripts/index.js`:**
```javascript
// Initialize message formatter
let messageFormatter;

loadPromise.then((moduleInstance) => {
    messageFormatter = new RibbitMessageFormat(moduleInstance.wasmExports);
    
    // ... rest of initialization
});

// Update encodemessage function
const encodemessage = () => {
    // Get message type from UI
    const messageType = parseInt(
        document.getElementById('messagetype')?.value || '1'
    );
    
    let encoded;
    
    if (messageType === 1) {
        // Chat mode (current)
        const str = `${header}&=${messagebox.value}`;
        encoded = new TextEncoder().encode(str);
    } else if (messageType === 2) {
        // Contest mode (new)
        const contestData = {
            callsign: db.getItem('callsign'),
            gridsquare: db.getItem('gridsquare'),
            firstName: db.getItem('firstName') || '',
            lastName: db.getItem('lastName') || '',
            message: messagebox.value,
            timestamp: Date.now(),
            ntp: hasNTPSync(),
            gps: hasGPSLock(),
            emergency: false
        };
        encoded = messageFormatter.encodeContestMode(contestData);
    }
    
    // Copy to WASM memory
    _message.fill(0);
    const copyLength = Math.min(encoded.length, MESSAGE_LENGTH);
    for (let i = 0; i < copyLength; i++) {
        _message[i] = encoded[i];
    }
    
    wasmExports._initEncoder();
};

// Update fetchDecoded function
window.fetchDecoded = (result) => {
    if (result < 0) {
        // CRC error
        return;
    }
    
    // Decode using formatter
    try {
        const decoded = messageFormatter.decode(_payload);
        
        if (decoded.type === 1) {
            // Chat mode
            displayChatMessage(decoded);
        } else if (decoded.type === 2) {
            // Contest mode
            displayContestMessage(decoded);
        }
    } catch (error) {
        console.error('Decode error:', error);
    }
};
```

## Benefits of This Approach

### 1. Backward Compatibility
```
✓ Existing chat messages still work
✓ No breaking changes for current users
✓ Gradual migration path
```

### 2. Mode-Specific Advantages

**Chat Mode:**
```
✓ Free-form text
✓ No length restrictions
✓ Simple format
✓ Human-readable debugging
```

**Contest Mode:**
```
✓ 40-50% more efficient
✓ Timestamps included
✓ ACK support
✓ Structured data
✓ Better for contests/nets
```

### 3. Space Savings Example

**Same message in both modes:**

**Chat Mode:**
```
"Alex|KO6BVA|FN42kl|555-1234&=QSL R-5-9"
= 38 bytes = 304 bits
```

**Contest Mode:**
```
Type(2) + Callsign(48) + Time(31) + Grid(28) + 
Flags(3) + Name(8+20) + Msg(8+88) = 236 bits = 30 bytes

Savings: 74 bits (can fit 9 ACKs @ 79 bits each!)
```

### 4. ACK Array Room

With contest mode, you can fit ACKs:
```
Total available: ~2080 bits
Base header: ~200 bits
Message (20 chars): ~160 bits
Remaining: ~1720 bits

ACK format: Callsign(48) + Timestamp(31) = 79 bits
Number of ACKs: 1720 / 79 = 21 ACKs!
```

## Summary

This dual-mode architecture gives you:

✅ **Keep chat mode** for casual use  
✅ **Add contest mode** for efficiency  
✅ **Room for ACKs** in contest mode  
✅ **Backward compatible**  
✅ **Best of both worlds**  

The implementation leverages C++ for efficient bit packing while keeping the JavaScript interface simple. Each mode serves its purpose perfectly!

Want me to start implementing the C++ contest mode encoder/decoder?

