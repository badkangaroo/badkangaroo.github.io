/**
 * Decoding & Stress Tests for RibbitWASM
 * Enhanced with microphone testing, WAV generation, and comprehensive test scenarios
 */
import { RibbitWASM } from './ribbit-wasm.js';

class DecodingTester {
    constructor() {
        this.ribbit = null;
        this.testsRunning = false;
        this.results = [];
        this.logs = [];
        
        // Audio context for playback and recording
        this.audioContext = null;
        this.micStream = null;
        this.micProcessor = null;
        this.isListening = false;
        this.lastGeneratedAudio = null;
        this.lastGeneratedMessage = null;
        this.spinnerRotation = 0;

        // Define global callback for WASM spinner rotation
        window.rotateSpinner = () => {
            if (this.isListening && this.elements.processingSpinner) {
                this.spinnerRotation = (this.spinnerRotation + 1) % 360;
                this.elements.processingSpinner.style.transform = `rotate(${this.spinnerRotation}deg)`;
            }
        };

        // UI Elements
        this.elements = {
            btnRunBasic: document.getElementById('btnRunBasicTests'),
            btnRunStress: document.getElementById('btnRunStressTest'),
            btnRunValidation: document.getElementById('btnRunValidationTests'),
            btnRunAdvanced: document.getElementById('btnRunAdvancedTests'),
            btnStop: document.getElementById('btnStopTests'),
            btnClear: document.getElementById('btnClearResults'),
            // Microphone test controls
            btnStartMic: document.getElementById('btnStartMic'),
            btnStopMic: document.getElementById('btnStopMic'),
            micStatus: document.getElementById('micStatus'),
            micLevelContainer: document.getElementById('micLevelContainer'),
            micLevelBar: document.getElementById('micLevelBar'),
            processingSpinner: document.getElementById('processingSpinner'),
            // WAV generation controls
            btnGenerateWav: document.getElementById('btnGenerateWav'),
            btnPlayAudio: document.getElementById('btnPlayAudio'),
            wavMessage: document.getElementById('wavMessage'),
            wavCallsign: document.getElementById('wavCallsign'),
            wavGridsquare: document.getElementById('wavGridsquare'),
            // Other controls
            noiseLevel: document.getElementById('noiseLevel'),
            noiseVal: document.getElementById('noiseVal'),
            testCount: document.getElementById('testCount'),
            delay: document.getElementById('delay'),
            testResults: document.getElementById('testResults'),
            totalTests: document.getElementById('totalTests'),
            passedTests: document.getElementById('passedTests'),
            failedTests: document.getElementById('failedTests'),
            accuracy: document.getElementById('accuracy'),
            logContainer: document.getElementById('logContainer'),
            decodedMessages: document.getElementById('decodedMessages')
        };

        this.setupEventListeners();
        this.init();
    }

    async init() {
        this.log('Initializing RibbitWASM...', 'info');
        try {
            this.ribbit = await RibbitWASM.load();
            this.log('✓ RibbitWASM loaded successfully', 'success');
            this.setControlsEnabled(true);
        } catch (error) {
            this.log('✗ Failed to load WASM: ' + error.message, 'error');
        }
    }

    setupEventListeners() {
        // Basic test buttons
        if (this.elements.btnRunBasic) {
            this.elements.btnRunBasic.onclick = () => this.runBasicTests();
        }
        if (this.elements.btnRunStress) {
            this.elements.btnRunStress.onclick = () => this.runStressTest();
        }
        if (this.elements.btnRunValidation) {
            this.elements.btnRunValidation.onclick = () => this.runValidationTests();
        }
        if (this.elements.btnRunAdvanced) {
            this.elements.btnRunAdvanced.onclick = () => this.runAdvancedTests();
        }
        if (this.elements.btnStop) {
            this.elements.btnStop.onclick = () => this.stopTests();
        }
        if (this.elements.btnClear) {
            this.elements.btnClear.onclick = () => this.clearResults();
        }

        // Microphone test buttons
        if (this.elements.btnStartMic) {
            this.elements.btnStartMic.onclick = () => this.startMicrophoneTest();
        }
        if (this.elements.btnStopMic) {
            this.elements.btnStopMic.onclick = () => this.stopMicrophoneTest();
        }

        // WAV generation buttons
        if (this.elements.btnGenerateWav) {
            this.elements.btnGenerateWav.onclick = () => this.generateWavFile();
        }
        if (this.elements.btnPlayAudio) {
            this.elements.btnPlayAudio.onclick = () => this.playGeneratedAudio();
        }

        // Noise level slider
        if (this.elements.noiseLevel) {
            this.elements.noiseLevel.oninput = (e) => {
                const val = parseInt(e.target.value);
                if (val === 0) {
                    this.elements.noiseVal.innerText = 'SNR: Clear';
                } else {
                    this.elements.noiseVal.innerText = `SNR: ${100 - val}% Noise`;
                }
            };
        }
    }

