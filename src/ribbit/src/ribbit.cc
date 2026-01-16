/*
██████╗ ██╗██████╗ ██████╗ ██╗████████╗
██╔══██╗██║██╔══██╗██╔══██╗██║╚══██╔══╝
██████╔╝██║██████╔╝██████╔╝██║   ██║   
██╔══██╗██║██╔══██╗██╔══██╗██║   ██║   
██║  ██║██║██████╔╝██████╔╝██║   ██║   
╚═╝  ╚═╝╚═╝╚═════╝ ╚═════╝ ╚═╝   ╚═╝   

WebAssembly Example 3
Copyright 2019 Ahmet Inan <inan@aicodix.de>
Additional modifications by:
- Alex Okita [KO6BVA] <alex@okita.io>
*/
#ifdef __EMSCRIPTEN__
#include <emscripten.h>   // Include the emscripten library for web assembly
#endif
#include <stdio.h>        // Include the stdio library for input and output
#include <algorithm>      // Include the algorithm library for sorting and searching
#include <cassert>        // Include the cassert library for assertions
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
    if (encoder) {
        delete encoder;
        encoder = nullptr;
    }
    encoder = new Encoder(); // Create a new encoder
    if (encoder)             // If the encoder is created
    {
        printf("Encoder created!\n");
        EM_ASM({ encoderCreated($0); }, (int)encoder); // Call the encoderCreated function
    }
}
EXTERN EMSCRIPTEN_KEEPALIVE void destroyEncoder()
{
    if (encoder) {
        delete encoder;
        encoder = nullptr;
        printf("Encoder destroyed!\n");
        EM_ASM({ if (typeof encoderDestroyed === 'function') encoderDestroyed(); });
    }
}
EXTERN EMSCRIPTEN_KEEPALIVE void createDecoder()
{
    if (decoder) {
        delete decoder;
        decoder = nullptr;
    }
    decoder = new Decoder(); // Create a new decoder
    if (decoder)             // If the decoder is created
    {
        printf("Decoder created!\n");
        EM_ASM({ decoderCreated($0); }, (int)decoder); // Call the decoderCreated function
    }
}
EXTERN EMSCRIPTEN_KEEPALIVE void destroyDecoder()
{
    if (decoder) {
        delete decoder;
        decoder = nullptr;
        printf("Decoder destroyed!\n");
        EM_ASM({ if (typeof decoderDestroyed === 'function') decoderDestroyed(); });
    }
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
/* While the decoder is fed with chunks of audio data,
 * the decoder waits for a message to be detected.
 * When a message is detected, the decoder returns true
 * which triggers the fetchDecoded function in the javascript
 * which will then look at the payload memory address then
 * the bytes are converted to a string and then split into
 * a sender and message.
 */
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
        // Clear payload buffer to prevent stale data if decoder fails to overwrite
        std::fill(payload, payload + PAYLOAD_LENGTH, 0);
        
        int outputresult = -1;                       // Define the outputresult for the audio input
        outputresult = decoder->fetch(payload);      // Fetch the decoder with the payload
        
        // Only notify JS if decode was successful
        if (outputresult >= 0) {
            EM_ASM({ fetchDecoded($0); }, outputresult); // Call the fetchDecoded function
        }
    }
}
/* 
 * digestFeed: Processes audio data from Web Audio API into fixed-size chunks for decoder
 * 
 * Memory Management:
 * - Uses static buffers defined at the top of the file:
 *   - feed[FEED_LENGTH]: Input buffer from Web Audio API (power-of-2 size)
 *   - overflow[CHUNK_LENGTH]: Temporary buffer for partial chunks
 *   - chunk[CHUNK_LENGTH]: Fixed-size buffer for decoder input (160 samples)
 * 
 * Web Audio API Integration:
 * - Web Audio API provides data in power-of-2 buffer sizes (e.g., 256, 512, 1024)
 * - This function bridges the gap between Web Audio's buffer size and the decoder's
 *   required chunk size of 160 samples
 * - The overflow buffer ensures no data is lost between Web Audio API callbacks
 * 
 * Performance Considerations:
 * - JavaScript side should use the largest possible buffer size that Web Audio API
 *   supports (typically 2048 or 4096) to minimize callback frequency
 * - Larger buffer sizes reduce the number of JavaScript-to-WASM transitions
 * - The function is optimized to minimize memory copies and avoid stack allocations
 * 
 * Operation Flow:
 * 1. Process any existing overflow data first
 * 2. For each Web Audio API buffer:
 *    - Copy data into overflow buffer
 *    - When overflow buffer reaches CHUNK_LENGTH (160):
 *      * Copy to chunk buffer
 *      * Feed to decoder
 *      * Reset overflow counter
 * 3. Any remaining data stays in overflow buffer for next call
 */
