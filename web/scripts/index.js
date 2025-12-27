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
            this.init();
        }

        async init() {
            try {
                console.log('Initializing Ribbit App...');

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
            if (!this.isInitialized || this.isTransmitting || !this.listen) {
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

            const message = messagebox.value.trim();
            this.isTransmitting = true;

            try {
                console.log('Encoding message:', message);

                // Create the message format (same as before for compatibility)
                const header = `${settings.name}|${settings.callsign}|${settings.gridsquare}|${settings.phone}`;
                const fullMessage = `${header}&=${message}`;

                // Use the new friendly API - this is so much simpler!
                const audioBuffer = await this.ribbit.encodeMessage(fullMessage, {
                    callsign: settings.callsign,
                    gridsquare: settings.gridsquare,
                    name: settings.name,
                    emergency: false,
                    messageType: 1
                });

                console.log('✓ Message encoded, audio length:', audioBuffer.length);

                // Save to message history
                this.saveMessage(fullMessage);

                // Clear input
                messagebox.value = '';

                // Play the audio
                await this.playAudio(audioBuffer);

            } catch (error) {
                console.error('Encoding failed:', error);
                this.showError('Failed to encode message: ' + error.message);
            } finally {
                this.isTransmitting = false;
            }
        }

        async playAudio(audioBuffer) {
            try {
                // Resume audio context if needed
                if (this.tx_context.state === 'suspended') {
                    await this.tx_context.resume();
                }

                // Create Web Audio buffer from the result
                const audioBufferNode = this.tx_context.createBuffer(1, audioBuffer.length, 8000);
                audioBufferNode.copyFromChannel(audioBuffer, 0);

                // Play the audio
                const source = this.tx_context.createBufferSource();
                source.buffer = audioBufferNode;
                source.connect(this.tx_context.destination);

                // Set up end handler
                source.onended = () => {
                    if (this.savewavfile) {
                        this.saveWavFile(audioBufferNode, "ribbit.wav");
                        this.savewavfile = false;
                    }
                    this.listen = true;
                };

                source.start();
                this.listen = false; // Don't listen while transmitting

                console.log('✓ Audio playing');

            } catch (error) {
                console.error('Audio playback failed:', error);
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

        setupRealTimeDecoding() {
            const mediaConstraints = {
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
                video: false,
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
                                console.log("Received:", decoded.callsign, decoded.text);

                                // Validate message format (same as before)
                                const fullMessage = `${decoded.name}|${decoded.callsign}|${decoded.gridsquare}&=${decoded.text}`;

                                const event = new CustomEvent("receivemessage", {
                                    detail: {
                                        save: true,
                                        type: "text",
                                        sender: `${decoded.name}|${decoded.callsign}|${decoded.gridsquare}`,
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
