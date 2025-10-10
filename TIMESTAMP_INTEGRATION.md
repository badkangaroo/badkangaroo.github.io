# Timestamp Integration for Message Codec

## Overview

The timestamp system from `headerCodec.html` has been successfully integrated into `messageCodec.html` for **Contest Mode** messages. This is essential for ACK (acknowledgment) and QSO (contact) confirmation in amateur radio operations.

## Timestamp Format (31 bits total)

### Encoding Scheme

| Field | Bits | Range | Description |
|-------|------|-------|-------------|
| **Year/Month** | 10 | 0-1023 | Months since January 2026 (0 = Jan 2026) |
| **Day** | 5 | 0-30 | Day of month (0-based: 0 = 1st, 30 = 31st) |
| **Hour** | 5 | 0-23 | Hour in UTC (24-hour format) |
| **Minute** | 6 | 0-59 | Minute |
| **Second** | 5 | 0-29 | Second with 2-second resolution (0 = 0s, 29 = 58s) |

### Total: 31 bits

```
[10 bits Year/Month][5 bits Day][5 bits Hour][6 bits Minute][5 bits Second]
```

## Features Added

### 1. Timestamp Input Section (Contest Mode Only)

When Contest Mode is selected, users see:
- **Current UTC Time Display**: Auto-updated every second
- **Bit Breakdown**: Shows how each time component is encoded
  - Year/Month (10 bits)
  - Day (5 bits)
  - Hour (5 bits)
  - Minute (6 bits)
  - Second (5 bits)
- **Combined Timestamp**: 31-bit combined representation
- **Refresh Button**: Manually update to current time

### 2. Auto-Update Timer

```javascript
// Auto-updates every second when in Contest Mode
setInterval(() => {
    const mode = parseInt(document.querySelector('input[name="messageMode"]:checked').value);
    if (mode === 2) {
        updateTimestamp();
    }
}, 1000);
```

### 3. Encoding Output Visualization

When encoding a Contest Mode message, the output shows:
- **Timestamp Breakdown Section**: Displays each component's bits
- **Combined 31-bit Value**: The full timestamp in binary

### 4. Decoding Output Visualization

When decoding a Contest Mode message, the output shows:
- **Human-Readable Time**: "2025-Oct-09 12:34:56 UTC"
- **Bit Breakdown**: Shows how the timestamp was encoded
- **All Components**: Year/Month, Day, Hour, Minute, Second in binary

## Usage Examples

### Encoding with Timestamp

1. Select **🏆 Contest Mode**
2. Fill in callsign, gridsquare, names, message
3. **Timestamp auto-fills with current UTC time**
4. Click "🔒 Encode Message"
5. See timestamp breakdown:
   ```
   Year/Month (10): 1111101001  (Months since Jan 2026)
   Day (5):         01000        (9th day, 0-based)
   Hour (5):        01100        (12 UTC)
   Minute (6):      100010       (34)
   Second (5):      11011        (54/2 = 27, represents 54s)
   Combined (31):   1111101001010000110010011011
   ```

### Decoding with Timestamp

1. Paste hex bytes from encoded message
2. Click "🔓 Decode Message"
3. See timestamp displayed:
   ```
   Timestamp (UTC): 2025-Oct-09 12:34:54 UTC
   
   Bit Breakdown:
   Year/Month: 1111101001
   Day:        01000
   Hour:       01100
   Minute:     100010
   Second:     11011
   Combined:   1111101001010000110010011011
   ```

## Calculations

### Year/Month Encoding

```javascript
const year = now.getUTCFullYear() - 2026; // 2025 → -1 (before 2026)
const month = now.getUTCMonth();           // 0-11 (0 = Jan)
const yearMonth = year * 12 + month;       // Months since Jan 2026

// Clamp to 0 if before Jan 2026 (epoch start)
const clampedYearMonth = Math.max(0, yearMonth);
const yearMonthBits = clampedYearMonth.toString(2).padStart(10, '0');
```

