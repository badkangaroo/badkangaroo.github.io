"use strict";
import { nibble, alphabit, alphanumbit, verifyNibble, verifyNibbit, verifyNibblit } from "./headerBitTypes.js";

/**
 * MessageCodec - Complete encoding/decoding API for Ribbit messages
 * 
 * Message Structure (128+ bits):
 * - Callsign (48 bits) - Header component
 * - Timestamp (31 bits) - Header component
 * - Emergency (1 bit) - Header component
 * - **Message ID (80 bits total: Callsign + Timestamp + Emergency)**
 * - Gridsquare (28 bits) - Location component
 * - NTP (1 bit) - Metadata flag
 * - GPS (1 bit) - Metadata flag
 * - Name Length (8 bits) - Metadata [FirstNameLength 4 bits][LastNameLength 4 bits]
 * - Message Length (8 bits) - Metadata
 * - Message Type (2 bits) - Metadata
 * - FirstName (variable, 5 bits per char, 0-15 chars) - Content
 * - LastName (variable, 5 bits per char, 0-15 chars) - Content
 * - Message (variable, 8 bits per byte UTF-8) - Content
 */
export class MessageCodec {
    constructor() {
        console.log("MessageCodec initialized");
        
        // Create reverse lookup tables for decoding
        this.alphanumbitReverse = Object.fromEntries(
            Object.entries(alphanumbit).map(([char, value]) => [value, char])
        );
        this.alphabitReverse = Object.fromEntries(
            Object.entries(alphabit).map(([char, value]) => [value, char])
        );
        this.nibbleReverse = Object.fromEntries(
            Object.entries(nibble).map(([char, value]) => [value, char])
        );
    }

    // ==================== ENCODING FUNCTIONS ====================

    /**
     * Get current timestamp as bitstream (31 bits)
     * @param {Date} date - Optional date object, uses current time if not provided
     * @returns {string} 31-bit bitstream
     */
    GetTimestampBitStream(date = null) {
        const now = date || new Date();
        
        // Year/Month (10 bits)
        const year = now.getUTCFullYear() - 2026;
        const month = now.getUTCMonth(); // 0-11
        const monthYear = year * 12 + month;
        const monthYearBits = monthYear.toString(2).padStart(10, '0');
        
        // Day (5 bits, 0-based)
        const day = now.getUTCDate() - 1;
        const dayBits = day.toString(2).padStart(5, '0');
        
        // Hour (5 bits)
        const hour = now.getUTCHours();
        const hourBits = hour.toString(2).padStart(5, '0');
        
        // Minute (6 bits)
        const minute = now.getUTCMinutes();
        const minuteBits = minute.toString(2).padStart(6, '0');
        
        // Second (5 bits, 2-second resolution)
        const second = Math.floor(now.getUTCSeconds() / 2);
        const secondBits = second.toString(2).padStart(5, '0');
        
        return monthYearBits + dayBits + hourBits + minuteBits + secondBits;
    }

    /**
     * Encode callsign to bitstream (48 bits)
     * @param {string} callsign - Ham radio callsign (up to 8 chars)
     * @returns {string} 48-bit bitstream
     */
    GetCallsignBitStream(callsign) {
        if (typeof callsign !== 'string') {
            throw new Error("Callsign must be a string");
        }
        
        const paddedCallsign = callsign.padEnd(8, ' ').toUpperCase();
        let callsignBits = '';
        
        for (let i = 0; i < 8; i++) {
            const char = paddedCallsign[i];
            const charValue = alphanumbit[char] || 0b111111;
            callsignBits += charValue.toString(2).padStart(6, '0');
        }
        
        return callsignBits;
    }

