"use strict";

// Test state
let wasmModule = null;
let wasmExports = null;
let wasmMemory = null;
let audioContext = null;
let currentEncodedAudio = null;
let testsPassed = 0;
let testsFailed = 0;
let testsTotal = 0;

// Memory views
let HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

// WASM buffer pointers
let _feed, _payload, _message, _signalbuffer;
let FEED_POINTER, FEED_LENGTH;
let PAYLOAD_POINTER, PAYLOAD_LENGTH;
let MESSAGE_POINTER, MESSAGE_LENGTH;
let SIGNAL_POINTER, SIGNAL_LENGTH;

// Test results logging
function logResult(message, type = 'info') {
    const resultDiv = document.createElement('div');
    resultDiv.className = `test-result ${type}`;
    resultDiv.textContent = message;
    return resultDiv;
}

function updateSummary() {
    const summary = document.getElementById('testSummary');
    const passRate = testsTotal > 0 ? ((testsPassed / testsTotal) * 100).toFixed(1) : 0;

    summary.innerHTML = `
        <h3>Test Results Summary</h3>
        <p><strong>Total Tests:</strong> ${testsTotal}</p>
        <p><strong>Passed:</strong> <span style="color: #28a745;">${testsPassed}</span></p>
        <p><strong>Failed:</strong> <span style="color: #dc3545;">${testsFailed}</span></p>
        <p><strong>Pass Rate:</strong> ${passRate}%</p>
    `;
}

// Update memory views
function updateMemoryViews() {
    const b = wasmMemory.buffer;
    HEAP8 = new Int8Array(b);
    HEAPU8 = new Uint8Array(b);
    HEAP16 = new Int16Array(b);
    HEAPU16 = new Uint16Array(b);
    HEAP32 = new Int32Array(b);
    HEAPU32 = new Uint32Array(b);
    HEAPF32 = new Float32Array(b);
    HEAPF64 = new Float64Array(b);
}

// Load WASM module using Emscripten's Module
async function loadWASM() {
    const statusDiv = document.getElementById('wasmStatus');

    try {
        statusDiv.appendChild(logResult('Loading Ribbit WASM module...', 'info'));

        // Set up callbacks for the Module
        window.encoderCreated = () => {
            console.log('Encoder created callback');
        };
        window.decoderCreated = () => {
            console.log('Decoder created callback');
        };
        window.encoderDestroyed = () => {
            console.log('Encoder destroyed callback');
        };
        window.decoderDestroyed = () => {
            console.log('Decoder destroyed callback');
        };
        window.readEncoded = () => {
            console.log('Read encoded callback');
        };
        window.fetchDecoded = () => {
            console.log('Fetch decoded callback');
        };
        window.encoderCreatedError = () => {
            console.log('Encoder created error callback');
        };
        window.encoderReadError = () => {
            console.log('Encoder read error callback');
        };

        // Load the Module (it's available from ribbit.js)
        const moduleInstance = await Module();

        wasmExports = moduleInstance;
        wasmMemory = moduleInstance.HEAP8.buffer;

        updateMemoryViews();

        // Initialize buffer pointers using the Module API
        FEED_POINTER = moduleInstance._feed_pointer();
        FEED_LENGTH = moduleInstance._feed_length();
        _feed = new Float32Array(wasmMemory, FEED_POINTER, FEED_LENGTH);

        PAYLOAD_POINTER = moduleInstance._payload_pointer();
        PAYLOAD_LENGTH = moduleInstance._payload_length();
        _payload = new Uint8Array(wasmMemory, PAYLOAD_POINTER, PAYLOAD_LENGTH);

        MESSAGE_POINTER = moduleInstance._message_pointer();
        MESSAGE_LENGTH = moduleInstance._message_length();
        _message = new Uint8Array(wasmMemory, MESSAGE_POINTER, MESSAGE_LENGTH);

        SIGNAL_POINTER = moduleInstance._signal_pointer();
        SIGNAL_LENGTH = moduleInstance._signal_length();
        _signalbuffer = new Float32Array(wasmMemory, SIGNAL_POINTER, SIGNAL_LENGTH);

        statusDiv.appendChild(logResult('✓ WASM module loaded successfully', 'pass'));
        statusDiv.appendChild(logResult(`Feed buffer: ${FEED_LENGTH} samples`, 'info'));
        statusDiv.appendChild(logResult(`Message buffer: ${MESSAGE_LENGTH} bytes`, 'info'));
        statusDiv.appendChild(logResult(`Signal buffer: ${SIGNAL_LENGTH} samples`, 'info'));
        statusDiv.appendChild(logResult(`Payload buffer: ${PAYLOAD_LENGTH} bytes`, 'info'));

        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 8000 });
        statusDiv.appendChild(logResult(`AudioContext created (${audioContext.sampleRate} Hz)`, 'pass'));

        // Create encoder and decoder
        moduleInstance._createEncoder();
        moduleInstance._createDecoder();
        statusDiv.appendChild(logResult('✓ Encoder and decoder created', 'pass'));

        return true;
    } catch (error) {
        statusDiv.appendChild(logResult(`✗ WASM loading failed: ${error.message}`, 'fail'));
        console.error('WASM load error:', error);
        return false;
    }
}