    setControlsEnabled(enabled) {
        if (this.elements.btnRunBasic) {
            this.elements.btnRunBasic.disabled = !enabled || this.testsRunning;
        }
        if (this.elements.btnRunStress) {
            this.elements.btnRunStress.disabled = !enabled || this.testsRunning;
        }
        if (this.elements.btnRunValidation) {
            this.elements.btnRunValidation.disabled = !enabled || this.testsRunning;
        }
        if (this.elements.btnRunAdvanced) {
            this.elements.btnRunAdvanced.disabled = !enabled || this.testsRunning;
        }
        if (this.elements.btnStop) {
            this.elements.btnStop.disabled = !enabled || !this.testsRunning;
        }
        if (this.elements.btnStartMic) {
            this.elements.btnStartMic.disabled = !enabled || this.isListening;
        }
        if (this.elements.btnStopMic) {
            this.elements.btnStopMic.disabled = !enabled || !this.isListening;
        }
        if (this.elements.btnGenerateWav) {
            this.elements.btnGenerateWav.disabled = !enabled;
        }
        if (this.elements.btnPlayAudio) {
            this.elements.btnPlayAudio.disabled = !enabled || !this.lastGeneratedAudio;
        }
    }

    log(message, type = 'info') {
        const time = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `<span class="log-time">${time}</span> <span class="log-${type}">${message}</span>`;
        this.elements.logContainer.prepend(entry);
    }

    async runBasicTests() {
        this.testsRunning = true;
        this.setControlsEnabled(true);
        this.log('Starting Basic Decoding Tests...', 'info');

        const testMessages = [
            { text: "Hello from Ribbit!", callsign: "W1AW", gridsquare: "FN31pr" },
            { text: "Testing the decoder robustness.", callsign: "K6ABC", gridsquare: "CM87um" },
            { text: "73 de Ribbit Team", callsign: "G8XYZ", gridsquare: "IO91lk" }
        ];

        for (const test of testMessages) {
            if (!this.testsRunning) break;
            await this.performSingleTest(test.text, test.callsign, test.gridsquare);
            await new Promise(r => setTimeout(r, parseInt(this.elements.delay.value)));
        }

        this.testsRunning = false;
        this.setControlsEnabled(true);
        this.log('Basic Tests Completed.', 'info');
    }

    async runStressTest() {
        this.testsRunning = true;
        this.setControlsEnabled(true);
        const count = parseInt(this.elements.testCount.value);
        this.log(`Starting Stress Test: ${count} messages...`, 'info');

        for (let i = 0; i < count; i++) {
            if (!this.testsRunning) break;
            const msg = `Stress Test Message #${i + 1} - ${Math.random().toString(36).substring(7)}`;
            await this.performSingleTest(msg, "STRESS", "AA00aa");
            await new Promise(r => setTimeout(r, parseInt(this.elements.delay.value)));
        }

        this.testsRunning = false;
        this.setControlsEnabled(true);
        this.log('Stress Test Completed.', 'info');
    }

    async runValidationTests() {
        this.testsRunning = true;
        this.setControlsEnabled(true);
        this.log('Starting Validation Tests...', 'info');

        const validationSuites = [
            { name: "Empty Messages", text: "", callsign: "EMPTY", gs: "AA00aa", expectPass: false },
            { name: "Long Callsigns", text: "Test", callsign: "VERYLONGCALLSIGN", gs: "AA00aa", expectPass: false },
            { name: "Invalid Characters", text: "Test", callsign: "CALL!", gs: "AA00aa", expectPass: false },
            { name: "Garbage Data", text: "A".repeat(500), callsign: "TEST", gs: "AA00aa", expectPass: true },
            { name: "Null Bytes", text: "Test\u0000", callsign: "TEST", gs: "AA00aa", expectPass: false },
            { name: "Non-Printable", text: "Test\x01\x02\x03", callsign: "TEST", gs: "AA00aa", expectPass: false }
        ];

        for (const suite of validationSuites) {
            if (!this.testsRunning) break;
            this.log(`Running Validation: ${suite.name}`, 'info');
            await this.performSingleTest(suite.text, suite.callsign, suite.gs, suite.expectPass);
            await new Promise(r => setTimeout(r, parseInt(this.elements.delay.value)));
        }

        this.testsRunning = false;
        this.setControlsEnabled(true);
        this.log('Validation Tests Completed.', 'info');
    }

