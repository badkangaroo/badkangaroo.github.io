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

    Ribbit - Development v0.1.0
    this is published to the development branch, releases are managed with tags
    https://github.com/ribbit-chat/ribbit
    There's no need to configure a radio or a server.
    Digital Signal Processing and core ribbit signal generation and decoding
    by Ahmet Inan <inan@aicodix.de>
    Web app by Alex Okita <alex@okita.io>
    Project management by Pierre <AlphaFan@pekt.org>
    Licensed under the MIT License, free to use and modify!
******************************************************************************/

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
    };
    console.log("request:", request);
    let loadPromise = new Promise((resolve, reject) => {
        fetch("./scripts/ribbit.wasm", { credentials: "same-origin" })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to load ribbit.wasm");
                }
                return response.arrayBuffer();
            })
            .then((binary) => {
                return WebAssembly.instantiate(binary, {
                    env: wasmImports,
                    wasi_snapshot_preview1: wasmImports,
                });
            })
            .then((result) => {
                wasmExports = result.instance.exports;
                wasmMemory = wasmExports.memory;
                updateMemoryViews();
                resolve({ wasmExports, wasmMemory });
            })
            .catch((err) => {
                console.error("Failed to load WASM:", err);
                reject(err);
            });
    });
    const mediaConstraints = {
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
        },
        video: false,
    };
    loadPromise
        .then((moduleInstance) => {
            const { wasmExports, wasmMemory } = moduleInstance;
            const init = () => {
                const _buffer = wasmMemory.buffer;
                // the array used to feed the decoder
                const FEED_POINTER = wasmExports["feed_pointer"]();
                const FEED_LENGTH =
                    wasmExports["feed_length"]() *
                    Float32Array.BYTES_PER_ELEMENT;
                const _feed = new Float32Array(
                    _buffer,
                    FEED_POINTER,
                    FEED_LENGTH
                );
                // bytes decoded by decoder
                const PAYLOAD_POINTER = wasmExports["payload_pointer"]();
                const PAYLOAD_LENGTH =
                    wasmExports["payload_length"]() *
                    Uint8Array.BYTES_PER_ELEMENT;
                const _payload = new Uint8Array(
                    _buffer,
                    PAYLOAD_POINTER,
                    PAYLOAD_LENGTH
                );
                // bytes to send to the encoder
                const MESSAGE_POINTER = wasmExports["message_pointer"]();
                const MESSAGE_LENGTH =
                    wasmExports["message_length"]() *
                    Uint8Array.BYTES_PER_ELEMENT;
                const _message = new Uint8Array(
                    _buffer,
                    MESSAGE_POINTER,
                    MESSAGE_LENGTH
                );
                // audio signal from the encoder
                const SIGNAL_POINTER = wasmExports["signal_pointer"]();
                const SIGNAL_LENGTH =
                    wasmExports["signal_length"]() *
                    Float32Array.BYTES_PER_ELEMENT;
                const _signalbuffer = new Float32Array(
                    _buffer,
                    SIGNAL_POINTER,
                    SIGNAL_LENGTH
                );
                // required in a browser since google decided that nobody
                // should enable audio on a web page until the user
                // has interacted with it in some way.
                // ignore self transmission
                var listen = true;
                // text to convert
                const messagebox = document.getElementById("textarea");
                if (!messagebox) {
                    const errorMsg = "Element #textarea not found in DOM.";
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
                const resizeviewport = () => {
                    // For the rare legacy browsers that don't support it
                    if (!window.visualViewport) {
                        return;
                    }
                    const { height } = window.visualViewport;
                    const h = height;
                    setTimeout(() => {
                        // console.log(window.visualViewport, h);
                    }, 250);
                };
                window.addEventListener("resize", resizeviewport);
                messagebox.onfocus = resizeviewport;
                messagebox.onblur = resizeviewport;
                messagebox.oninput = (input) => {
                    console.log("input", input);
                };
                // button to trigger encoding
                const encodebutton = document.getElementById("encodebutton");
                if (!encodebutton) {
                    const errorMsg = "Element #encodebutton not found in DOM.";
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
                const encodemessage = () => {
                    // don't send a blank message.
                    if (messagebox.value.length < 1) {
                        console.log("no message to send");
                        return;
                    }
                    // don't send a message while transmitting.
                    if (!listen) {
                        return;
                    }
                    const db = window.localStorage;
                    if (!db) {
                        const errorMsg = "Local Storage is not available.";
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
                    const name = db.getItem("name");
                    const callsign = db.getItem("callsign");
                    const gridsquare = db.getItem("gridsquare");
                    const phone = db.getItem("phone");
                    const header = `${name}|${callsign}|${gridsquare}|${phone}`;
                    const str = `${header}&=${messagebox.value}`;

                    let encoding = new TextEncoder().encode(str);
                    console.log("encoded:", str);
                    const event = new CustomEvent("receivemessage", {
                        detail: {
                            save: true,
                            type: "text",
                            sender: str.split("&=")[0],
                            message: str.split("&=")[1],
                            timestamp: new Date().toUTCString(),
                        },
                    });
                    setTimeout(() => {
                        document.dispatchEvent(event);
                    }, 1600);

                    // Zero out the buffer first
                    _message.fill(0);
                    // Only copy up to the buffer size
                    const copyLength = Math.min(encoding.length, MESSAGE_LENGTH);
                    for (let i = 0; i < copyLength; i++) {
                        _message[i] = encoding[i];
                    }
                    if (encoding.length > MESSAGE_LENGTH) {
                        console.warn("Message truncated: input is longer than MESSAGE_LENGTH");
                    }
                    if (!wasmExports || !wasmExports["initEncoder"]) {
                        const errorMsg = "WASM exports missing required functions.";
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
                    wasmExports["initEncoder"]();
                    console.log(
                        "encoding message:",
                        wasmExports["initEncoder"] === undefined
                            ? "failed"
                            : "success"
                    );
                    // clear message box for next message.
                    messagebox.value = "";
                };
                var tx_context;
                var savewavfile = false;
                encodebutton.onclick = () => {
                    const db = window.localStorage;
                    // enable audio output
                    // after playing the audio, encode the message.
                    encodebutton.onclick = encodemessage;
                    try {
                        tx_context = tx_context || new AudioContext({ sampleRate: 8000 });
                    } catch (err) {
                        const errorMsg = "Failed to create AudioContext: " + err;
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
                    buttonPressSoundEffect.play();
                };
                const savewav = document.getElementById("savewav");
                if (!savewav) {
                    const errorMsg = "Element #savewav not found in DOM.";
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
                const saveToWav = () => {
                    savewavfile = true;
                    tx_context =
                        tx_context || new AudioContext({ sampleRate: 8000 });
                    const str = messagebox.value;
                    let encoding = new TextEncoder().encode(str);
                    console.log("encoded:", encoding);
                    for (let i = 0; i < MESSAGE_LENGTH; i++) {
                        _message[i] = encoding[i];
                    }
                    wasmExports["initEncoder"]();
                    console.log(
                        "encoding message:",
                        wasmExports["initEncoder"] === undefined
                            ? "failed"
                            : "success"
                    );
                };
                savewav.onclick = saveToWav;
                navigator.mediaDevices
                    .getUserMedia(mediaConstraints)
                    .then((stream) => {
                        const rx_context = new AudioContext({
                            sampleRate: 8000,
                        });
                        const source =
                            rx_context.createMediaStreamSource(stream);
                        const streamsize = 2048;
                        const processor = rx_context.createScriptProcessor(
                            streamsize,
                            1,
                            1
                        );
                        source.connect(processor);
                        processor.connect(rx_context.destination);
                        // process audio
                        processor.onaudioprocess = (audio) => {
                            const { inputBuffer, playbackTime, timeStamp } =
                                audio;
                            const { duration, length, sampleRate } =
                                inputBuffer;
                            const input = inputBuffer.getChannelData(0);
                            for (let i = 0; i < length; i++) {
                                _feed[i] = listen ? input[i] : 0;
                            }
                            // Use optimized version if enabled in settings
                            const useOptimized = window.localStorage.getItem("useOptimizedDigest") === "true";
                            if (useOptimized) {
                                wasmExports["digestFeedOptimized"]();
                            } else {
                                wasmExports["digestFeed"]();
                            }
                        };
                    })
                    .catch((err) => {
                        const errorMsg = "getUserMedia failed: " + err;
                        console.error(errorMsg);
                        const event = new CustomEvent("receivemessage", {
                            detail: {
                                save: false,
                                type: "alert",
                                message: errorMsg,
                            },
                        });
                        document.dispatchEvent(event);
                    });
                window.initEncoded = () => {
                    wasmExports["readEncoder"]();
                };
                window.readEncoded = (e) => {
                    const signal = tx_context.createBuffer(1, e, 8000);
                    const bufferSouce = tx_context.createBufferSource();
                    bufferSouce.buffer = signal;
                    for (let i = 0; i < e; i++) {
                        signal.getChannelData(0)[i] = _signalbuffer[i];
                    }
                    listen = false;
                    if (savewavfile) {
                        savewavfile = false;
                        const wav = audioBufferToWav(bufferSouce.buffer);
                        const url = window.URL.createObjectURL(
                            new Blob([wav], { type: "audio/wav;" })
                        );
                        const link = document.createElement("a");
                        link.href = url;
                        link.setAttribute("download", "audio.wav"); //or any other extension
                        document.body.appendChild(link);
                        link.click();
                        setTimeout(() => {
                            revokeObjectURL(url);
                        }, 3000);
                        return;
                    }
                    console.log(e, tx_context, signal, bufferSouce);
                    bufferSouce.connect(tx_context.destination);
                    bufferSouce.start();
                    bufferSouce.onended = () => (listen = true);
                };
                window.fetchDecoded = (result) => {
                    // If the decoder result is negative, show CRC failure in chat and return
                    if (typeof result === "number" && result < 0) {
                        const errorMsg = "Message failed CRC check and was rejected.";
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
                    console.log("payload", _payload);
                    const decoder = new TextDecoder();
                    // Trim trailing nulls from _payload before decoding
                    let end = _payload.length;
                    while (end > 0 && _payload[end - 1] === 0) end--;
                    const str = decoder.decode(_payload.subarray(0, end));
                    console.log("decoded:", str);

                    // Helper for error reporting
                    function showDecodeError(msg) {
                        console.error(msg);
                        const event = new CustomEvent("receivemessage", {
                            detail: {
                                save: false,
                                type: "alert",
                                message: "Decoding error: " + msg,
                            },
                        });
                        document.dispatchEvent(event);
                    }

                    // 1. Check for replacement character
                    if (str.includes("")) {
                        showDecodeError("Message contains invalid characters.");
                        return;
                    }
                    // 2. Check for expected structure
                    const parts = str.split("&=");
                    if (parts.length !== 2) {
                        showDecodeError("Malformed message: missing '&=' separator.");
                        return;
                    }
                    const headerFields = parts[0].split("|");
                    if (headerFields.length !== 4) {
                        showDecodeError("Malformed header: expected 4 fields.");
                        return;
                    }
                    // 3. Check for non-printable characters in the message
                    const nonPrintable = /[^\x20-\x7E\r\n\t]/g;
                    if (nonPrintable.test(parts[1])) {
                        showDecodeError("Message contains non-printable characters.");
                        return;
                    }

                    const sender = parts[0];
                    const message = parts[1];
                    if (sender && message) {
                        const event = new CustomEvent("receivemessage", {
                            detail: {
                                save: true,
                                type: "text",
                                sender: sender,
                                message: message,
                                timestamp: new Date().toUTCString(),
                            },
                        });
                        document.dispatchEvent(event);
                    } else {
                        const event = new CustomEvent("receivemessage", {
                            detail: {
                                save: true,
                                type: "text",
                                sender: "unknown",
                                callsign: "000",
                                gridsquare: "unknown",
                                phone: "unknown",
                                message: str,
                                timestamp: new Date().toUTCString(),
                            },
                        });
                        document.dispatchEvent(event);
                    }
                };
                window.encoderCreated = () => {
                    console.log("Encoder Created!");
                };
                window.decoderCreated = () => {
                    console.log("Decoder Created!");
                };
                window.mainCalled = () => {
                    console.log("Initalization Complete!");
                };
                // check if we should open the settings panel
                // the localStorage has fields for name, callsign, gridsquare, and phone.
                // if any of these fields are missing, open the settings panel.
                const db = window.localStorage;
                if (!db) {
                    const errorMsg = "Local Storage is not available.";
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
                const name = db.getItem("name");
                if (!name) {
                    openSettings();
                }
            };
            init();
        })
        .catch((error) => {
            console.error(error);
        })
        .finally(() => {
            console.log("Ribbit is ready!");
        });
});
document.addEventListener("receivemessage", (e) => {
    console.log("received message: ", e);
    // collect data for message
    const { save, type, sender, message, timestamp } = e.detail;

    console.log("save:", sender);
    console.log("type:", type);
    console.log("sender:", sender);
    console.log("message:", message);
    console.log("timestamp:", timestamp);
    const name = sender.split("|")[0];
    const callsign = sender.split("|")[1];
    const gridsquare = sender.split("|")[2];
    const phone = sender.split("|")[3];
    console.log("name", name);
    console.log("callsign", callsign);
    console.log("gridsquare", gridsquare);
    console.log("phone", phone);

    // create message element
    const chat = document.getElementById("chat");
    if (!chat) {
        const errorMsg = "Element #chat not found in DOM.";
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
    const messageElement = document.createElement("p");
    const newMessage = document.createElement("div");
    const senderElement = document.createElement("div");
    const nameElement = document.createElement("p");
    const timeElement = document.createElement("p");
    senderElement.appendChild(nameElement);
    senderElement.appendChild(timeElement);
    newMessage.appendChild(senderElement);
    newMessage.appendChild(messageElement);
    newMessage.classList.add("message");
    senderElement.classList.add("sender");
    nameElement.classList.add("name");
    timeElement.classList.add("time");

    if (timestamp) {
        // if the timestamp exists then it's restoring saved messages
        timeElement.innerHTML = timestamp;
    } else {
        timeElement.innerText = new Date().toUTCString();
    }
    if (type == "alert") {
        console.warn("alert:", message);
        messageElement.innerText = message;
        chat.appendChild(newMessage);
    }
    // regex for repeating '\u0000' values and remove them
    if (!message) {
        console.warn("Received message is empty.");
    } else {
        messageElement.innerText = message;
        chat.appendChild(newMessage);
    }
    const text = message.replace(/(\u0000)\1+/g, "$1");
    console.log("message:", text);

    if (message?.includes("�")) {
        console.error("Received message contains invalid characters.");
        return;
    }
    // check if the callsign is our callsign
    if (callsign === window.localStorage.getItem("callsign")) {
        newMessage.classList.add("tx");
    } else {
        newMessage.classList.add("rx");
    }

    // populate message element

    if (
        name.length > 0 &&
        callsign?.length > 0 &&
        gridsquare.length > 0 &&
        phone.length > 0
    ) {
        nameElement.innerText = `${name} [${callsign}] @${gridsquare} ${phone}`;
        const callsignToColor = (cs) => {
            console.log("callsign:", cs);
            const a =
                cs.charCodeAt(0) * 11 +
                cs.charCodeAt(1) * 7 +
                cs.charCodeAt(2) * 3;
            const h = a % 360;
            const color = `hsl(${h}, 50%, 80%)`;
            return color;
        };
        if (callsign) {
            const color = callsignToColor(callsign);
            console.log("setting color", color);
            nameElement.style.background = color;
            messageElement.style.background = color;
        }
        console.log(nameElement);
        console.log(messageElement);
    } else {
        nameElement.innerText = `unknown sender`;
    }

    chat.scrollTop = chat.scrollHeight;
    // add incoming message to indexedDB
    if (save) {
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
            return;
        }
        const request = db.open("ribbit", 1);
        request.onerror = (e) => {
            const errorMsg = "IndexedDB open error: " + e;
            console.error(errorMsg);
            const event = new CustomEvent("receivemessage", {
                detail: {
                    save: false,
                    type: "alert",
                    message: errorMsg,
                },
            });
            document.dispatchEvent(event);
        };
        request.onsuccess = (e) => {
            const db = e.target.result;
            const transaction = db.transaction("messages", "readwrite");
            const store = transaction.objectStore("messages");
            console.log("saving message:", message);
            const request = store.add({
                type,
                sender,
                message,
                timestamp: new Date().toUTCString(),
            });
            request.onsuccess = (e) => {
                console.log("Message added to indexedDB.");
                store.getAll().onsuccess = (e) => {
                    const messagecount =
                        document.getElementById("messagecount");
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
                    messagecount.value = e.target.result.length;
                };
            };
        };
    }
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
