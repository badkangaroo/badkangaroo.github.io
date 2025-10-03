# Header Data Format

The data arrangement and bit wise formatting for a reduced and compact
arrangement of several different types to identify data sent through ribbit.
The proposed total length of the header is 32 bits.

## Data types

    1. Emergency - 1 bit
    2. Time-Stamp - 10 + 5 + 5 + 6 + 5 = 31 bits
    3. Callsign  - 48 bits
    4. Gridsquare - 28 bits

The total bits is 1 + 31 + 48 + 28 = 108 bits
the 108 bits can be divided into 13.5 bytes, or rather 14 bytes since
we need to use whole bytes to send to the ribbit encoder. This means
the first 112 bits, or rather the first 14 bytes from the decoder
will be split from the array to be decoded into the header.

## **Emergency** - 1 bit

By default this is set to 0, when using the app for emergency
the bit is set to 1 to alert and set the app into a special
mode to forward messages or repeat messages from the emergency sender.

### **Decoding** emergency flag into 1 bit

    ```javascript
        const emergencyBit = '0';
        const emergency = parseInt(emergencyBit, 2); // 0
        const isEmergency = emergency > 0;
        console.log(`is Emergency: ${isEmergency?'true':'false'}`);
    ```

The emergency bit is decoded as a boolean value.

### **Encoding** emergency flag into 1 bit

    ```javascript
        const emergencyBit = false;
        const isEmergency = emergencyBit ? 1 : 0;
        return isEmergency;
    ```

## Timestamp - 31 bits

An unusual format is used to keep track of the time a message is sent.
The timing interval is set to every two seconds. The formatting
is to reduce the use of bits by using only 10 bits for the month

there can be as many as 2,687,400 seconds per month which would need a 22 bit
binary value to represent the resolution per second. if we use every other second
that can be reduced to 1,343,700 which would need a 21 bits.