    /**
     * Run advanced test scenarios covering edge cases and real-world conditions
     */
    async runAdvancedTests() {
        this.testsRunning = true;
        this.setControlsEnabled(true);
        this.log('Starting Advanced Tests...', 'info');

        const advancedSuites = [
            // Unicode and international characters
            { name: "Unicode (Chinese)", text: "你好世界 Hello", callsign: "BV2AAA", gs: "PL05qh", expectPass: true },
            { name: "Unicode (Japanese)", text: "こんにちは 73", callsign: "JA1ABC", gs: "PM95tp", expectPass: true },
            { name: "Unicode (Korean)", text: "안녕하세요", callsign: "HL1ABC", gs: "PM36jk", expectPass: true },
            { name: "Unicode (Russian)", text: "Привет мир", callsign: "UA3ABC", gs: "KO85tu", expectPass: true },
            { name: "Unicode (Arabic)", text: "مرحبا بالعالم", callsign: "A71A", gs: "LL55aa", expectPass: true },
            { name: "Emojis in message", text: "Hello 🐸 73! 👋", callsign: "W1AW", gs: "FN31pr", expectPass: true },
            
            // Special characters
            { name: "Special chars", text: "Test!@#$%^&*()", callsign: "K6TEST", gs: "CM87um", expectPass: true },
            { name: "Newlines", text: "Line1\nLine2\nLine3", callsign: "W6ABC", gs: "DM04wf", expectPass: true },
            { name: "Tabs", text: "Col1\tCol2\tCol3", callsign: "N6XYZ", gs: "DM12jw", expectPass: true },
            
            // Message length boundaries
            { name: "Minimum message (1 char)", text: "X", callsign: "W1MIN", gs: "FN42ig", expectPass: true },
            { name: "Medium message (50 chars)", text: "A".repeat(50), callsign: "W2MED", gs: "FN20vr", expectPass: true },
            { name: "Long message (200 chars)", text: "B".repeat(200), callsign: "W3LONG", gs: "EM73sq", expectPass: true },
            { name: "Max message (240 chars)", text: "C".repeat(240), callsign: "W4MAX", gs: "DN31ut", expectPass: true },
            { name: "Over max (250 chars)", text: "D".repeat(250), callsign: "W5OVER", gs: "CN87wr", expectPass: false },
            
            // Callsign edge cases
            { name: "Short callsign (3 chars)", text: "Test", callsign: "K6A", gs: "CM87um", expectPass: true },
            { name: "Max callsign (8 chars)", text: "Test", callsign: "VK2ABCD", gs: "QF56od", expectPass: true },
            { name: "Callsign with slash", text: "Portable op", callsign: "W6ABC/P", gs: "CM98lk", expectPass: true },
            { name: "Callsign with numbers", text: "Test", callsign: "3DA0AQ", gs: "KG43px", expectPass: true },
            
            // Gridsquare variations  
            { name: "Minimum gridsquare", text: "Test", callsign: "TEST1", gs: "AA00aa", expectPass: true },
            { name: "Maximum gridsquare", text: "Test", callsign: "TEST2", gs: "RR99xx", expectPass: true },
            
            // Chunked audio simulation (test decoder state)
            { name: "State consistency", text: "State test 1", callsign: "STATE1", gs: "FN31pr", expectPass: true },
            { name: "State consistency 2", text: "State test 2", callsign: "STATE2", gs: "FN31pr", expectPass: true },
            
            // Timing/latency measurement
            { name: "Quick decode", text: "Quick", callsign: "QUICK", gs: "CM87um", expectPass: true, measureLatency: true },
        ];

        for (const suite of advancedSuites) {
            if (!this.testsRunning) break;
            this.log(`Running Advanced: ${suite.name}`, 'info');
            
            if (suite.measureLatency) {
                await this.performLatencyTest(suite.text, suite.callsign, suite.gs);
            } else {
                await this.performSingleTest(suite.text, suite.callsign, suite.gs, suite.expectPass);
            }
            await new Promise(r => setTimeout(r, parseInt(this.elements.delay?.value || 500)));
        }

        this.testsRunning = false;
        this.setControlsEnabled(true);
        this.log('Advanced Tests Completed.', 'info');
    }

