/**
 * Ribbit WASM API Usage Examples
 *
 * This file demonstrates how to use the new friendly WebAssembly API
 * for encoding and decoding Ribbit messages.
 */

import { RibbitWASM } from './scripts/ribbit-wasm.js';

/**
 * Example 1: Basic Usage - One-line initialization
 */
async function basicExample() {
    try {
        // One-line WASM loading!
        const ribbit = await RibbitWASM.load();

        // Simple message encoding
        const audioBuffer = await ribbit.encodeMessage("Hello World!");

        console.log("Encoded audio length:", audioBuffer.length);

        // Cleanup when done
        ribbit.destroy();

    } catch (error) {
        console.error("Failed:", error.message);
    }
}

/**
 * Example 2: Advanced Encoding with Options
 */
async function advancedEncodingExample() {
    const ribbit = await RibbitWASM.load();

    // Encode with custom settings
    const audio = await ribbit.encodeMessage("CQ CQ DE KA1XYZ", {
        callsign: "KA1XYZ",
        gridsquare: "FN42ab",
        name: "John",
        emergency: false,
        messageType: 1  // Chat
    });

    console.log("Advanced encoding complete, audio samples:", audio.length);

    ribbit.destroy();
}

/**
 * Example 3: Real-time Audio Decoding
 */
async function realtimeDecodingExample() {
    const ribbit = await RibbitWASM.load();

    try {
        // Get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        // Start decoding stream
        const decoder = await ribbit.decodeStream(stream);

        // Listen for decoded messages
        decoder.addEventListener('message', (event) => {
            const message = event.detail;
            console.log("Received message:", {
                text: message.text,
                callsign: message.callsign,
                gridsquare: message.gridsquare,
                confidence: message.confidence
            });
        });

        decoder.addEventListener('error', (event) => {
            console.error("Decoding error:", event.detail);
        });

        // Decode for 30 seconds, then stop
        setTimeout(() => {
            decoder.stop();
            console.log("Stopped decoding");
        }, 30000);

    } catch (error) {
        console.error("Real-time decoding failed:", error);
    }

    ribbit.destroy();
}

/**
 * Example 4: Batch Processing
 */
async function batchProcessingExample() {
    const ribbit = await RibbitWASM.load();
    const messages = [
        "Hello from the digital wilderness!",
        "73 and good DX!",
        "CQ CQ DE TESTCALL",
        "Weather is great today"
    ];

    try {
        // Encode multiple messages
        const encodedMessages = await Promise.all(
            messages.map(msg => ribbit.encodeMessage(msg, {
                callsign: "BATCH01",
                gridsquare: "ZZ99zz"
            }))
        );

        console.log(`Encoded ${encodedMessages.length} messages`);
        console.log("Total audio samples:",
            encodedMessages.reduce((sum, buf) => sum + buf.length, 0)
        );

        // Simulate decoding one message
        const testAudio = encodedMessages[0];
        const decoded = await ribbit.decodeAudio(testAudio);

        if (decoded) {
            console.log("Round-trip successful:", decoded.text);
        }

    } catch (error) {
        console.error("Batch processing failed:", error);
    }

    ribbit.destroy();
}

/**
 * Example 5: Memory Management and Performance Monitoring
 */
async function memoryManagementExample() {
    const ribbit = await RibbitWASM.load();

    console.log("Initial memory:", ribbit.getMemoryUsage());

    // Perform operations
    for (let i = 0; i < 10; i++) {
        await ribbit.encodeMessage(`Test message ${i}`);
    }

    console.log("After operations:", ribbit.getMemoryUsage());

    // Memory is automatically managed - no manual cleanup needed!
    ribbit.destroy();

    console.log("After cleanup - automatic memory management working!");
}

/**
 * Example 6: Error Handling
 */
async function errorHandlingExample() {
    try {
        const ribbit = await RibbitWASM.load();

        // This will fail - empty message
        await ribbit.encodeMessage("");

    } catch (error) {
        console.log("Expected error caught:", error.message);
        // Error: Message text must be a string
    }

    try {
        const ribbit = await RibbitWASM.load();

        // This will fail - invalid audio buffer
        await ribbit.decodeAudio("not an audio buffer");

    } catch (error) {
        console.log("Expected error caught:", error.message);
        // Error: Audio buffer must be Float32Array or ArrayBuffer
    }
}

/**
 * Example 7: Integration with Web Audio API
 */
async function webAudioIntegrationExample() {
    const ribbit = await RibbitWASM.load();
    const audioContext = new AudioContext({ sampleRate: 8000 });

    // Encode a message
    const audioBuffer = await ribbit.encodeMessage("Web Audio API test");

    // Create Web Audio buffer from the result
    const webAudioBuffer = audioContext.createBuffer(1, audioBuffer.length, 8000);
    webAudioBuffer.copyFromChannel(audioBuffer, 0);

    // Play it
    const source = audioContext.createBufferSource();
    source.buffer = webAudioBuffer;
    source.connect(audioContext.destination);
    source.start();

    console.log("Playing encoded message via Web Audio API");

    ribbit.destroy();
}

// Export examples for use in browser console or tests
window.RibbitExamples = {
    basicExample,
    advancedEncodingExample,
    realtimeDecodingExample,
    batchProcessingExample,
    memoryManagementExample,
    errorHandlingExample,
    webAudioIntegrationExample
};

console.log("Ribbit WASM examples loaded! Try:");
console.log("- RibbitExamples.basicExample()");
console.log("- RibbitExamples.advancedEncodingExample()");
console.log("- etc.");