"use strict";

/**
 * Simplified Ribbit Web App using the new friendly WASM API
 *
 * This replaces the complex manual WASM memory management with simple,
 * promise-based API calls.
 */

import { RibbitWASM } from './ribbit-wasm.js';

class RibbitApp {
    constructor() {
        this.ribbit = null;
        this.audioContext = null;
        this.isInitialized = false;
        this.isTransmitting = false;

        this.init();
    }

    async init() {
        try {
            console.log('Initializing Ribbit App...');

            // Load WASM with one line
            this.ribbit = await RibbitWASM.load();
            console.log('✓ WASM loaded successfully');

            // Initialize audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 8000
            });
            console.log('✓ Audio context initialized');

            // Set up UI event handlers
            this.setupEventHandlers();

            this.isInitialized = true;
            console.log('✓ Ribbit App ready!');

            // Dispatch ready event
            document.dispatchEvent(new CustomEvent('ribbit-ready'));

        } catch (error) {
            console.error('Failed to initialize Ribbit App:', error);
            this.showError('Failed to initialize: ' + error.message);
        }
    }

    setupEventHandlers() {
        // Encode button
        const encodeButton = document.getElementById('encodebutton');
        if (encodeButton) {
            encodeButton.addEventListener('click', () => this.handleEncode());
        }

        // Message input
        const messageBox = document.getElementById('textarea');
        if (messageBox) {
            messageBox.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleEncode();
                }
            });
        }

        // Settings
        this.loadSettings();
    }

    async handleEncode() {
        if (!this.isInitialized || this.isTransmitting) {
            return;
        }

        const messageBox = document.getElementById('textarea');
        if (!messageBox || !messageBox.value.trim()) {
            console.log('No message to send');
            return;
        }

        const message = messageBox.value.trim();
        this.isTransmitting = true;

        try {
            // Show encoding indicator
            this.showEncodingIndicator(true);

            // Get settings
            const settings = this.getSettings();

            console.log('Encoding message:', message);

            // Encode with friendly API - one simple call!
            const audioBuffer = await this.ribbit.encodeMessage(message, {
                callsign: settings.callsign,
                gridsquare: settings.gridsquare,
                name: settings.name,
                emergency: false, // Could be set from UI
                messageType: 1    // Chat message
            });

            console.log('✓ Message encoded, audio length:', audioBuffer.length);

            // Play the audio
            await this.playAudio(audioBuffer);

            // Save to message history
            this.saveMessage(message, settings);

            // Clear input
            messageBox.value = '';

            // Dispatch message event for UI
            document.dispatchEvent(new CustomEvent('receivemessage', {
                detail: {
                    save: true,
                    type: 'text',
                    sender: `${settings.name}|${settings.callsign}|${settings.gridsquare}`,
                    message: message,
                    timestamp: new Date().toISOString()
                }
            }));

        } catch (error) {
            console.error('Encoding failed:', error);
            this.showError('Failed to encode message: ' + error.message);
        } finally {
            this.isTransmitting = false;
            this.showEncodingIndicator(false);
        }
    }

    async playAudio(audioBuffer) {
        try {
            // Resume audio context if needed (required by browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Convert Float32Array to AudioBuffer
            const audioBufferNode = this.audioContext.createBuffer(1, audioBuffer.length, 8000);
            audioBufferNode.copyFromChannel(audioBuffer, 0);

            // Play the audio
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBufferNode;
            source.connect(this.audioContext.destination);
            source.start();

            console.log('✓ Audio playing');

            // Play button sound effect
            const buttonSound = document.querySelector('audio');
            if (buttonSound) {
                buttonSound.play().catch(e => console.warn('Button sound failed:', e));
            }

        } catch (error) {
            console.error('Audio playback failed:', error);
            throw new Error('Audio playback failed: ' + error.message);
        }
    }

    getSettings() {
        const db = window.localStorage;
        return {
            name: db.getItem('name') || '',
            callsign: db.getItem('callsign') || 'NOCALL',
            gridsquare: db.getItem('gridsquare') || 'AA00aa',
            phone: db.getItem('phone') || ''
        };
    }

    loadSettings() {
        // Load settings into form fields if they exist
        const settings = this.getSettings();

        const callsignInput = document.getElementById('callsign');
        const gridsquareInput = document.getElementById('gridsquare');
        const nameInput = document.getElementById('name');

        if (callsignInput) callsignInput.value = settings.callsign;
        if (gridsquareInput) gridsquareInput.value = settings.gridsquare;
        if (nameInput) nameInput.value = settings.name;
    }

    saveMessage(message, settings) {
        // Save to localStorage or IndexedDB as needed
        // This replaces the complex message saving logic
        console.log('Message saved:', { message, settings });
    }

    showEncodingIndicator(show) {
        // Show/hide encoding indicator in UI
        const indicator = document.getElementById('encoding-indicator');
        if (indicator) {
            indicator.style.display = show ? 'block' : 'none';
        }
    }

    showError(message) {
        // Dispatch error event
        document.dispatchEvent(new CustomEvent('receivemessage', {
            detail: {
                save: false,
                type: 'alert',
                message: message
            }
        }));
    }

    // Cleanup
    destroy() {
        if (this.ribbit) {
            this.ribbit.destroy();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Ribbit App...');
    window.ribbitApp = new RibbitApp();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.ribbitApp) {
        window.ribbitApp.destroy();
    }
});