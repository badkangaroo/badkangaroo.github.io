"use strict";

/**
 * ACKPacker — Wire format serialization/deserialization for ACK arrays.
 *
 * Spec: operator-ack-accumulation (task 1.1)
 *
 * Wire format: 8-bit count field + N × 84-bit ACK entries
 * Each entry: Callsign[48] + Timestamp[31] + Emergency[1] + HopCount[4]
 *
 * Uses the 6-bit alphanumbit encoding from headerBitTypes.js for callsign fields.
 * Callsigns shorter than 8 characters are right-padded with space (value 63).
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 5.1–5.5, 7.1–7.3, 7.6, 8.2, 8.7
 */

// ── 6-bit alphanumbit encoding table (mirrors headerBitTypes.js) ────────────
// This is inlined here so the module works under CommonJS require() in Jest
// without needing ES module transform. Values are identical to headerBitTypes.js.
const ALPHANUMBIT_ENCODE = {
    "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
    "8": 8, "9": 9, "A": 10, "B": 11, "C": 12, "D": 13, "E": 14, "F": 15,
    "G": 16, "H": 17, "I": 18, "J": 19, "K": 20, "L": 21, "M": 22, "N": 23,
    "O": 24, "P": 25, "Q": 26, "R": 27, "S": 28, "T": 29, "U": 30, "V": 31,
    "W": 32, "X": 33, "Y": 34, "Z": 35, "/": 36, "?": 37, "~": 38, "!": 39,
    "@": 40, "#": 41, "$": 43, "%": 44, "^": 45, "&": 46, "*": 47, "(": 48,
    ")": 49, "-": 50, "=": 51, "[": 52, "]": 53, "\\": 54, "|": 55, "`": 56,
    "_": 57, "+": 58, ":": 59, "\"": 60, ";": 61, ",": 62, ".": 63, " ": 63
};

// Build reverse lookup: value → character
const ALPHANUMBIT_DECODE = {};
for (const [char, value] of Object.entries(ALPHANUMBIT_ENCODE)) {
    // Space and "." both map to 63; prefer space for padding decode
    if (ALPHANUMBIT_DECODE[value] === undefined || char === ' ') {
        ALPHANUMBIT_DECODE[value] = char;
    }
}

// ── Constants ───────────────────────────────────────────────────────────────
const MAX_ENTRIES = 22;          // floor((1920 - 8) / 84)
const ENTRY_BITS = 84;           // Callsign[48] + Timestamp[31] + Emergency[1] + HopCount[4]
const COUNT_BITS = 8;            // 8-bit unsigned count field
const MAX_ACK_FIELD_BITS = 1920; // Maximum ACK Array field capacity

const CALLSIGN_BITS = 48;       // 8 chars × 6 bits
const TIMESTAMP_BITS = 31;      // Composite timestamp
const EMERGENCY_BITS = 1;       // Emergency flag
const HOP_COUNT_BITS = 4;       // 4-bit unsigned hop count (0–15)
const CALLSIGN_MAX_CHARS = 8;
const BITS_PER_CHAR = 6;
const SPACE_VALUE = 63;          // alphanumbit encoding for space (padding character)

// ── ACKPacker Class ─────────────────────────────────────────────────────────

class ACKPacker {
    /**
     * @param {Object} accumulator - ACKAccumulator instance
     * @param {Object} [config] - Optional configuration
     * @param {number} [config.maxEntries] - Max entries per message (default 22)
     */
    constructor(accumulator, config = {}) {
        this.accumulator = accumulator;
        this.config = {
            maxEntries: config.maxEntries || MAX_ENTRIES,
        };
    }

    /**
     * Pack pending entries into wire format bitstream.
     *
     * Snapshots entries from the accumulator, applies priority sort,
     * selects up to maxEntries, and serializes to the wire format.
     *
     * @param {Set|Map|Object} contactConfirmations - Set of callsigns with confirmed contacts
     * @returns {{ bitstream: string, packedEntries: Array, count: number }}
     */
    pack(contactConfirmations) {
        const confirmSet = contactConfirmations instanceof Set
            ? contactConfirmations
            : new Set(
                contactConfirmations instanceof Map
                    ? contactConfirmations.keys()
                    : Array.isArray(contactConfirmations)
                        ? contactConfirmations
                        : Object.keys(contactConfirmations || {})
            );

        // Snapshot ALL pending entries so priority sort can select globally
        const maxEntries = this.config.maxEntries;
        const pendingCount = this.accumulator.pendingCount;
        const entries = this.accumulator.takeForPacking(
            pendingCount > 0 ? pendingCount : maxEntries
        );

        if (!entries || entries.length === 0) {
            // Zero-count ACK array: count=0, no entry data
            return { bitstream: ACKPacker.packEntries([]).bitstream, packedEntries: [], count: 0 };
        }

        // Sort by priority, select top N, return unselected to accumulator
        const sorted = entries.slice().sort((a, b) =>
            compareACKPriority(a, b, confirmSet)
        );
        const selected = sorted.slice(0, maxEntries);
        const remaining = sorted.slice(maxEntries);
        if (remaining.length > 0) {
            this.accumulator.returnEntries(remaining);
        }

        const packed = ACKPacker.packEntries(selected);
        return { bitstream: packed.bitstream, packedEntries: selected, count: packed.count };
    }