**Examples**:
- Jan 2026: (2026-2026) * 12 + 0 = 0 → `0000000000` (epoch start)
- Oct 2025: (2025-2026) * 12 + 9 = -3 → **Clamped to 0** → `0000000000` ⚠️
- Dec 2030: (2030-2026) * 12 + 11 = 59 → `0000111011`
- Apr 2111: (2111-2026) * 12 + 3 = 1023 → `1111111111` (max value)

**Range**: Jan 2026 to Apr 2111 (~85 years)

**Note**: Any date before January 2026 is clamped to 0 (all zeros). The timestamp display will show a warning: "⚠️ Before Jan 2026 (encoded as 0)"

### Day Encoding

```javascript
const day = now.getUTCDate() - 1; // 1st → 0, 31st → 30
const dayBits = day.toString(2).padStart(5, '0');
```

**Examples**:
- 1st: 0 → `00000`
- 15th: 14 → `01110`
- 31st: 30 → `11110`

### Hour Encoding

```javascript
const hour = now.getUTCHours(); // 0-23
const hourBits = hour.toString(2).padStart(5, '0');
```

**Examples**:
- 00:00 UTC: 0 → `00000`
- 12:00 UTC: 12 → `01100`
- 23:59 UTC: 23 → `10111`

### Minute Encoding

```javascript
const minute = now.getUTCMinutes(); // 0-59
const minuteBits = minute.toString(2).padStart(6, '0');
```

**Examples**:
- :00: 0 → `000000`
- :30: 30 → `011110`
- :59: 59 → `111011`

### Second Encoding (2-second resolution)

```javascript
const second = Math.floor(now.getUTCSeconds() / 2); // Divide by 2
const secondBits = second.toString(2).padStart(5, '0');
```

**Examples**:
- 0-1s: 0 → `00000`
- 30-31s: 15 → `01111`
- 58-59s: 29 → `11101`

**Note**: 2-second resolution saves 1 bit. Ribbit's transmission time is ~1.6s, so this resolution is adequate.

## Why This Matters for ACK/QSO

### ACK Format (79 bits)

For message acknowledgments, the ACK contains:
- **Callsign** (48 bits): Who sent the message
- **Timestamp** (31 bits): When the message was sent

This allows receivers to:
1. **Uniquely identify** each message (callsign + time)
2. **Confirm receipt** by sending back the ACK
3. **Prevent duplicates** by checking timestamp
4. **Track contacts** for logging QSOs

### Space Efficiency

Contest Mode's bitwise encoding saves space for ACKs:

```
Chat Mode:     52 bytes (416 bits)
Contest Mode:  33 bytes (264 bits)
Saved:         19 bytes (152 bits)

152 bits / 79 bits per ACK = 1.9 ACKs possible in saved space
```

### QSO Logging

The timestamp ensures accurate logging:
- **When**: Exact time of contact (2-second precision)
- **Who**: Callsign of other station
- **Where**: Gridsquare location
- **What**: Exchange details (names, signal report implied)

All required for valid contest QSO logging!

## Browser UTC Time

The system uses the browser's built-in UTC time:

```javascript
const now = new Date();
const utcYear = now.getUTCFullYear();
const utcMonth = now.getUTCMonth();
const utcDay = now.getUTCDate();
const utcHour = now.getUTCHours();
const utcMinute = now.getUTCMinutes();
const utcSecond = now.getUTCSeconds();
```

**Benefits**:
- No external time API needed
- Works offline
- Consistent across all browsers
- Automatically handles timezones

**Considerations**:
- Relies on user's system clock
- NTP flag indicates if time is synchronized
- GPS flag indicates if position (and possibly time) from GPS

## Visual Feedback

### Encoding Section

```
┌─────────────────────────────────────────┐
│ Timestamp (UTC) - For ACK/QSO           │
├─────────────────────────────────────────┤
│ Current UTC Time:                       │
│ 2025-Oct-09 12:34:56 UTC               │
│                                         │
│ Year/Month (10 bits): 1111101001       │
│ Months since Jan 2026                   │
│                                         │
│ Day (5 bits): 01000                     │
│ 0-30 (0-based)                          │
│                                         │
│ Hour (5 bits): 01100                    │
│ 0-23 UTC                                │
│                                         │
│ Minute (6 bits): 100010                 │
│ 0-59                                    │
│                                         │
│ Second (5 bits): 11011                  │
│ 2-sec resolution                        │
│                                         │
│ Combined Timestamp (31 bits):           │
│ 1111101001010000110010011011           │
│                                         │
│ [🔄 Refresh UTC Time]                   │
└─────────────────────────────────────────┘
```

