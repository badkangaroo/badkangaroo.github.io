/**
 * RibbitWASM - Friendly WebAssembly API for Ribbit
 *
 * Provides a simple, promise-based interface to the Ribbit WebAssembly module
 * with automatic memory management and error handling.
 */

import { MessageCodec } from './messageCodec.js';

/**
 * MessageEncoder - Handles message encoding with automatic memory management
 */
class MessageEncoder {
    /**
     * Create a new message encoder
     * @param {Object} module - WASM module instance
     * @param {MessageCodec} codec - Message codec instance
     */
    constructor(module, codec) {
        this.module = module;
        this.codec = codec;
        this._allocatedBuffers = new Set();
    }

    /**
     * Encode a message to audio
     * @param {string} text - Message text
     * @param {EncodeOptions} options - Encoding options
     * @returns {Promise<Float32Array>} Encoded audio data
     */
    async encode(text, options = {}) {
        const opts = {
            callsign: 'NOCALL',
            gridsquare: 'AA00aa',
            name: '',
            emergency: false,
            ntp: false,
            gps: false,
            messageType: 1,
            ...options
        };

        // Use MessageCodec to create the packed message
        const packedMessage = this.codec.EncodeMessage(text, {
            callsign: opts.callsign,
            gridsquare: opts.gridsquare,
            name: opts.name,
            emergency: opts.emergency,
            ntp: opts.ntp,
            gps: opts.gps,
            messageType: opts.messageType
        });

        // Convert to bytes and allocate in WASM memory
        const messageBytes = this._stringToBytes(packedMessage);
        const messagePtr = this._allocateBuffer(messageBytes);

        try {
            // Initialize encoder with the message
            this.module._initEncoder(messagePtr, messageBytes.length);

            // Read the encoded signal
            this.module._readEncoder();

            // Get the signal buffer from WASM
            const signalPtr = this.module._signal_pointer();
            const signalLength = this.module._signal_length();

            // Copy the signal data
            return this._copySignalBuffer(signalPtr, signalLength);

        } finally {
            // Always free the message buffer
            this._freeBuffer(messagePtr);
        }
    }

    /**
     * Convert string to UTF-8 bytes
     * @param {string} str - String to convert
     * @returns {Uint8Array} UTF-8 encoded bytes
     * @private
     */
    _stringToBytes(str) {
        return new TextEncoder().encode(str);
    }

    /**
     * Allocate buffer in WASM memory
     * @param {Uint8Array} data - Data to copy
     * @returns {number} Pointer to allocated buffer
     * @private
     */
    _allocateBuffer(data) {
        const ptr = this.module._malloc(data.length);
        if (ptr === 0) {
            throw new Error('Failed to allocate WASM memory');
        }

        // Copy data to WASM memory
        this.module.HEAPU8.set(data, ptr);
        this._allocatedBuffers.add(ptr);

        return ptr;
    }

    /**
     * Free buffer in WASM memory
     * @param {number} ptr - Pointer to free
     * @private
     */
    _freeBuffer(ptr) {
        if (this._allocatedBuffers.has(ptr)) {
            this.module._free(ptr);
            this._allocatedBuffers.delete(ptr);
        }
    }

    /**
     * Copy signal buffer from WASM memory
     * @param {number} signalPtr - Pointer to signal data
     * @param {number} signalLength - Length of signal data
     * @returns {Float32Array} Copied signal data
     * @private
     */
    _copySignalBuffer(signalPtr, signalLength) {
        const signalView = new Float32Array(
            this.module.HEAPU8.buffer,
            signalPtr,
            signalLength
        );

        // Create a copy of the signal data
        return new Float32Array(signalView);
    }

    /**
     * Clean up allocated memory
     */
    destroy() {
        for (const ptr of this._allocatedBuffers) {
            try {
                this.module._free(ptr);
            } catch (e) {
                console.warn('Failed to free encoder memory at', ptr, e);
            }
        }
        this._allocatedBuffers.clear();
    }
}

/**
 * MessageDecoder - Handles message decoding with automatic memory management
 */
class MessageDecoder {
    /**
     * Create a new message decoder
     * @param {Object} module - WASM module instance
     * @param {MessageCodec} codec - Message codec instance
     */
    constructor(module, codec) {
        this.module = module;
        this.codec = codec;
        this._allocatedBuffers = new Set();
    }

    /**
     * Decode audio data into a message
     * @param {Float32Array} audioData - Audio data to decode
     * @returns {Promise<DecodeResult|null>} Decoded message or null
     */
    async decode(audioData) {
        // Prepare audio data
        const preparedData = this._prepareAudioData(audioData);

        // Feed audio data to decoder
        await this._feedAudioToDecoder(preparedData);

        // Attempt to decode a message
        return await this._attemptDecode();
    }