    /**
     * Encode gridsquare to bitstream (28 bits)
     * @param {string} gridsquare - Maidenhead locator (6 chars: AA00aa)
     * @returns {string} 28-bit bitstream
     */
    GetGridsquareBitStream(gridsquare) {
        if (typeof gridsquare !== 'string') {
            throw new Error("Gridsquare must be a string");
        }
        
        if (gridsquare.length !== 6) {
            throw new Error("Gridsquare must be 6 characters");
        }
        
        const upper = gridsquare.toUpperCase();
        
        if (!/^[A-R]{2}[0-9]{2}[A-X]{2}$/i.test(gridsquare)) {
            throw new Error("Invalid gridsquare format (expected: AA00aa)");
        }
        
        const letter1Bits = (alphabit[upper[0]] || 0).toString(2).padStart(5, '0');
        const letter2Bits = (alphabit[upper[1]] || 0).toString(2).padStart(5, '0');
        const number1Bits = (nibble[upper[2]] || 0).toString(2).padStart(4, '0');
        const number2Bits = (nibble[upper[3]] || 0).toString(2).padStart(4, '0');
        const letter3Bits = (alphabit[upper[4]] || 0).toString(2).padStart(5, '0');
        const letter4Bits = (alphabit[upper[5]] || 0).toString(2).padStart(5, '0');
        
        return letter1Bits + letter2Bits + number1Bits + number2Bits + letter3Bits + letter4Bits;
    }

    /**
     * Get emergency bit (1 bit)
     * @param {boolean} isEmergency
     * @returns {string} 1-bit value
     */
    GetEmergencyBit(isEmergency) {
        return isEmergency ? '1' : '0';
    }

    /**
     * Get NTP bit (1 bit)
     * @param {boolean} isNTP
     * @returns {string} 1-bit value
     */
    GetNTPBit(isNTP) {
        return isNTP ? '1' : '0';
    }

    /**
     * Get GPS bit (1 bit)
     * @param {boolean} isGPS
     * @returns {string} 1-bit value
     */
    GetGPSBit(isGPS) {
        return isGPS ? '1' : '0';
    }

    /**
     * Get name length bits (8 bits) - split into firstName and lastName lengths
     * @param {number} firstNameLength - First name length (0-15)
     * @param {number} lastNameLength - Last name length (0-15)
     * @returns {string} 8-bit value [FirstNameLength 4 bits][LastNameLength 4 bits]
     */
    GetNameLengthBits(firstNameLength, lastNameLength) {
        if (typeof firstNameLength !== 'number' || firstNameLength < 0 || firstNameLength > 15) {
            throw new Error("First name length must be between 0 and 15");
        }
        if (typeof lastNameLength !== 'number' || lastNameLength < 0 || lastNameLength > 15) {
            throw new Error("Last name length must be between 0 and 15");
        }
        const firstNameBits = firstNameLength.toString(2).padStart(4, '0');
        const lastNameBits = lastNameLength.toString(2).padStart(4, '0');
        return firstNameBits + lastNameBits;
    }

    /**
     * Get message length bits (8 bits)
     * @param {number} length - Message length in bytes (0-240)
     * @returns {string} 8-bit value
     */
    GetMessageLengthBits(length) {
        if (typeof length !== 'number' || length < 0 || length > 240) {
            throw new Error("Message length must be between 0 and 240 bytes");
        }
        return length.toString(2).padStart(8, '0');
    }

    /**
     * Get message type bits (2 bits)
     * @param {number} type - Message type (0-3)
     * @returns {string} 2-bit value
     */
    GetMessageTypeBits(type) {
        if (typeof type !== 'number' || type < 0 || type > 3) {
            throw new Error("Message type must be between 0 and 3");
        }
        return type.toString(2).padStart(2, '0');
    }

    /**
     * Encode name to bitstream (variable length, 5 bits per char)
     * @param {string} name - Name string (up to 15 chars, letters only)
     * @returns {string} Variable-length bitstream
     */
    GetNameBitStream(name) {
        if (typeof name !== 'string') {
            throw new Error("Name must be a string");
        }
        
        if (name.length > 15) {
            throw new Error("Name must be 15 characters or less");
        }
        
        const nameUpper = name.toUpperCase();
        let nameBits = '';
        
        for (let i = 0; i < nameUpper.length; i++) {
            const char = nameUpper[i];
            const charValue = alphabit[char] || 0b11111;
            nameBits += charValue.toString(2).padStart(5, '0');
        }
        
        return nameBits;
    }