    /**
     * Serialize an ordered list of ACK entries to wire format (no priority sort).
     * Used for round-trip tests and when entries are already ordered.
     *
     * @param {Array} entries - ACK entries to serialize (0–22)
     * @returns {{ bitstream: string, count: number }}
     */
    static packEntries(entries) {
        const list = Array.isArray(entries) ? entries.slice(0, MAX_ENTRIES) : [];
        const count = list.length;
        let bitstream = count.toString(2).padStart(COUNT_BITS, '0');
        for (const entry of list) {
            bitstream += ACKPacker.encodeEntry(entry);
        }
        const remainder = bitstream.length % 8;
        if (remainder !== 0) {
            bitstream += '0'.repeat(8 - remainder);
        }
        return { bitstream, count };
    }

    /**
     * Encode a single ACK entry to 84-bit bitstream.
     *
     * Layout: Callsign[48] + Timestamp[31] + Emergency[1] + HopCount[4]
     *
     * @param {Object} entry - ACK entry object
     * @param {string} entry.callsign - Callsign (1–8 alphanum chars)
     * @param {number} entry.timestamp - 31-bit timestamp value
     * @param {boolean} entry.emergency - Emergency flag
     * @param {number} entry.hopCount - Hop count (0–15)
     * @returns {string} 84-bit bitstream string
     */
    static encodeEntry(entry) {
        // Callsign: 8 chars × 6 bits, right-padded with space (value 63)
        const callsign = (entry.callsign || '').toUpperCase();
        let callsignBits = '';
        for (let i = 0; i < CALLSIGN_MAX_CHARS; i++) {
            const char = i < callsign.length ? callsign[i] : ' ';
            const value = ALPHANUMBIT_ENCODE[char] !== undefined ? ALPHANUMBIT_ENCODE[char] : SPACE_VALUE;
            callsignBits += value.toString(2).padStart(BITS_PER_CHAR, '0');
        }

        // Timestamp: 31-bit value
        const ts = entry.timestamp >>> 0; // ensure unsigned 31-bit
        const timestampBits = (ts & 0x7FFFFFFF).toString(2).padStart(TIMESTAMP_BITS, '0');

        // Emergency: 1 bit
        const emergencyBit = entry.emergency ? '1' : '0';

        // Hop count: 4-bit unsigned (0–15)
        const hopCount = Math.min(Math.max(entry.hopCount || 0, 0), 15);
        const hopCountBits = hopCount.toString(2).padStart(HOP_COUNT_BITS, '0');

        return callsignBits + timestampBits + emergencyBit + hopCountBits;
    }

    /**
     * Decode a single 84-bit block to ACK entry object.
     *
     * @param {string} bits - 84-bit bitstream string
     * @returns {Object} ACK entry { callsign, timestamp, emergency, hopCount }
     */
    static decodeEntry(bits) {
        if (bits.length !== ENTRY_BITS) {
            return null;
        }

        let offset = 0;

        // Callsign: 48 bits (8 chars × 6 bits)
        let callsign = '';
        for (let i = 0; i < CALLSIGN_MAX_CHARS; i++) {
            const charBits = bits.substring(offset, offset + BITS_PER_CHAR);
            const charValue = parseInt(charBits, 2);
            const char = ALPHANUMBIT_DECODE[charValue] || '?';
            callsign += char;
            offset += BITS_PER_CHAR;
        }
        // Trim trailing spaces (padding)
        callsign = callsign.replace(/\s+$/, '');

        // Timestamp: 31 bits
        const timestampBits = bits.substring(offset, offset + TIMESTAMP_BITS);
        const timestamp = parseInt(timestampBits, 2);
        offset += TIMESTAMP_BITS;

        // Emergency: 1 bit
        const emergencyBit = bits.substring(offset, offset + EMERGENCY_BITS);
        const emergency = emergencyBit === '1';
        offset += EMERGENCY_BITS;

        // Hop count: 4 bits
        const hopCountBits = bits.substring(offset, offset + HOP_COUNT_BITS);
        const hopCount = parseInt(hopCountBits, 2);

        return { callsign, timestamp, emergency, hopCount };
    }

