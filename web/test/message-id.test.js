/**
 * Unit tests for Message ID Generation Logic (80 bits)
 * 
 * Components:
 * - Callsign: 48 bits (8 chars x 6 bits)
 * - Timestamp: 31 bits (Custom packed format)
 * - Emergency: 1 bit
 */

describe('Message ID Generation (80 bits)', () => {

    // --- Helper: alphanumbit lookup (Mocking C++ logic) ---
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

    // --- Packer Function (JS Implementation of C++ logic) ---
    function packMessageId(callsign, timestampDate, emergency) {
        // 1. Callsign (48 bits)
        const paddedCallsign = callsign.padEnd(8, ' ').toUpperCase().substring(0, 8);
        let callsignBits = '';
        for (let i = 0; i < 8; i++) {
            const char = paddedCallsign[i];
            const val = alphanumbit[char] !== undefined ? alphanumbit[char] : 0b111111;
            callsignBits += val.toString(2).padStart(6, '0');
        }

        // 2. Timestamp (31 bits)
        // Year(2026=0) + Month -> 10 bits
        // Day -> 5 bits
        // Hour -> 5 bits
        // Minute -> 6 bits
        // Second/2 -> 5 bits
        const year = timestampDate.getUTCFullYear() - 2026;
        const month = timestampDate.getUTCMonth(); // 0-11
        const monthYear = (year * 12) + month;
        
        const day = timestampDate.getUTCDate() - 1; // 0-30 (Ribbit uses 0-based day internally?) 
        // Note: headerCodec.html uses day input directly but let's assume standard date mapping for this test
        // headerCodec.html: "Day (0-30)" input. JS Date.getUTCDate() is 1-31. So -1 seems right if 0-based.
        // Let's verify against headerCodec.html logic:
        // `const day = parseInt(dayInput);` where input min=0 max=30.
        // So yes, 0-based index.

        const hour = timestampDate.getUTCHours();
        const minute = timestampDate.getUTCMinutes();
        const second = Math.floor(timestampDate.getUTCSeconds() / 2);

        const timeBits = 
            monthYear.toString(2).padStart(10, '0') +
            day.toString(2).padStart(5, '0') +
            hour.toString(2).padStart(5, '0') +
            minute.toString(2).padStart(6, '0') +
            second.toString(2).padStart(5, '0');

        // 3. Emergency (1 bit)
        const emergencyBit = emergency ? '1' : '0';

        return callsignBits + timeBits + emergencyBit;
    }

    test('Structure: Should produce exactly 80 bits', () => {
        const id = packMessageId('KO6BVA', new Date(), false);
        expect(id.length).toBe(80);
    });

    test('Structure: Bit allocation check', () => {
        // Callsign: 8 chars * 6 bits = 48 bits
        // Timestamp: 10 + 5 + 5 + 6 + 5 = 31 bits
        // Emergency: 1 bit
        // Total: 48 + 31 + 1 = 80 bits
        
        const callsign = 'AAAA    '; // A = 001010 (10)
        // A * 4 = 101010...
        // Space = 111111
        
        // Let's use specific known values
        // Space = 111111
        const id = packMessageId('        ', new Date('2026-01-01T00:00:00Z'), false);
        
        // Callsign part (first 48 bits) - 8 spaces
        const callsignPart = id.substring(0, 48);
        expect(callsignPart).toBe('111111'.repeat(8));
        
        // Timestamp part (next 31 bits) - 2026-01-01 00:00:00
        // Year=0, Month=0 -> MonthYear=0 -> 0000000000
        // Day=1 (JS) -> 0 -> 00000
        // Hour=0 -> 00000
        // Minute=0 -> 000000
        // Second=0 -> 00000
        const timestampPart = id.substring(48, 79);
        expect(timestampPart).toBe('0'.repeat(31));
        
        // Emergency part (last 1 bit)
        const emergencyPart = id.substring(79, 80);
        expect(emergencyPart).toBe('0');
    });

    test('Uniqueness: Callsign change changes ID', () => {
        const date = new Date('2026-06-15T12:00:00Z');
        const id1 = packMessageId('KO6BVA', date, false);
        const id2 = packMessageId('W1ABC', date, false);
        
        expect(id1).not.toBe(id2);
        // Only first 48 bits should differ
        expect(id1.substring(48)).toBe(id2.substring(48));
    });

    test('Uniqueness: Timestamp change changes ID (2 sec resolution)', () => {
        const date1 = new Date('2026-06-15T12:00:00Z');
        const date2 = new Date('2026-06-15T12:00:02Z'); // +2 seconds
        
        const id1 = packMessageId('KO6BVA', date1, false);
        const id2 = packMessageId('KO6BVA', date2, false);
        
        expect(id1).not.toBe(id2);
        // First 48 bits should match
        expect(id1.substring(0, 48)).toBe(id2.substring(0, 48));
        
        // Last bit (emergency) should match
        expect(id1[79]).toBe(id2[79]);
    });

    test('Uniqueness: Emergency flag change changes ID', () => {
        const date = new Date('2026-06-15T12:00:00Z');
        const id1 = packMessageId('KO6BVA', date, false);
        const id2 = packMessageId('KO6BVA', date, true);
        
        expect(id1).not.toBe(id2);
        // First 79 bits should match
        expect(id1.substring(0, 79)).toBe(id2.substring(0, 79));
        // Last bit should differ
        expect(id1[79]).toBe('0');
        expect(id2[79]).toBe('1');
    });

    test('Formatting: Should handle callsign padding/truncation', () => {
        const date = new Date();
        const idShort = packMessageId('KO6', date, false);
        const idLong = packMessageId('KO6BVA123', date, false);
        const idExact = packMessageId('KO6BVA12', date, false);

        expect(idShort.length).toBe(80);
        expect(idLong.length).toBe(80);
        expect(idExact.length).toBe(80);
    });

    test('Hex Conversion: Should maintain 20 hex chars (10 bytes)', () => {
        const idBits = packMessageId('KO6BVA', new Date(), true);
        
        // Convert bits to hex manually to verify
        const hexArray = [];
        for(let i=0; i<idBits.length; i+=8) {
            const byte = parseInt(idBits.substring(i, i+8), 2);
            hexArray.push(byte.toString(16).padStart(2, '0').toUpperCase());
        }
        const hexString = hexArray.join('');
        
        expect(hexString.length).toBe(20); // 10 bytes * 2 chars
        expect(/^[0-9A-F]{20}$/.test(hexString)).toBe(true);
    });

});