    /**
     * Encode message to bitstream (variable length, 8 bits per byte UTF-8)
     * @param {string} message - Message string (up to 240 bytes)
     * @returns {string} Variable-length bitstream
     */
    GetMessageBitStream(message) {
        if (typeof message !== 'string') {
            throw new Error("Message must be a string");
        }
        
        const encoder = new TextEncoder();
        const messageBytes = encoder.encode(message);
        
        if (messageBytes.length > 240) {
            throw new Error("Message must be 240 bytes or less");
        }
        
        let messageBits = '';
        for (let i = 0; i < messageBytes.length; i++) {
            messageBits += messageBytes[i].toString(2).padStart(8, '0');
        }
        
        return messageBits;
    }

    /**
     * Get Message ID bitstream (80 bits: Callsign + Timestamp + Emergency)
     * @param {string} callsign - Ham radio callsign (up to 8 chars)
     * @param {Date} timestamp - Timestamp (optional, defaults to now)
     * @param {boolean} emergency - Emergency flag
     * @returns {string} 80-bit Message ID bitstream
     */
    GetMessageIDBitStream(callsign, timestamp = null, emergency = false) {
        const callsignBits = this.GetCallsignBitStream(callsign);     // 48 bits
        const timestampBits = this.GetTimestampBitStream(timestamp);  // 31 bits
        const emergencyBit = this.GetEmergencyBit(emergency);         // 1 bit
        
        return callsignBits + timestampBits + emergencyBit;           // 80 bits total
    }

    // ==================== DECODING FUNCTIONS ====================

    /**
     * Decode timestamp bitstream to Date object
     * @param {string} bits - 31-bit bitstream
     * @returns {Date} Decoded date
     */
    BitStreamToTimestamp(bits) {
        if (bits.length !== 31) {
            throw new Error("Timestamp bitstream must be 31 bits");
        }
        
        const yearMonthBits = bits.slice(0, 10);
        const dayBits = bits.slice(10, 15);
        const hourBits = bits.slice(15, 20);
        const minuteBits = bits.slice(20, 26);
        const secondBits = bits.slice(26, 31);
        
        const monthYear = parseInt(yearMonthBits, 2);
        const year = Math.floor(monthYear / 12) + 2026;
        const month = monthYear % 12;
        const day = parseInt(dayBits, 2) + 1;
        const hour = parseInt(hourBits, 2);
        const minute = parseInt(minuteBits, 2);
        const second = parseInt(secondBits, 2) * 2;
        
        return new Date(Date.UTC(year, month, day, hour, minute, second));
    }

    /**
     * Decode callsign bitstream to string
     * @param {string} bits - 48-bit bitstream
     * @returns {string} Decoded callsign
     */
    BitStreamToCallsign(bits) {
        if (bits.length !== 48) {
            throw new Error("Callsign bitstream must be 48 bits");
        }
        
        let callsign = '';
        for (let i = 0; i < 48; i += 6) {
            const charBits = bits.substring(i, i + 6);
            const charValue = parseInt(charBits, 2);
            callsign += this.alphanumbitReverse[charValue] || ' ';
        }
        
        return callsign.trim();
    }

    /**
     * Decode gridsquare bitstream to string
     * @param {string} bits - 28-bit bitstream
     * @returns {string} Decoded gridsquare
     */
    BitStreamToGridsquare(bits) {
        if (bits.length !== 28) {
            throw new Error("Gridsquare bitstream must be 28 bits");
        }
        
        const letter1Value = parseInt(bits.substring(0, 5), 2);
        const letter2Value = parseInt(bits.substring(5, 10), 2);
        const number1Value = parseInt(bits.substring(10, 14), 2);
        const number2Value = parseInt(bits.substring(14, 18), 2);
        const letter3Value = parseInt(bits.substring(18, 23), 2);
        const letter4Value = parseInt(bits.substring(23, 28), 2);
        
        const gridsquare = 
            (this.alphabitReverse[letter1Value] || '') + 
            (this.alphabitReverse[letter2Value] || '') + 
            (this.nibbleReverse[number1Value] || '') + 
            (this.nibbleReverse[number2Value] || '') + 
            (this.alphabitReverse[letter3Value] || '') + 
            (this.alphabitReverse[letter4Value] || '');
        
        return gridsquare;
    }

