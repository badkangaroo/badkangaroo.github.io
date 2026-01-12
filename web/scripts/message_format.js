/**
 * Ribbit Message Format Handler
 * Supports dual-mode messaging:
 * - Mode 1 (Chat): UTF-8 free-form text
 * - Mode 2 (Contest): Bitwise-packed structured data
 */

class RibbitMessageFormat {
    constructor(wasmModule) {
        if (!wasmModule) {
            throw new Error('WASM module is required');
        }

        this.Module = wasmModule;

        // Allocate persistent buffers
        this.inputBuffer = this.Module._malloc(512);
        this.outputBuffer = this.Module._malloc(512);
        this.callsignBuffer = this.Module._malloc(9);
        this.gridsquareBuffer = this.Module._malloc(7);
        this.firstNameBuffer = this.Module._malloc(16);
        this.lastNameBuffer = this.Module._malloc(16);
        this.messageBuffer = this.Module._malloc(256);
        this.timestampBuffer = this.Module._malloc(4);
        this.flagsBuffer = this.Module._malloc(1);
        this.messageLenBuffer = this.Module._malloc(2);

        console.log('RibbitMessageFormat initialized');
    }

    /**
     * Encode a message based on type
     * @param {number} messageType - 1 for chat, 2 for contest
     * @param {object} data - Message data
     * @returns {Uint8Array} Encoded message bytes
     */
    encode(messageType, data) {
        if (messageType === 1) {
            return this.encodeChatMode(data);
        } else if (messageType === 2) {
            return this.encodeContestMode(data);
        }
        throw new Error(`Unsupported message type: ${messageType}`);
    }

    /**
     * Encode chat mode message (current format)
     * Format: "Name|Callsign|Gridsquare|Phone&=Message"
     */
    encodeChatMode(data) {
        const { name, callsign, gridsquare, message } = data;
        const str = `${name}|${callsign}|${gridsquare}&=${message}`;

        const encoder = new TextEncoder();
        return encoder.encode(str);
    }

    /**
     * Encode contest mode message (bitwise-packed)
     * New order: Callsign → Timestamp → Emergency → Gridsquare → NTP → GPS
     * Message ID = Callsign (48) + Timestamp (31) + Emergency (1) = 80 bits
     */
    encodeContestMode(data) {
        const {
            callsign = '',
            timestamp = Date.now(),
            gridsquare = '',
            emergency = false,
            ntp = false,
            gps = false,
            firstName = '',
            lastName = '',
            message = ''
        } = data;

        // Write strings to WASM memory
        this.Module.stringToUTF8(callsign, this.callsignBuffer, 9);
        this.Module.stringToUTF8(gridsquare, this.gridsquareBuffer, 7);
        this.Module.stringToUTF8(firstName, this.firstNameBuffer, 16);
        this.Module.stringToUTF8(lastName, this.lastNameBuffer, 16);

        // Prepare message bytes
        const messageEncoder = new TextEncoder();
        const messageBytes = messageEncoder.encode(message);
        this.Module.HEAPU8.set(messageBytes, this.inputBuffer);

        // Pack flags (3 bits: emergency|ntp|gps)
        // Note: C++ code now handles emergency separately as part of Message ID
        const flags = (emergency ? 0x04 : 0) |
            (ntp ? 0x02 : 0) |
            (gps ? 0x01 : 0);

        // Call C++ packer
        const packedSize = this.Module._pack_contest_message(
            this.callsignBuffer,
            Math.floor(timestamp / 1000),  // Unix timestamp in seconds
            this.gridsquareBuffer,
            flags,
            this.firstNameBuffer,
            this.lastNameBuffer,
            this.inputBuffer,
            messageBytes.length,
            this.outputBuffer,
            512
        );

        if (packedSize < 0) {
            throw new Error(`Failed to pack contest message: error code ${packedSize}`);
        }

        console.log(`Contest message packed: ${packedSize} bytes`);

        // Copy packed bytes to JavaScript array
        const packed = new Uint8Array(packedSize);
        packed.set(this.Module.HEAPU8.subarray(
            this.outputBuffer,
            this.outputBuffer + packedSize
        ));

        return packed;
    }

