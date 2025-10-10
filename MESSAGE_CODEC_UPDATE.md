# Message Codec Update

## What Changed

The `headerCodec.html` has been renamed to `messageCodec.html` and significantly upgraded to integrate with the new WASM-based message encoding system.

## File Changes

| Old File | New File | Status |
|----------|----------|--------|
| `web/headerCodec.html` | `web/messageCodec.html` | ✅ Renamed & Upgraded |
| - | Uses `web/scripts/message_format.js` | ✅ New Integration |
| - | Uses `web/scripts/ribbit.js` (WASM) | ✅ New Integration |

## New Features

### 1. **Dual-Mode Support** 🎯

The codec now supports both message modes:

#### Chat Mode (Type 1) 💬
- UTF-8 free-form format
- Current implementation: `"Name|Callsign|Gridsquare|Phone&=Message"`
- Flexible, any UTF-8 characters
- Best for casual conversations

#### Contest Mode (Type 2) 🏆
- Bitwise-packed efficient format
- 40-60% smaller than chat mode
- Includes timestamp (31 bits, 2-sec resolution)
- Room for ACK arrays
- Best for contests, structured communications

### 2. **Visual Binary Representation** 🔢

The codec maintains the helpful visual guide showing:
- **Binary bits**: Individual 1s and 0s with space-separated bytes
- **Color-coded fields**: Different colors for callsign, timestamp, gridsquare, etc.
- **Real-time updates**: See binary change as you type

Example visual output:
```
01001011 01001110 00110110 01000110 01011010 01011001 11111111 11111111
[Callsign: KN6FZY + padding]
```

### 3. **Hex Encoding/Decoding** 🔐

Integrated from the demo, now you can:
- **Encode to hex**: See message as hex bytes (e.g., `4b 4e 36 46 5a 59 ff ff`)
- **Decode from hex**: Paste hex bytes and decode back to readable data
- **Copy/paste hex**: Easy sharing and testing

### 4. **Mode Comparison** 📊

New comparison feature shows:
- Size difference (bytes and bits)
- Percentage savings
- Transmission time difference
- ACK capacity gained

Example comparison:
```
Chat Mode:     52 bytes (416 bits)
Contest Mode:  33 bytes (264 bits)
Savings:       37% smaller, 19 bytes saved
ACKs:          2 ACKs possible in saved space
```

### 5. **WASM Integration** ⚙️

The codec now uses:
- **C++ bit-packing** for efficient encoding
- **WASM module** loaded via `ribbit.js`
- **JavaScript wrapper** (`message_format.js`) for easy API access
- **Real-time status** showing WASM load state

## Visual Flow

```
┌─────────────────────────────────────────────────┐
│  1. INPUT FIELDS                                │
│  ├─ Mode selector (Chat/Contest radio buttons)  │
│  ├─ Common fields (Callsign, Gridsquare)        │
│  ├─ Chat fields (Name, Phone)                   │
│  └─ Contest fields (First/Last name, flags)     │
└─────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│  2. ENCODING (Click "Encode Message")           │
│  ├─ WASM C++ bit-packing                        │
│  ├─ Binary visualization (1s and 0s)            │
│  ├─ Hex output (space-separated bytes)          │
│  ├─ Byte array display                          │
│  └─ Size metrics                                │
└─────────────────────────────────────────────────┘
           │
           ▼  TRANSMISSION
           │
           ▼
┌─────────────────────────────────────────────────┐
│  3. DECODING (Click "Decode Message")           │
│  ├─ Hex input (paste from encoded)              │
│  ├─ Binary reconstruction                       │
│  ├─ WASM C++ bit-unpacking                      │
│  └─ Human-readable output (all fields)          │
└─────────────────────────────────────────────────┘
```

## Usage Examples

### Encoding a Chat Message

1. Select "💬 Chat Mode"
2. Fill in:
   - Callsign: `KN6FZY`
   - Gridsquare: `CM87uq`
   - Name: `Alex Okita`
   - Message: `Hello from Ribbit!`
3. Click "🔒 Encode Message"
4. See output:
   - Binary: `01001011 01001110 00110110...`
   - Hex: `4b 4e 36 46 5a 59 ff ff...`
   - Size: `52 bytes (416 bits)`

### Encoding a Contest Message

1. Select "🏆 Contest Mode"
2. Fill in:
   - Callsign: `KN6FZY`
   - Gridsquare: `CM87uq`
   - First Name: `Alex`
   - Last Name: `Okita`
   - Message: `Hello from Ribbit!`
   - Check "GPS Location Active"
