/**
 * MessageCodec API Usage Examples
 * 
 * This file demonstrates how to use the MessageCodec API for encoding
 * and decoding Ribbit messages.
 */

import { MessageCodec } from './messageCodec.js';

// Initialize the codec
const codec = new MessageCodec();

// ==================== EXAMPLE 1: Individual Field Encoding ====================

console.log("=== Example 1: Individual Field Encoding ===");

// Get current timestamp
const timestampBits = codec.GetTimestampBitStream();
console.log("Timestamp bits:", timestampBits);
console.log("Length:", timestampBits.length, "bits");

// Encode a callsign
const callsignBits = codec.GetCallsignBitStream("KN6FZY");
console.log("Callsign bits:", callsignBits);
console.log("Length:", callsignBits.length, "bits");

// Encode a gridsquare
const gridsquareBits = codec.GetGridsquareBitStream("CM87uq");
console.log("Gridsquare bits:", gridsquareBits);
console.log("Length:", gridsquareBits.length, "bits");

// Get flag bits
const emergencyBit = codec.GetEmergencyBit(false);
const ntpBit = codec.GetNTPBit(true);
const gpsBit = codec.GetGPSBit(true);
console.log("Flags:", { emergency: emergencyBit, ntp: ntpBit, gps: gpsBit });

// Encode name and message
const name = "Alex Okita";
const nameBits = codec.GetNameBitStream(name);
console.log("Name bits:", nameBits);
console.log("Length:", nameBits.length, "bits");

const message = "Hello world!";
const messageBits = codec.GetMessageBitStream(message);
console.log("Message bits:", messageBits);
console.log("Length:", messageBits.length, "bits");

// ==================== EXAMPLE 2: Individual Field Decoding ====================

console.log("\n=== Example 2: Individual Field Decoding ===");

// Decode timestamp
const decodedTimestamp = codec.BitStreamToTimestamp(timestampBits);
console.log("Decoded timestamp:", decodedTimestamp.toISOString());

// Decode callsign
const decodedCallsign = codec.BitStreamToCallsign(callsignBits);
console.log("Decoded callsign:", decodedCallsign);

// Decode gridsquare
const decodedGridsquare = codec.BitStreamToGridsquare(gridsquareBits);
console.log("Decoded gridsquare:", decodedGridsquare);

// Decode flags
console.log("Decoded emergency:", codec.BitStreamToEmergency(emergencyBit));
console.log("Decoded NTP:", codec.BitStreamToNTP(ntpBit));
console.log("Decoded GPS:", codec.BitStreamToGPS(gpsBit));

// Decode name and message
const decodedName = codec.BitStreamToName(nameBits);
console.log("Decoded name:", decodedName);

const decodedMessage = codec.BitStreamToMessage(messageBits);
console.log("Decoded message:", decodedMessage);

// ==================== EXAMPLE 3: Complete Message Encoding (JSON to Bitstream) ====================

console.log("\n=== Example 3: Complete Message Encoding ===");

const messageData = {
    callsign: "W1AW",
    timestamp: new Date(),
    gridsquare: "FN31pr",
    emergency: false,
    ntp: true,
    gps: true,
    messageType: 1, // Chat
    name: "ARRL",
    message: "Testing Ribbit digital mode. 73!"
};

const fullBitstream = codec.EncodeMessage(messageData);
console.log("Full bitstream:", fullBitstream);
console.log("Total bits:", fullBitstream.length);

// Convert to bytes ready for transmission
const bytes = codec.BitStreamToBytes(fullBitstream);
console.log("Byte array:", Array.from(bytes));
console.log("Total bytes:", bytes.length);

// ==================== EXAMPLE 4: Complete Message Decoding (Bitstream to JSON) ====================

console.log("\n=== Example 4: Complete Message Decoding ===");

// Decode the bitstream back to JSON
const decodedHeader = codec.DecodeMessage(fullBitstream);
console.log("Decoded header:", JSON.stringify(decodedHeader, null, 2));

// Pretty print the decoded header
console.log("\n--- Decoded Header Details ---");
console.log("Callsign:", decodedHeader.callsign);
console.log("Timestamp:", decodedHeader.timestamp.toISOString());
console.log("Gridsquare:", decodedHeader.gridsquare);
console.log("Emergency:", decodedHeader.emergency);
console.log("NTP:", decodedHeader.ntp);
console.log("GPS:", decodedHeader.gps);
console.log("Message Type:", decodedHeader.messageType, "-", codec.GetMessageTypeName(decodedHeader.messageType));
console.log("Name:", decodedHeader.name);
console.log("Message:", decodedHeader.message);

// ==================== EXAMPLE 5: Round-trip Test ====================

console.log("\n=== Example 5: Round-trip Test ===");

const testData = {
    callsign: "KN6FZY",
    gridsquare: "CM87uq",
    emergency: true,
    ntp: false,
    gps: true,
    messageType: 0, // Emergency
    name: "Emergency Contact",
    message: "Need assistance at location. Low battery."
};

console.log("Original data:", testData);

// Encode
const encoded = codec.EncodeMessage(testData);
console.log("Encoded to", encoded.length, "bits");

// Convert to bytes (simulating transmission)
const transmitBytes = codec.BitStreamToBytes(encoded);
console.log("Transmission:", transmitBytes.length, "bytes");

// Convert back from bytes (simulating reception)
const receivedBitstream = codec.BytesToBitStream(transmitBytes);

// Decode
const decoded = codec.DecodeMessage(receivedBitstream);
console.log("Decoded data:", decoded);

// Verify
const matches = 
    testData.callsign === decoded.callsign &&
    testData.gridsquare === decoded.gridsquare &&
    testData.emergency === decoded.emergency &&
    testData.ntp === decoded.ntp &&
    testData.gps === decoded.gps &&
    testData.messageType === decoded.messageType &&
    testData.name === decoded.name &&
    testData.message === decoded.message;

console.log("Round-trip successful:", matches ? "✅ PASS" : "❌ FAIL");

// ==================== EXAMPLE 6: Minimal Message ====================

console.log("\n=== Example 6: Minimal Message (Required Fields Only) ===");

const minimalData = {
    callsign: "TEST",
    gridsquare: "AA00aa"
};

const minimalBitstream = codec.EncodeMessage(minimalData);
console.log("Minimal bitstream length:", minimalBitstream.length, "bits");

const minimalBytes = codec.BitStreamToBytes(minimalBitstream);
console.log("Minimal byte count:", minimalBytes.length, "bytes");

const decodedMinimal = codec.DecodeMessage(minimalBitstream);
console.log("Decoded minimal message:", decodedMinimal);

// ==================== EXAMPLE 7: Maximum Message ====================

console.log("\n=== Example 7: Maximum Message (All Fields) ===");

const maximalData = {
    callsign: "W1AW",
    gridsquare: "FN31pr",
    emergency: true,
    ntp: true,
    gps: true,
    messageType: 2, // Contest
    name: "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345", // 32 chars max
    message: "A".repeat(240) // 240 bytes max
};

const maximalBitstream = codec.EncodeMessage(maximalData);
console.log("Maximal bitstream length:", maximalBitstream.length, "bits");

const maximalBytes = codec.BitStreamToBytes(maximalBitstream);
console.log("Maximal byte count:", maximalBytes.length, "bytes");

console.log("\n=== All Examples Complete ===");

