"use strict";

/******************************************************************************
                                                                   --
                                                                --###--
                                           -----                -+#+##-
                                  --################+++---      -+#+##-
                                --##+--+#----------##+-###--    -+#+##-
                              --+##++++--++------+++----###---##++#+##---
                             -+##+++#-+#+--#+++##+++#-+#++##+##+###+#####-
                            -##+-+++#+--+##++---+++++##-+++###+--#+#+++###--
                           -+##-++#+++++++++++#+++++++++++++##++##++++#+###-
                   ---     -+#+-++#+#######++++++++########+###+##+---+#+##-
               --+######+--+###-++#-...-#++++####++++++++#+###+++#++++#++###--
              -+##++--++#####-+++++++++++++++++++++++++++##++++++#+#+##++--+#--
             -+##++++++---+##-++++##++++++++++++++++++++###++++++#+###+---+##--
             -##++++++++++++#-+++###++++++++++++++++++++####+++++#+#####++++#--
             -#####++#+++#+##+++++####++++++++++++++++####+++####+###++----+#--
             --####++####+##++++++######++++++++++++#####++++++#########+++##--
              -+####++######++++++####++++++++++++++#####++++++++##+-----+++--
               -+###+++######+++++#####+++++++++++++###++++++++++-+##--
                -+####++######+++++#####+++++++++++######+++#+++++-+##--
               --+#####+++####++++++#######+++++#######++++++++++++-+##-
             --##########++###+++++++###############++#################--
            -+##++##++###++##+++++++++++############+++###############--
           -+##++##++#++++###+++++++++++++##########++++++########----
      ------##########++######+++++++++#+++##+--########+++#++++###----
      -+########################+##+##################################-
       -+#+.........-##-...+#-+#####+..##.........-#-...-#..........##-
       --##..........##-...##+...---...+#-...---...##...+#-.........##--
       -+#+...###...-##-..-##-...###...+#-..-###...+#....#####...#####+-
       -##-...###...+##...-##..........##-.........+#+...#####...+#####-
       -##-.......-####...+##.--.+++.--+#---.++-...-##...#####...-##--#-
       -##....--.--.##+.-.###.-.+###.--+#---.###-.-.##.--+####----##- ---
      -+#+.-.###---.##---.##+.-.+###.--+#---.###+.-.##---+####+.-.##--
      -##----###.-.+##.---##+.--.-----.+#-----...--.+#----#####.-.+#+-
     --##.-.+##+.-.###....##--++###############++-.-##---.#####----##-
     --##.-.###-...-###########++++---------+++##########++####+--.##--
     -+#+.-.+########+-------                      -----+#######-..+##-
    -+##.+#####+---                                        ----########-
   -######+---                                                   ---####--
  -###---                                                            ---+--
 ----                                                                     -

    Ribbit - Development v0.1.0 (Updated WASM API)
    this is published to the development branch, releases are managed with tags
    https://github.com/ribbit-chat/ribbit
    There's no need to configure a radio or a server.
    Digital Signal Processing and core ribbit signal generation and decoding
    by Ahmet Inan <inan@aicodix.de>
    Web app by Alex Okita <alex@okita.io>
    Project management by Pierre <AlphaFan@pekt.org>
    Licensed under the MIT License, free to use and modify!
******************************************************************************/

// Import the new friendly WASM API
import { RibbitWASM } from './ribbit-wasm.js';

