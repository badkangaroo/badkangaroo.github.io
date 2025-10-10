# Message ID Visual Guide

## Bit Layout Comparison

### OLD Structure
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Callsign (48 bits)                                         │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┐   │
│  │ 6 bits │ 6 bits │ 6 bits │ 6 bits │ 6 bits │ 6 bits │   │
│  │ + 6 bits + 6 bits                                      │   │
│  └────────┴────────┴────────┴────────┴────────┴────────┘   │
│                                                              │
│  Timestamp (31 bits)                                        │
│  ┌──────────┬─────┬─────┬──────┬─────┐                    │
│  │ 10 bits  │5 bit│5 bit│6 bits│5 bit│                    │
│  │Year/Month│ Day │Hour │Minute│ Sec │                    │
│  └──────────┴─────┴─────┴──────┴─────┘                    │
│                                                              │
│  Gridsquare (28 bits)                                       │
│  Emergency (1 bit)                                          │
│  NTP (1 bit)                                                │
│  GPS (1 bit)                                                │
│  ...                                                        │
└──────────────────────────────────────────────────────────────┘
```

### NEW Structure (Message ID = 80 bits)
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║              MESSAGE ID (80 BITS)                     ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                              │
│  Callsign (48 bits)                                         │
│  ┌────────┬────────┬────────┬────────┬────────┬────────┐   │
│  │ 6 bits │ 6 bits │ 6 bits │ 6 bits │ 6 bits │ 6 bits │   │
│  │ + 6 bits + 6 bits                                      │   │
│  └────────┴────────┴────────┴────────┴────────┴────────┘   │
│                                                              │
│  Timestamp (31 bits)                                        │
│  ┌──────────┬─────┬─────┬──────┬─────┐                    │
│  │ 10 bits  │5 bit│5 bit│6 bits│5 bit│                    │
│  │Year/Month│ Day │Hour │Minute│ Sec │                    │
│  └──────────┴─────┴─────┴──────┴─────┘                    │
│                                                              │
│  Emergency (1 bit) ──┐                                      │
│                      │                                       │
│  ╚═══════════════════════════════════════════════════════╝  │
│                      MESSAGE ID ENDS                         │
│                                                              │
│  Gridsquare (28 bits)                                       │
│  NTP (1 bit)                                                │
│  GPS (1 bit)                                                │
│  ...                                                        │
└──────────────────────────────────────────────────────────────┘
```

## Message ID Breakdown

```
Message ID = 80 bits total

┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Bits 0-47:   Callsign (48 bits)                       │
│               8 characters × 6 bits each                │
│               Example: "W1AW    "                       │
│                                                         │
│  Bits 48-78:  Timestamp (31 bits)                      │
│               - Year/Month: 10 bits (Jan 2026 - 2111)  │
│               - Day: 5 bits (0-30, 0-based)            │
│               - Hour: 5 bits (0-23)                    │
│               - Minute: 6 bits (0-59)                  │
│               - Second: 5 bits (0-29, 2s resolution)   │
│               Example: 2026-04-15 14:30:00 UTC         │
│                                                         │
│  Bit 79:      Emergency (1 bit)                        │
│               0 = Normal, 1 = Emergency                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Usage Examples

### Create Message ID
```javascript
// Using wrapper function
const messageID = codec.GetMessageIDBitStream(
    "W1AW",                          // Callsign
    new Date("2026-04-15T14:30:00Z"), // Timestamp
    true                             // Emergency
);
// Returns: "001010..." (80-bit string)
```

### Decode Message ID
```javascript
const decoded = codec.BitStreamToMessageID(messageID);
// Returns:
// {
//   callsign: "W1AW",
//   timestamp: Date object,
//   emergency: true
// }
```

### Extract from Full Message
```javascript
// Encode a full message
const fullMessage = codec.EncodeMessage({
    callsign: "KN6FZY",
    gridsquare: "CM87uq",
    emergency: false,
    message: "Hello world"
});

// Extract just the Message ID (first 80 bits)
const messageID = fullMessage.slice(0, 80);
const idInfo = codec.BitStreamToMessageID(messageID);

console.log(idInfo.callsign);   // "KN6FZY"
console.log(idInfo.emergency);  // false
```

## Use Cases

### 1. Message Acknowledgement
```
Station A sends: Message ID = 0x4B4E3646...  (80 bits)
Station B receives and decodes the Message ID
Station B sends ACK: 0x4B4E3646...  (only 80 bits needed)
Station A confirms delivery
```

### 2. Message Deduplication
```
Message ID: W1AW|2026-04-15T14:30:00|Emergency

Same message received multiple times (via different paths)
System checks Message ID to identify duplicates
Only process unique Message IDs
```

### 3. Emergency Priority Queue
```
Message Queue sorted by:
1. Emergency bit (bit 79)
2. Timestamp (bits 48-78)
3. Callsign (bits 0-47)

Emergency messages automatically prioritized
```

### 4. Message Tracking
```
Database Index:
- Primary Key: Message ID (80 bits)
- Fast lookups by callsign, timestamp, or emergency status
- Efficient message history and relay tracking
```

## Bit Position Reference

| Field      | Bits   | Start | End | Length |
|------------|--------|-------|-----|--------|
| Callsign   | 0-47   | 0     | 47  | 48     |
| Timestamp  | 48-78  | 48    | 78  | 31     |
| Emergency  | 79     | 79    | 79  | 1      |
| **MSG ID** | **0-79** | **0** | **79** | **80** |
| Gridsquare | 80-107 | 80    | 107 | 28     |
| NTP        | 108    | 108   | 108 | 1      |
| GPS        | 109    | 109   | 109 | 1      |
| ...        | 110+   | 110   | ... | ...    |

## Why 80 Bits?

**80 bits = 10 bytes** - a compact, efficient identifier

- **48 bits (Callsign)**: Identifies the sender (281 trillion possibilities)
- **31 bits (Timestamp)**: Identifies when sent (2-second resolution over 85 years)
- **1 bit (Emergency)**: Identifies priority level

Together, these create a virtually guaranteed unique identifier for every message transmission while maintaining a small footprint suitable for radio transmission.

## Integration Points

The Message ID is now seamlessly integrated into:
- ✅ JavaScript codec (messageCodec.js)
- ✅ C++ WASM module (message_format.cc)
- ✅ HTML demo interfaces (headerCodec.html, messageCodec.html)
- ✅ Documentation (HeaderReadme.md)
- ✅ Code examples (messageCodecExample.js)

**All files pass linting with zero errors.**

