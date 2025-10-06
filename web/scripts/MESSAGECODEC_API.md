# MessageCodec API Documentation

Complete API for encoding and decoding Ribbit messages.

## Installation

```javascript
import { MessageCodec } from './messageCodec.js';

const codec = new MessageCodec();
```

## Message Structure

The Ribbit message follows this structure (130+ bits):

| Field | Bits | Type | Description |
|-------|------|------|-------------|
| Callsign | 48 | alphanumbit | Ham radio callsign (8 chars max) |
| Timestamp | 31 | composite | UTC time with 2-second resolution |
| Gridsquare | 28 | maidenhead | Location (6 chars: AA00aa) |
| Emergency | 1 | boolean | Emergency flag |
| NTP | 1 | boolean | NTP time sync flag |
| GPS | 1 | boolean | GPS location flag |
| Name Length | 8 | number | Length of name field (0-32) |
| Message Length | 8 | number | Length of message in bytes (0-240) |
| Message Type | 4 | number | Message type (0-15) |
| Name | variable | alphanumbit | Sender name (6 bits per char) |
| Message | variable | UTF-8 | Message content (8 bits per byte) |

## Individual Field Encoding

### GetTimestampBitStream(date?)
Returns a 31-bit timestamp bitstream.

```javascript
// Use current time
const bits = codec.GetTimestampBitStream();

// Use specific date
const date = new Date('2026-05-15T14:30:00Z');
const bits = codec.GetTimestampBitStream(date);
```

**Returns:** String (31 bits)

---

### GetCallsignBitStream(callsign)
Encodes a ham radio callsign to 48 bits.

```javascript
const bits = codec.GetCallsignBitStream("KN6FZY");
```

**Parameters:**
- `callsign` (string): 1-8 character callsign

**Returns:** String (48 bits)

---

### GetGridsquareBitStream(gridsquare)
Encodes a Maidenhead gridsquare to 28 bits.

```javascript
const bits = codec.GetGridsquareBitStream("CM87uq");
```

**Parameters:**
- `gridsquare` (string): 6-character Maidenhead locator (AA00aa)

**Returns:** String (28 bits)

**Throws:** Error if format is invalid

---

### GetEmergencyBit(isEmergency)
Returns emergency flag bit.

```javascript
const bit = codec.GetEmergencyBit(true);  // "1"
const bit = codec.GetEmergencyBit(false); // "0"
```

**Parameters:**
- `isEmergency` (boolean)

**Returns:** String (1 bit)

---

### GetNTPBit(isNTP)
Returns NTP sync flag bit.

```javascript
const bit = codec.GetNTPBit(true);
```

**Parameters:**
- `isNTP` (boolean)

**Returns:** String (1 bit)

---

### GetGPSBit(isGPS)
Returns GPS active flag bit.

```javascript
const bit = codec.GetGPSBit(true);
```

**Parameters:**
- `isGPS` (boolean)

**Returns:** String (1 bit)

---

### GetNameLengthBits(length)
Returns name length as 8-bit value.

```javascript
const bits = codec.GetNameLengthBits(10);
```

**Parameters:**
- `length` (number): 0-32

**Returns:** String (8 bits)

**Throws:** Error if out of range

---

### GetMessageLengthBits(length)
Returns message length in bytes as 8-bit value.

```javascript
const bits = codec.GetMessageLengthBits(42);
```

**Parameters:**
- `length` (number): 0-240

**Returns:** String (8 bits)

**Throws:** Error if out of range

---

### GetMessageTypeBits(type)
Returns message type as 4-bit value.

```javascript
const bits = codec.GetMessageTypeBits(1); // Chat
```

**Parameters:**
- `type` (number): 0-15
  - 0: Emergency
  - 1: Chat
  - 2: Contest
  - 3: Other
  - 4-15: Reserved

**Returns:** String (4 bits)

**Throws:** Error if out of range

---

### GetNameBitStream(name)
Encodes name to alphanumbit bitstream.

```javascript
const bits = codec.GetNameBitStream("Alex Okita");
```

**Parameters:**
- `name` (string): 0-32 characters