// Encode a message to audio
function encodeMessage(messageText) {
    const resultsDiv = document.getElementById('manualTestResults');

    try {
        // Clear message buffer
        _message.fill(0);

        // Encode text to UTF-8
        const encoder = new TextEncoder();
        const encoded = encoder.encode(messageText);

        if (encoded.length > MESSAGE_LENGTH) {
            resultsDiv.appendChild(logResult(`⚠ Message truncated from ${encoded.length} to ${MESSAGE_LENGTH} bytes`, 'warning'));
        }

        // Copy to WASM memory
        const copyLength = Math.min(encoded.length, MESSAGE_LENGTH);
        for (let i = 0; i < copyLength; i++) {
            _message[i] = encoded[i];
        }

        resultsDiv.appendChild(logResult(`Encoding message: "${messageText}" (${encoded.length} bytes)`, 'info'));

        // Initialize encoder with message
        wasmExports._initEncoder();

        // Read encoded signal
        wasmExports._readEncoder();

        // Create audio buffer
        const audioBuffer = audioContext.createBuffer(1, SIGNAL_LENGTH, 8000);
        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < SIGNAL_LENGTH; i++) {
            channelData[i] = _signalbuffer[i];
        }

        currentEncodedAudio = audioBuffer;

        resultsDiv.appendChild(logResult(`✓ Message encoded to ${SIGNAL_LENGTH} audio samples (${(SIGNAL_LENGTH / 8000).toFixed(2)}s)`, 'pass'));

        // Create audio player
        const audioContainer = document.getElementById('audioContainer');
        audioContainer.innerHTML = '';

        const audioPlayer = document.createElement('audio');
        audioPlayer.controls = true;

        // Convert to WAV for playback
        const wav = audioBufferToWav(audioBuffer);
        const blob = new Blob([wav], { type: 'audio/wav' });
        audioPlayer.src = URL.createObjectURL(blob);

        audioContainer.appendChild(audioPlayer);

        document.getElementById('btnSaveWav').disabled = false;

        return audioBuffer;
    } catch (error) {
        resultsDiv.appendChild(logResult(`✗ Encoding failed: ${error.message}`, 'fail'));
        console.error('Encode error:', error);
        return null;
    }
}