    /**
     * Perform a latency measurement test
     */
    async performLatencyTest(text, callsign, gridsquare) {
        this.log(`Latency Test: "${text}" de ${callsign}`, 'info');

        try {
            const encodeStart = performance.now();
            const audioBuffer = await this.ribbit.encodeMessage(text, {
                callsign: callsign,
                gridsquare: gridsquare
            });
            const encodeEnd = performance.now();

            const decodeStart = performance.now();
            const decoded = await this.ribbit.decodeAudio(audioBuffer);
            const decodeEnd = performance.now();

            const encodeTime = (encodeEnd - encodeStart).toFixed(2);
            const decodeTime = (decodeEnd - decodeStart).toFixed(2);

            const isValid = this.isValidDecodedMessage(decoded);
            const pass = decoded && isValid && decoded.text === text;

            this.log(`Encode: ${encodeTime}ms, Decode: ${decodeTime}ms`, pass ? 'success' : 'warn');
            this.recordResult(text, callsign, gridsquare, decoded, true, null, isValid, { encodeTime, decodeTime });

        } catch (error) {
            this.log(`Latency test error: ${error.message}`, 'error');
            this.recordResult(text, callsign, gridsquare, null, true, error.message);
        }
    }

    // ==================== MICROPHONE LIVE AUDIO TEST ====================