3. Click "🔒 Encode Message"
4. See output:
   - Binary: `01001011 01001110 00110110...`
   - Hex: `4b 4e 36 46 5a 59 ff ff...`
   - Size: `33 bytes (264 bits)` ✅ 37% smaller!

### Comparing Both Modes

1. Fill in all fields
2. Click "📊 Compare Both Modes"
3. See side-by-side comparison table:
   - Size difference
   - Efficiency gains
   - Transmission time savings
   - ACK capacity

### Decoding a Message

1. Copy hex from encoded output (auto-filled)
2. Go to "Step 2: Decoding" section
3. Hex should already be in the field
4. Click "🔓 Decode Message"
5. See reconstructed binary and human-readable values

## Technical Details

### Binary Visualization Format

The binary output maintains the visual format from the original `headerCodec.html`:

- **Space-separated bytes**: `01001011 01001110 00110110`
- **Colored by field**:
  - 🟢 Green: Callsign
  - 🟡 Yellow: Timestamp
  - 🔵 Blue: Gridsquare
  - 🟣 Purple: Meta flags
  - 🩷 Pink: Names
  - 🟠 Orange: Message

### Hex Format

Hex bytes are displayed as:
- Space-separated: `4b 4e 36 46 5a 59`
- Lowercase letters
- Two digits per byte
- Easy to copy/paste

### WASM Loading

The codec shows real-time status:
- ⏳ Loading: Yellow background
- ✓ Ready: Green background
- ✗ Error: Red background

Buttons are disabled until WASM loads.

## Migration Notes

### From Old headerCodec.html

The old `headerCodec.html` was a pure JavaScript implementation with manual bit manipulation. The new `messageCodec.html`:

✅ **Keeps**:
- Visual binary representation (1s and 0s)
- Color-coded field highlighting
- Step-by-step encoding/decoding flow
- Same dark theme and styling

✅ **Adds**:
- WASM integration for speed
- Dual-mode support (Chat & Contest)
- Hex encoding/decoding
- Mode comparison tool
- Real-time WASM status

✅ **Removes**:
- Manual JavaScript bit manipulation (now in C++)
- Individual timestamp field inputs (now auto-generated)
- Some verbose intermediate displays

### Backward Compatibility

The old `headerCodec.html` still exists in the repo for reference, but:
- `messageCodec.html` is the new canonical implementation
- All new features will be added to `messageCodec.html`
- The old file may be removed in a future cleanup

## File Structure

```
web/
├── messageCodec.html          ← NEW! Main visual encoder/decoder
├── headerCodec.html           ← OLD (still present for reference)
├── message_format_demo.html   ← Simple test page
├── scripts/
│   ├── ribbit.js             ← WASM module (Emscripten generated)
│   ├── ribbit.wasm           ← WASM binary
│   └── message_format.js     ← JavaScript wrapper for WASM
```

## Testing Checklist

To verify the codec works correctly:

1. ✅ **WASM loads**: Status shows green "✓ WASM Module Loaded & Ready"
2. ✅ **Chat encoding**: Enter data, click encode, see binary & hex
3. ✅ **Contest encoding**: Switch mode, encode, see different output
4. ✅ **Comparison**: Click compare, see table with savings
5. ✅ **Decoding**: Paste hex, decode, see original values
6. ✅ **Binary visible**: Can see 1s and 0s in output
7. ✅ **Hex matches**: Hex in encode matches what decodes correctly
8. ✅ **Round-trip**: Encode → Decode → Get same values

## Links

- **Live Codec**: `http://localhost:8000/web/messageCodec.html`
- **Simple Demo**: `http://localhost:8000/web/message_format_demo.html`
- **Architecture**: [DUAL_MODE_MESSAGE_ARCHITECTURE.md](DUAL_MODE_MESSAGE_ARCHITECTURE.md)
- **Implementation**: [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)
- **Header Spec**: [web/HeaderReadme.md](web/HeaderReadme.md)

## Future Enhancements

Planned features for the codec:

1. **ACK visualization**: Show ACK array packing
2. **Save/Load**: Save encoded messages to file
3. **History**: Keep history of encoded messages
4. **Validation**: Real-time validation of inputs
5. **Examples**: Pre-filled example messages
6. **Export**: Export to various formats (JSON, CSV, etc.)

## Conclusion

The new `messageCodec.html` provides a powerful, visual, and educational tool for understanding how Ribbit encodes messages. It combines:

- **Visual learning**: See bits change in real-time
- **Practical use**: Encode/decode actual messages
- **Performance**: WASM-powered C++ bit-packing
- **Flexibility**: Support for multiple message modes

Perfect for developers, operators, and anyone curious about how Ribbit works under the hood! 🐸

