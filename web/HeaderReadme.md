# Header Data Format

Revisions to the data structure of the header are as follows.

## Data Structure Revision



| **section**    | **sub-section** | **type**   | **bits** | **input**  | **output**     |
| -------------- | --------------- | ---------- | -------- | ---------- | -------------- |
|                | callsign 1      | alphanum   | 6        | a-z/0-9    | a-z/0-9        |
|                | callsign 2      | alphanum   | 6        | a-z/0-9    | a-z/0-9        |
|                | callsign 3      | alphanum   | 6        | a-z/0-9    | a-z/0-9        |
|                | callsign 4      | alphanum   | 6        | a-z/0-9    | a-z/0-9        |
|                | callsign 5      | alphanum   | 6        | a-z/0-9    | a-z/0-9        |
|                | callsign 6      | alphanum   | 6        | a-z/0-9    | a-z/0-9        |
|                | callsign 7      | alphanum   | 6        | a-z/0-9    | a-z/0-9        |
|                | callsign 8      | alphanum   | 6        | a-z/0-9    | a-z/0-9        |
| ==callsign==   |                 | **total:** | 48       |            |                |
|                | months*         | number     | 10       | 0-1023     | 2026-2111      |
|                | day             | number     | 5        | 0-31       | 1-32           |
|                | hour            | number     | 5        | 0-23       | 1-24           |
|                | minute          | number     | 6        | 0-58       | 0-58           |
|                | second          | number     | 5        | 0-29       | 0-58           |
| ==timestamp==  |                 | **total:** | 31       |            |                |
|                | field x         | letter     | 5        | a-z        | A-Z            |
|                | field y         | letter     | 5        | a-z        | A-Z            |
|                | square x        | number     | 4        | 0-9        | 0-9            |
|                | square y        | number     | 4        | 0-9        | 0-9            |
|                | subsquare x     | letter     | 5        | a-z        | a-z            |
|                | subsquare y     | letter     | 5        | a-z        | a-z            |
| ==gridsquare== |                 | **total:** | 28       |            |                |
|                | NTP             | boolean    | 1        | true/false | isNTP          |
|                | GPS             | boolean    | 1        | true/false | isGPS          |
|                | Template        | template   | 2        | 0-3        | message type*  |
|                | emergency       | boolean    | 1        | true/false | isEmergency    |
| ==meta==       |                 | **total:** | 5        |            |                |
|                | name length     | number     | 8        | 0-255      | name length*   |
|                | name            | alphanum   | array    | array      |                |
| ==name==       |                 |            | 8-192    |            |                |
| ==message==    |                 |            |          |            |                |
|                | message length  | number     | 8        | 0-255      | message lenth* |
|                | message         | utf-8      | 1920*    | string     | string         |
|                | ACK*            | alphanum   | 1920*    | string     | string         |

**months**: also sets the year by counting number of months from 2026.

**message type:** 2-bit field supporting up to 4 message types (0-3). Defined types:
0. emergency
1. chat
2. contest
3. other

**name length:** 8-bit field split into two 4-bit nibbles. First nibble (bits 0-3) sets the first name length (0-15 characters), second nibble (bits 4-7) sets the last name length (0-15 characters). Both names use 6-bit alphanumeric encoding and are displayed with first character uppercase, rest lowercase.

**message length**: sets the number of characters to display in the message component, unused space can be used for forwarding or repeating emergency information. This comes out to 1920 bits, or 240 bytes, since this is UTF-8, some characters can multiple bytes long.

**ACK** the acknowledgement section contains callsign + timestamp to indicate which messages have been received.
# Ordering

| Input           | fragment       | bit size | bit layout  |
| --------------- | -------------- | -------- | --- |
| AB1CDE          | Callsign       | 48       | 0b000000 ... 0b000000 0b000000 |
| 2025/10/5 21:11 | Timestamp      | 31       | 0b0000000000 ... 0b00000 0b00000 0b00000 |
| CM97af          | Grid Square    | 28       | 0b00000 ... 0b00000 0b00000 |
| checkbox        | Emergency      | 1        | 0b0 |
| checkbox        | NTP            | 1        | 0b0 |
| checkbox        | GPS            | 1        | 0b0 |
| 4 + 4           | Name length    | 8        | 0b0000 0b0000 |
| 11              | Message length | 8        | 0b00000000 |
| 0-3             | Message Type   | 2        | 0b00       |
| "alex"          | First Name     | 0-90     | [0b000000, ... 0b000000] |
| "okita"         | Last Name      | 0-90     | [0b000000, ... 0b000000] |
| "hello world"   | Message        | 0-1920   | [0b00000000, ... 0b0000000] |
| ACK             | array          | 0-1920   | [callsign + timestamp, ... callsign + timestamp] |