    /**
     * Prepare audio data for decoding
     * @param {Float32Array|ArrayBuffer} audioBuffer - Input audio data
     * @returns {Float32Array} Prepared audio data
     * @private
     */
    _prepareAudioData(audioBuffer) {
        if (audioBuffer instanceof Float32Array) {
            return audioBuffer;
        } else if (audioBuffer instanceof ArrayBuffer) {
            return new Float32Array(audioBuffer);
        } else {
            throw new Error('Audio buffer must be Float32Array or ArrayBuffer');
        }
    }

    /**
     * Feed audio data to the WASM decoder
     * @param {Float32Array} audioData - Audio data to feed
     * @private
     */
    async _feedAudioToDecoder(audioData) {
        // Copy audio data to WASM feed buffer
        const feedPtr = this.module._feed_pointer();
        const feedLength = this.module._feed_length();
        const feedView = new Float32Array(
            this.module.HEAPU8.buffer,
            feedPtr,
            feedLength
        );

        // Copy as much data as possible to the feed buffer
        const copyLength = Math.min(audioData.length, feedLength);
        feedView.set(audioData.subarray(0, copyLength));

        // Feed to decoder
        this.module._digestFeedOptimized();
    }

    /**
     * Attempt to decode a message from current decoder state
     * @returns {DecodeResult|null} Decoded message or null
     * @private
     */
    async _attemptDecode() {
        // Check if decoder has a message ready
        const payloadPtr = this.module._payload_pointer();
        const payloadLength = this.module._payload_length();

        if (payloadLength === 0) {
            return null;
        }

        // Copy payload data
        const payloadView = new Uint8Array(
            this.module.HEAPU8.buffer,
            payloadPtr,
            payloadLength
        );
        const payloadBytes = new Uint8Array(payloadView);

        // Decode the message using MessageCodec
        try {
            const decoded = this.codec.DecodeMessage(payloadBytes);

            return {
                text: decoded.message,
                callsign: decoded.callsign,
                gridsquare: decoded.gridsquare,
                name: decoded.name || '',
                timestamp: decoded.timestamp,
                emergency: decoded.emergency,
                ntp: decoded.ntp,
                gps: decoded.gps,
                confidence: decoded.confidence || 1.0
            };
        } catch (error) {
            console.warn('Failed to decode message payload:', error);
            return null;
        }
    }

    /**
     * Clean up allocated memory
     */
    destroy() {
        for (const ptr of this._allocatedBuffers) {
            try {
                this.module._free(ptr);
            } catch (e) {
                console.warn('Failed to free decoder memory at', ptr, e);
            }
        }
        this._allocatedBuffers.clear();
    }
}

/**
 * Configuration options for message encoding
 * @typedef {Object} EncodeOptions
 * @property {string} [callsign="NOCALL"] - Ham radio callsign
 * @property {string} [gridsquare="AA00aa"] - Maidenhead gridsquare
 * @property {string} [name=""] - Optional name
 * @property {boolean} [emergency=false] - Emergency flag
 * @property {boolean} [ntp=false] - NTP timestamp flag
 * @property {boolean} [gps=false] - GPS location flag
 * @property {number} [messageType=1] - Message type (1=chat)
 */

/**
 * Result of audio decoding
 * @typedef {Object} DecodeResult
 * @property {string} text - Decoded message text
 * @property {string} callsign - Sender's callsign
 * @property {string} gridsquare - Sender's gridsquare
 * @property {string} name - Sender's name (if provided)
 * @property {Date} timestamp - Message timestamp
 * @property {boolean} emergency - Emergency flag
 * @property {boolean} ntp - NTP flag
 * @property {boolean} gps - GPS flag
 * @property {number} confidence - Decoding confidence (0-1)
 */

/**
 * RibbitWASM - Main WebAssembly wrapper class
 *
 * Provides a simple, promise-based API for encoding and decoding Ribbit messages.
 */
export class RibbitWASM {
    /**
     * Load and initialize the Ribbit WebAssembly module
     * @returns {Promise<RibbitWASM>} Initialized RibbitWASM instance
     */
    static async load() {
        try {
            // Check if Module is already available (loaded by main page)
            if (typeof Module !== 'undefined') {
                const instance = new RibbitWASM(Module);
                await instance._initialize();
                return instance;
            }

            // Otherwise, load the WASM module dynamically
            const module = await new Promise((resolve, reject) => {
                // Create a script element to load the WASM module
                const script = document.createElement('script');
                script.src = './scripts/ribbit.js';
                script.onload = () => {
                    // Wait for Module to be ready
                    if (typeof Module !== 'undefined') {
                        Module.ready.then(resolve).catch(reject);
                    } else {
                        reject(new Error('Module not available after script load'));
                    }
                };
                script.onerror = () => reject(new Error('Failed to load ribbit.js'));
                document.head.appendChild(script);
            });

            const instance = new RibbitWASM(module);
            await instance._initialize();
            return instance;
        } catch (error) {
            throw new Error(`Failed to load Ribbit WASM module: ${error.message}`);
        }
    }