**Returns:** String (variable length, 6 bits per char)

**Throws:** Error if > 32 chars

---

### GetMessageBitStream(message)
Encodes message to UTF-8 bitstream.

```javascript
const bits = codec.GetMessageBitStream("Hello world!");
```

**Parameters:**
- `message` (string): 0-240 bytes UTF-8

**Returns:** String (variable length, 8 bits per byte)

**Throws:** Error if > 240 bytes

---

## Individual Field Decoding

### BitStreamToTimestamp(bits)
Decodes 31-bit timestamp to Date object.

```javascript
const date = codec.BitStreamToTimestamp("0000000000000000000000000000000");
console.log(date.toISOString());
```

**Parameters:**
- `bits` (string): 31-bit bitstream

**Returns:** Date object (UTC)

**Throws:** Error if not 31 bits

---

### BitStreamToCallsign(bits)
Decodes 48-bit callsign.

```javascript
const callsign = codec.BitStreamToCallsign(bits);
```

**Parameters:**
- `bits` (string): 48-bit bitstream

**Returns:** String (trimmed callsign)

**Throws:** Error if not 48 bits

---

### BitStreamToGridsquare(bits)
Decodes 28-bit gridsquare.

```javascript
const gridsquare = codec.BitStreamToGridsquare(bits);
```

**Parameters:**
- `bits` (string): 28-bit bitstream

**Returns:** String (6-char gridsquare)

**Throws:** Error if not 28 bits

---

### BitStreamToEmergency(bit)
Decodes emergency flag.

```javascript
const isEmergency = codec.BitStreamToEmergency("1"); // true
```

**Parameters:**
- `bit` (string): 1-bit value

**Returns:** Boolean

---

### BitStreamToNTP(bit)
Decodes NTP flag.

```javascript
const isNTP = codec.BitStreamToNTP("1"); // true
```

**Parameters:**
- `bit` (string): 1-bit value

**Returns:** Boolean

---

### BitStreamToGPS(bit)
Decodes GPS flag.

```javascript
const isGPS = codec.BitStreamToGPS("1"); // true
```

**Parameters:**
- `bit` (string): 1-bit value

**Returns:** Boolean

---

### BitStreamToNameLength(bits)
Decodes name length.

```javascript
const length = codec.BitStreamToNameLength("00001010"); // 10
```

**Parameters:**
- `bits` (string): 8-bit value

**Returns:** Number (0-255)

**Throws:** Error if not 8 bits

---

### BitStreamToMessageLength(bits)
Decodes message length.

```javascript
const length = codec.BitStreamToMessageLength("00101100"); // 44
```

**Parameters:**
- `bits` (string): 8-bit value

**Returns:** Number (0-255)

**Throws:** Error if not 8 bits

---

### BitStreamToMessageType(bits)
Decodes message type.

```javascript
const type = codec.BitStreamToMessageType("0001"); // 1 (Chat)
```

**Parameters:**
- `bits` (string): 4-bit value

**Returns:** Number (0-15)

**Throws:** Error if not 4 bits

---

### BitStreamToName(bits)
Decodes name from alphanumbit bitstream.

```javascript
const name = codec.BitStreamToName(bits);
```

**Parameters:**
- `bits` (string): Variable-length bitstream (multiple of 6)

**Returns:** String (trimmed name)

**Throws:** Error if not multiple of 6 bits

---

### BitStreamToMessage(bits)
Decodes message from UTF-8 bitstream.

```javascript
const message = codec.BitStreamToMessage(bits);
```

**Parameters:**
- `bits` (string): Variable-length bitstream (multiple of 8)

**Returns:** String (UTF-8 decoded message)

**Throws:** Error if not multiple of 8 bits

---

## Complete Message Encoding/Decoding

### EncodeMessage(data)
Encodes complete message from JSON to bitstream.

```javascript
const bitstream = codec.EncodeMessage({
    callsign: "W1AW",
    timestamp: new Date(),      // Optional, defaults to now
    gridsquare: "FN31pr",
    emergency: false,           // Optional, defaults to false
    ntp: true,                  // Optional, defaults to false
    gps: true,                  // Optional, defaults to false
    messageType: 1,             // Optional, defaults to 1 (Chat)
    name: "ARRL",               // Optional
    message: "Hello!"           // Optional
});
```