The revision above should be reflected in the following information

## Emergency - 1 bit

Boolean flag for emergency messages. When set, triggers special forwarding/repeating mode.

```javascript
// Encoding
const emergency = false;
const emergencyBit = emergency ? 1 : 0;

// Decoding
const isEmergency = parseInt(emergencyBit, 2) > 0;
```

## Timestamp - 31 bits

Time encoding with 2-second resolution (aligns with Ribbit's ~1.6s transmission time).

**Structure:** Year/Month (10) + Day (5) + Hour (5) + Minute (6) + Second (5) = 31 bits

### Year / Month - 10 bits

Combined year/month counter starting from **January 2026** (month 0).  
**Range:** 0-1023 (covers Jan 2026 to Apr 2111, ~85 years)

```javascript
// Encoding
const now = new Date();
const year = now.getUTCFullYear() - 2026;
const month = now.getUTCMonth(); // 0-11
const monthYear = year * 12 + month;
const monthYearBits = monthYear.toString(2).padStart(10, '0');

// Decoding
const monthYear = parseInt(monthYearBits, 2);
const year = Math.floor(monthYear / 12) + 2026;
const month = monthYear % 12; // 0=Jan, 11=Dec
```

### Day - 5 bits

**Range:** 0-30 (0-based encoding, represents days 1-31)

```javascript
// Encoding
const day = now.getUTCDate() - 1; // 0-30
const dayBits = day.toString(2).padStart(5, '0');

// Decoding
const day = parseInt(dayBits, 2) + 1; // 1-31
```

### Hour - 5 bits

**Range:** 0-23 (24-hour UTC format)

```javascript
// Encoding
const hour = now.getUTCHours(); // 0-23
const hourBits = hour.toString(2).padStart(5, '0');

// Decoding
const hour = parseInt(hourBits, 2); // 0-23
```

### Minute - 6 bits

**Range:** 0-59

```javascript
// Encoding
const minute = now.getUTCMinutes(); // 0-59
const minuteBits = minute.toString(2).padStart(6, '0');

// Decoding
const minute = parseInt(minuteBits, 2); // 0-59
```

### Second - 5 bits

**Range:** 0-29 (represents 0, 2, 4...58 seconds, 2-second resolution)

```javascript
// Encoding
const second = Math.floor(now.getUTCSeconds() / 2); // 0-29
const secondBits = second.toString(2).padStart(5, '0');

// Decoding
const second = parseInt(secondBits, 2) * 2; // 0, 2, 4...58
```

## Callsign - 48 bits

8-character amateur radio callsign (6 bits per character using alphanumbit encoding).  
Padded with spaces if shorter than 8 characters.

```javascript
// Encoding
const callsign = 'KN6FZY';
const paddedCallsign = callsign.padEnd(8, ' ').toUpperCase();
let callsignBits = '';
for (let i = 0; i < 8; i++) {
    const char = paddedCallsign[i];
    const charValue = alphanumbit[char] || 0b111111;
    callsignBits += charValue.toString(2).padStart(6, '0');
}

// Decoding
const alphanumbitReverse = Object.fromEntries(
    Object.entries(alphanumbit).map(([char, value]) => [value, char])
);
let callsign = '';
for (let i = 0; i < 48; i += 6) {
    const charBits = callsignBits.substring(i, i + 6);
    const charValue = parseInt(charBits, 2);
    callsign += alphanumbitReverse[charValue] || ' ';
}
```

### Alphanumbit Lookup (6 bits)

```javascript
const alphanumbit = {
    "0": 0b000000, "1": 0b000001, "2": 0b000010, "3": 0b000011,
    "4": 0b000100, "5": 0b000101, "6": 0b000110, "7": 0b000111,
    "8": 0b001000, "9": 0b001001, "A": 0b001010, "B": 0b001011,
    "C": 0b001100, "D": 0b001101, "E": 0b001110, "F": 0b001111,
    "G": 0b010000, "H": 0b010001, "I": 0b010010, "J": 0b010011,
    "K": 0b010100, "L": 0b010101, "M": 0b010110, "N": 0b010111,
    "O": 0b011000, "P": 0b011001, "Q": 0b011010, "R": 0b011011,
    "S": 0b011100, "T": 0b011101, "U": 0b011110, "V": 0b011111,
    "W": 0b100000, "X": 0b100001, "Y": 0b100010, "Z": 0b100011,
    "/": 0b100100, "?": 0b100101, "~": 0b100110, "!": 0b100111,
    "@": 0b101000, "#": 0b101001, "$": 0b101011, "%": 0b101100,
    "^": 0b101101, "&": 0b101110, "*": 0b101111, "(": 0b110000,
    ")": 0b110001, "-": 0b110010, "=": 0b110011, "[": 0b110100,
    "]": 0b110101, "\\": 0b110110, "|": 0b110111, "`": 0b111000,
    "_": 0b111001, "+": 0b111010, ":": 0b111011, "\"": 0b111100,
    ";": 0b111101, ",": 0b111110, ".": 0b111111, " ": 0b111111
};
```

## Gridsquare - 28 bits

[Maidenhead Locator](https://en.wikipedia.org/wiki/Maidenhead_Locator_System) geolocation (6 characters: 2 letters + 2 numbers + 2 letters).  
Example: `CM87uq`

```javascript
// Encoding
const gridsquare = 'CM87uq';
const upper = gridsquare.toUpperCase();