    /**
     * Start microphone test - listens for Ribbit signals in real-time
     */
    async startMicrophoneTest() {
        if (this.isListening) {
            this.log('Already listening...', 'warn');
            return;
        }

        try {
            this.log('Requesting microphone access...', 'info');
            
            // Initialize audio context if needed
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 8000 });
            }
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Get microphone stream
            this.micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 8000
                },
                video: false
            });

            const source = this.audioContext.createMediaStreamSource(this.micStream);
            this.micProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);

            let messageBuffer = [];
            let lastDecodeTime = 0;
            const DEBOUNCE_MS = 2000;

            this.micProcessor.onaudioprocess = async (event) => {
                if (!this.isListening) return;

                try {
                    const inputData = event.inputBuffer.getChannelData(0);
                    
                    // Update audio level meter
                    if (this.elements.micLevelBar) {
                        let sum = 0;
                        for (let i = 0; i < inputData.length; i++) {
                            sum += inputData[i] * inputData[i];
                        }
                        const rms = Math.sqrt(sum / inputData.length);
                        // amplify low signals for better visibility, cap at 100%
                        const percentage = Math.min(100, Math.round(rms * 500)); 
                        
                        this.elements.micLevelBar.style.width = `${percentage}%`;
                        
                        // Visual clipping indication if very loud
                        if (percentage >= 95) {
                            this.elements.micLevelBar.classList.add('clipping');
                        } else {
                            this.elements.micLevelBar.classList.remove('clipping');
                        }
                    }

                    const decoded = await this.ribbit.decodeAudio(inputData);

                    if (decoded) {
                        const now = Date.now();
                        if (now - lastDecodeTime > DEBOUNCE_MS) {
                            lastDecodeTime = now;
                            
                            const isValid = this.isValidDecodedMessage(decoded);
                            if (isValid) {
                                this.log(`🎤 DECODED: ${decoded.callsign} > "${decoded.text}"`, 'success');
                                this.addDecodedMessage(decoded);
                            } else {
                                this.log('🎤 Invalid message received (failed validation)', 'warn');
                            }
                        }
                    }
                } catch (error) {
                    // Silently ignore decode errors during continuous listening
                }
            };

            source.connect(this.micProcessor);
            this.micProcessor.connect(this.audioContext.destination);

            this.isListening = true;
            this.setControlsEnabled(true);
            this.updateMicStatus('Listening...', 'active');
            
            // Activate UI indicators
            if (this.elements.micLevelContainer) this.elements.micLevelContainer.classList.add('active');
            if (this.elements.processingSpinner) this.elements.processingSpinner.classList.add('active');
            
            this.log('🎤 Microphone listening started - play a Ribbit signal to decode', 'success');

        } catch (error) {
            this.log(`Microphone error: ${error.message}`, 'error');
            this.updateMicStatus('Error: ' + error.message, 'error');
        }
    }

    /**
     * Stop microphone listening
     */
    stopMicrophoneTest() {
        if (!this.isListening) return;

        if (this.micProcessor) {
            this.micProcessor.disconnect();
            this.micProcessor = null;
        }

        if (this.micStream) {
            this.micStream.getTracks().forEach(track => track.stop());
            this.micStream = null;
        }

        this.isListening = false;
        this.setControlsEnabled(true);
        this.updateMicStatus('Stopped', 'inactive');
        this.log('🎤 Microphone listening stopped', 'info');
    }

    /**
     * Update microphone status display
     */
    updateMicStatus(text, state) {
        if (this.elements.micStatus) {
            this.elements.micStatus.innerText = text;
            this.elements.micStatus.className = `mic-status ${state}`;
        }
    }

    /**
     * Add a decoded message to the live messages display
     */
    addDecodedMessage(decoded) {
        if (!this.elements.decodedMessages) return;

        const item = document.createElement('div');
        item.className = 'decoded-message';
        item.innerHTML = `
            <div class="decoded-header">
                <span class="decoded-callsign">${decoded.callsign}</span>
                <span class="decoded-grid">${decoded.gridsquare || 'N/A'}</span>
                <span class="decoded-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="decoded-text">${decoded.text}</div>
        `;
        this.elements.decodedMessages.prepend(item);

        // Keep only last 20 messages
        while (this.elements.decodedMessages.children.length > 20) {
            this.elements.decodedMessages.removeChild(this.elements.decodedMessages.lastChild);
        }
    }

    // ==================== WAV FILE GENERATION ====================

    /**
     * Generate a WAV file from encoded message for cross-device testing
     */
    async generateWavFile() {
        const message = this.elements.wavMessage?.value || 'Test message for cross-device decoding';
        const callsign = this.elements.wavCallsign?.value || 'W1TEST';
        const gridsquare = this.elements.wavGridsquare?.value || 'FN31pr';

        this.log(`Generating WAV: "${message}" de ${callsign}`, 'info');

        try {
            // Encode the message
            const audioBuffer = await this.ribbit.encodeMessage(message, {
                callsign: callsign,
                gridsquare: gridsquare
            });

            // Add wake-up tone (like in index.js)
            const sampleRate = 8000;
            const toneFreq = 300;
            const toneDuration = 0.3; // 300ms wake-up tone
            const silenceDuration = 0.1; // 100ms silence
            const tailSilence = 0.5; // 500ms silence at end

            const toneSamples = Math.floor(toneDuration * sampleRate);
            const silenceSamples = Math.floor(silenceDuration * sampleRate);
            const tailSamples = Math.floor(tailSilence * sampleRate);

            const extendedBuffer = new Float32Array(toneSamples + silenceSamples + audioBuffer.length + tailSamples);

            // Generate 300Hz wake-up tone
            for (let i = 0; i < toneSamples; i++) {
                extendedBuffer[i] = 0.8 * Math.sin(2 * Math.PI * toneFreq * i / sampleRate);
            }

            // Copy message audio after tone + silence
            extendedBuffer.set(audioBuffer, toneSamples + silenceSamples);

            // Store for playback
            this.lastGeneratedAudio = extendedBuffer;
            this.lastGeneratedMessage = { message, callsign, gridsquare };
            this.setControlsEnabled(true);

            // Create WAV file
            const wavData = this.createWavFile(extendedBuffer, sampleRate);
            const blob = new Blob([wavData], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);

            // Create download link with descriptive filename
            // Format: YYYY-MM-DD_HHMMSS-CALLSIGN-GRIDSQUARE.wav
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
            const safeCallsign = callsign.replace(/[^A-Z0-9]/gi, '').toUpperCase();
            const safeGridsquare = gridsquare.replace(/[^A-Za-z0-9]/g, '');
            const filename = `${timestamp}-${safeCallsign}-${safeGridsquare}.wav`;
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.log(`✓ WAV file generated: ${filename} (${(wavData.byteLength / 1024).toFixed(1)} KB)`, 'success');
            this.log('Play this file on another device to test cross-device decoding!', 'info');

        } catch (error) {
            this.log(`WAV generation error: ${error.message}`, 'error');
        }
    }

    /**
     * Create WAV file from Float32Array audio data
     */
    createWavFile(samples, sampleRate) {
        const numChannels = 1;
        const bitDepth = 16;
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;

        const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
        const view = new DataView(buffer);

        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + samples.length * bytesPerSample, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM format
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(36, 'data');
        view.setUint32(40, samples.length * bytesPerSample, true);

        // Audio data
        let offset = 44;
        for (let i = 0; i < samples.length; i++) {
            const sample = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }

        return buffer;
    }

    /**
     * Play the last generated audio through speakers
     */
    async playGeneratedAudio() {
        if (!this.lastGeneratedAudio) {
            this.log('No audio generated yet. Generate a WAV file first.', 'warn');
            return;
        }

        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 8000 });
            }

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            const audioBufferNode = this.audioContext.createBuffer(1, this.lastGeneratedAudio.length, 8000);
            audioBufferNode.copyToChannel(this.lastGeneratedAudio, 0);

            const source = this.audioContext.createBufferSource();
            source.buffer = audioBufferNode;
            source.connect(this.audioContext.destination);

            source.onended = () => {
                this.log('✓ Audio playback completed', 'success');
            };

            source.start();
            this.log(`🔊 Playing: "${this.lastGeneratedMessage.message}" de ${this.lastGeneratedMessage.callsign}`, 'info');

        } catch (error) {
            this.log(`Playback error: ${error.message}`, 'error');
        }
    }

    /**
     * logic from web/scripts/index.js to verify it works as expected
     */
    isValidDecodedMessage(decoded) {
        if (!decoded) return false;

        // Check if required fields exist and are strings
        if (typeof decoded.callsign !== 'string' || typeof decoded.text !== 'string') {
            return false;
        }

        // Check for null bytes or invalid characters
        const hasNullBytes = (str) => str && str.includes('\u0000');
        if (hasNullBytes(decoded.callsign) || hasNullBytes(decoded.text)) {
            return false;
        }

        // Check if callsign is reasonable (not empty, reasonable length)
        if (!decoded.callsign || decoded.callsign.trim().length === 0 || decoded.callsign.length > 20) {
            return false;
        }

        // Validate callsign format
        const callsignRegex = /^[A-Z0-9/]+$/i;
        if (!callsignRegex.test(decoded.callsign.trim())) {
            return false;
        }

        // Check if text is reasonable
        if (!decoded.text || decoded.text.trim().length === 0 || decoded.text.length > 1000) {
            return false;
        }

        // Check for garbled text
        const nonPrintableRegex = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/g;
        const nonPrintableCount = (decoded.text.match(nonPrintableRegex) || []).length;
        if (nonPrintableCount > decoded.text.length * 0.1) {
            return false;
        }

        if (decoded.text.includes('\uFFFD') || decoded.callsign.includes('\uFFFD')) {
            return false;
        }

        return true;
    }

    stopTests() {
        this.testsRunning = false;
        this.log('Tests Stopping...', 'warn');
    }

    async performSingleTest(text, callsign, gridsquare, expectPass = true) {
        const noiseLevel = parseInt(this.elements.noiseLevel.value) / 100;
        this.log(`Testing: "${text.substring(0, 20)}..." de ${callsign} (Noise: ${Math.round(noiseLevel * 100)}%)`, 'info');

        try {
            // Clear any leftover messages from previous tests
            this.ribbit.decoder.messageQueue = [];

            // 1. Encode
            const audioBuffer = await this.ribbit.encodeMessage(text, {
                callsign: callsign,
                gridsquare: gridsquare
            });

            // 2. Add Noise if requested
            let testBuffer = audioBuffer;
            if (noiseLevel > 0) {
                testBuffer = this.addNoise(audioBuffer, noiseLevel);
            }

            // 3. Decode by feeding audio in chunks (simulating real-time streaming)
            // The decoder accumulates state across multiple calls and may decode a message
            // after receiving enough audio data
            let decodedMessage = null;
            const chunkSize = 2048; // Match the WASM feed buffer size

            for (let i = 0; i < testBuffer.length && !decodedMessage; i += chunkSize) {
                const chunk = testBuffer.subarray(i, Math.min(i + chunkSize, testBuffer.length));
                const chunkResult = await this.ribbit.decodeAudio(chunk);

                // If we got a decoded message from this chunk, use it
                if (chunkResult) {
                    decodedMessage = chunkResult;
                }
            }

            // Apply application-level validation logic
            const isValid = this.isValidDecodedMessage(decodedMessage);
            const actualPass = decodedMessage && isValid;

            this.recordResult(text, callsign, gridsquare, decodedMessage, expectPass, null, isValid);

        } catch (error) {
            this.log(`Error during test: ${error.message}`, 'error');
            this.recordResult(text, callsign, gridsquare, null, expectPass, error.message);
        }
    }

    addNoise(buffer, level) {
        const noisyBuffer = new Float32Array(buffer.length);
        for (let i = 0; i < buffer.length; i++) {
            // Gaussian noise approximation
            const noise = (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;
            noisyBuffer[i] = buffer[i] + noise * level;
        }
        return noisyBuffer;
    }

    recordResult(originalText, originalCall, originalGS, decoded, expectPass, error = null, isValid = true, timing = null) {
        let pass = false;

        if (error) {
            pass = false;
        } else if (!expectPass) {
            // We expected it to be invalid or not decode
            pass = !decoded || !isValid;
        } else {
            // We expected it to pass
            pass = decoded && isValid && decoded.text === originalText && decoded.callsign === originalCall;
        }

        const result = {
            original: { text: originalText, call: originalCall, gs: originalGS },
            decoded: decoded,
            pass: pass,
            isValid: isValid,
            error: error,
            timestamp: new Date(),
            timing: timing // { encodeTime, decodeTime } if provided
        };

        this.results.push(result);
        this.updateUI(result);
    }

    updateUI(result) {
        // Update stats
        const total = this.results.length;
        const passed = this.results.filter(r => r.pass).length;
        if (this.elements.totalTests) this.elements.totalTests.innerText = total;
        if (this.elements.passedTests) this.elements.passedTests.innerText = passed;
        if (this.elements.failedTests) this.elements.failedTests.innerText = total - passed;
        if (this.elements.accuracy) this.elements.accuracy.innerText = `${Math.round((passed / total) * 100)}%`;

        if (!this.elements.testResults) return;

        // Inject result item
        const item = document.createElement('div');
        item.className = `result-item ${result.pass ? 'pass' : 'fail'}`;

        let details = `Original: ${result.original.call} > ${result.original.text.substring(0, 50)}${result.original.text.length > 50 ? '...' : ''}`;
        if (result.error) {
            details += `\nError: ${result.error}`;
        } else if (result.decoded) {
            details += `\nDecoded: [${result.isValid ? 'VALID' : 'INVALID'}] ${result.decoded.callsign} > ${result.decoded.text.substring(0, 50)}${result.decoded.text.length > 50 ? '...' : ''}`;
        } else {
            details += `\nDecoded: (None)`;
        }

        // Add timing info if available
        if (result.timing) {
            details += `\nTiming: Encode ${result.timing.encodeTime}ms, Decode ${result.timing.decodeTime}ms`;
        }

        item.innerHTML = `
            <div class="result-header">
                <span>Test #${this.results.length}</span>
                <span class="status-badge ${result.pass ? 'pass' : 'fail'}">${result.pass ? 'PASS' : 'FAIL'}</span>
            </div>
            <div class="result-details">${details}</div>
        `;

        this.elements.testResults.prepend(item);
    }

    clearResults() {
        this.results = [];
        if (this.elements.testResults) this.elements.testResults.innerHTML = '';
        if (this.elements.totalTests) this.elements.totalTests.innerText = '0';
        if (this.elements.passedTests) this.elements.passedTests.innerText = '0';
        if (this.elements.failedTests) this.elements.failedTests.innerText = '0';
        if (this.elements.accuracy) this.elements.accuracy.innerText = '0%';
        if (this.elements.decodedMessages) this.elements.decodedMessages.innerHTML = '';
        this.log('Results cleared.', 'info');
    }

    /**
     * Clean up resources on page unload
     */
    destroy() {
        this.stopMicrophoneTest();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.ribbit) {
            this.ribbit.destroy();
            this.ribbit = null;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.tester = new DecodingTester();
});