    /**
     * Create a new RibbitWASM instance
     * @param {Object} module - The loaded WASM module
     * @private
     */
    constructor(module) {
        this.module = module;
        this.codec = new MessageCodec();
        this.encoder = null;
        this.decoder = null;
        this._isInitialized = false;
    }

    /**
     * Initialize the WASM encoders and decoders
     * @private
     */
    async _initialize() {
        if (this._isInitialized) return;

        try {
            // Create encoder and decoder instances
            this.module._createEncoder();
            this.module._createDecoder();

            // Initialize encoder and decoder classes
            this.encoder = new MessageEncoder(this.module, this.codec);
            this.decoder = new MessageDecoder(this.module, this.codec);

            this._isInitialized = true;
        } catch (error) {
            throw new Error(`Failed to initialize Ribbit WASM: ${error.message}`);
        }
    }

    /**
     * Encode a text message into audio
     * @param {string} text - The message to encode
     * @param {EncodeOptions} [options={}] - Encoding options
     * @returns {Promise<Float32Array>} Audio buffer containing the encoded message
     */
    async encodeMessage(text, options = {}) {
        if (!this._isInitialized) {
            throw new Error('RibbitWASM not initialized. Call RibbitWASM.load() first.');
        }

        if (typeof text !== 'string') {
            throw new Error('Message text must be a string');
        }

        try {
            return await this.encoder.encode(text, options);
        } catch (error) {
            throw new Error(`Failed to encode message: ${error.message}`);
        }
    }

    /**
     * Decode audio data into a message
     * @param {Float32Array|ArrayBuffer} audioBuffer - Audio data to decode
     * @returns {Promise<DecodeResult|null>} Decoded message or null if no message found
     */
    async decodeAudio(audioBuffer) {
        if (!this._isInitialized) {
            throw new Error('RibbitWASM not initialized. Call RibbitWASM.load() first.');
        }

        try {
            return await this.decoder.decode(audioBuffer);
        } catch (error) {
            throw new Error(`Failed to decode audio: ${error.message}`);
        }
    }

    /**
     * Start real-time audio decoding from a stream
     * @param {MediaStream} stream - Audio stream to decode
     * @returns {Promise<EventEmitter>} Event emitter that emits 'message' events
     */
    async decodeStream(stream) {
        if (!this._isInitialized) {
            throw new Error('RibbitWASM not initialized. Call RibbitWASM.load() first.');
        }

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(2048, 1, 1);

        return new Promise((resolve, reject) => {
            const emitter = new EventTarget();

            processor.onaudioprocess = async (event) => {
                try {
                    const audioData = event.inputBuffer.getChannelData(0);
                    const decoded = await this.decodeAudio(audioData);

                    if (decoded) {
                        const messageEvent = new CustomEvent('message', { detail: decoded });
                        emitter.dispatchEvent(messageEvent);
                    }
                } catch (error) {
                    const errorEvent = new CustomEvent('error', { detail: error });
                    emitter.dispatchEvent(errorEvent);
                }
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            // Add a stop method to the emitter
            emitter.stop = () => {
                source.disconnect();
                processor.disconnect();
                audioContext.close();
            };

            resolve(emitter);
        });
    }

    /**
     * Get current memory usage statistics
     * @returns {Object} Memory usage information
     */
    getMemoryUsage() {
        if (!this.module || !this.module.HEAPU8) {
            return { used: 0, total: 0, percentage: 0 };
        }

        // This is a simplified memory check - in a real implementation
        // you'd want more sophisticated memory tracking
        const used = this._memoryRefs.size * 256; // Rough estimate
        const total = this.module.HEAPU8.length;
        const percentage = total > 0 ? (used / total) * 100 : 0;

        return { used, total, percentage };
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Clean up encoder and decoder
        if (this.encoder) {
            this.encoder.destroy();
            this.encoder = null;
        }

        if (this.decoder) {
            this.decoder.destroy();
            this.decoder = null;
        }

        // Destroy WASM instances
        try {
            if (this.module._destroyEncoder) this.module._destroyEncoder();
            if (this.module._destroyDecoder) this.module._destroyDecoder();
        } catch (e) {
            console.warn('Failed to destroy WASM instances', e);
        }

        this._isInitialized = false;
    }
}

// Export a default instance loader for convenience
export default RibbitWASM;