// Save encoded audio as WAV file
function saveAsWav() {
    if (!currentEncodedAudio) {
        alert('No encoded audio available. Encode a message first.');
        return;
    }

    const resultsDiv = document.getElementById('manualTestResults');

    try {
        const wav = audioBufferToWav(currentEncodedAudio);
        const blob = new Blob([wav], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `ribbit_test_${Date.now()}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 3000);

        resultsDiv.appendChild(logResult(`✓ WAV file saved (${wav.byteLength} bytes)`, 'pass'));
    } catch (error) {
        resultsDiv.appendChild(logResult(`✗ Save failed: ${error.message}`, 'fail'));
        console.error('Save error:', error);
    }
}

// Load WAV file for decoding
function loadWavFile(file) {
    const resultsDiv = document.getElementById('manualTestResults');

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                resultsDiv.appendChild(logResult(`✓ WAV file loaded: ${audioBuffer.length} samples, ${audioBuffer.duration.toFixed(2)}s`, 'pass'));

                currentEncodedAudio = audioBuffer;
                document.getElementById('btnDecode').disabled = false;
                resolve(audioBuffer);
            } catch (error) {
                resultsDiv.appendChild(logResult(`✗ Failed to decode WAV: ${error.message}`, 'fail'));
                reject(error);
            }
        };

        reader.onerror = () => {
            resultsDiv.appendChild(logResult(`✗ Failed to read file`, 'fail'));
            reject(reader.error);
        };

        reader.readAsArrayBuffer(file);
    });
}

// Decode audio buffer
function decodeAudio(audioBuffer) {
    const resultsDiv = document.getElementById('manualTestResults');

    try {
        const channelData = audioBuffer.getChannelData(0);
        resultsDiv.appendChild(logResult(`Decoding ${channelData.length} audio samples...`, 'info'));

        // Clear payload buffer
        _payload.fill(0);

        // Feed audio to decoder in chunks
        const CHUNK_SIZE = FEED_LENGTH;
        let chunksProcessed = 0;
        let messageFound = false;

        for (let offset = 0; offset < channelData.length; offset += CHUNK_SIZE) {
            const remaining = Math.min(CHUNK_SIZE, channelData.length - offset);

            // Copy audio data to feed buffer
            for (let i = 0; i < remaining; i++) {
                _feed[i] = channelData[offset + i];
            }

            // Fill remaining with zeros if needed
            for (let i = remaining; i < CHUNK_SIZE; i++) {
                _feed[i] = 0;
            }

            // Process this chunk - use optimized version if enabled
            const useOptimized = window.localStorage.getItem("useOptimizedDigest") === "true";
            if (useOptimized) {
                wasmExports._digestFeedOptimized();
            } else {
                wasmExports._digestFeed();
            }
            chunksProcessed++;
        }

        resultsDiv.appendChild(logResult(`Processed ${chunksProcessed} chunks`, 'info'));

        // Check if we got a payload
        let payloadLength = 0;
        for (let i = 0; i < PAYLOAD_LENGTH; i++) {
            if (_payload[i] !== 0) {
                payloadLength = i + 1;
            }
        }

        if (payloadLength > 0) {
            const decoder = new TextDecoder();
            const decoded = decoder.decode(_payload.subarray(0, payloadLength));

            resultsDiv.appendChild(logResult(`✓ Message decoded: "${decoded}"`, 'pass'));
            return decoded;
        } else {
            resultsDiv.appendChild(logResult(`⚠ No message decoded (payload empty)`, 'warning'));
            return null;
        }
    } catch (error) {
        resultsDiv.appendChild(logResult(`✗ Decoding failed: ${error.message}`, 'fail'));
        console.error('Decode error:', error);
        return null;
    }
}

// Automated test: Encode and decode a message
async function testEncodeDecodeRoundTrip(message, testName = 'Round Trip') {
    testsTotal++;

    const resultsDiv = document.getElementById('autoTestResults');
    const testHeader = document.createElement('div');
    testHeader.style.fontWeight = 'bold';
    testHeader.style.marginTop = '15px';
    testHeader.textContent = `Test: ${testName}`;
    resultsDiv.appendChild(testHeader);

    try {
        // Encode
        resultsDiv.appendChild(logResult(`Encoding: "${message}"`, 'info'));
        const audioBuffer = encodeMessage(message);

        if (!audioBuffer) {
            throw new Error('Encoding failed');
        }

        // Small delay to simulate real-world conditions
        await new Promise(resolve => setTimeout(resolve, 100));

        // Decode
        resultsDiv.appendChild(logResult('Decoding...', 'info'));
        const decoded = decodeAudio(audioBuffer);

        if (!decoded) {
            throw new Error('Decoding failed - no message recovered');
        }

        // Verify
        if (decoded.trim() === message.trim()) {
            resultsDiv.appendChild(logResult(`✓ PASS: Message matches exactly`, 'pass'));
            testsPassed++;
            return true;
        } else {
            resultsDiv.appendChild(logResult(`✗ FAIL: Message mismatch`, 'fail'));
            resultsDiv.appendChild(logResult(`  Expected: "${message}"`, 'fail'));
            resultsDiv.appendChild(logResult(`  Got: "${decoded}"`, 'fail'));
            testsFailed++;
            return false;
        }
    } catch (error) {
        resultsDiv.appendChild(logResult(`✗ FAIL: ${error.message}`, 'fail'));
        testsFailed++;
        return false;
    }
}

// Run comprehensive test suite
async function runAllTests() {
    testsPassed = 0;
    testsFailed = 0;
    testsTotal = 0;

    const resultsDiv = document.getElementById('autoTestResults');
    resultsDiv.innerHTML = '';

    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('testProgress');
    const progressText = document.getElementById('progressText');

    progressContainer.style.display = 'block';

    const testCases = [
        { message: 'Test|KO6BVA|FN42kl&=Hello World', name: 'Basic Message' },
        { message: 'Alice|W1ABC|FN31pr&=Test 123', name: 'Different User' },
        { message: 'Bob|K9XYZ|EM48qv&=Short', name: 'Short Message' },
        { message: 'Charlie|VE3TEST|FN25dk&=This is a longer message to test buffer handling', name: 'Long Message' },
        { message: 'Dave|G4ABC|IO91wl&=Special chars: !@#$%', name: 'Special Characters' },
    ];

    resultsDiv.appendChild(logResult(`Running ${testCases.length} tests...`, 'info'));

    for (let i = 0; i < testCases.length; i++) {
        const test = testCases[i];
        await testEncodeDecodeRoundTrip(test.message, test.name);

        const progress = ((i + 1) / testCases.length) * 100;
        progressBar.value = progress;
        progressText.textContent = `${progress.toFixed(0)}%`;
    }

    progressContainer.style.display = 'none';
    updateSummary();
}

// Quick test with one message
async function runQuickTest() {
    testsPassed = 0;
    testsFailed = 0;
    testsTotal = 0;

    const resultsDiv = document.getElementById('autoTestResults');
    resultsDiv.innerHTML = '';

    await testEncodeDecodeRoundTrip('Test|KO6BVA|FN42kl&=Quick test message', 'Quick Test');

    updateSummary();
}

// Stress test with multiple messages
async function runStressTest() {
    testsPassed = 0;
    testsFailed = 0;
    testsTotal = 0;

    const resultsDiv = document.getElementById('autoTestResults');
    resultsDiv.innerHTML = '';

    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('testProgress');
    const progressText = document.getElementById('progressText');

    progressContainer.style.display = 'block';

    resultsDiv.appendChild(logResult('Running stress test with 10 messages...', 'info'));

    for (let i = 0; i < 10; i++) {
        const message = `Stress${i}|TEST${i}|FN42kl&=Stress test message ${i + 1}`;
        await testEncodeDecodeRoundTrip(message, `Stress Test ${i + 1}/10`);

        const progress = ((i + 1) / 10) * 100;
        progressBar.value = progress;
        progressText.textContent = `${progress.toFixed(0)}%`;
    }

    progressContainer.style.display = 'none';
    updateSummary();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Load WASM module
    const loaded = await loadWASM();

    if (!loaded) {
        alert('Failed to load WASM module. Tests cannot run.');
        return;
    }

    // Manual test controls
    document.getElementById('btnEncode').addEventListener('click', () => {
        const message = document.getElementById('testMessage').value;
        if (!message) {
            alert('Please enter a test message');
            return;
        }
        document.getElementById('manualTestResults').innerHTML = '';
        encodeMessage(message);
    });

    document.getElementById('btnSaveWav').addEventListener('click', saveAsWav);

    document.getElementById('btnLoadWav').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.wav,audio/wav';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('manualTestResults').innerHTML = '';
                loadWavFile(file);
            }
        };
        input.click();
    });

    document.getElementById('btnDecode').addEventListener('click', () => {
        if (!currentEncodedAudio) {
            alert('No audio loaded. Encode a message or load a WAV file first.');
            return;
        }
        decodeAudio(currentEncodedAudio);
    });

    // Automated test controls
    document.getElementById('btnRunAllTests').addEventListener('click', runAllTests);
    document.getElementById('btnRunQuickTest').addEventListener('click', runQuickTest);
    document.getElementById('btnRunStressTest').addEventListener('click', runStressTest);

    // Set default test message
    document.getElementById('testMessage').value = 'Test|KO6BVA|FN42kl&=Hello World';
});

