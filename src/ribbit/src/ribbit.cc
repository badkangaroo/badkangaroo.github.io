/*
WebAssembly Example 3

Copyright 2019 Ahmet Inan <inan@aicodix.de>
*/
#include <emscripten.h>   // Include the emscripten library for web assembly
#include <stdio.h>        // Include the stdio library for input and output
#include <algorithm>      // Include the algorithm library for sorting and searching
#include "example.hh"     // Include the example header file
#include "dsp/complex.hh" // Include the complex header file
#include "dsp/window.hh"  // Include the window header file
#include "dsp/filter.hh"  // Include the filter header file
#include "dsp/coeffs.hh"  // Include the coeffs header file
#include "dsp/decibel.hh" // Include the decibel header file
#include "dsp/fft.hh"     // Include the fft header file
#include "dsp/encoder.hh" // Include the encoder header file
#include "dsp/decoder.hh" // Include the decoder header file

#ifdef __cplusplus
#define EXTERN extern "C"
#else
#define EXTERN
#endif
static Encoder *encoder; // Define the encoder pointer
static Decoder *decoder; // Define the decoder pointer
EXTERN EMSCRIPTEN_KEEPALIVE void createEncoder()
{
    encoder = new Encoder(); // Create a new encoder
    if (encoder)             // If the encoder is created
    {
        printf("Encoder created!\n");
        EM_ASM({ encoderCreated($0); }, (int)encoder); // Call the encoderCreated function
    }
}
EXTERN EMSCRIPTEN_KEEPALIVE void createDecoder()
{
    decoder = new Decoder(); // Create a new decoder
    if (decoder)             // If the decoder is created
    {
        printf("Decoder created!\n");
        EM_ASM({ decoderCreated($0); }, (int)decoder); // Call the decoderCreated function
    }
}
EXTERN EMSCRIPTEN_KEEPALIVE int main()
{
    printf("wasmModule loaded!\n"); // Print the wasmModule loaded message
    createEncoder();                // Create a new encoder
    createDecoder();                // Create a new decoder
    EM_ASM({ mainCalled($0); }, 1); // Call the mainCalled function
    return 0;
}

static const int FEED_LENGTH = 2048;                                  // Define the feed length for the audio input
float feed[FEED_LENGTH];                                              // Define the feed array for the audio input
EXTERN EMSCRIPTEN_KEEPALIVE float *feed_pointer() { return feed; }    // Define the feed pointer for the audio input
EXTERN EMSCRIPTEN_KEEPALIVE int feed_length() { return FEED_LENGTH; } // Define the feed length for the audio input
static const int CHUNK_LENGTH = 160;                                  // Define the chunk length for the audio input
float chunk[CHUNK_LENGTH];                                            // Define the chunk array for the audio input
float overflow[CHUNK_LENGTH];                                         // Define the overflow array for the audio input
int over = 0;                                                         // Define the overflow for the audio input
// payload
static const int PAYLOAD_LENGTH = 256; // Define the payload length for the audio input
uint8_t payload[PAYLOAD_LENGTH];       // Define the payload array for the audio input
// message
static const int MESSAGE_LENGTH = 256; // Define the message length for the audio input
uint8_t message[MESSAGE_LENGTH];       // Define the message array for the audio input
EXTERN EMSCRIPTEN_KEEPALIVE void *message_pointer()
{
    return message; // Return the message pointer for the audio input
}
EXTERN EMSCRIPTEN_KEEPALIVE int message_length()
{
    return MESSAGE_LENGTH; // Return the message length for the audio input
}
static const int SIGNAL_LENGTH = 4096 * 4; // Define the signal length for the audio input
float signal[SIGNAL_LENGTH];               // Define the signal array for the audio input
EXTERN EMSCRIPTEN_KEEPALIVE float *signal_pointer()
{
    return signal; // Return the signal pointer for the audio input
}
EXTERN EMSCRIPTEN_KEEPALIVE int signal_length()
{
    return SIGNAL_LENGTH; // Return the signal length for the audio input
}
EXTERN EMSCRIPTEN_KEEPALIVE void *payload_pointer()
{
    return payload; // Return the payload pointer for the audio input
}
EXTERN EMSCRIPTEN_KEEPALIVE int payload_length()
{
    return PAYLOAD_LENGTH; // Return the payload length for the audio input
}
EXTERN EMSCRIPTEN_KEEPALIVE void feedDecoder()
{
    if (decoder == nullptr)
    {
        return; // Return if the decoder is not created
    }
    bool getpayload = false;                // Define the getpayload for the audio input
    getpayload = decoder->feed(chunk, 160); // Feed the decoder with the chunk and 160
    if (getpayload)                         // If the getpayload is true
    {
        printf("Message Incoming!\n");               // Print the message incoming message
        int outputresult = -1;                       // Define the outputresult for the audio input
        outputresult = decoder->fetch(payload);      // Fetch the decoder with the payload
        EM_ASM({ fetchDecoded($0); }, outputresult); // Call the fetchDecoded function
    }
}

// digestFeed from overflow and feed
// fill the chunk for the decoder and request
// the decoder to be fed
// store the overflow

EXTERN EMSCRIPTEN_KEEPALIVE void digestFeed()
{
    int totalLength = over + FEED_LENGTH; // Define the totalLength for the audio input
    // printf("totalLength: %d\n", totalLength);
    // new array for overflow with feed concatenated
    float localArray[totalLength]; // Define the localArray for the audio input
    int index = 0;                 // Define the index for the audio input
    for (int i = 0; i < over; i++) // Loop through the over for the audio input
    {
        // fill in from overflow
        localArray[index++] = overflow[i]; // Fill in from overflow
    }
    for (int i = 0; i < FEED_LENGTH; i++) // Loop through the feed for the audio input
    {
        // concatenate from feed
        localArray[index++] = feed[i]; // Fill in from feed
    }

    // fill the chunk for the decoder and request
    // the decoder to be fed
    int fedTo = 0;                                      // Define the fedTo for the audio input
    for (int i = 0; i < totalLength; i += CHUNK_LENGTH) // Loop through the totalLength for the audio input
    {
        if (i + CHUNK_LENGTH < totalLength)
        {
            // printf("chunk[%d-%d]", i, i + CHUNK_LENGTH);
            // fill chunk before feeding to decoder
            for (int j = 0; j < CHUNK_LENGTH; j++)
            {
                chunk[j] = localArray[i + j]; // Fill the chunk before feeding to decoder
            }
            feedDecoder(); // Feed the decoder
        }
        else
        {
            // what has not been fed to the decoder
            // will be stored in the overflow
            fedTo = i; // Set the fedTo for the audio input
        }
    }

    // store the overflow
    if (fedTo >= 0) // If the fedTo is greater than 0
    {
        over = totalLength - fedTo;    // Set the over for the audio input
        for (int i = 0; i < over; i++) // Loop through the over for the audio input
        {
            overflow[i] = localArray[fedTo + i]; // Fill the overflow for the audio input
        }
        fedTo = 0; // Set the fedTo for the audio input
    }
}

EXTERN EMSCRIPTEN_KEEPALIVE void initEncoder()
{
    encoder->init(message); // Initialize the encoder with the message
}

EXTERN EMSCRIPTEN_KEEPALIVE void readEncoder()
{
    encoder->read(signal, SIGNAL_LENGTH); // Read the encoder with the signal and SIGNAL_LENGTH
}