    /**
     * Decode emergency bit to boolean
     * @param {string} bit - 1-bit value
     * @returns {boolean}
     */
    BitStreamToEmergency(bit) {
        return parseInt(bit, 2) > 0;
    }

    /**
     * Decode NTP bit to boolean
     * @param {string} bit - 1-bit value
     * @returns {boolean}
     */
    BitStreamToNTP(bit) {
        return parseInt(bit, 2) > 0;
    }

    /**
     * Decode GPS bit to boolean
     * @param {string} bit - 1-bit value
     * @returns {boolean}
     */
    BitStreamToGPS(bit) {
        return parseInt(bit, 2) > 0;
    }

    /**
     * Decode name length bits to object with firstName and lastName lengths
     * @param {string} bits - 8-bit value [FirstNameLength 4 bits][LastNameLength 4 bits]
     * @returns {Object} {firstNameLength: number, lastNameLength: number}
     */
    BitStreamToNameLength(bits) {
        if (bits.length !== 8) {
            throw new Error("Name length bitstream must be 8 bits");
        }
        const firstNameLength = parseInt(bits.substring(0, 4), 2);
        const lastNameLength = parseInt(bits.substring(4, 8), 2);
        return { firstNameLength, lastNameLength };
    }

    /**
     * Decode message length bits to number
     * @param {string} bits - 8-bit value
     * @returns {number}
     */
    BitStreamToMessageLength(bits) {
        if (bits.length !== 8) {
            throw new Error("Message length bitstream must be 8 bits");
        }
        return parseInt(bits, 2);
    }

    /**
     * Decode message type bits to number
     * @param {string} bits - 2-bit value
     * @returns {number}
     */
    BitStreamToMessageType(bits) {
        if (bits.length !== 2) {
            throw new Error("Message type bitstream must be 2 bits");
        }
        return parseInt(bits, 2);
    }

    /**
     * Decode name bitstream to string with proper capitalization
     * @param {string} bits - Variable-length bitstream (multiple of 5)
     * @returns {string} Decoded name (First character uppercase, rest lowercase)
     */
    BitStreamToName(bits) {
        if (bits.length % 5 !== 0) {
            throw new Error("Name bitstream length must be a multiple of 5");
        }
        
        let name = '';
        for (let i = 0; i < bits.length; i += 5) {
            const charBits = bits.substring(i, i + 5);
            const charValue = parseInt(charBits, 2);
            name += this.alphabitReverse[charValue] || ' ';
        }
        
        name = name.trim();
        
        // Capitalize: first character uppercase, rest lowercase
        if (name.length > 0) {
            name = name.charAt(0).toUpperCase() + name.substring(1).toLowerCase();
        }
        
        return name;
    }

    /**
     * Decode message bitstream to string
     * @param {string} bits - Variable-length bitstream (multiple of 8)
     * @returns {string} Decoded message
     */
    BitStreamToMessage(bits) {
        if (bits.length % 8 !== 0) {
            throw new Error("Message bitstream length must be a multiple of 8");
        }
        
        const messageBytes = [];
        for (let i = 0; i < bits.length; i += 8) {
            const byteBits = bits.substring(i, i + 8);
            messageBytes.push(parseInt(byteBits, 2));
        }
        
        const decoder = new TextDecoder();
        return decoder.decode(new Uint8Array(messageBytes));
    }