const letter1Bits = alphabit[upper[0]].toString(2).padStart(5, '0');
const letter2Bits = alphabit[upper[1]].toString(2).padStart(5, '0');
const number1Bits = nibble[upper[2]].toString(2).padStart(4, '0');
const number2Bits = nibble[upper[3]].toString(2).padStart(4, '0');
const letter3Bits = alphabit[upper[4]].toString(2).padStart(5, '0');
const letter4Bits = alphabit[upper[5]].toString(2).padStart(5, '0');

const gridsquareBits = letter1Bits + letter2Bits + number1Bits +
                       number2Bits + letter3Bits + letter4Bits;

// Decoding
const alphabitReverse = Object.fromEntries(
    Object.entries(alphabit).map(([char, value]) => [value, char])
);
const nibbleReverse = Object.fromEntries(
    Object.entries(nibble).map(([char, value]) => [value, char])
);

const letter1 = alphabitReverse[parseInt(gridsquareBits.substring(0, 5), 2)];
const letter2 = alphabitReverse[parseInt(gridsquareBits.substring(5, 10), 2)];
const number1 = nibbleReverse[parseInt(gridsquareBits.substring(10, 14), 2)];
const number2 = nibbleReverse[parseInt(gridsquareBits.substring(14, 18), 2)];
const letter3 = alphabitReverse[parseInt(gridsquareBits.substring(18, 23), 2)];
const letter4 = alphabitReverse[parseInt(gridsquareBits.substring(23, 28), 2)];

const gridsquare = `${letter1}${letter2}${number1}${number2}${letter3}${letter4}`;
```

### Alphabit Lookup (5 bits for letters)

```javascript
const alphabit = {
    " ": 0b00000, "A": 0b00001, "B": 0b00010, "C": 0b00011,
    "D": 0b00100, "E": 0b00101, "F": 0b00110, "G": 0b00111,
    "H": 0b01000, "I": 0b01001, "J": 0b01010, "K": 0b01011,
    "L": 0b01100, "M": 0b01101, "N": 0b01110, "O": 0b01111,
    "P": 0b10000, "Q": 0b10001, "R": 0b10010, "S": 0b10011,
    "T": 0b10100, "U": 0b10101, "V": 0b10110, "W": 0b10111,
    "X": 0b11000, "Y": 0b11001, "Z": 0b11010, "@": 0b11011,
    ".": 0b11100, ":": 0b11101, "/": 0b11110, "-": 0b11111
};
```

### Nibble Lookup (4 bits for numbers)

```javascript
const nibble = {
    "0": 0b0000, "1": 0b0001, "2": 0b0010, "3": 0b0011,
    "4": 0b0100, "5": 0b0101, "6": 0b0110, "7": 0b0111,
    "8": 0b1000, "9": 0b1001, "A": 0b1010, "B": 0b1011,
    "C": 0b1100, "D": 0b1101, "E": 0b1110, " ": 0b1111
};
```

## Reference

### Bit Capacity Reference

| Bits | Max Value | Bits | Max Value |
|------|-----------|------|-----------|
| 1    | 1         | 4    | 15        |
| 5    | 31        | 6    | 63        |
| 10   | 1,023     | 28   | 268M      |
| 31   | 2.1B      | 48   | 281T      |

### Maidenhead Gridsquare Precision

| Format     | Example     | Precision     |
|------------|-------------|---------------|
| 2 letters  | `CM`        | ~20° × 10°    |
| +2 digits  | `CM87`      | ~2° × 1°      |
| +2 letters | `CM87uq`    | ~5′ × 2.5′    |
| +2 digits  | `CM87uq12`  | ~30″ × 15″    |

**Note:** Ribbit uses the 6-character format (CM87uq) for optimal size/precision balance.