    /**
     * Unpack ACK array from received bitstream.
     *
     * Reads 8-bit count, then count × 84-bit entry blocks.
     * Returns { entries: [], count: 0 } on malformed input.
     *
     * @param {string} bitstream - Wire format bitstream
     * @returns {{ entries: Array, count: number }}
     */
    static unpack(bitstream) {
        if (!bitstream || bitstream.length < COUNT_BITS) {
            return { entries: [], count: 0 };
        }

        // Read 8-bit count field
        const countBits = bitstream.substring(0, COUNT_BITS);
        const count = parseInt(countBits, 2);

        // Zero count: return empty
        if (count === 0) {
            return { entries: [], count: 0 };
        }

        // Malformed check: count × ENTRY_BITS must not exceed remaining bits
        const remainingBits = bitstream.length - COUNT_BITS;
        if (count * ENTRY_BITS > remainingBits) {
            return { entries: [], count: 0 };
        }

        // Decode each entry
        const entries = [];
        let offset = COUNT_BITS;
        for (let i = 0; i < count; i++) {
            const entryBits = bitstream.substring(offset, offset + ENTRY_BITS);
            const entry = ACKPacker.decodeEntry(entryBits);
            if (entry) {
                entries.push(entry);
            }
            offset += ENTRY_BITS;
        }

        return { entries, count: entries.length };
    }
}

// ── Priority Sort Comparator ────────────────────────────────────────────────

/**
 * Compare two ACK entries by priority for packing selection.
 *
 * Priority Tiers (highest to lowest):
 *   Tier 1: First-hand (hopCount=0), first-time (transmitAttempts=0), unconfirmed
 *   Tier 2: First-hand, first-time, confirmed
 *   Tier 3: First-hand, retransmission (transmitAttempts>0), unconfirmed
 *   Tier 4: First-hand, retransmission, confirmed
 *   Tier 5: Relayed (hopCount>0), first-time, unconfirmed
 *   Tier 6: Relayed, first-time, confirmed
 *   Tier 7: Relayed, retransmission, unconfirmed
 *   Tier 8: Relayed, retransmission, confirmed
 *
 * Within each tier: FIFO (earlier addedAtSlot first).
 *
 * @param {Object} a - First ACK entry
 * @param {Object} b - Second ACK entry
 * @param {Set} confirmations - Set of callsigns with confirmed contacts
 * @returns {number} Negative if a has higher priority, positive if b does, 0 if equal
 */
function compareACKPriority(a, b, confirmations) {
    // 1. First-hand vs relayed (hopCount 0 beats hopCount > 0)
    const aFirstHand = (a.hopCount || 0) === 0;
    const bFirstHand = (b.hopCount || 0) === 0;
    if (aFirstHand !== bFirstHand) return aFirstHand ? -1 : 1;

    // 2. First-time vs retransmission (transmitAttempts 0 beats > 0)
    const aFirstTime = (a.transmitAttempts || 0) === 0;
    const bFirstTime = (b.transmitAttempts || 0) === 0;
    if (aFirstTime !== bFirstTime) return aFirstTime ? -1 : 1;

    // 3. Unconfirmed vs confirmed contact (unconfirmed wins)
    const aConfirmed = confirmations.has(a.callsign);
    const bConfirmed = confirmations.has(b.callsign);
    if (aConfirmed !== bConfirmed) return aConfirmed ? 1 : -1;

    // 4. FIFO tiebreaker (earlier addedAtSlot wins)
    return (a.addedAtSlot || 0) - (b.addedAtSlot || 0);
}

/**
 * Build 80-bit Message_ID hex string (20 chars) from entry fields.
 * @param {{ callsign: string, timestamp: number, emergency: boolean }} fields
 * @returns {string}
 */
function messageIdFromFields(fields) {
    const bits = ACKPacker.encodeEntry({
        callsign: fields.callsign,
        timestamp: fields.timestamp,
        emergency: fields.emergency,
        hopCount: 0,
    }).slice(0, 80);
    let hex = '';
    for (let i = 0; i < 80; i += 4) {
        hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    }
    return hex;
}

/**
 * Parse Message_ID hex back to callsign/timestamp/emergency fields.
 * @param {string} messageId - 20-char hex string
 * @returns {{ callsign: string, timestamp: number, emergency: boolean }|null}
 */
function fieldsFromMessageId(messageId) {
    if (!messageId || typeof messageId !== 'string' || messageId.length !== 20) {
        return null;
    }
    let bits = '';
    for (let i = 0; i < 20; i++) {
        bits += parseInt(messageId[i], 16).toString(2).padStart(4, '0');
    }
    const entry = ACKPacker.decodeEntry(bits + '0000'); // pad hop count
    if (!entry) return null;
    return {
        callsign: entry.callsign,
        timestamp: entry.timestamp,
        emergency: entry.emergency,
    };
}

const api = {
    ACKPacker,
    compareACKPriority,
    messageIdFromFields,
    fieldsFromMessageId,
    MAX_ENTRIES,
    ENTRY_BITS,
    COUNT_BITS,
    MAX_ACK_FIELD_BITS,
    CALLSIGN_BITS,
    TIMESTAMP_BITS,
    EMERGENCY_BITS,
    HOP_COUNT_BITS,
    CALLSIGN_MAX_CHARS,
    BITS_PER_CHAR,
    SPACE_VALUE,
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
}
if (typeof globalThis !== "undefined") {
    globalThis.__ribbitAckPacker = api;
}
