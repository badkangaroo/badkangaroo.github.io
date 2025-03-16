/*
Java native interface to C++ encoder and decoder

Copyright 2023 Ahmet Inan <inan@aicodix.de>

Purpose:
- Provide a Java native interface to C++ encoder and decoder
- The encoder and decoder are used to encode and decode data
- The encoder and decoder are used to encode and decode data
- The encoder and decoder are used to encode and decode data
- The encoder and decoder are used to encode and decode data
- The encoder and decoder are used to encode and decode data

Input:
- A Java native interface to C++ encoder and decoder

Output:
- A Java native interface to C++ encoder and decoder

*/

#include <jni.h> // Include the Java Native Interface header file
#define assert(expr) do {} while (0) // Define the assert macro
#include "encoder.hh" // Include the encoder header file
#include "decoder.hh" // Include the decoder header file
#include <emscripten/bind.h>

static Encoder *encoder; // Define the encoder pointer
static Decoder *decoder; // Define the decoder pointer

Encoder encoderInstance;  // Global encoder instance

extern "C" JNIEXPORT jboolean JNICALL
Java_institute_openresearch_ribbit_MainActivity_createEncoder(
	JNIEnv *,
	jobject) {
	if (encoder) // Check if the encoder is already created
		return true; // Return true if the encoder is already created
	encoder = new(std::nothrow) Encoder(); // Create a new encoder
	return encoder != nullptr; // Return true if the encoder is created
}

extern "C" JNIEXPORT void JNICALL
Java_institute_openresearch_ribbit_MainActivity_destroyEncoder(
	JNIEnv *,
	jobject) {
	delete encoder; // Delete the encoder
	encoder = nullptr; // Set the encoder pointer to nullptr
}

extern "C" JNIEXPORT jboolean JNICALL
Java_institute_openresearch_ribbit_MainActivity_readEncoder(
	JNIEnv *env,
	jobject,
	jfloatArray JNI_audioBuffer,
	jint sampleCount) {
	jboolean done = true; // Define the done variable
	if (encoder) { // Check if the encoder is created
		jfloat *audioBuffer = env->GetFloatArrayElements(JNI_audioBuffer, nullptr); // Get the audio buffer
		if (audioBuffer) // Check if the audio buffer is created
			done = encoder->read(audioBuffer, sampleCount); // Read the audio buffer
		env->ReleaseFloatArrayElements(JNI_audioBuffer, audioBuffer, 0); // Release the audio buffer
	}
	return done; // Return the done variable
}

extern "C" JNIEXPORT void JNICALL
Java_institute_openresearch_ribbit_MainActivity_initEncoder(
	JNIEnv *env,
	jobject,
	jbyteArray JNI_payload) {
	if (encoder) { // Check if the encoder is created
		jbyte *payload = env->GetByteArrayElements(JNI_payload, nullptr); // Get the payload
		if (payload) // Check if the payload is created
			encoder->init(reinterpret_cast<uint8_t *>(payload)); // Initialize the encoder
		env->ReleaseByteArrayElements(JNI_payload, payload, JNI_ABORT); // Release the payload
	}
}

extern "C" JNIEXPORT void JNICALL
Java_institute_openresearch_ribbit_MainActivity_destroyDecoder(
	JNIEnv *,
	jobject) {
	delete decoder; // Delete the decoder
	decoder = nullptr; // Set the decoder pointer to nullptr
}

extern "C" JNIEXPORT jboolean JNICALL
Java_institute_openresearch_ribbit_MainActivity_createDecoder(
	JNIEnv *,
	jobject) {
	if (decoder) // Check if the decoder is already created
		return true; // Return true if the decoder is already created
	decoder = new(std::nothrow) Decoder(); // Create a new decoder
	return decoder != nullptr; // Return true if the decoder is created
}

extern "C" JNIEXPORT jint JNICALL
Java_institute_openresearch_ribbit_MainActivity_fetchDecoder(
	JNIEnv *env,
	jobject,
	jbyteArray JNI_payload) {
	jint result = -1; // Define the result variable
	if (decoder) { // Check if the decoder is created
		jbyte *payload = env->GetByteArrayElements(JNI_payload, nullptr); // Get the payload
		if (payload) // Check if the payload is created
			result = decoder->fetch(reinterpret_cast<uint8_t *>(payload)); // Fetch the payload
		env->ReleaseByteArrayElements(JNI_payload, payload, 0); // Release the payload
	}
	return result; // Return the result variable
}

extern "C" JNIEXPORT jboolean JNICALL
Java_institute_openresearch_ribbit_MainActivity_feedDecoder(
	JNIEnv *env,
	jobject,
	jfloatArray JNI_audioBuffer,
	jint sampleCount) {
	jboolean fetch = false; // Define the fetch variable
	if (decoder) { // Check if the decoder is created
		jfloat *audioBuffer = env->GetFloatArrayElements(JNI_audioBuffer, nullptr); // Get the audio buffer
		if (audioBuffer) // Check if the audio buffer is created
			fetch = decoder->feed(reinterpret_cast<float *>(audioBuffer), sampleCount); // Feed the audio buffer
		env->ReleaseFloatArrayElements(JNI_audioBuffer, audioBuffer, JNI_ABORT); // Release the audio buffer
	}
	return fetch; // Return the fetch variable
}

extern "C" {
    // Function exposed to JavaScript
    EMSCRIPTEN_KEEPALIVE
    void initEncoder(const uint8_t* payload, int length) {
        if (length != 256) {
            // Handle error - payload must be 256 bytes
            return;
        }
        encoderInstance.init(payload);
    }
    
    // Function to read encoded audio data
    EMSCRIPTEN_KEEPALIVE
    bool readEncodedAudio(float* buffer, int count) {
        return encoderInstance.read(buffer, count);
    }
}