**Parameters:**
- `data` (object):
  - `callsign` (string, required)
  - `timestamp` (Date, optional)
  - `gridsquare` (string, required)
  - `emergency` (boolean, optional)
  - `ntp` (boolean, optional)
  - `gps` (boolean, optional)
  - `messageType` (number 0-15, optional)
  - `name` (string, optional)
  - `message` (string, optional)

**Returns:** String (complete bitstream, 130+ bits)

**Throws:** Error if required fields missing or invalid

---

### DecodeMessage(bitstream)
Decodes complete message from bitstream to JSON.

```javascript
const message = codec.DecodeMessage(bitstream);
console.log(message);
// {
//   callsign: "W1AW",
//   timestamp: Date,
//   gridsquare: "FN31pr",
//   emergency: false,
//   ntp: true,
//   gps: true,
//   nameLength: 4,
//   messageLength: 6,
//   messageType: 1,
//   name: "ARRL",
//   message: "Hello!"
// }
```

**Parameters:**
- `bitstream` (string): Complete message bitstream

**Returns:** Object with all decoded fields

---

## Utility Functions

### BitStreamToBytes(bitstream)
Converts bitstream to byte array for transmission.

```javascript
const bytes = codec.BitStreamToBytes(bitstream);
// Returns: Uint8Array
```

**Parameters:**
- `bitstream` (string): Any length bitstream

**Returns:** Uint8Array (padded to byte boundary)

---

### BytesToBitStream(bytes)
Converts byte array back to bitstream.

```javascript
const bitstream = codec.BytesToBitStream(bytes);
```

**Parameters:**
- `bytes` (Uint8Array or Array): Byte array

**Returns:** String (bitstream)

---

### GetMessageTypeName(type)
Gets human-readable message type name.

```javascript
const name = codec.GetMessageTypeName(1); // "Chat"
```

**Parameters:**
- `type` (number): 0-15

**Returns:** String (type name)

---

## Complete Usage Example

```javascript
import { MessageCodec } from './messageCodec.js';

const codec = new MessageCodec();

// Encode a complete message
const data = {
    callsign: "KN6FZY",
    gridsquare: "CM87uq",
    emergency: false,
    ntp: true,
    gps: true,
    messageType: 1,
    name: "Alex",
    message: "Testing Ribbit!"
};

const bitstream = codec.EncodeMessage(data);
console.log("Bitstream:", bitstream);
console.log("Bits:", bitstream.length);

// Convert to bytes for transmission
const bytes = codec.BitStreamToBytes(bitstream);
console.log("Bytes:", bytes);

// === TRANSMISSION ===

// Receive and decode
const receivedBitstream = codec.BytesToBitStream(bytes);
const decoded = codec.DecodeMessage(receivedBitstream);

console.log("Decoded:", decoded);
console.log("Callsign:", decoded.callsign);
console.log("Message:", decoded.message);
```

## Error Handling

All functions throw descriptive errors for invalid input:

```javascript
try {
    const bits = codec.GetCallsignBitStream(12345); // Not a string
} catch (error) {
    console.error(error.message); // "Callsign must be a string"
}

try {
    const message = codec.EncodeMessage({ callsign: "TEST" }); // Missing gridsquare
} catch (error) {
    console.error(error.message); // "Gridsquare is required"
}
```

## Message Types

| Value | Type | Description |
|-------|------|-------------|
| 0 | Emergency | Emergency communications |
| 1 | Chat | General chat/conversation |
| 2 | Contest | Contest/competition |
| 3 | Other | Other purposes |
| 4-15 | Reserved | Reserved for future use |

## Limitations

- Callsign: 8 characters max
- Gridsquare: Must be valid Maidenhead format (AA00aa)
- Name: 32 characters max (alphanumeric)
- Message: 240 bytes max (UTF-8)
- Timestamp: 2026-2111, 2-second resolution

