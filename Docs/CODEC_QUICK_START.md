# Message Codec - Quick Start Guide

## 🚀 Getting Started

### 1. Start the Server

```bash
run_tests.bat
# OR
python -m http.server
```

### 2. Open the Codec

```
http://localhost:8000/web/messageCodec.html
```

### 3. Wait for WASM to Load

Look for: **✓ WASM Module Loaded & Ready** (green status)

## 📝 Quick Examples

### Example 1: Encode a Chat Message

1. Select **💬 Chat Mode**
2. Fill in:
   ```
   Callsign:   KN6FZY
   Gridsquare: CM87uq
   Name:       Alex Okita
   Message:    Hello from Ribbit!
   ```
3. Click **🔒 Encode Message**
4. See:
   - Binary: `01001011 01001110 00110110 01000110 01011010 01011001...`
   - Hex: `4b 4e 36 46 5a 59 ff ff 06 03 15 18 01 21...`
   - Size: `52 bytes (416 bits)`

### Example 2: Encode a Contest Message

1. Select **🏆 Contest Mode**
2. Fill in:
   ```
   Callsign:   KN6FZY
   Gridsquare: CM87uq
   First Name: Alex
   Last Name:  Okita
   Message:    Hello from Ribbit!
   ☑ GPS Location Active
   ```
3. Click **🔒 Encode Message**
4. See:
   - Binary: `01001011 01001110 00110110 01000110...`
   - Hex: `4b 4e 36 46 5a 59 ff ff 00 1a 30 15...`
   - Size: `33 bytes (264 bits)` ✅ **37% smaller!**

### Example 3: Compare Modes

1. Fill in all fields
2. Click **📊 Compare Both Modes**
3. See comparison table:
   ```
   Chat Mode:     52 bytes
   Contest Mode:  33 bytes
   Savings:       19 bytes (37%)
   ACKs:          2 ACKs possible
   ```

### Example 4: Decode a Message

1. Copy hex from encode (auto-filled): `4b 4e 36 46...`
2. Scroll to "Step 2: Decoding"
3. Click **🔓 Decode Message**
4. See all original values restored

## 🎨 What You'll See

### Binary Visualization (1s and 0s)

```
01001011 01001110 00110110 01000110 01011010 01011001 11111111 11111111
[🟢 Callsign: KN6FZY                                                    ]

00000000 00011010 00110000 00010101 00000001 00100001
[🟡 Timestamp              ] [🔵 Gridsquare        ]

0 0 1
[🔴][🟣][🟣]
Emg NTP GPS

00000100 00000101
[🟣 Name Length  ]

00010011
[🟣 Msg Len]

01
[Type]

00001 00101 00110 11000
[🩷 First Name: ALEX   ]

01111 01011 01001 10100 00001
[🩷 Last Name: OKITA       ]

01001000 01100101 01101100 01101100 01101111 00100000 01100110 01110010
01101111 01101101 00100000 01010010 01101001 01100010 01100010 01101001
01110100 00100001
[🟠 Message: "Hello from Ribbit!"                                      ]
```

### Hex Output

```
Hex: 4b 4e 36 46 5a 59 ff ff 00 1a 30 15 01 21 00 45 13 01 01 29 c7 88
     44 80 78 ec 42 c6 c6 fd 78 21 cc b2 c4
```

### Decoded Values

```
✅ Decoded Values

Mode:       🏆 Contest Mode
Callsign:   KN6FZY
Timestamp:  2025-10-09 12:34:56
Gridsquare: CM87uq
First Name: Alex
Last Name:  Okita
Emergency:  No
NTP Sync:   ✗
GPS Active: ✓
Message:    Hello from Ribbit!
```

## 🎯 Key Features

| Feature | Description |
|---------|-------------|
| **Dual Mode** | Switch between Chat (UTF-8) and Contest (bitpacked) |
| **Binary View** | See actual 1s and 0s, color-coded by field |
| **Hex I/O** | Encode to hex, decode from hex |
| **Comparison** | Side-by-side mode comparison with savings |
| **Round-trip** | Encode → Decode → Same values |
| **WASM Powered** | C++ bit-packing for speed |
| **Visual Flow** | Educational step-by-step visualization |

## 📊 Typical Savings

| Message Length | Chat Mode | Contest Mode | Savings |
|----------------|-----------|--------------|---------|
| Short (20 chars) | 42 bytes | 26 bytes | 38% |
| Medium (50 chars) | 72 bytes | 44 bytes | 39% |
| Long (100 chars) | 122 bytes | 73 bytes | 40% |
| Max (240 chars) | 262 bytes | 157 bytes | 40% |

**ACK Capacity**: Every ~19 bytes saved = space for 2 ACKs (79 bits each)

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| WASM not loading | Check console, refresh page |
| Buttons disabled | Wait for green status |
| Encode fails | Check all required fields filled |
| Decode fails | Verify hex format (space-separated) |
| No binary shown | Check browser supports TextEncoder |

## 📚 Color Legend

| Color | Field | Example |
|-------|-------|---------|
| 🟢 Green | Callsign | `KN6FZY` |
| 🟡 Yellow | Timestamp | `2025-10-09 12:34:56` |
| 🔵 Blue | Gridsquare | `CM87uq` |
| 🔴 Red | Emergency | `true/false` |
| 🟣 Purple | Meta (NTP, GPS, lengths) | Flags and counters |
| 🩷 Pink | Names | `Alex`, `Okita` |
| 🟠 Orange | Message | `Hello from Ribbit!` |

## 🎓 Learning Path

1. **Start Simple**: Encode a short chat message, see binary
2. **Try Contest**: Switch modes, see size difference
3. **Compare**: Use comparison tool to understand savings
4. **Decode**: Paste hex back, verify round-trip works
5. **Experiment**: Try different messages, see patterns
6. **Explore**: Look at binary, understand bit fields

## 🔗 Related Pages

- **Simple Demo**: `http://localhost:8000/web/message_format_demo.html`
- **Test Suite**: `http://localhost:8000/web/wasm_tests.html`
- **Header Tests**: `http://localhost:8000/web/encoder_tests.html`

## 📖 Documentation

- [MESSAGE_CODEC_UPDATE.md](MESSAGE_CODEC_UPDATE.md) - Full update details
- [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) - Implementation guide
- [web/HeaderReadme.md](web/HeaderReadme.md) - Bit format specification
- [DUAL_MODE_MESSAGE_ARCHITECTURE.md](DUAL_MODE_MESSAGE_ARCHITECTURE.md) - Architecture

## ⚡ Pro Tips

1. **Auto-decode**: Encoded hex is auto-filled in decode field
2. **Copy hex**: Easy to copy/paste for testing
3. **Watch binary**: See how changes affect bit patterns
4. **Use comparison**: Best way to see mode differences
5. **Check colors**: Each field type has unique color
6. **Try examples**: Pre-filled values for quick testing

## 🎉 Success!

You're ready to use the message codec! Encode, decode, compare, and learn how Ribbit packs data efficiently for radio transmission. 🐸

---

**Quick Test**: Can you encode "Hello" in both modes and see which is smaller? Try it! 🚀