Ultimately, the binary representation needs to be broken into 8 bit fragments to
be encoded into utf-8 characters. so a 32 bit timestamp can be encoded into 4
utf-8 segments which can actually be a single utf-8 character
[see UTF8 breakdown](###utf8breakdown) for reference.

⚠️ To avoid these problems we need to ensure that the encoding per character
always checks for leading 0x. If leading with 1s the utf-8 parsing could be
mislead into seeing the following bits as a part of a multi-part utf-8 encoded
character. Testing for interfering with the text in the body of the message
will be required to inspect results when this occurs.

### Timestamp formatting

    1. Year / Month - 10 bits
    2. Day - 5 bits
    3. Hour - 5 bits
    4. Minute - 6 bits
    5. Second - 5 bits
    6. Emergency - 1 bit

Total bits: 10 + 5 + 5 + 6 + 5 + 1 = 32 bits

### Function patterns

When **decoding** a fragment of the header the input into a function is always a
string `11110000` of 1s and 0s and the returned value is a **Number** of the
decoded year day hour minute or second. The only exception is the Emergency flag
which is a boolean value true or false.

When **encoding** to the header fragment, the input is always a **Number** of
the year, day hour minute second. The only exception is the emergency flag which is a boolean value.

## **Year / Month** - 10 bits

The first month of the app begins **January 2026** as month 0 each month after
increments by 1. Year and Month encoding uses 10 bits of resolution.

**Range 0 - 1023** The last month before looping is January 2111 or 85 years and
3 months from the start of the counter. To calculate the specific month we can
also find the year the month is in.

### **Decoding** Month from 10 bits

Getting the the value from extracted bits.

📝 Verbose code used to provide more debugging opportunity.

    ```javascript
    // decoding
    // range 0 to 1023
    const monthYearBits = `0101010101`; // 10 bit value
    const monthYear = parseInt(monthYearBits, 2); // 341

    // array of the month of the year
    const theMonths = [
        'January','February','March',
        'April','May','June','July',
        'August','September','October',
        'November','December'
    ];

    // get month
    const whichMonth = monthYear % 12; // 341 % 12 = 5

    // jan = 0, feb = 1, mar = 2, apr = 3, may = 4, jun = 5, jul = 6
    // aug = 7, sep = 8, oct = 9, nov = 10, dec = 11
    const month = theMonths[whichMonth]; // June
    // 5th month = june

    // get year
    const whichYear = monthYear / 12; // 28.41666...

    const years = Number.parseInt(whichYear); // 28 (remove float component)
    // don't use Math.round(whichYear/12) since 28.6 will round to 29
    // which will advance another year just because july is past
    // the rounding point so it goes up to the next year, and
    // we don't want to add a year half way through a year.

    const year = years + 2026; // 2054

    // log year and month from the 10 bits.
    console.log(`Year: ${year} Month: ${month}`);
    ```

### **Encoding** Month into 10 bits:

Creating the ribbit formatted year from the current date.

    ```javascript
    // encoding
    const now = new Date();
    const fullYear = now.getUTCFullYear(); // 2026
    const year = fullYear - 2026; // 0
    const month = now.getUTCMonth(); // 0-11 (0=Jan, 11=Dec)
    const monthYear = year * 12 + month; // 0
    const monthYearBits = monthYear.toString(2).padStart(10, '0'); // '0000000000'
    console.log(`Year bits: 0b${monthYearBits}`); // Year bits: 0b0000000000
    ```

## **Day** - 5 bits

The first day of the month is 0 with the last day possible is 32 using 5 bits of
resolution to cover any day for each month. Of course, the first day is still
considered the 1st.

### **Decoding** Day from 5 bits

After masking and isolating the day bits from the header we use the following
to extract the day from the bits.

**Range 0 - 31** an unsigned integer is used to designate the day for each month.

    ```javascript
    // decoding
    const dayBits = '11111';
    const day = parseInt(dayBits, 2); // 31
    console.log(`Day: ${day}`);
    ```

### **Encoding** Day into 5 bits

To encode the day into the bits we use the following:

    ```javascript
    const now = new Date();
    const dayOfTheMonth = now.getUTCDate() - 1; // 0 to 30 (getUTCDate returns 1-31)
    const dayBits = dayOfTheMonth.toString(2).padStart(5,'0'); // 00000 to 11111
    console.log(`Day bits: 0b${dayBits}`);
    ```

## **Hour** - 5 bits

The hours of the day require a range of 24, so the next closest bit width is 5
bits. with the first hour of the day starting at 0.

**Range 0 - 31 (bit capacity), 0 - 23 (used range)** The hour of the day from 0 (midnight) to 23 (11pm)

### **Decoding** hour from 5 bits

To get the hour we will also show a 12 hour clock with am/pm.

    ```javascript
    const hourBits = '10111';
    const hours = parseInt(hourBits, 2); // 23
    const hour = hours%12;
    // midnight is 0am to 1 = 1am to 11 = 11am
    // noon is 0pm 13 = 1pm to 23 = 11pm
    const midDay = hours / 12; // 0 - 1.91
    const afternoon = midDay >= 1;

    // get suffix am or pm
    const ampm = afternoon ? 'pm' : 'am';

    // technically the zeroth hour is 12
    const nonZero = hour == 0 ? 12 : hour;
    console.log(`${nonZero}${ampm}`); // 11pm
    ```

We can improve this by using the timezone to update the hour to the users
local timezone.
`const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;`
then at the end we can use
`const localString = utcDate.toLocaleString('en-US', { timeZone: timezone });`
to convert the full utcDate into a local value from
`const utcDate = new Date('2025-10-01T18:20:00Z');`

### **Encoding** hour to 5 bits

    To encode the hour we use `getUTCHours()` to get the hour in a from midnight.

    ```javascript
    const now = new Date();
    const hour = now.getUTCHours(); // 0 to 23
    const hourBits = hour.toString(2).padStart(5, '0'); // 00000 to 10111
    console.log(`Hour bits: 0b${hourBits}`);
    ```

## **Minute** - 6 bits

The minute is a 6 bit value which can represent a number from 0 to 63 so the
used range is from 0 to 59 or 0b000000 to 0b111011

### **Decoding** minute from 6 bits

    ```javascript
        const minuteBits = '111011'; // extracted bits
        const minutes = parseInt(minuteBits, 2);  // 59
        console.log(`Minute of the hour: ${minutes}`);
    ```

### **Encoding** minute into 6 bits

    ```javascript
        const now = new Date();
        const minute = now.getUTCMinutes(); // 30
        const minuteBits = minute.toString(2).padStart(6, '0');
        console.log(`Minute bits: 0b${minuteBits}`);
    ```

## **Second** - 5 bits

We're only counting every other second or 0, 2, 4, 6... This is to set the
time resolution of our updates to every beat of the ribbit clock for automatic
time alignment between all clients. The message transmission time is roughly 1.6
seconds, so we're only ever able to send/receive a message every 2 seconds.
This means we only need a range from 0 to 29, so a 5 bit value is all we need.

### **Decoding** seconds into 5 bits

    ```javascript
        const secondBits = '11101';
        const second = parseInt(secondBits, 2); // 29
        const seconds = second * 2; // 58
        console.log(`Seconds of the minute: 0b${seconds}`);
    ```

### **Encoding** second into 5 bits

    ```javascript
        const now = new Date();
        const second = Math.floor(now.getUTCSeconds() / 2); // 0 to 29 (every 2 seconds)
        const secondBits = second.toString(2).padStart(5, '0');
        console.log(`Second bits: 0b${secondBits}`);
    ```



## **Callsign** - 48 bits

The encoding of the radio controller's callsign. This is an 8 character string
composed of either letters or numbers. Each character is a 6 bit character drawn
from the alphanumbits `headerBitTypes.js` located in scripts. The total bit
length of the callsign is `6 * 8 = 48` bits.

### **Decoding** callsign from 48 bits

To decode a callsign, we extract each 6-bit segment and convert it back to a character using the alphanumbit lookup table.

    ```javascript
    // decoding
    import { alphanumbit } from './headerBitTypes.js';
    
    // create reverse lookup table
    const alphanumbitReverse = Object.fromEntries(
        Object.entries(alphanumbit).map(([char, value]) => [value, char])
    );
    
    // 48 bit callsign string
    const callsignBits = '001010001011001100001101001110001111010000010001'; // 'ABCDEFGH'
    
    let callsign = '';
    for (let i = 0; i < 48; i += 6) {
        const charBits = callsignBits.substring(i, i + 6);
        const charValue = parseInt(charBits, 2);
        callsign += alphanumbitReverse[charValue];
    }
    
    console.log(`Callsign: ${callsign}`); // 'ABCDEFGH'
    ```

### **Encoding** callsign to 48 bits

To encode a callsign, we convert each character to its 6-bit value using the alphanumbit lookup table. The callsign must be exactly 8 characters, padding with spaces if needed.

    ```javascript
    // encoding
    import { alphanumbit } from './headerBitTypes.js';
    
    const callsign = 'KN6FZY'; // example callsign
    const paddedCallsign = callsign.padEnd(8, ' '); // pad to 8 characters
    
    let callsignBits = '';
    for (let i = 0; i < 8; i++) {
        const char = paddedCallsign[i].toUpperCase();
        const charValue = alphanumbit[char] || 0b111111; // default to space if not found
        const charBits = charValue.toString(2).padStart(6, '0');
        callsignBits += charBits;
    }
    
    console.log(`Callsign bits (48 bits): 0b${callsignBits}`);
    ```

## **Gridsquare** - 28 bits

A Gridsquare is a geolocation address
The encoding of the first 6 digits of the users grid square location. The first
two characters are always letters the second two characters are always numbers.
The last two characters are always letters. So we can rely on A-Z, or two 5 bit
values, followed by 0-9, 0-9 which can be two 4 bit values then another pair of letters. Technically the number section ranges from 0 to 99 which can be
represented by a single 7bit value which ranges 0 to 127. 99 being `0b1100011`
but that creates a floating bit left over. the total bits used for a grid square is 28 bits. 10 + 8 + 10.

### **Decoding** Gridsquare from 28 bits

To decode a gridsquare, we extract the bits in groups: 5+5 for first letters, 4+4 for numbers, 5+5 for last letters.

    ```javascript
    // decoding
    import { alphabit, nibble } from './headerBitTypes.js';
    
    // create reverse lookup tables
    const alphabitReverse = Object.fromEntries(
        Object.entries(alphabit).map(([char, value]) => [value, char])
    );
    const nibbleReverse = Object.fromEntries(
        Object.entries(nibble).map(([char, value]) => [value, char])
    );
    
    // 28 bit gridsquare string (example: CM87uq)
    const gridsquareBits = '0001110110001000011110110001'; // CM87uq
    
    // First letter (5 bits)
    const letter1Value = parseInt(gridsquareBits.substring(0, 5), 2);
    const letter1 = alphabitReverse[letter1Value];
    
    // Second letter (5 bits)
    const letter2Value = parseInt(gridsquareBits.substring(5, 10), 2);
    const letter2 = alphabitReverse[letter2Value];
    
    // First number (4 bits)
    const number1Value = parseInt(gridsquareBits.substring(10, 14), 2);
    const number1 = nibbleReverse[number1Value];
    
    // Second number (4 bits)
    const number2Value = parseInt(gridsquareBits.substring(14, 18), 2);
    const number2 = nibbleReverse[number2Value];
    
    // Third letter (5 bits)
    const letter3Value = parseInt(gridsquareBits.substring(18, 23), 2);
    const letter3 = alphabitReverse[letter3Value];
    
    // Fourth letter (5 bits)
    const letter4Value = parseInt(gridsquareBits.substring(23, 28), 2);
    const letter4 = alphabitReverse[letter4Value];
    
    const gridsquare = `${letter1}${letter2}${number1}${number2}${letter3}${letter4}`;
    console.log(`Gridsquare: ${gridsquare}`); // 'CM87uq'
    ```

### **Encoding** Gridsquare into 28 bits

To encode a gridsquare, we convert each character using the appropriate lookup table: alphabit for letters, nibble for numbers.

    ```javascript
    // encoding
    import { alphabit, nibble } from './headerBitTypes.js';
    
    const gridsquare = 'CM87uq'; // example gridsquare
    const upper = gridsquare.toUpperCase(); // 'CM87UQ'
    
    // First letter (5 bits)
    const letter1Bits = alphabit[upper[0]].toString(2).padStart(5, '0');
    
    // Second letter (5 bits)
    const letter2Bits = alphabit[upper[1]].toString(2).padStart(5, '0');
    
    // First number (4 bits)
    const number1Bits = nibble[upper[2]].toString(2).padStart(4, '0');
    
    // Second number (4 bits)
    const number2Bits = nibble[upper[3]].toString(2).padStart(4, '0');
    
    // Third letter (5 bits)
    const letter3Bits = alphabit[upper[4]].toString(2).padStart(5, '0');
    
    // Fourth letter (5 bits)
    const letter4Bits = alphabit[upper[5]].toString(2).padStart(5, '0');
    
    const gridsquareBits = letter1Bits + letter2Bits + number1Bits + 
                           number2Bits + letter3Bits + letter4Bits;
    
    console.log(`Gridsquare bits (28 bits): 0b${gridsquareBits}`);
    ```

## Reference

### UTF-8 fragments

Great question, Alex — the number of **8-bit frames (bytes)** used to encode a UTF-8 character depends on the character itself. UTF-8 is a **variable-length encoding**, meaning it uses between **1 and 4 bytes** per character.

### utf8breakdown

| Unicode Range        | UTF-8 Bytes | Binary Prefix                         |
|----------------------|-------------|---------------------------------------|
| U+0000 to U+007F     | 1 byte      | `0xxxxxxx`                            |
| U+0080 to U+07FF     | 2 bytes     | `110xxxxx 10xxxxxx`                   |
| U+0800 to U+FFFF     | 3 bytes     | `1110xxxx 10xxxxxx 10xxxxxx`          |
| U+10000 to U+10FFFF  | 4 bytes     | `11110xxx 10xxxxxx 10xxxxxx 10xxxxxx` |
|----------------------|-------------|---------------------------------------|

### 🧠 Examples

- `'A'` → U+0041 → **1 byte**: `0x41`
- `'é'` → U+00E9 → **2 bytes**: `0xC3 0xA9`
- `'€'` → U+20AC → **3 bytes**: `0xE2 0x82 0xAC`
- `'𐍈'` → U+10348 → **4 bytes**: `0xF0 0x90 0x8D 0x88`

So if you're parsing UTF-8 streams or designing a decoder, you’ll need to inspect the **leading bits** of each byte to determine how many frames follow.

Want to build a UTF-8 parser or visualize byte sequences for onboarding docs? I’d love to help!

### Seconds in a month

Great question — but the answer depends on **which month** you're talking about, since months vary in length. Here's a breakdown:

### 📆 Seconds per Month (Typical Range)

| Month                             | Days | Seconds                         |
|-----------------------------------|------|---------------------------------|
| February                          | 28   | 2,419,200                       |
| February (leap year)              | 29   | 2,505,600                       |
| April, June, Sept, Nov            | 30   | 2,592,000                       |
| Jan, Mar, May, Jul, Aug, Oct, Dec | 31   | 2,678,400                       |
|-----------------------------------|------|---------------------------------|

### 🧮 Quick Formula

To calculate seconds in any month:

    ```javascript
    const daysInMonth = 30; // or 31, or 28/29 for Feb
    const seconds = daysInMonth * 24 * 60 * 60;
    console.log(seconds); // e.g., 2,592,000 for 30-day month
    ```

If you're looking for an **average month**, you can divide the number of seconds in a year by 12:
- \( \frac{365 \times 24 \times 60 \times 60}{12} = 2,629,746.67 \) seconds (non-leap year)

Let me know if you want to calculate this dynamically for a given date or build a time tracker!

### Bit Sizes

| Bits | Number of Values | Max Unsigned Value |
|------|------------------|--------------------|
| 0    | 1                | 0                  |
| 1    | 2                | 1                  |
| 2    | 4                | 3                  |
| 3    | 8                | 7                  |
| 4    | 16               | 15                 |
| 5    | 32               | 31                 |
| 6    | 64               | 63                 |
| 7    | 128              | 127                |
| 8    | 256              | 255                |
| 9    | 512              | 511                |
| 10   | 1,024            | 1,023              |
| 11   | 2,048            | 2,047              |
| 12   | 4,096            | 4,095              |
| 13   | 8,192            | 8,191              |
| 14   | 16,384           | 16,383             |
| 15   | 32,768           | 32,767             |
| 16   | 65,536           | 65,535             |
| 17   | 131,072          | 131,071            |
| 18   | 262,144          | 262,143            |
| 19   | 524,288          | 524,287            |
| 20   | 1,048,576        | 1,048,575          |
| 21   | 2,097,152        | 2,097,151          |
| 22   | 4,194,304        | 4,194,303          |
| 23   | 8,388,608        | 8,388,607          |
| 24   | 16,777,216       | 16,777,215         |
| 25   | 33,554,432       | 33,554,431         |
| 26   | 67,108,864       | 67,108,863         |
| 27   | 134,217,728      | 134,217,727        |
| 28   | 268,435,456      | 268,435,455        |
| 29   | 536,870,912      | 536,870,911        |
| 30   | 1,073,741,824    | 1,073,741,823      |
| 31   | 2,147,483,648    | 2,147,483,647      |
| 32   | 4,294,967,296    | 4,294,967,295      |
|------|------------------|--------------------|

### Baudot Code

**Baudot code**, a 5-bit character encoding system used in early telegraphy and ham radio before ASCII. Invented by Émile Baudot in the 1870s and later evolved into the 

**International Telegraph Alphabet No. 2 (ITA2)**, which became the standard for radioteletype (RTTY) communications.

### 📡 Baudot Code Basics
    - **5 bits per character** → only 32 possible combinations
    - To represent both **letters and figures**, it used **shift states**:
    - **Letters shift**: A–Z and a few control characters
    - **Figures shift**: digits 0–9, punctuation, and symbols

### 🔠 Baudot Letters (in Letters Shift)
Here are some of the key letter encodings:

| Character | Binary | Decimal |
|-----------|--------|---------|
| A         | 00011  | 3       |
| B         | 11001  | 25      |
| C         | 01110  | 14      |
| D         | 01001  | 9       |
| E         | 00001  | 1       |
| F         | 01101  | 13      |
| G         | 11010  | 26      |
| H         | 10100  | 20      |
| I         | 00110  | 6       |
| J         | 01011  | 11      |
| K         | 01111  | 15      |
| L         | 10010  | 18      |
| M         | 11100  | 28      |
| N         | 01100  | 12      |
| O         | 11000  | 24      |
| P         | 10110  | 22      |
| Q         | 10111  | 23      |
| R         | 01010  | 10      |
| S         | 00101  | 5       |
| T         | 10000  | 16      |
| U         | 00111  | 7       |
| V         | 11110  | 30      |
| W         | 10011  | 19      |
| X         | 11101  | 29      |
| Y         | 10101  | 21      |
| Z         | 10001  | 17      |
|-----------|--------|---------|

### 🔢 Figures Shift (same bit patterns, different meanings)
For example:
- `00011` = A (Letters shift) or `1` (Figures shift)
- `01001` = D or `0`
- `00101` = S or `7`

### 🔧 Control Characters

- `11011` = Letters shift
- `11111` = Figures shift
- `00000` = Null
- `00100` = Space
- `01000` = Carriage Return
- `00010` = Line Feed

This compact encoding was perfect for early mechanical teleprinters and ham radio RTTY, where bandwidth and simplicity were critical.

### GridSquare

In ham radio, the **Maidenhead Locator System** (gridsquare system) is hierarchical and can vary in length depending on the desired precision. The **longest standard gridsquare** is typically **8 characters**, but it can be extended further for ultra-precise location encoding.

### 📡 Maidenhead Gridsquare Structure

Each level adds more precision:

| Level        | Format     | Example     | Precision                    |
|--------------|------------|-------------|------------------------------|
| Field        | 2 letters  | `CM`        | ~20° longitude × 10° latitude|
| Square       | +2 digits  | `CM87`      | ~2° × 1°                     |
| Subsquare    | +2 letters | `CM87uq`    | ~5′ × 2.5′                   |
| Extended     | +2 digits  | `CM87uq12`  | ~30″ × 15″                   |
|--------------|------------|-------------|------------------------------|

So the **longest commonly used gridsquare** is:

    ```
    CM87uq12  → 8 characters
    ```

This gives a resolution of about **1 km × 0.5 km**, which is plenty for most amateur radio applications.


### 🧠 Can it go longer?

Yes — the system can be extended beyond 8 characters by alternating digits and letters:

- 10 characters: `CM87uq12ab`
- 12 characters: `CM87uq12ab34`
- Each additional pair increases precision by a factor of 1/10

But anything beyond 8 characters is rarely used in practice.