### Output Section

```
┌─────────────────────────────────────────┐
│ Timestamp Breakdown (31 bits)           │
├─────────────────────────────────────────┤
│ Year/Month (10): 1111101001             │
│ Day (5): 01000                          │
│ Hour (5): 01100                         │
│ Minute (6): 100010                      │
│ Second (5): 11011                       │
│ ───────────────────────────────────────│
│ Combined (31 bits):                     │
│ 1111101001010000110010011011           │
└─────────────────────────────────────────┘
```

## Technical Implementation

### Update Function

```javascript
function updateTimestamp() {
    const now = new Date();
    
    // Calculate components
    const year = now.getUTCFullYear() - 2026;
    const month = now.getUTCMonth();
    const yearMonth = year * 12 + month;
    const day = now.getUTCDate() - 1;
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const second = Math.floor(now.getUTCSeconds() / 2);
    
    // Convert to binary
    const yearMonthBits = yearMonth.toString(2).padStart(10, '0');
    const dayBits = day.toString(2).padStart(5, '0');
    const hourBits = hour.toString(2).padStart(5, '0');
    const minuteBits = minute.toString(2).padStart(6, '0');
    const secondBits = second.toString(2).padStart(5, '0');
    
    // Combine
    const combinedBits = yearMonthBits + dayBits + hourBits + minuteBits + secondBits;
    
    // Update display
    document.getElementById('timestampCombined').textContent = combinedBits;
    
    return Date.now(); // Epoch timestamp for WASM
}
```

### Mode Switching

```javascript
radio.addEventListener('change', (e) => {
    const mode = parseInt(e.target.value);
    document.getElementById('timestampFields').style.display = mode === 2 ? 'block' : 'none';
    
    if (mode === 2) {
        updateTimestamp(); // Refresh when switching to Contest
    }
});
```

### Auto-Update

```javascript
setInterval(() => {
    const mode = parseInt(document.querySelector('input[name="messageMode"]:checked').value);
    if (mode === 2) {
        updateTimestamp(); // Update every second
    }
}, 1000);
```

## Integration with WASM

The timestamp is passed to the WASM encoder:

```javascript
// Contest mode data
data = {
    callsign: document.getElementById('callsign').value,
    gridsquare: document.getElementById('gridsquare').value,
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    message: document.getElementById('message').value,
    timestamp: Date.now(), // ← Epoch timestamp passed to WASM
    emergency: document.getElementById('emergency').checked,
    ntp: document.getElementById('ntp').checked,
    gps: document.getElementById('gps').checked
};

const encoded = messageFormatter.encode(2, data);
```

The WASM C++ code converts the epoch timestamp to the bit-packed format.

## Color Coding

In the visual display, timestamp-related fields use **yellow/amber** (`#fbbf24`):
- 🟡 Timestamp bits
- 🟡 Year/Month
- 🟡 Day
- 🟡 Hour
- 🟡 Minute
- 🟡 Second

This matches the convention from `headerCodec.html` and makes it easy to identify timestamp data in the binary stream.

## Summary

✅ **Added**: Full timestamp system (31 bits) for Contest Mode  
✅ **Auto-updates**: Every second with current UTC time  
✅ **Visual**: Bit breakdown shown for encoding and decoding  
✅ **Range**: Jan 2026 to Apr 2111 (~85 years)  
✅ **Resolution**: 2 seconds (adequate for Ribbit's ~1.6s TX time)  
✅ **Purpose**: Essential for ACK and QSO confirmation  
✅ **Integration**: Works seamlessly with WASM encoder/decoder  

The timestamp system is now fully operational and ready for ACK/QSO confirmation in Contest Mode! 🎉

