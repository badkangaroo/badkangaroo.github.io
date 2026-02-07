# Quick Start Guide

Welcome to Ribbit! This guide will get you up and running with Ribbit's digital HF radio messaging system in just a few minutes. Whether you're a developer integrating Ribbit into your application or a radio enthusiast trying out the web app, this guide has you covered.

## What is Ribbit?

Ribbit is a digital communication system that converts text messages into audio signals suitable for HF (High Frequency) radio transmission. It uses advanced digital signal processing to encode messages that can be reliably transmitted over thousands of miles using standard HF radio equipment.

**Key Features:**
- **Real-time messaging** over HF radio
- **WebAssembly-powered** high-performance DSP
- **Cross-platform** web application
- **Developer-friendly** APIs
- **Open source** and MIT licensed

## Getting Started

### Option 1: Try the Web App (Easiest)

1. **Open your browser** and navigate to the Ribbit web app
2. **Grant microphone permission** when prompted
3. **Enter your callsign** (ham radio identifier) in settings
4. **Start chatting!** Type messages and they'll be encoded into audio

**That's it!** You're now sending digital messages over radio waves.

### Option 2: Developer Integration

If you're building your own Ribbit application, here's how to get started:

#### 1. Include Ribbit in Your Project

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Ribbit App</title>
    <script src="path/to/ribbit.js"></script>
    <script src="path/to/messageCodec.js"></script>
</head>
<body>
    <h1>Ribbit Integration</h1>
    <div id="messages"></div>
    <input type="text" id="messageInput" placeholder="Type your message...">
    <button onclick="sendMessage()">Send</button>
</body>
</html>
```

#### 2. Initialize Ribbit

```javascript
// Initialize Ribbit when page loads
let ribbitModule;
let messageCodec;

async function initRibbit() {
    try {
        // Load WebAssembly module
        ribbitModule = await Module();

        // Initialize encoder and decoder
        ribbitModule._createEncoder();
        ribbitModule._createDecoder();

        // Create message codec
        messageCodec = new MessageCodec();

        console.log("✅ Ribbit ready!");
    } catch (error) {
        console.error("❌ Failed to initialize Ribbit:", error);
    }
}

// Call when DOM is ready
document.addEventListener('DOMContentLoaded', initRibbit);
```

## Your First Message

### Sending a Message

```javascript
async function sendMessage() {
    const messageText = document.getElementById('messageInput').value;
    if (!messageText.trim()) return;

    try {
        // 1. Encode message to bitstream
        const bitstream = messageCodec.EncodeMessage({
            callsign: "YOURCALL",    // Replace with your callsign
            gridsquare: "AA00aa",    // Replace with your location
            message: messageText
        });

        // 2. Convert to bytes
        const messageBytes = messageCodec.BitStreamToBytes(bitstream);

        // 3. Allocate memory and encode to audio
        const messagePtr = ribbitModule._malloc(messageBytes.length);
        ribbitModule.HEAPU8.set(messageBytes, messagePtr);

        ribbitModule._initEncoder(messagePtr, messageBytes.length);
        ribbitModule._readEncoder();

        // 4. Get audio signal
        const signalPtr = ribbitModule._signal_pointer();
        const signalLength = ribbitModule._signal_length();
        const audioBuffer = ribbitModule.HEAPF32.slice(
            signalPtr / 4,
            (signalPtr + signalLength * 4) / 4
        );

        // 5. Play the audio (transmit over radio!)
        await playAudio(audioBuffer);

        // 6. Clean up
        ribbitModule._free(messagePtr);

        console.log("📡 Message transmitted!");
        document.getElementById('messageInput').value = '';

    } catch (error) {
        console.error("❌ Transmission failed:", error);
    }
}