// Register Service Worker
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("./sw.js")
            .then((registration) => {
                console.log("ServiceWorker registration successful");
            })
            .catch((err) => {
                console.log("ServiceWorker registration failed: ", err);
            });
    });
}
const buttonPressSoundEffect = new Audio();
buttonPressSoundEffect.autoplay = true;
buttonPressSoundEffect.src =
    "data:audio/mpeg;base64,//OkxAAAAAAAAAAAAEluZm8AAAAPAAAAAwAABIAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq////////////////////////////////////////////AAAAOUxBTUUzLjEwMAF4AAAAAAAAAAAUYCQD+iIAAGAAAASA2xsiIQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OkxAA4rDKEAHsHkGgfYSMf8aCT8Tcl7rCcJwXBwY2dgIOJuLmccisbSVibiGEIOhkqxoeh6jQw0DQNAnBBBCAUgEAAVgHYEMB3AE4AHAFYGMXMTQI4A6AQAVAmBkMkR/Hw8iUSCQIgjn92zszXtEgAMA472MDAwPOWGCykzp2JYNAaCQeQmZmvfWGBgeUnW17mtr169/6LzsliGJZ/9KL17/0YWLHPowsWGB4scfv8zdevPzAwWLAAAAAAAA3OhwMDFuiInX0DgYGBgbn6In/1EL/0AxZxAAAQuv/XdAAAEJ//C3d3QviIiO7hwMW6KOUWE9g1Q/m9QrwkwmqE4XJBRNSWumKKphvBHhDkcpXEuwhIOUNSGpByhIRcR6Rb//OkxDA43DqMAnsNjESYQ4TYTYQoNUGqDVCbGirU6W0uKwT4TYyqWYS2i2hqQ1IuJOS3EGIUXJRCECQHlTTzK13DoShKiJQEgJCMffq17TkxWrTExPfZMRJEk962rvZOVq1atotW9lrNLjJaYnvHQlE5cur1rV/IKAgESJEkvP7a5EiRmdmcbXk0kSSeWOJEpk0iRnKqc9EiRKt8yRnHma///qvRJKqeZ/avMzNa5pFGc7VTmo5VTMtW///9iRIlVQSY2JMK6LMRkgBIyUFvL4iFOwP3Tkywocak+MSUPJCIZAE4hlQzNDYxOkqVCTniNSuZgYfRFoSRyFImDWJ5AK5grUny1qBtxUemRVKRfKaROsVuvMtHFmJokjTiyyj0//OkxF82PBm0pnsMvRaNSzXiSJI0CAwMo8xNSRpxwGYTQSInGmgR5BaJI044sxNSRE4ssw9BIiSNKKPMTUkacWXF4OCQYsyLUkROLKPdpo04sos0ouLzc/qWdrzamna43JZ4WicacKEgR6C0SRppR5BaJI0oo9BZEkJAjzzE1JETizIWCSoGTEFNRTMuMTAwqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";

