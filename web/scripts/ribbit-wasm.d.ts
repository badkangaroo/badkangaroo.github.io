/**
 * TypeScript definitions for Ribbit WebAssembly API
 */

export interface EncodeOptions {
    /** Ham radio callsign (default: "NOCALL") */
    callsign?: string;
    /** Maidenhead gridsquare (default: "AA00aa") */
    gridsquare?: string;
    /** Optional name (default: "") */
    name?: string;
    /** Emergency flag (default: false) */
    emergency?: boolean;
    /** NTP timestamp flag (default: false) */
    ntp?: boolean;
    /** GPS location flag (default: false) */
    gps?: boolean;
    /** Message type (default: 1 for chat) */
    messageType?: number;
}

export interface DecodeResult {
    /** Decoded message text */
    text: string;
    /** Sender's callsign */
    callsign: string;
    /** Sender's gridsquare */
    gridsquare: string;
    /** Sender's name (if provided) */
    name: string;
    /** Message timestamp */
    timestamp: Date;
    /** Emergency flag */
    emergency: boolean;
    /** NTP flag */
    ntp: boolean;
    /** GPS flag */
    gps: boolean;
    /** Decoding confidence (0-1) */
    confidence: number;
}

export interface MemoryUsage {
    /** Bytes currently used */
    used: number;
    /** Total bytes available */
    total: number;
    /** Usage percentage */
    percentage: number;
}

export declare class MessageEncoder {
    constructor(module: any, codec: any);
    encode(text: string, options?: EncodeOptions): Promise<Float32Array>;
    destroy(): void;
}

export declare class MessageDecoder {
    constructor(module: any, codec: any);
    decode(audioBuffer: Float32Array | ArrayBuffer): Promise<DecodeResult | null>;
    destroy(): void;
}

export declare class RibbitWASM {
    /**
     * Load and initialize the Ribbit WebAssembly module
     */
    static load(): Promise<RibbitWASM>;

    /**
     * Encode a text message into audio
     */
    encodeMessage(text: string, options?: EncodeOptions): Promise<Float32Array>;

    /**
     * Decode audio data into a message
     */
    decodeAudio(audioBuffer: Float32Array | ArrayBuffer): Promise<DecodeResult | null>;

    /**
     * Start real-time audio decoding from a stream
     */
    decodeStream(stream: MediaStream): Promise<EventTarget>;

    /**
     * Get current memory usage statistics
     */
    getMemoryUsage(): MemoryUsage;

    /**
     * Clean up resources
     */
    destroy(): void;
}

export default RibbitWASM;