// Helper function to play audio
function playAudio(audioBuffer) {
    return new Promise((resolve) => {
        const audioContext = new AudioContext({ sampleRate: 8000 });
        const audioBufferObj = audioContext.createBuffer(1, audioBuffer.length, 8000);
        audioBufferObj.copyFromChannel(audioBuffer, 0);

        const source = audioContext.createBufferSource();
        source.buffer = audioBufferObj;
        source.connect(audioContext.destination);
        source.onended = resolve;
        source.start();
    });
}
```

### Receiving Messages

```javascript
// Set up continuous audio input for receiving messages
// IMPORTANT: This creates a continuous audio processing loop that must remain active
async function startReceiving() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,    // Critical: preserve radio signal
                noiseSuppression: false,    // Critical: don't filter the signal
                autoGainControl: false,     // Critical: maintain original levels
                sampleRate: 8000           // Required: Ribbit processes at 8000 Hz
            }
        });

        const audioContext = new AudioContext({ sampleRate: 8000 });
        const source = audioContext.createMediaStreamSource(stream);

        const processor = audioContext.createScriptProcessor(2048, 1, 1);

        // This callback fires continuously (~43 times per second) while audio streams
        processor.onaudioprocess = (event) => {
            const audioData = event.inputBuffer.getChannelData(0);

            // Feed this audio chunk to the decoder immediately
            const audioPtr = ribbitModule._malloc(audioData.length * 4);
            ribbitModule.HEAPF32.set(audioData, audioPtr / 4);
            ribbitModule._feedDecoder(audioPtr, audioData.length);
            ribbitModule._free(audioPtr);

            // Process any complete chunks and check for messages
            const result = ribbitModule._digestFeedOptimized();
            if (result >= 0) {
                // Message successfully decoded!
                const messagePtr = ribbitModule._message_pointer();
                const messageLength = ribbitModule._message_length();
                const messageBytes = ribbitModule.HEAPU8.slice(messagePtr, messagePtr + messageLength);

                const bitstream = messageCodec.BytesToBitStream(messageBytes);
                const decodedMessage = messageCodec.DecodeMessage(bitstream);

                displayMessage(decodedMessage);
            }
            // If no message found, continue listening...
            // More audio chunks will arrive soon
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        console.log("🎧 Continuously listening for messages...");

    } catch (error) {
        console.error("❌ Failed to start receiving:", error);
    }
}

// Display received message
function displayMessage(message) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message received';

    messageDiv.innerHTML = `
        <strong>${message.firstName || 'Unknown'} ${message.lastName || ''} [${message.callsign}]</strong><br>
        <small>@${message.gridsquare} • ${message.timestamp.toLocaleTimeString()}</small><br>
        ${message.message}
    `;

    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
