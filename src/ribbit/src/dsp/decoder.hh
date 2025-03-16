/*
Decoder for Ribbit

Copyright 2023 Ahmet Inan <inan@aicodix.de>
*/

#pragma once

#include <cmath> // Include the math library for mathematical functions
#include <iostream> // Include the iostream library for input and output
#include <algorithm> // Include the algorithm library for sorting and searching

namespace DSP
{
    using std::abs; // Use the abs function from the standard library for absolute value
    using std::cos; // Use the cos function from the standard library for cosine
    using std::min; // Use the min function from the standard library for minimum
    using std::sin; // Use the sin function from the standard library for sine
}

#include "simplex_decoder.hh" // Include the simplex decoder for metadata
#include "schmidl_cox.hh" // Include the Schmidl-Cox correlator for frame synchronization
#include "bip_buffer.hh" // Include the BipBuffer class for circular buffer
#include "xorshift.hh" // Include the Xorshift class for scrambling
#include "complex.hh" // Include the Complex class for complex numbers
#include "permute.hh" // Include the Permute class for interleaving
#include "hilbert.hh" // Include the Hilbert class for analytic signal
#include "blockdc.hh" // Include the BlockDC class for DC offset removal
#include "bitman.hh" // Include the Bitman class for bit manipulation
#include "phasor.hh" // Include the Phasor class for frequency correction
#include "polar.hh" // Include the Polar class for polar code decoding
#include "fft.hh" // Include the FFT class for fast Fourier transform
#include "mls.hh" // Include the MLS class for scrambling
#include "psk.hh" // Include the PSK class for modulation and demodulation

class Decoder
{
    typedef DSP::Complex<float> cmplx; // Define the complex number type for the decoder
    typedef int8_t code_type; // Define the code type for the decoder
    typedef PhaseShiftKeying<2, cmplx, code_type> bpsk;    // Binary Phase Shift Keying modulation for BPSK (BPSK is a binary modulation scheme that uses a single carrier frequency to transmit data)
    typedef PhaseShiftKeying<4, cmplx, code_type> qpsk;    // Quadrature Phase Shift Keying modulation for QPSK (QPSK is a binary modulation scheme that uses two carrier frequencies to transmit data)

    // Core parameters for the decoder
    static const int code_order = 12;                      // Order of the polar code (determines code length) (12)
    static const int mesg_bytes = 256;                     // Size of the payload message in bytes (256)
    static const int code_len = 1 << code_order;           // Length of the error correction code (2^12 = 4096)
    static const int meta_len = 63;                        // Length of metadata/header sequence (63)

    // OFDM parameters
    static const int symbol_length = 256;                  // FFT size / number of samples per OFDM symbol
    static const int guard_length = symbol_length / 8;     // Cyclic prefix length (32)
    static const int extended_length = symbol_length + guard_length;  // Total symbol length (288)
    static const int filter_length = 33;                   // Length of Hilbert transform filter (33)
    static const int subcarrier_count = 64;                // Number of OFDM subcarriers
    static const int payload_symbols = 32;                 // Number of OFDM symbols for payload
    static const int first_subcarrier = -subcarrier_count / 2;  // Index of first subcarrier (for centered spectrum) (-64 / 2 = -32)

    // Buffer parameters
    static const int buffer_length = 5 * extended_length;    // Size of circular buffer for input samples (5 times the extended length) (5 * 288 = 1440)
    static const int search_position = 2 * extended_length;  // Position to start searching for frame sync (2 times the extended length) (2 * 288 = 576)

    // Signal processing components
    DSP::FastFourierTransform<symbol_length, cmplx, -1> fwd;  // FFT for OFDM demodulation (Fast Fourier Transform)
    SchmidlCox<float, cmplx, search_position, symbol_length, guard_length> correlator;  // Frame synchronization (Schmidl-Cox correlator)
    DSP::BlockDC<float, float> block_dc;                  // DC offset removal (Block DC offset removal)
    DSP::Hilbert<cmplx, filter_length> hilbert;           // Hilbert transform for analytic signal (Hilbert transform)
    DSP::BipBuffer<cmplx, buffer_length> buffer;          // Circular buffer for input samples (BipBuffer)
    DSP::Phasor<cmplx> osc;                               // Oscillator for frequency correction (Phasor)

    // Error correction components
    CODE::SimplexDecoder<4> simplex;                      // Simplex code decoder for metadata (Simplex code decoder)
    CODE::ReverseFisherYatesShuffle<code_len> shuffle;    // Interleaver (Reverse Fisher-Yates shuffle)
    PolarDecoder<code_type> polar;                        // Polar code decoder for payload (Polar code decoder)