    /**
     * Decode Message ID bitstream to object
     * @param {string} bits - 80-bit Message ID bitstream
     * @returns {Object} {callsign: string, timestamp: Date, emergency: boolean}
     */
    BitStreamToMessageID(bits) {
        if (bits.length !== 80) {
            throw new Error("Message ID bitstream must be 80 bits");
        }
        
        const callsignBits = bits.slice(0, 48);
        const timestampBits = bits.slice(48, 79);
        const emergencyBit = bits.slice(79, 80);
        
        return {
            callsign: this.BitStreamToCallsign(callsignBits),
            timestamp: this.BitStreamToTimestamp(timestampBits),
            emergency: this.BitStreamToEmergency(emergencyBit)
        };
    }

    // ==================== COMPREHENSIVE FUNCTIONS ====================

    /**
     * Encode complete message from JSON to bitstream
     * @param {Object} data - Message data object
     * @param {string} data.callsign - Callsign (required)
     * @param {Date} data.timestamp - Timestamp (optional, defaults to now)
     * @param {string} data.gridsquare - Gridsquare (required)
     * @param {boolean} data.emergency - Emergency flag (default: false)
     * @param {boolean} data.ntp - NTP flag (default: false)
     * @param {boolean} data.gps - GPS flag (default: false)
     * @param {number} data.messageType - Message type 0-3 (default: 1)
     * @param {string} data.firstName - First name (optional, 0-15 chars)
     * @param {string} data.lastName - Last name (optional, 0-15 chars)
     * @param {string} data.message - Message (optional)
     * @returns {string} Complete bitstream
     */
    EncodeMessage(data) {
        // Validate required fields
        if (!data.callsign) {
            throw new Error("Callsign is required");
        }
        if (!data.gridsquare) {
            throw new Error("Gridsquare is required");
        }
        
        // Set defaults
        const callsign = data.callsign;
        const timestamp = data.timestamp || new Date();
        const gridsquare = data.gridsquare;
        const emergency = data.emergency || false;
        const ntp = data.ntp || false;
        const gps = data.gps || false;
        const messageType = data.messageType !== undefined ? data.messageType : 1;
        const firstName = data.firstName || '';
        const lastName = data.lastName || '';
        const message = data.message || '';
        
        // Calculate lengths
        const firstNameLength = firstName.length;
        const lastNameLength = lastName.length;
        const encoder = new TextEncoder();
        const messageLength = encoder.encode(message).length;
        
        // Build bitstream in correct order
        let bitstream = '';
        bitstream += this.GetCallsignBitStream(callsign);                       // 48 bits
        bitstream += this.GetTimestampBitStream(timestamp);                     // 31 bits
        bitstream += this.GetEmergencyBit(emergency);                           // 1 bit
        // Message ID = Callsign + Timestamp + Emergency (80 bits total)
        bitstream += this.GetGridsquareBitStream(gridsquare);                   // 28 bits
        bitstream += this.GetNTPBit(ntp);                                       // 1 bit
        bitstream += this.GetGPSBit(gps);                                       // 1 bit
        bitstream += this.GetNameLengthBits(firstNameLength, lastNameLength);  // 8 bits
        bitstream += this.GetMessageLengthBits(messageLength);                  // 8 bits
        bitstream += this.GetMessageTypeBits(messageType);                      // 2 bits
        
        if (firstName) {
            bitstream += this.GetNameBitStream(firstName);                      // Variable
        }
        if (lastName) {
            bitstream += this.GetNameBitStream(lastName);                       // Variable
        }
        if (message) {
            bitstream += this.GetMessageBitStream(message);                     // Variable
        }
        
        return bitstream;
    }