    /**
     * Decode a message (auto-detects type)
     * @param {Uint8Array} bytes - Encoded message bytes
     * @returns {object} Decoded message data
     */
    decode(bytes) {
        if (!bytes || bytes.length < 1) {
            throw new Error('Empty message');
        }

        // Try to detect message type from first 2 bits
        const firstByte = bytes[0];
        const messageType = firstByte & 0x03;

        // If it looks like contest mode (type 2)
        if (messageType === 2) {
            return this.decodeContestMode(bytes);
        }

        // Otherwise try chat mode
        try {
            return this.decodeChatMode(bytes);
        } catch (e) {
            console.error('Failed to decode as chat mode:', e);
            throw new Error('Unable to decode message');
        }
    }

    /**
     * Decode chat mode message
     */
    decodeChatMode(bytes) {
        const decoder = new TextDecoder();
        const str = decoder.decode(bytes);

        // Parse format: "Name|Callsign|Gridsquare&=Message"
        const parts = str.split('&=');
        if (parts.length !== 2) {
            throw new Error('Invalid chat message format');
        }

        const header = parts[0].split('|');
        if (header.length !== 3) {
            throw new Error('Invalid chat message header');
        }

        return {
            type: 1,
            mode: 'chat',
            name: header[0],
            callsign: header[1],
            gridsquare: header[2],
            message: parts[1]
        };
    }

    /**
     * Decode contest mode message
     */
    decodeContestMode(bytes) {
        // Copy to WASM memory
        this.Module.HEAPU8.set(bytes, this.inputBuffer);

        // Call C++ unpacker
        const result = this.Module._unpack_contest_message(
            this.inputBuffer,
            bytes.length,
            this.callsignBuffer,
            this.timestampBuffer,
            this.gridsquareBuffer,
            this.flagsBuffer,
            this.firstNameBuffer,
            this.lastNameBuffer,
            this.messageBuffer,
            this.messageLenBuffer
        );

        if (result < 0) {
            throw new Error(`Failed to unpack contest message: error code ${result}`);
        }

        // Read unpacked data
        const flags = this.Module.HEAPU8[this.flagsBuffer];
        const timestamp = this.Module.HEAPU32[this.timestampBuffer >> 2];

        const decoded = {
            type: 2,
            mode: 'contest',
            callsign: this.Module.UTF8ToString(this.callsignBuffer).trim(),
            timestamp: timestamp * 1000,  // Convert back to milliseconds
            timestampDate: new Date(timestamp * 1000),
            gridsquare: this.Module.UTF8ToString(this.gridsquareBuffer),
            emergency: !!(flags & 0x04),
            ntp: !!(flags & 0x02),
            gps: !!(flags & 0x01),
            firstName: this.Module.UTF8ToString(this.firstNameBuffer),
            lastName: this.Module.UTF8ToString(this.lastNameBuffer),
            message: this.Module.UTF8ToString(this.messageBuffer)
        };

        console.log('Contest message decoded:', decoded);

        return decoded;
    }

    /**
     * Get efficiency comparison between modes
     */
    compareEfficiency(data) {
        const chatEncoded = this.encodeChatMode(data);
        const contestEncoded = this.encodeContestMode(data);

        return {
            chatSize: chatEncoded.length,
            contestSize: contestEncoded.length,
            savings: chatEncoded.length - contestEncoded.length,
            savingsPercent: ((chatEncoded.length - contestEncoded.length) / chatEncoded.length * 100).toFixed(1)
        };
    }

    /**
     * Clean up allocated buffers
     */
    cleanup() {
        if (this.inputBuffer) this.Module._free(this.inputBuffer);
        if (this.outputBuffer) this.Module._free(this.outputBuffer);
        if (this.callsignBuffer) this.Module._free(this.callsignBuffer);
        if (this.gridsquareBuffer) this.Module._free(this.gridsquareBuffer);
        if (this.firstNameBuffer) this.Module._free(this.firstNameBuffer);
        if (this.lastNameBuffer) this.Module._free(this.lastNameBuffer);
        if (this.messageBuffer) this.Module._free(this.messageBuffer);
        if (this.timestampBuffer) this.Module._free(this.timestampBuffer);
        if (this.flagsBuffer) this.Module._free(this.flagsBuffer);
        if (this.messageLenBuffer) this.Module._free(this.messageLenBuffer);

        console.log('RibbitMessageFormat cleaned up');
    }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.RibbitMessageFormat = RibbitMessageFormat;
}