    // Working buffers
    cmplx temp[extended_length];                          // Temporary buffer for OFDM symbol processing (Temporary buffer)
    cmplx freq[symbol_length];                            // Frequency domain buffer after FFT (Frequency domain buffer)
    cmplx prev[subcarrier_count];                         // Previous symbol's subcarriers for differential demod (Previous symbol's subcarriers)
    cmplx cons[subcarrier_count];                         // Constellation points after differential demod (Constellation points)
    code_type code[code_len];                             // Buffer for decoded bits (Buffer for decoded bits)
    code_type meta[meta_len];                             // Buffer for metadata bits (Buffer for metadata bits)

    // State variables
    int symbol_number = payload_symbols;                  // Current OFDM symbol being processed (Current OFDM symbol)
    int symbol_position = search_position;                // Position in buffer for current symbol (Position in buffer)
    int stored_position = 0;                              // Saved position of detected frame start (Saved position)
    int staged_position = 0;                              // Position ready for processing (Position ready)
    int accumulated = 0;                                  // Number of samples processed in current block (Number of samples processed)
    float stored_cfo_rad = 0;                             // Saved carrier frequency offset (Saved carrier frequency offset)
    float staged_cfo_rad = 0;                             // Frequency offset ready for correction (Frequency offset ready)
    bool stored_check = false;                            // Flag for stored frame detection (Flag for stored frame detection)
    bool staged_check = false;                            // Flag for staged frame ready (Flag for staged frame ready)
    const cmplx *buf;                                     // Pointer to current buffer position (Pointer to current buffer position)

    // Helper functions
    static int bin(int carrier)
    {
        // Calculate the bin index for a given carrier
        // This function maps the carrier index to the corresponding bin in the FFT output
        // The carrier index can be negative, so we add the first_subcarrier and symbol_length
        // and then take modulo symbol_length to ensure the result is within the valid range
        return (carrier + first_subcarrier + symbol_length) % symbol_length;
    }

    // Convert a boolean bit to a bipolar value (-1 for 0, 1 for 1)
    static int nrz(bool bit)
    {
        return 1 - 2 * bit;
    }

    // Differential demodulation or erase if previous symbol is not detected
    static cmplx demod_or_erase(cmplx curr, cmplx prev)
    {
        // If the previous symbol is not detected, return 0
        if (norm(prev) <= 0)
            return 0;
        // Differential demodulation
        cmplx cons = curr / prev;
        // If the constellation point is too far from the origin, return 0
        if (norm(cons) > 4)
            return 0;
        // Return the constellation point
        return cons;
    }

    // Generate the correlation sequence for frame synchronization
    const cmplx *corSeq()
    {
        // Generate the correlation sequence
        CODE::MLS seq(0b1100111);
        // Initialize the frequency domain buffer
        for (int i = 0; i < symbol_length; ++i)
            freq[i] = 0;
        // Generate the correlation sequence
        for (int i = 1; i < subcarrier_count; ++i)
            freq[bin(i)] = nrz(seq());
        // Return the frequency domain buffer
        return freq;
    }

    // Convert a real sample to an analytic signal
    cmplx analytic(float real)
    {
        // Convert the real sample to an analytic signal
        return hilbert(block_dc(real));
    }

    // Calculate the precision of the demodulation
    float precision()
    {
        // Initialize the precision variables
        float sp = 0, np = 0;
        // Calculate the precision of the demodulation
        for (int i = 0; i < subcarrier_count; ++i)
        {
            // Calculate the hard decision
            code_type tmp[2];
            qpsk::hard(tmp, cons[i]);
            cmplx hard = qpsk::map(tmp);
            cmplx error = cons[i] - hard;
            // Update the precision variables
            sp += norm(hard);
            np += norm(error);
        }
        // Return the precision of the demodulation
        return sp / np;
    }

    // Demodulate the received signal and convert to soft bits
    void demap()
    {
        // Calculate the precision of the demodulation
        float pre = precision();
        // Demodulate the received signal and convert to soft bits
        for (int i = 0; i < subcarrier_count; ++i)
        {
            // Convert the demodulated symbol to soft bits
            qpsk::soft(code + 2 * (symbol_number * subcarrier_count + i), cons[i], pre);
        }
    }

    // Detect the preamble and extract metadata
    int preamble()
    {
        // Initialize the NCO for frequency correction
        DSP::Phasor<cmplx> nco;
        nco.omega(-staged_cfo_rad);
        
        // Process the received signal
        for (int i = 0; i < symbol_length; ++i)
            temp[i] = buf[staged_position + extended_length + i] * nco();
        fwd(freq, temp);
        
        // Extract metadata bits using differential demodulation
        for (int i = 0; i < meta_len; ++i)
            cons[i] = demod_or_erase(freq[bin(i + 1)], freq[bin(i)]);
        
        // Convert to soft bits using BPSK demodulation
        for (int i = 0; i < meta_len; ++i)
            bpsk::soft(meta + i, cons[i], 8);
        
        // Descramble using MLS sequence
        CODE::MLS seq(0b1000011);
        for (int i = 0; i < meta_len; ++i)
            meta[i] *= nrz(seq());
        
        // Decode metadata using simplex decoder
        return simplex(meta);
    }