    /**
     * Decode complete message from bitstream to JSON
     * @param {string} bitstream - Complete message bitstream
     * @returns {Object} Decoded message data
     */
    DecodeMessage(bitstream) {
        // Convert Uint8Array to bitstream string if needed
        if (bitstream instanceof Uint8Array || Array.isArray(bitstream)) {
            bitstream = this.BytesToBitStream(bitstream);
        }
        
        let offset = 0;
        
        // Extract fixed-length fields
        const callsignBits = bitstream.slice(offset, offset + 48);
        offset += 48;
        
        const timestampBits = bitstream.slice(offset, offset + 31);
        offset += 31;
        
        const emergencyBit = bitstream.slice(offset, offset + 1);
        offset += 1;
        // Message ID complete (80 bits: Callsign + Timestamp + Emergency)
        
        const gridsquareBits = bitstream.slice(offset, offset + 28);
        offset += 28;
        
        const ntpBit = bitstream.slice(offset, offset + 1);
        offset += 1;
        
        const gpsBit = bitstream.slice(offset, offset + 1);
        offset += 1;
        
        const nameLengthBits = bitstream.slice(offset, offset + 8);
        offset += 8;
        
        const messageLengthBits = bitstream.slice(offset, offset + 8);
        offset += 8;
        
        const messageTypeBits = bitstream.slice(offset, offset + 2);
        offset += 2;
        
        // Get lengths for variable fields
        const { firstNameLength, lastNameLength } = this.BitStreamToNameLength(nameLengthBits);
        const messageLength = this.BitStreamToMessageLength(messageLengthBits);
        
        // Extract variable-length fields
        const firstNameBitLength = firstNameLength * 5;
        const firstNameBits = bitstream.slice(offset, offset + firstNameBitLength);
        offset += firstNameBitLength;
        
        const lastNameBitLength = lastNameLength * 5;
        const lastNameBits = bitstream.slice(offset, offset + lastNameBitLength);
        offset += lastNameBitLength;
        
        const messageBitLength = messageLength * 8;
        const messageBits = bitstream.slice(offset, offset + messageBitLength);
        offset += messageBitLength;
        
        // Decode all fields
        return {
            callsign: this.BitStreamToCallsign(callsignBits),
            timestamp: this.BitStreamToTimestamp(timestampBits),
            gridsquare: this.BitStreamToGridsquare(gridsquareBits),
            emergency: this.BitStreamToEmergency(emergencyBit),
            ntp: this.BitStreamToNTP(ntpBit),
            gps: this.BitStreamToGPS(gpsBit),
            firstNameLength: firstNameLength,
            lastNameLength: lastNameLength,
            messageLength: messageLength,
            messageType: this.BitStreamToMessageType(messageTypeBits),
            firstName: firstNameLength > 0 ? this.BitStreamToName(firstNameBits) : '',
            lastName: lastNameLength > 0 ? this.BitStreamToName(lastNameBits) : '',
            message: messageLength > 0 ? this.BitStreamToMessage(messageBits) : ''
        };
    }

    /**
     * Convert bitstream to byte array
     * @param {string} bitstream - Bitstream to convert
     * @returns {Uint8Array} Byte array
     */
    BitStreamToBytes(bitstream) {
        // Pad to nearest byte boundary
        const paddedLength = Math.ceil(bitstream.length / 8) * 8;
        const paddedBitstream = bitstream.padEnd(paddedLength, '0');
        
        const bytes = [];
        for (let i = 0; i < paddedBitstream.length; i += 8) {
            const byteBits = paddedBitstream.substring(i, i + 8);
            bytes.push(parseInt(byteBits, 2));
        }
        
        return new Uint8Array(bytes);
    }

    /**
     * Convert byte array to bitstream
     * @param {Uint8Array|Array} bytes - Byte array to convert
     * @returns {string} Bitstream
     */
    BytesToBitStream(bytes) {
        let bitstream = '';
        for (let i = 0; i < bytes.length; i++) {
            bitstream += bytes[i].toString(2).padStart(8, '0');
        }
        return bitstream;
    }

    /**
     * Get message type name from type number
     * @param {number} type - Message type (0-3)
     * @returns {string} Message type name
     */
    GetMessageTypeName(type) {
        const messageTypeNames = [
            'Emergency', 'Chat', 'Contest', 'Other'
        ];
        return messageTypeNames[type] || 'Unknown';
    }
}

