/**
 * Decoding & Stress Tests for RibbitWASM
 */
import { RibbitWASM } from './ribbit-wasm.js';

class DecodingTester {
    constructor() {
        this.ribbit = null;
        this.testsRunning = false;
        this.results = [];
        this.logs = [];

        // UI Elements
        this.elements = {
            btnRunBasic: document.getElementById('btnRunBasicTests'),
            btnRunStress: document.getElementById('btnRunStressTest'),
            btnRunValidation: document.getElementById('btnRunValidationTests'),
            btnStop: document.getElementById('btnStopTests'),
            btnClear: document.getElementById('btnClearResults'),
            noiseLevel: document.getElementById('noiseLevel'),
            noiseVal: document.getElementById('noiseVal'),
            testCount: document.getElementById('testCount'),
            delay: document.getElementById('delay'),
            useWakeupTone: document.getElementById('useWakeupTone'),
            testResults: document.getElementById('testResults'),
            totalTests: document.getElementById('totalTests'),
            passedTests: document.getElementById('passedTests'),
            failedTests: document.getElementById('failedTests'),
            accuracy: document.getElementById('accuracy'),
            logContainer: document.getElementById('logContainer')
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
        this.elements.btnRunBasic.onclick = () => this.runBasicTests();
        this.elements.btnRunStress.onclick = () => this.runStressTest();
        this.elements.btnRunValidation.onclick = () => this.runValidationTests();
        this.elements.btnStop.onclick = () => this.stopTests();
        this.elements.btnClear.onclick = () => this.clearResults();

        this.elements.noiseLevel.oninput = (e) => {
            const val = parseInt(e.target.value);
            if (val === 0) {
                this.elements.noiseVal.innerText = 'SNR: Clear';
            } else {
                this.elements.noiseVal.innerText = `SNR: ${100 - val}% Noise`;
            }
        };
    }

    setControlsEnabled(enabled) {
        this.elements.btnRunBasic.disabled = !enabled || this.testsRunning;
        this.elements.btnRunStress.disabled = !enabled || this.testsRunning;
        this.elements.btnRunValidation.disabled = !enabled || this.testsRunning;
        this.elements.btnStop.disabled = !enabled || !this.testsRunning;
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
            // 1. Encode
            const audioBuffer = await this.ribbit.encodeMessage(text, {
                callsign: callsign,
                gridsquare: gridsquare
            });

            // 2. Add wake-up tone if enabled (300Hz for 200ms, then 100ms silence)
            let processedBuffer = audioBuffer;
            if (this.elements.useWakeupTone.checked) {
                processedBuffer = this.addWakeupTone(audioBuffer);
            }

            // 3. Add Noise if requested
            let testBuffer = processedBuffer;
            if (noiseLevel > 0) {
                testBuffer = this.addNoise(processedBuffer, noiseLevel);
            }

            // 4. Decode
            // We feed the whole buffer at once. RibbitWASM.decodeAudio handles feeding and attempting decode.
            // However, real-time decoder works in chunks. 
            // Here we want to see if it detects it.

            // First reset/clear decoder state if possible (though RibbitWASM doesn't expose a reset)
            // For now, we just feed it.

            const decoded = await this.ribbit.decodeAudio(testBuffer);

            // Apply application-level validation logic
            const isValid = this.isValidDecodedMessage(decoded);
            const actualPass = decoded && isValid;

            this.recordResult(text, callsign, gridsquare, decoded, expectPass, null, isValid);

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

    addWakeupTone(buffer) {
        // Add a wake-up tone to ensure radio transmitters open the channel
        // Tone: 300Hz for 200ms, then 100ms silence
        const sampleRate = 8000;
        const toneFreq = 300;
        const toneDuration = 0.2; // 200ms
        const silenceDuration = 0.1; // 100ms

        const toneSamples = Math.floor(toneDuration * sampleRate);
        const silenceSamples = Math.floor(silenceDuration * sampleRate);
        const totalExtraSamples = toneSamples + silenceSamples;

        const extendedBuffer = new Float32Array(totalExtraSamples + buffer.length);

        // Generate 300Hz wake-up tone
        // 300Hz at 8000Hz SR for 1600 samples is exactly 60 cycles, ending at zero crossing.
        for (let i = 0; i < toneSamples; i++) {
            extendedBuffer[i] = Math.sin(2 * Math.PI * toneFreq * i / sampleRate);
        }

        // Silence is already zeros (Float32Array initializes to 0)
        
        // Copy original encoded message audio after tone and silence
        extendedBuffer.set(buffer, totalExtraSamples);

        return extendedBuffer;
    }

    recordResult(originalText, originalCall, originalGS, decoded, expectPass, error = null, isValid = true) {
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
            timestamp: new Date()
        };

        this.results.push(result);
        this.updateUI(result);
    }

    updateUI(result) {
        // Update stats
        const total = this.results.length;
        const passed = this.results.filter(r => r.pass).length;
        this.elements.totalTests.innerText = total;
        this.elements.passedTests.innerText = passed;
        this.elements.failedTests.innerText = total - passed;
        this.elements.accuracy.innerText = `${Math.round((passed / total) * 100)}%`;

        // Inject result item
        const item = document.createElement('div');
        item.className = `result-item ${result.pass ? 'pass' : 'fail'}`;

        let details = `Original: ${result.original.call} > ${result.original.text}`;
        if (result.error) {
            details += `\nError: ${result.error}`;
        } else if (result.decoded) {
            details += `\nDecoded: [${result.isValid ? 'VALID' : 'INVALID'}] ${result.decoded.callsign} > ${result.decoded.text}`;
        } else {
            details += `\nDecoded: (None)`;
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
        this.elements.testResults.innerHTML = '';
        this.elements.totalTests.innerText = '0';
        this.elements.passedTests.innerText = '0';
        this.elements.failedTests.innerText = '0';
        this.elements.accuracy.innerText = '0%';
        this.log('Results cleared.', 'info');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.tester = new DecodingTester();
});