// restore messages from localDB when DOM has loaded
document.addEventListener("DOMContentLoaded", (e) => {
    console.log("DOM Loaded.", e);
    const db = window.indexedDB;
    if (!db) {
        const errorMsg = "IndexedDB is not available.";
        console.error(errorMsg);
        const event = new CustomEvent("receivemessage", {
            detail: {
                save: false,
                type: "alert",
                message: errorMsg,
            },
        });
        document.dispatchEvent(event);
    } else {
        console.log("indexedDB Available!", db);
    }
    const request = db.open("ribbit", 1);
    request.onblocked = (e) => {
        console.error("blocked:", e);
    };
    // read stored messages
    request.onupgradeneeded = (e) => {
        const { result } = e.target;
        console.log("upgradeneeded:", result);
        const { objectStoreNames } = result;
        // Check if the object store already exists
        if (objectStoreNames.contains("messages")) {
            result.deleteObjectStore("messages");
            console.log("objectStoreNames:", objectStoreNames);
        }
        result.createObjectStore("messages", {
            keyPath: "timestamp",
            autoIncrement: true,
        });
    };
    request.onsuccess = (e) => {
        console.log("success", e);
        const { result } = e.target;

        // Check if the "messages" object store exists
        if (!result.objectStoreNames.contains("messages")) {
            console.log("Messages object store not found. Database may need initialization.");
            const messagecount = document.getElementById("messagecount");
            if (messagecount) {
                messagecount.value = "0";
            }
            return;
        }

        try {
            const transaction = result.transaction("messages", "readonly");
            const store = transaction.objectStore("messages");
            console.log("store:", store);
            console.log("store.indexNames", store.indexNames);

            if (transaction.objectStoreNames.length < 1) {
                console.log("No object stores found.");
                const event = new CustomEvent("receivemessage", {
                    detail: {
                        save: false,
                        type: "alert",
                        message: "No Messages Found.",
                    },
                });
                document.dispatchEvent(event);
                return;
            }

            const request = store.getAll();
            request.onsuccess = (e) => {
                const messages = e.target.result;
                console.log("messages:", messages);
                // update messagecounter
                const messagecount = document.getElementById("messagecount");
                if (!messagecount) {
                    const errorMsg = "Element #messagecount not found in DOM.";
                    console.error(errorMsg);
                    const event = new CustomEvent("receivemessage", {
                        detail: {
                            save: false,
                            type: "alert",
                            message: errorMsg,
                        },
                    });
                    document.dispatchEvent(event);
                    return;
                }
                messagecount.value = messages.length;
                messages.forEach((m) => {
                    const event = new CustomEvent("receivemessage", {
                        detail: {
                            save: false,
                            type: "text",
                            sender: m.sender,
                            message: m.message,
                            timestamp: m.timestamp,
                        },
                    });
                    document.dispatchEvent(event);
                });
            };
            request.onerror = (e) => {
                console.error("Error getting messages from IndexedDB:", e);
                const messagecount = document.getElementById("messagecount");
                if (messagecount) {
                    messagecount.value = "0";
                }
            };
        } catch (error) {
            console.error("Error accessing messages object store:", error);
            const messagecount = document.getElementById("messagecount");
            if (messagecount) {
                messagecount.value = "0";
            }
        }
    };
    console.log("request:", request);

    // Set up message display handler
    document.addEventListener("receivemessage", (e) => {
        const { detail } = e;
        const chat = document.getElementById("chat");
        if (!chat) return;

        const messageDiv = document.createElement("div");
        messageDiv.className = "message";

        if (detail.type === "decode-error") {
            // Special styling for decode errors
            messageDiv.classList.add("decode-error");
            messageDiv.innerHTML = `
                <div class="sender">
                    <span class="name" style="background: var(--warning, #ff9800);">⚠️ Decode Error</span>
                    <span class="time">${new Date(detail.timestamp).toLocaleTimeString()}</span>
                </div>
                <p style="background: rgba(255, 152, 0, 0.1); border-color: var(--warning, #ff9800);">
                    ${detail.message}
                </p>
            `;
        } else if (detail.type === "alert") {
            // Alert messages
            messageDiv.classList.add("alert");
            messageDiv.innerHTML = `
                <div class="sender">
                    <span class="name" style="background: var(--error, #d32f2f);">Alert</span>
                    <span class="time">${new Date(detail.timestamp || Date.now()).toLocaleTimeString()}</span>
                </div>
                <p style="background: rgba(211, 47, 47, 0.1); border-color: var(--error, #d32f2f);">
                    ${detail.message}
                </p>
            `;
        } else if (detail.type === "text") {
            // Regular text messages
            const isTx = detail.sender && detail.sender.includes(window.localStorage?.getItem("callsign") || "");
            if (isTx) {
                messageDiv.classList.add("tx");
            }

            const senderParts = detail.sender ? detail.sender.split("|") : ["Unknown", "", ""];
            messageDiv.innerHTML = `
                <div class="sender">
                    <span class="name">${senderParts[0] || "Unknown"} ${senderParts[1] ? `[${senderParts[1]}]` : ""} ${senderParts[2] ? `@${senderParts[2]}` : ""}</span>
                    <span class="time">${new Date(detail.timestamp || Date.now()).toLocaleTimeString()}</span>
                </div>
                <p>${detail.message || ""}</p>
            `;
        }

        chat.appendChild(messageDiv);
        chat.scrollTop = chat.scrollHeight;
    });

    // Initialize the Ribbit App with the new friendly WASM API
    class RibbitApp {
        constructor() {
            this.ribbit = null;
            this.audioContext = null;
            this.isInitialized = false;
            this.isTransmitting = false;
            this.listen = true;
            this.tx_context = null;
            this.savewavfile = false;
            this.initializationError = null;
            // Track decode errors to prevent spam
            this.decodeErrorHashes = new Set();
            this.decodeErrorTimes = new Map(); // Map of hash -> timestamp
            this.DECODE_ERROR_DEBOUNCE_MS = 5000; // Don't show same decode error within 5 seconds
            this.init();
        }

        async init() {
            try {
                console.log('Initializing Ribbit App...');

                // Set up WASM callbacks BEFORE loading
                // The WASM module calls fetchDecoded when it detects a decoded message
                // Store reference to 'this' for use in callback
                const appInstance = this;
                window.fetchDecoded = (payloadPtr) => {
                    // Don't process decode errors until app is fully initialized and listening
                    if (!appInstance.isInitialized || !appInstance.listen || !appInstance.ribbit) {
                        return;
                    }

                    // Process the decoded message asynchronously
                    appInstance.handleWasmDecodedMessage(payloadPtr).catch(error => {
                        console.warn('Error handling WASM decoded message:', error);
                    });
                };

                // Load WASM with one line - this is the magic!
                this.ribbit = await RibbitWASM.load();
                console.log('✓ WASM loaded successfully');

                // Initialize audio context
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: 8000
                });
                console.log('✓ Audio context initialized');

                // Set up UI event handlers
                this.setupEventHandlers();

                // Initialize real-time decoding
                this.setupRealTimeDecoding();

                this.isInitialized = true;
                console.log('✓ Ribbit App ready!');

                // Dispatch ready event
                document.dispatchEvent(new CustomEvent('ribbit-ready'));

            } catch (error) {
                console.error('Failed to initialize Ribbit App:', error);
                this.initializationError = error.message;
                this.showError('Failed to initialize: ' + error.message);
            }
        }

        setupEventHandlers() {
            // Message input
            const messagebox = document.getElementById("textarea");
            if (messagebox) {
                messagebox.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.handleEncode();
                    }
                });

                const resizeviewport = () => {
                    if (!window.visualViewport) return;
                    const { height } = window.visualViewport;
                    setTimeout(() => {
                        // console.log(window.visualViewport, h);
                    }, 250);
                };
                window.addEventListener("resize", resizeviewport);
                messagebox.onfocus = resizeviewport;
                messagebox.onblur = resizeviewport;
            }

            // Encode button
            const encodebutton = document.getElementById("encodebutton");
            if (encodebutton) {
                encodebutton.onclick = () => {
                    // First click enables audio, second click encodes
                    if (!this.tx_context) {
                        this.enableAudioOutput();
                    } else {
                        this.handleEncode();
                    }
                };
            }

            // Save WAV button
            const savewav = document.getElementById("savewav");
            if (savewav) {
                savewav.onclick = () => this.saveToWav();
            }
        }

        enableAudioOutput() {
            try {
                this.tx_context = this.tx_context || new AudioContext({ sampleRate: 8000 });
                buttonPressSoundEffect.play();

                // Now set up the actual encode handler
                const encodebutton = document.getElementById("encodebutton");
                if (encodebutton) {
                    encodebutton.onclick = () => this.handleEncode();
                }
            } catch (err) {
                const errorMsg = "Failed to create AudioContext: " + err;
                console.error(errorMsg);
                this.showError(errorMsg);
            }
        }

        async handleEncode() {
            if (!this.isInitialized || this.isTransmitting) {
                return;
            }

            const messagebox = document.getElementById("textarea");
            if (!messagebox || !messagebox.value.trim()) {
                console.log("no message to send");
                return;
            }

            // Check if required settings are complete
            const settings = this.getSettings();
            if (!settings.name || !settings.callsign || !settings.gridsquare ||
                settings.name.trim().length === 0 ||
                settings.callsign.trim().length === 0 ||
                settings.gridsquare.trim().length < 6) {
                this.showError('Please complete your settings (Name, Callsign, and Grid Square) before encoding messages.');
                // Open settings if not already open
                if (typeof openSettings === 'function') {
                    openSettings();
                }
                return;
            }

            // Suspend audio listening before encoding
            this.listen = false;
            console.log('Audio listening suspended for transmission');

            const message = messagebox.value.trim();
            this.isTransmitting = true;

            try {
                console.log('Encoding message:', message);

                // Use the new friendly API with just the message text
                // The metadata (callsign, grid, etc.) is handled by the options
                const audioBuffer = await this.ribbit.encodeMessage(message, {
                    callsign: settings.callsign,
                    gridsquare: settings.gridsquare,
                    name: settings.name,
                    emergency: false,
                    messageType: 1
                });

                console.log('✓ Message encoded, audio length:', audioBuffer.length);
                console.log('✓ Message encoded, audio bit array 2 content:', audioBuffer);
                // check if the audio buffer is valid by checking values in the buffer
                // if all of the values are 0 then we had an encoding problem
                if (audioBuffer.every(value => value === 0)) {
                    this.showError('Failed to encode message: audio buffer is silent');
                    return;
                }
                // Save to message history for display
                const header = `${settings.name}|${settings.callsign}|${settings.gridsquare}`;
                const fullMessage = `${header}&=${message}`;
                this.saveMessage(fullMessage);

                // Clear input
                messagebox.value = '';

                // Play the audio
                await this.playAudio(audioBuffer);

            } catch (error) {
                console.error('Encoding failed:', error);
                this.showError('Failed to encode message: ' + error.message);
                // Resume listening even if encoding fails
                this.listen = true;
                console.log('Audio listening resumed after encoding error');
            } finally {
                this.isTransmitting = false;
            }
        }

        async playAudio(audioBuffer) {
            try {
                // Resume audio context if needed
                if (this.tx_context.state === 'suspended') {
                    await this.tx_context.resume();
                    console.log('✓ Audio context resumed');
                }

                // Add a wake-up tone to ensure radio transmitters open the channel
                // Tone: 300Hz for 200ms, then 100ms silence
                const sampleRate = 8000;
                const toneFreq = 300;
                const toneDuration = 0.2; // 200ms
                const silenceDuration = 0.1; // 100ms

                const toneSamples = Math.floor(toneDuration * sampleRate);
                const silenceSamples = Math.floor(silenceDuration * sampleRate);
                const totalExtraSamples = toneSamples + silenceSamples;

                const extendedBuffer = new Float32Array(totalExtraSamples + audioBuffer.length);

                // Generate 300Hz wake-up tone
                // 300Hz at 8000Hz SR for 1600 samples is exactly 60 cycles, ending at zero crossing.
                for (let i = 0; i < toneSamples; i++) {
                    extendedBuffer[i] = Math.sin(2 * Math.PI * toneFreq * i / sampleRate);
                }

                // Silence (next silenceSamples are already 0)

                // Copy original encoded message audio
                extendedBuffer.set(audioBuffer, totalExtraSamples);

                // Create Web Audio buffer from the result
                console.log('✓ Creating Web Audio buffer from result', extendedBuffer);
                const audioBufferNode = this.tx_context.createBuffer(1, extendedBuffer.length, sampleRate);
                console.log('✓ Web Audio buffer created', audioBufferNode);
                audioBufferNode.copyFromChannel(extendedBuffer, 0);
                console.log('✓ Web Audio buffer copied');

                // Play the audio
                console.log('✓ Creating audio source');
                const source = this.tx_context.createBufferSource();
                console.log('✓ Audio source created', source);
                source.buffer = audioBufferNode;
                console.log('✓ Audio source buffer set', audioBufferNode);
                source.connect(this.tx_context.destination);
                console.log('✓ Audio source connected to destination', this.tx_context.destination);

                // Set up end handler to resume listening after playback completes
                source.onended = () => {
                    if (this.savewavfile) {
                        console.log('✓ Saving audio to file');
                        this.saveWavFile(audioBufferNode, "ribbit.wav");
                        console.log('✓ Audio saved to file');
                        this.savewavfile = false;
                    }
                    // Resume audio listening after playback completes
                    this.listen = true;
                    console.log('✓ Audio playback completed, listening resumed');
                };

                // Set up error handler to resume listening if playback fails
                source.onerror = (error) => {
                    console.error('Audio playback error:', error);
                    this.listen = true;
                    console.log('✓ Audio listening resumed after playback error');
                };

                source.start();
                console.log('✓ Audio source started');
                // Note: this.listen is already set to false in handleEncode() before encoding starts

                console.log('✓ Audio playing through speakers');

            } catch (error) {
                console.error('Audio playback failed:', error);
                // Resume listening even if playback fails
                this.listen = true;
                console.log('✓ Audio listening resumed after playback failure');
                throw new Error('Audio playback failed: ' + error.message);
            }
        }

        saveToWav() {
            this.savewavfile = true;
            // The actual saving happens in the audio end handler
        }

        saveWavFile(buffer, filename) {
            // Save WAV file functionality (kept from original)
            const length = buffer.length;
            const arrayBuffer = new ArrayBuffer(44 + length * 2);
            const view = new DataView(arrayBuffer);

            // WAV header
            const writeString = (offset, string) => {
                for (let i = 0; i < string.length; i++) {
                    view.setUint8(offset + i, string.charCodeAt(i));
                }
            };

            writeString(0, 'RIFF');
            view.setUint32(4, 36 + length * 2, true);
            writeString(8, 'WAVE');
            writeString(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, 1, true);
            view.setUint32(24, 8000, true);
            view.setUint32(28, 8000 * 2, true);
            view.setUint16(32, 2, true);
            view.setUint16(34, 16, true);
            writeString(36, 'data');
            view.setUint32(40, length * 2, true);

            // Audio data
            const channelData = buffer.getChannelData(0);
            let offset = 44;
            for (let i = 0; i < length; i++) {
                const sample = Math.max(-1, Math.min(1, channelData[i]));
                view.setInt16(offset, sample * 32767, true);
                offset += 2;
            }

            // Create download
            const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        async handleWasmDecodedMessage(payloadPtr) {
            // This is called by the WASM module when it detects a decoded message via fetchDecoded callback
            // Don't process if app isn't initialized or not listening
            if (!this.isInitialized || !this.ribbit || !this.listen) {
                return;
            }

            try {
                // Get payload from WASM memory
                const payloadLength = this.ribbit.module._payload_length();
                if (payloadLength === 0) {
                    return;
                }

                // Copy payload data
                const payloadView = new Uint8Array(
                    this.ribbit.module.HEAPU8.buffer,
                    payloadPtr || this.ribbit.module._payload_pointer(),
                    payloadLength
                );
                const payloadBytes = new Uint8Array(payloadView);

                // Ignore empty or all-zero payloads (likely initialization artifacts)
                const hasNonZero = payloadBytes.some(byte => byte !== 0);
                if (!hasNonZero) {
                    return;
                }

                // Decode using MessageCodec
                const decoded = this.ribbit.codec.DecodeMessage(payloadBytes);

                if (decoded) {
                    // Use the same validation logic as setupRealTimeDecoding
                    const isValidDecodedMessage = (decoded) => {
                        if (!decoded) return false;
                        if (typeof decoded.callsign !== 'string' || typeof decoded.message !== 'string') {
                            return false;
                        }
                        const hasNullBytes = (str) => str && str.includes('\u0000');
                        if (hasNullBytes(decoded.callsign) || hasNullBytes(decoded.message)) {
                            return false;
                        }
                        if (!decoded.callsign || decoded.callsign.trim().length === 0 || decoded.callsign.length > 20) {
                            return false;
                        }
                        const callsignRegex = /^[A-Z0-9/]+$/i;
                        if (!callsignRegex.test(decoded.callsign.trim())) {
                            return false;
                        }
                        if (!decoded.message || decoded.message.trim().length === 0 || decoded.message.length > 1000) {
                            return false;
                        }
                        const nonPrintableRegex = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/g;
                        const nonPrintableCount = (decoded.message.match(nonPrintableRegex) || []).length;
                        if (nonPrintableCount > decoded.message.length * 0.1) {
                            return false;
                        }
                        if (decoded.message.includes('\uFFFD') || decoded.callsign.includes('\uFFFD')) {
                            return false;
                        }
                        return true;
                    };

                    if (!isValidDecodedMessage(decoded)) {
                        // Create hash from payload to identify duplicate decode errors
                        // Use more of the payload for better uniqueness (first 64 bytes)
                        const payloadHash = Array.from(payloadBytes.slice(0, Math.min(64, payloadBytes.length)))
                            .map(b => b.toString(16).padStart(2, '0'))
                            .join('');

                        const now = Date.now();
                        const lastErrorTime = this.decodeErrorTimes.get(payloadHash) || 0;

                        // Only show decode error if we haven't seen this exact payload recently
                        if (now - lastErrorTime > this.DECODE_ERROR_DEBOUNCE_MS) {
                            // Update tracking
                            this.decodeErrorTimes.set(payloadHash, now);

                            // Clean up old entries (keep only last 100)
                            if (this.decodeErrorTimes.size > 100) {
                                const oldestHash = Array.from(this.decodeErrorTimes.entries())
                                    .sort((a, b) => a[1] - b[1])[0][0];
                                this.decodeErrorTimes.delete(oldestHash);
                            }

                            // Only show decode error if we're actually listening (not during initialization)
                            if (this.listen && this.isInitialized) {
                                // Show decode error in UI
                                const failedDecodeEvent = new CustomEvent("receivemessage", {
                                    detail: {
                                        save: false,
                                        type: "decode-error",
                                        message: "Message received but could not be decoded",
                                        timestamp: new Date().toISOString(),
                                    },
                                });
                                document.dispatchEvent(failedDecodeEvent);
                            }
                        }
                        return;
                    }

                    // Valid message - process it
                    const decodedResult = {
                        text: decoded.message,
                        callsign: decoded.callsign,
                        gridsquare: decoded.gridsquare,
                        name: decoded.name || '',
                        timestamp: decoded.timestamp
                    };

                    console.log("Received (from WASM fetchDecoded callback):", decodedResult.callsign, decodedResult.text);

                    const fullMessage = `${decodedResult.name || ''}|${decodedResult.callsign}|${decodedResult.gridsquare || ''}&=${decodedResult.text}`;

                    const event = new CustomEvent("receivemessage", {
                        detail: {
                            save: true,
                            type: "text",
                            sender: `${decodedResult.name || ''}|${decodedResult.callsign}|${decodedResult.gridsquare || ''}`,
                            message: decodedResult.text,
                            timestamp: new Date().toISOString(),
                        },
                    });
                    document.dispatchEvent(event);
                }
            } catch (error) {
                console.warn('Error processing WASM decoded message:', error);
            }
        }

        setupRealTimeDecoding() {
            const mediaConstraints = {
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
                video: false,
            };

            // Track last decoded message to prevent duplicates
            let lastDecodedHash = null;
            let lastDecodeTime = 0;
            const DEBOUNCE_MS = 2000; // Don't process same message within 2 seconds

            // Track invalid message hashes to prevent repeated processing
            const invalidMessageHashes = new Set();
            const INVALID_MESSAGE_TTL = 5000; // Remember invalid messages for 5 seconds

            // Track decode errors to prevent spam (shared with handleWasmDecodedMessage)
            const decodeErrorHashes = this.decodeErrorHashes;
            const decodeErrorTimes = this.decodeErrorTimes;
            const DECODE_ERROR_DEBOUNCE_MS = this.DECODE_ERROR_DEBOUNCE_MS;

            // Helper function to validate decoded message
            const isValidDecodedMessage = (decoded) => {
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

                // Validate callsign format - should only contain alphanumeric characters and common callsign separators
                // Valid callsign format: letters/numbers, may contain / for portable/mobile designators
                const callsignRegex = /^[A-Z0-9/]+$/i;
                if (!callsignRegex.test(decoded.callsign.trim())) {
                    return false;
                }

                // Check if text is reasonable (not empty, reasonable length)
                if (!decoded.text || decoded.text.trim().length === 0 || decoded.text.length > 1000) {
                    return false;
                }

                // Check for garbled text (too many non-printable characters or replacement characters)
                const nonPrintableRegex = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/g;
                const nonPrintableCount = (decoded.text.match(nonPrintableRegex) || []).length;
                if (nonPrintableCount > decoded.text.length * 0.1) { // More than 10% non-printable
                    return false;
                }

                // Check for replacement characters (�) which indicate decoding errors
                if (decoded.text.includes('\uFFFD') || decoded.callsign.includes('\uFFFD')) {
                    return false;
                }

                return true;
            };

            // Helper function to create hash of decoded message
            const createMessageHash = (decoded) => {
                return `${decoded.callsign}|${decoded.text}`.substring(0, 100);
            };

            navigator.mediaDevices
                .getUserMedia(mediaConstraints)
                .then((stream) => {
                    const rx_context = new AudioContext({ sampleRate: 8000 });
                    const source = rx_context.createMediaStreamSource(stream);
                    const processor = rx_context.createScriptProcessor(2048, 1, 1);

                    processor.onaudioprocess = async (event) => {
                        if (!this.listen || !this.ribbit) {
                            return;
                        }

                        try {
                            const inputData = event.inputBuffer.getChannelData(0);

                            // Use the new friendly API for decoding
                            const decoded = await this.ribbit.decodeAudio(inputData);

                            if (decoded) {
                                // Create hash for duplicate/invalid checking
                                const messageHash = createMessageHash(decoded);

                                // Check if this is a known invalid message
                                if (invalidMessageHashes.has(messageHash)) {
                                    // Skip known invalid messages
                                    return;
                                }

                                // Validate the decoded message BEFORE logging
                                if (!isValidDecodedMessage(decoded)) {
                                    // Mark as invalid and skip
                                    invalidMessageHashes.add(messageHash);
                                    // Clean up old invalid hashes after TTL
                                    setTimeout(() => {
                                        invalidMessageHashes.delete(messageHash);
                                    }, INVALID_MESSAGE_TTL);

                                    // Create hash from decoded data to identify duplicate decode errors
                                    const errorHash = messageHash; // Reuse the message hash
                                    const now = Date.now();
                                    const lastErrorTime = decodeErrorTimes.get(errorHash) || 0;

                                    // Only show decode error if we haven't seen this exact message recently
                                    if (now - lastErrorTime > DECODE_ERROR_DEBOUNCE_MS) {
                                        // Update tracking
                                        decodeErrorTimes.set(errorHash, now);

                                        // Clean up old entries (keep only last 100)
                                        if (decodeErrorTimes.size > 100) {
                                            const oldestHash = Array.from(decodeErrorTimes.entries())
                                                .sort((a, b) => a[1] - b[1])[0][0];
                                            decodeErrorTimes.delete(oldestHash);
                                        }

                                        // Show UI notification that a message was received but failed to decode
                                        const failedDecodeEvent = new CustomEvent("receivemessage", {
                                            detail: {
                                                save: false,
                                                type: "decode-error",
                                                message: "Message received but could not be decoded",
                                                timestamp: new Date().toISOString(),
                                            },
                                        });
                                        document.dispatchEvent(failedDecodeEvent);
                                    }
                                    return;
                                }

                                // Check for duplicate messages (debounce)
                                const now = Date.now();
                                if (messageHash === lastDecodedHash && (now - lastDecodeTime) < DEBOUNCE_MS) {
                                    // Same message within debounce period, skip it
                                    return;
                                }

                                // Update tracking
                                lastDecodedHash = messageHash;
                                lastDecodeTime = now;

                                // Only log valid, unique messages
                                console.log("Received:", decoded.callsign, decoded.text);

                                // Validate message format (same as before)
                                const fullMessage = `${decoded.name || ''}|${decoded.callsign}|${decoded.gridsquare || ''}&=${decoded.text}`;

                                const event = new CustomEvent("receivemessage", {
                                    detail: {
                                        save: true,
                                        type: "text",
                                        sender: `${decoded.name || ''}|${decoded.callsign}|${decoded.gridsquare || ''}`,
                                        message: decoded.text,
                                        timestamp: new Date().toISOString(),
                                    },
                                });
                                document.dispatchEvent(event);
                            }
                        } catch (error) {
                            console.warn('Decoding error:', error);
                        }
                    };

                    source.connect(processor);
                    processor.connect(rx_context.destination);
                })
                .catch((err) => {
                    const errorMsg = "Failed to access microphone: " + err;
                    console.error(errorMsg);
                    this.showError(errorMsg);
                });
        }

        getSettings() {
            const db = window.localStorage;
            const name = db.getItem("name") || db.getItem("operatorName") || '';
            const callsign = db.getItem("callsign") || '';
            const gridsquare = db.getItem("gridsquare") || '';
            return {
                name: name,
                callsign: callsign,
                gridsquare: gridsquare,
                phone: db.getItem("phone") || ''
            };
        }

        saveMessage(fullMessage) {
            // Save message for display (same format as before)
            const parts = fullMessage.split("&=");
            if (parts.length === 2) {
                const event = new CustomEvent("receivemessage", {
                    detail: {
                        save: true,
                        type: "text",
                        sender: parts[0],
                        message: parts[1],
                        timestamp: new Date().toISOString(),
                    },
                });
                // Small delay to simulate transmission time
                setTimeout(() => document.dispatchEvent(event), 1600);
            }
        }

        showError(message) {
            const event = new CustomEvent("receivemessage", {
                detail: {
                    save: false,
                    type: "alert",
                    message: message
                }
            });
            document.dispatchEvent(event);
        }

        destroy() {
            if (this.ribbit) {
                this.ribbit.destroy();
            }
            if (this.audioContext) {
                this.audioContext.close();
            }
        }
    }

    // Initialize the app
    const ribbitApp = new RibbitApp();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (ribbitApp) {
            ribbitApp.destroy();
        }
    });
});
// header format
// The custom character tables are:
// 4bit (0-9)
// 5bit (A-Z, -, space)
// 6bit (0-9,A-Z, -, space)
// Callsign is 8 character long to accommodate all countries.
// Location is encoded as Gridsquare8.
// Name is limited to 16+16 characters.
// Year/month is a number starting Jan2025
// Time is a number starting on 1st of the month with a 14h offset to account
// for the date change time zone line. Each 2sec increment is a unit.
// 30 (2sec)x60minx24hx31.5 days