```

## Complete Example

Here's a complete, working Ribbit chat application:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Ribbit Chat</title>
    <script src="scripts/ribbit.js"></script>
    <script src="scripts/messageCodec.js"></script>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        #messages { height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; }
        .message { margin-bottom: 10px; padding: 8px; border-radius: 4px; }
        .sent { background: #e3f2fd; margin-left: 100px; }
        .received { background: #f5f5f5; margin-right: 100px; }
        #controls { display: flex; gap: 10px; margin-bottom: 10px; }
        input, button { padding: 8px; }
        #messageInput { flex: 1; }
    </style>
</head>
<body>
    <h1>🎵 Ribbit Chat</h1>

    <div id="controls">
        <input type="text" id="callsign" placeholder="Your callsign" value="NOCALL">
        <input type="text" id="gridsquare" placeholder="Gridsquare" value="AA00aa">
        <button onclick="startReceiving()">🎧 Listen</button>
    </div>

    <div id="messages"></div>

    <div id="input">
        <input type="text" id="messageInput" placeholder="Type your message..." onkeypress="handleKeyPress(event)">
        <button onclick="sendMessage()">📡 Send</button>
    </div>

    <script>
        let ribbitModule;
        let messageCodec;
        let isReceiving = false;

        async function initRibbit() {
            try {
                ribbitModule = await Module();
                ribbitModule._createEncoder();
                ribbitModule._createDecoder();
                messageCodec = new MessageCodec();
                console.log("✅ Ribbit ready!");
            } catch (error) {
                console.error("❌ Initialization failed:", error);
            }
        }

        async function sendMessage() {
            const messageText = document.getElementById('messageInput').value.trim();
            if (!messageText) return;

            const callsign = document.getElementById('callsign').value;
            const gridsquare = document.getElementById('gridsquare').value;

            try {
                const bitstream = messageCodec.EncodeMessage({
                    callsign: callsign,
                    gridsquare: gridsquare,
                    message: messageText
                });

                const messageBytes = messageCodec.BitStreamToBytes(bitstream);
                const messagePtr = ribbitModule._malloc(messageBytes.length);
                ribbitModule.HEAPU8.set(messageBytes, messagePtr);

                ribbitModule._initEncoder(messagePtr, messageBytes.length);
                ribbitModule._readEncoder();

                const signalPtr = ribbitModule._signal_pointer();
                const signalLength = ribbitModule._signal_length();
                const audioBuffer = ribbitModule.HEAPF32.slice(
                    signalPtr / 4, (signalPtr + signalLength * 4) / 4
                );

                await playAudio(audioBuffer);
                ribbitModule._free(messagePtr);

                displayMessage({
                    callsign: callsign,
                    gridsquare: gridsquare,
                    message: messageText,
                    timestamp: new Date()
                }, 'sent');

                document.getElementById('messageInput').value = '';

            } catch (error) {
                console.error("❌ Send failed:", error);
                alert("Failed to send message: " + error.message);
            }
        }

        async function startReceiving() {
            if (isReceiving) return;

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: false, noiseSuppression: false }
                });

                const audioContext = new AudioContext({ sampleRate: 8000 });
                const source = audioContext.createMediaStreamSource(stream);
                const processor = audioContext.createScriptProcessor(2048, 1, 1);

                processor.onaudioprocess = (event) => {
                    const audioData = event.inputBuffer.getChannelData(0);
                    const audioPtr = ribbitModule._malloc(audioData.length * 4);
                    ribbitModule.HEAPF32.set(audioData, audioPtr / 4);
                    ribbitModule._feedDecoder(audioPtr, audioData.length);
                    ribbitModule._free(audioPtr);

                    const result = ribbitModule._digestFeedOptimized();
                    if (result >= 0) {
                        const messagePtr = ribbitModule._message_pointer();
                        const messageLength = ribbitModule._message_length();
                        const messageBytes = ribbitModule.HEAPU8.slice(messagePtr, messagePtr + messageLength);

                        const bitstream = messageCodec.BytesToBitStream(messageBytes);
                        const decodedMessage = messageCodec.DecodeMessage(bitstream);

                        displayMessage(decodedMessage, 'received');
                    }
                };

                source.connect(processor);
                processor.connect(audioContext.destination);
                isReceiving = true;

                console.log("🎧 Listening for messages...");
                event.target.textContent = "Listening...";

            } catch (error) {
                console.error("❌ Receive failed:", error);
                alert("Failed to start receiving: " + error.message);
            }
        }

        function displayMessage(message, type) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}`;

            messageDiv.innerHTML = `
                <strong>${message.callsign}</strong> @${message.gridsquare}<br>
                <small>${message.timestamp.toLocaleTimeString()}</small><br>
                ${message.message}
            `;

            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        async function playAudio(audioBuffer) {
            return new Promise((resolve) => {
                const audioContext = new AudioContext({ sampleRate: 8000 });
                const audioBufferObj = audioContext.createBuffer(1, audioBuffer.length, 8000);
                audioBufferObj.copyFromChannel(audioBuffer, 0);

                const source = audioContext.createBufferSource();
                source.buffer = audioBufferObj;
                source.connect(audioContext.destination);
                source.onended = resolve;
                source.start();
            });
        }

        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }

        document.addEventListener('DOMContentLoaded', initRibbit);
    </script>
</body>
</html>
```

## Common Issues & Solutions

### Audio Permission Denied
**Problem:** Browser blocks microphone access
**Solution:** Make sure you're using HTTPS and grant microphone permission when prompted

### No Messages Received
**Problem:** Can't decode incoming audio
**Solution:**
- Check that your radio audio is connected to your computer's microphone
- Adjust radio volume so signals are clear but not distorted
- Ensure 8000 Hz sample rate (Ribbit requirement)

### Messages Not Transmitting
**Problem:** Audio output not going to radio
**Solution:**
- Connect computer audio output to radio microphone input
- Check radio is in transmit mode when playing audio
- Verify audio levels aren't too high (causing distortion)

### WebAssembly Loading Fails
**Problem:** WASM module won't load
**Solution:**
- Use a local web server (not file:// protocol)
- Check that `ribbit.wasm` and `ribbit.js` are in the correct directory
- Clear browser cache and try again

## Next Steps

Now that you have Ribbit working, here are some things to try:

1. **Experiment with different messages** - Try various lengths and characters
2. **Test with real radio equipment** - Connect to an HF radio and transmit over the air
3. **Explore the MessageCodec API** - Check out the full API documentation
4. **Build your own features** - Add file transfer, images, or custom message types
5. **Join the community** - Check out the GitHub repository for examples and support

## Need Help?

- **Documentation:** Check the `Docs/` directory for detailed guides
- **GitHub Issues:** Report bugs or request features
- **Community:** Join discussions on the Ribbit GitHub repository

Happy coding with Ribbit! 🎵📡