    // Process the received signal and extract payload data
    bool process()
    {
        // indicate payload symbols
        // printf("symbol_number: %d \n", symbol_number);
        if (staged_check)
        {
            staged_check = false;
            if (preamble() == 1)
            {
                // printf("preamble() == 1 \n");
                osc.omega(-staged_cfo_rad); // update the NCO frequency
                symbol_position = staged_position; // update the position of the first symbol
                symbol_number = -1; // start from the first symbol
                return false; // return false to indicate that the preamble is not yet detected
            }
        }
        // process the payload symbols
        bool fetch_payload = false;
        if (symbol_number < payload_symbols)
        {
            // Apply the NCO to the input signal
            for (int i = 0; i < extended_length; ++i)
            {
                temp[i] = buf[symbol_position + i] * osc(); // apply the NCO to the input signal
            }
            fwd(freq, temp); // perform the FFT
            if (symbol_number >= 0)
            {
                // Differential demodulation
                for (int i = 0; i < subcarrier_count; ++i)
                {
                    cons[i] = demod_or_erase(freq[bin(i)], prev[i]);
                }
                // Convert the demodulated symbols to soft bits
                demap();
            }
            if (++symbol_number == payload_symbols)
            {
                // Indicate that the payload symbols are ready
                fetch_payload = true;
            }
            for (int i = 0; i < subcarrier_count; ++i)
            {
                // Update the previous symbol's subcarriers
                prev[i] = freq[bin(i)];
            }
        }
        return fetch_payload; // return true if the payload symbols are ready
    }

public:
    Decoder() : correlator(corSeq())
    {
        block_dc.samples(filter_length); // initialize the DC offset removal filter
    }

    int fetch(uint8_t *payload)
    {
        shuffle(code); // interleave the code
        int result = polar(payload, code); // decode the payload
        CODE::Xorshift32 scrambler; // initialize the scrambler
        for (int i = 0; i < mesg_bytes; ++i)
        {
            payload[i] ^= scrambler(); // scramble the payload
        }
        return result; // return the result of the decoding
    }

    bool original_feed(const float *audio_buffer, int sample_count, int offset)
    {
        assert(sample_count <= extended_length); // assert that the sample count is less than the extended length
        for (int i = 0; i < sample_count; ++i)
        {
            if (correlator(buffer(analytic(audio_buffer[i + offset])))) // check if the correlator detects a frame
            {
                stored_cfo_rad = correlator.cfo_rad; // update the CFO
                stored_position = correlator.symbol_pos + accumulated - extended_length; // update the position of the stored frame
                stored_check = true; // set the stored check flag
            }
            if (++accumulated == extended_length)
                buf = buffer(); // update the buffer pointer
        }
        if (accumulated >= extended_length)
        {
            accumulated -= extended_length; // update the accumulated samples
            if (stored_check)
            {
                staged_cfo_rad = stored_cfo_rad; // update the CFO
                staged_position = stored_position; // update the position of the staged frame
                staged_check = true; // set the staged check flag
                stored_check = false; // reset the stored check flag
            }
            return process(); // process the received signal
        }
        return false; // return false if the frame is not detected
    }

    bool feed(const float *audio_buffer, int sample_count)
    {
        assert(sample_count <= extended_length); // assert that the sample count is less than the extended length
        // indicate start and end point of audio buffer feed
        for (int i = 0; i < sample_count; ++i) {
            // check if the correlator detects a frame
            if (correlator(buffer(analytic(audio_buffer[i])))) 
            {
                stored_cfo_rad = correlator.cfo_rad; // update the CFO
                stored_position = correlator.symbol_pos + accumulated - extended_length; // update the position of the stored frame
                stored_check = true; // set the stored check flag
            }

            // update the accumulated samples
            if (++accumulated == extended_length)
            {
                buf = buffer(); // update the buffer pointer
            }
        }
        if (accumulated >= extended_length)
        {
            accumulated -= extended_length; // update the accumulated samples
            if (stored_check)
            {
                staged_cfo_rad = stored_cfo_rad; // update the CFO
                staged_position = stored_position; // update the position of the staged frame
                staged_check = true; // set the staged check flag
                stored_check = false; // reset the stored check flag
            }
            return process(); // process the received signal
        }
        return false; // return false if the frame is not detected
    }
};