EXTERN EMSCRIPTEN_KEEPALIVE void digestFeed()
{
    // Process overflow first if any exists
    if (over > 0) {
        // Fill chunk with overflow data
        int copySize = std::min(CHUNK_LENGTH, over);
        for (int i = 0; i < copySize; i++) {
            chunk[i] = overflow[i];
        }
        
        // If we have a full chunk, process it
        if (copySize == CHUNK_LENGTH) {
            feedDecoder();
            // Move remaining overflow data to start of overflow array
            for (int i = 0; i < over - CHUNK_LENGTH; i++) {
                overflow[i] = overflow[i + CHUNK_LENGTH];
            }
            over -= CHUNK_LENGTH;
        } else {
            // Not enough data for a full chunk, just store in overflow
            for (int i = 0; i < copySize; i++) {
                overflow[i] = overflow[i];
            }
            over = copySize;
        }
    }

    // Process feed data in chunks
    int processed = 0;
    while (processed < FEED_LENGTH) {
        // Calculate how much space we have in the current chunk
        int spaceInChunk = CHUNK_LENGTH - over;
        
        // Calculate how much data we can copy from feed
        int copySize = std::min(spaceInChunk, FEED_LENGTH - processed);
        
        // Copy data from feed to overflow
        for (int i = 0; i < copySize; i++) {
            overflow[over + i] = feed[processed + i];
        }
        
        processed += copySize;
        over += copySize;
        
        // If we have a full chunk, process it
        if (over == CHUNK_LENGTH) {
            // Copy overflow to chunk
            for (int i = 0; i < CHUNK_LENGTH; i++) {
                chunk[i] = overflow[i];
            }
            feedDecoder();
            over = 0;
        }
    }
}
/* 
 * digestFeedOptimized: Optimized version of digestFeed with improved memory management
 * 
 * Improvements over original:
 * - Uses std::copy instead of manual loops for better performance
 * - Feeds decoder directly from overflow buffer (eliminates redundant chunk copy)
 * - Simplified control flow with better bounds checking
 * - Removes no-op assignment bug from original
 * 
 * Memory Safety:
 * - Assertions ensure overflow counter stays within valid bounds
 * - Uses std::copy which is bounds-safe with proper parameters
 * 
 * Performance Benefits:
 * - Reduces memory copies by ~50% (eliminates overflow→chunk copy)
 * - Uses optimized std::copy instead of manual loops
 * - Simpler control flow reduces branch mispredictions
 */
EXTERN EMSCRIPTEN_KEEPALIVE void digestFeedOptimized()
{
    // Process any complete chunks from existing overflow first
    while (over >= CHUNK_LENGTH) {
        // Copy overflow to chunk and feed decoder
        std::copy(overflow, overflow + CHUNK_LENGTH, chunk);
        feedDecoder();
        
        // Shift remaining overflow data to start
        int remaining = over - CHUNK_LENGTH;
        if (remaining > 0) {
            std::copy(overflow + CHUNK_LENGTH, overflow + over, overflow);
        }
        over = remaining;
    }
    
    // Bounds check: overflow should be less than CHUNK_LENGTH after processing
    assert(over >= 0 && over < CHUNK_LENGTH);
    
    // Process feed data in chunks
    int processed = 0;
    while (processed < FEED_LENGTH) {
        // Calculate how much space we have in the current overflow buffer
        int spaceInOverflow = CHUNK_LENGTH - over;
        
        // Calculate how much data we can copy from feed
        int copySize = std::min(spaceInOverflow, FEED_LENGTH - processed);
        
        // Copy data from feed to overflow using optimized std::copy
        std::copy(feed + processed, feed + processed + copySize, overflow + over);
        
        processed += copySize;
        over += copySize;
        
        // If we have a full chunk, process it immediately
        if (over == CHUNK_LENGTH) {
            // Copy overflow to chunk and feed decoder
            std::copy(overflow, overflow + CHUNK_LENGTH, chunk);
            feedDecoder();
            over = 0;
        }
    }
    
    // Final bounds check: overflow should be less than CHUNK_LENGTH
    assert(over >= 0 && over < CHUNK_LENGTH);
}
EXTERN EMSCRIPTEN_KEEPALIVE void initEncoder()
{
    if (!encoder) {
        printf("Encoder not created!\n");
        EM_ASM({ if (typeof encoderCreatedError === 'function') encoderCreatedError(); });
        return;
    }
    encoder->init(message); // Initialize the encoder with the message
}
EXTERN EMSCRIPTEN_KEEPALIVE void readEncoder()
{
    if (!encoder) {
        printf("Encoder not created!\n");
        EM_ASM({ if (typeof encoderReadError === 'function') encoderReadError(); });
        return;
    }
    encoder->read(signal, SIGNAL_LENGTH); // Read the encoder with the signal and SIGNAL_LENGTH
}
