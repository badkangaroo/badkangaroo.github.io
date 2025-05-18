/*
Encoder for Ribbit

Copyright 2023 Ahmet Inan <inan@aicodix.de>

This code implements an encoder for the Ribbit protocol. The encoder is responsible for encoding
the payload message into a codeword that can be transmitted over a noisy channel.

The encoder uses a combination of a simplex encoder, a Fisher-Yates shuffle, and a polar code
encoder to encode the payload message. The simplex encoder is used to encode the metadata,
which includes the payload length and the CRC of the payload. The Fisher-Yates shuffle is used
to shuffle the code symbols, which helps to prevent frequency-selective fading and other channel
impairments from causing errors in the decoded data. The polar code encoder is used to encode
the payload message into a codeword that can be transmitted over a noisy channel.

The encoder also includes a noise symbol generator, which is used to generate a noise symbol
that is added to the payload message to help prevent frequency-selective fading and other
channel impairments from causing errors in the decoded data.

The encoder also includes a preamble generator, which is used to generate a preamble that is
added to the payload message to help synchronize the receiver with the transmitter.

The encoder also includes a payload symbol generator, which is used to generate a payload symbol
that is added to the payload message to help prevent frequency-selective fading and other
channel impairments from causing errors in the decoded data.

The encoder also includes a silence symbol generator, which is used to generate a silence symbol
that is added to the payload message to help prevent frequency-selective fading and other
channel impairments from causing errors in the decoded data.

Purpose:
- Encode the payload message into a codeword that can be transmitted over a noisy channel
- Generate a noise symbol to help prevent frequency-selective fading and other channel impairments
- Generate a preamble to help synchronize the receiver with the transmitter
- Generate a payload symbol to help prevent frequency-selective fading and other channel impairments
- Generate a silence symbol to help prevent frequency-selective fading and other channel impairments

Input:
- A payload message to be encoded

Output:
- A codeword that can be transmitted over a noisy channel

Process Flow:
	1. A payload message is given to the init function
	2. The payload message is encoded using the simplex code
	3. The payload message is encoded using the polar code
	4. The payload message is encoded using the Fisher-Yates shuffle
	5. The payload message is encoded using the noise symbol
	6. The payload message is encoded using the preamble
	7. The payload message is encoded using the payload symbol
	8. The payload message is encoded using the silence symbol

Once the payload message is encoded, the produce function is called to generate the codeword.

The read function is used to read the codeword from the buffer and return the codeword to the caller.

*/

#pragma once
#include <emscripten.h> // Include the emscripten library for web assembly
#include <stdio.h> // Include the stdio library for input and output
#include <cmath> // Include the cmath library for mathematical functions
#include <iostream> // Include the iostream library for input and output
#include <algorithm> // Include the algorithm library for sorting and searching
#include "simplex_encoder.hh" // Include the simplex encoder for metadata
#include "permute.hh" // Include the permute library for interleaving
#include "xorshift.hh" // Include the xorshift library for scrambling
#include "complex.hh" // Include the complex library for complex numbers
#include "bitman.hh" // Include the bitman library for bit manipulation
#include "deque.hh" // Include the deque library for double-ended queue
#include "polar.hh" // Include the polar library for polar code encoding
#include "utils.hh" // Include the utils library for utility functions
#include "const.hh" // Include the const library for constants
#include "fft.hh" // Include the fft library for fast Fourier transform
#include "mls.hh" // Include the mls library for maximum length sequence
#include "psk.hh" // Include the psk library for phase shift keying

class Encoder {
	typedef DSP::Complex<float> cmplx; // Define the complex number type for the encoder
	typedef int8_t code_type; // Define the code type for the encoder
	typedef PhaseShiftKeying<4, cmplx, code_type> qpsk; // Define the qpsk modulation type for the encoder
	static const int code_order = 12; // Define the code order for the encoder
	static const int mesg_bytes = 256; // Define the message bytes for the encoder
	static const int code_len = 1 << code_order; // Define the code length for the encoder
	static const int meta_len = 63; // Define the metadata length for the encoder
	static const int symbol_length = 256; // Define the symbol length for the encoder
	static const int subcarrier_count = 64; // Define the subcarrier count for the encoder
	static const int payload_symbols = 32; // Define the payload symbols for the encoder
	static const int noise_symbols = 14; // Define the noise symbols for the encoder
	static const int first_subcarrier = 16; // Define the first subcarrier for the encoder
	static const int guard_length = symbol_length / 8; // Define the guard length for the encoder
	static const int extended_length = symbol_length + guard_length; // Define the extended length for the encoder
	DSP::FastFourierTransform<symbol_length, cmplx, 1> bwd; // Define the forward Fourier transform for the encoder
	DSP::Deque<float, 3 * extended_length> buffer; // Define the buffer for the encoder
	CODE::MLS noise_seq; // Define the noise sequence for the encoder
	CODE::SimplexEncoder<6> simplex; // Define the simplex encoder for the encoder
	CODE::FisherYatesShuffle<code_len> shuffle; // Define the Fisher-Yates shuffle for the encoder
	PolarEncoder<code_type> polar; // Define the polar encoder for the encoder
	cmplx temp[symbol_length], freq[symbol_length]; // Define the temporary and frequency buffers for the encoder
	float guard[guard_length]; // Define the guard buffer for the encoder
	uint8_t mesg[mesg_bytes]; // Define the message buffer for the encoder
	code_type code[code_len], meta[meta_len]; // Define the code and metadata buffers for the encoder
	int symbol_number = payload_symbols; // Define the symbol number for the encoder
	int count_down = 0; // Define the count down for the encoder
	int noise_count = 0; // Define the noise count for the encoder

	static int nrz(bool bit) { // Define the nrz function for the encoder
		return 1 - 2 * bit; // Return the nrz value for the encoder
	}

	void noise_symbol() { // Define the noise symbol function for the encoder
		float factor = std::sqrt(symbol_length / float(subcarrier_count)); // Define the factor for the encoder
		for (int i = 0; i < subcarrier_count; ++i) // Loop through the subcarriers for the encoder
			freq[first_subcarrier + i] = factor * cmplx(nrz(noise_seq()), nrz(noise_seq())); // Define the frequency for the encoder
		symbol(); // Call the symbol function for the encoder
	}

	void schmidl_cox() { // Define the schmidl_cox function for the encoder
		CODE::MLS seq(0b1100111); // Define the sequence for the encoder
		freq[first_subcarrier] = std::sqrt(float(2 * symbol_length) / subcarrier_count); // Define the frequency for the encoder
		for (int i = first_subcarrier + 1; i < first_subcarrier + subcarrier_count; ++i) // Loop through the subcarriers for the encoder
			freq[i] = freq[i - 1] * cmplx(nrz(seq())); // Define the frequency for the encoder
		symbol(); // Call the symbol function for the encoder
		symbol(false); // Call the symbol function for the encoder with false output guard
	}

	// Preamble Generation (Encoder Side):
	// - Generates a preamble sequence for synchronization and metadata transmission
	// - Encoded using simplex code for error correction
	// - Scrambled using Maximum Length Sequence (MLS) with polynomial 0b1000011
	// - Guard interval for OFDM symbol protection
	void preamble(int data) {
		simplex(meta, data);  // Encode metadata using simplex code
		CODE::MLS seq(0b1000011);  // Maximum Length Sequence for scrambling
		freq[first_subcarrier] = std::sqrt(float(symbol_length) / subcarrier_count);
		
		// Differentially encode metadata bits
		for (int i = 0; i < meta_len; ++i)
			freq[first_subcarrier + 1 + i] = freq[first_subcarrier + i] * 
				cmplx(meta[i] * nrz(seq()));
		symbol(); // Call the symbol function for the encoder
	}

	void payload_symbol() { // Define the payload symbol function for the encoder
		for (int i = 0; i < subcarrier_count; ++i) // Loop through the subcarriers for the encoder
			freq[first_subcarrier + i] *= qpsk::map(code + 2 * (subcarrier_count * symbol_number + i)); // Define the frequency for the encoder
		symbol(); // Call the symbol function for the encoder
	}

	void silence() { // Define the silence function for the encoder
		for (int i = 0; i < symbol_length; ++i) // Loop through the symbol length for the encoder
			freq[i] = 0; // Define the frequency for the encoder
		symbol(); // Call the symbol function for the encoder
	}

	void symbol(bool output_guard = true) { // Define the symbol function for the encoder
		bwd(temp, freq); // Call the forward Fourier transform for the encoder
		for (int i = 0; i < symbol_length; ++i) // Loop through the symbol length for the encoder
			temp[i] /= std::sqrt(float(8 * symbol_length)); // Define the frequency for the encoder
		for (int i = 0; output_guard && i < guard_length; ++i) { // Loop through the guard length for the encoder
			float x = i / float(guard_length - 1); // Define the x value for the encoder
			float ratio(0.5); // Define the ratio for the encoder
			x = std::min(x, ratio) / ratio; // Define the x value for the encoder
			float y = 0.5f * (1 - std::cos(DSP::Const<float>::Pi() * x)); // Define the y value for the encoder
			float sum = DSP::lerp(guard[i], temp[i + symbol_length - guard_length].real(), y); // Define the sum for the encoder
			buffer.push_front(sum); // Push the sum to the buffer for the encoder
		}
		for (int i = 0; i < guard_length; ++i) // Loop through the guard length for the encoder
			guard[i] = temp[i].real(); // Define the guard for the encoder
		for (int i = 0; i < symbol_length; ++i) // Loop through the symbol length for the encoder
			buffer.push_front(temp[i].real()); // Push the real value to the buffer for the encoder
	}

	bool produce() { // Define the produce function for the encoder
		if (buffer.size() > buffer.max_size() - 2 * extended_length) // Check if the buffer is full for the encoder
			return false; // Return false if the buffer is full for the encoder
		switch (count_down) { // Switch through the count down for the encoder
			case 5: // Case 5 for the encoder
				if (noise_count) { // Check if the noise count is greater than 0 for the encoder
					--noise_count; // Decrement the noise count for the encoder
					noise_symbol(); // Call the noise symbol function for the encoder
					break; // Break the loop for the encoder
				}
				--count_down; // Decrement the count down for the encoder
			case 4: // Case 4 for the encoder
				schmidl_cox(); // Call the schmidl_cox function for the encoder
				--count_down; // Decrement the count down for the encoder
				break; // Break the loop for the encoder
			case 3: // Case 3 for the encoder
				preamble(1); // Call the preamble function for the encoder
				--count_down; // Decrement the count down for the encoder
				break; // Break the loop for the encoder
			case 2: // Case 2 for the encoder
				payload_symbol(); // Call the payload symbol function for the encoder
				if (++symbol_number == payload_symbols) // Check if the symbol number is equal to the payload symbols for the encoder
					--count_down; // Decrement the count down for the encoder
				break; // Break the loop for the encoder
			case 1: // Case 1 for the encoder
				silence(); // Call the silence function for the encoder
				--count_down; // Decrement the count down for the encoder
				break; // Break the loop for the encoder
			default: // Default case for the encoder
				return false; // Return false if the count down is not 0 for the encoder
		}
		return true; // Return true if the count down is 0 for the encoder
	}

public:
	Encoder() : noise_seq(0b100101010001) {} // Define the constructor for the encoder

	bool read(float *audio_buffer, int sample_count) { // Define the read function for the encoder
		for (int i = 0; i < sample_count; ++i) { // Loop through the sample count for the encoder
			produce(); // Call the produce function for the encoder
			if (buffer.size()) { // Check if the buffer is not empty for the encoder
				audio_buffer[i] = buffer.back(); // Define the audio buffer for the encoder
				buffer.pop_back(); // Pop the back value from the buffer for the encoder
			} else { // Otherwise for the encoder
				audio_buffer[i] = 0; // Define the audio buffer for the encoder
			}
		}
        EM_ASM({readEncoded($0);}, sample_count); // Call the readEncoded function for the encoder
		return !buffer.size(); // Return true if the buffer is empty for the encoder
	}

	// Function to expose metadata to JavaScript
	void expose_metadata(int data) {
		simplex(meta, data);  // Encode metadata using simplex code
		// Convert metadata to a JavaScript array and expose it
		EM_ASM({
			var metadata = new Array($1);
			for(var i = 0; i < $1; i++) {
				metadata[i] = HEAP8[$0 + i];
			}
			metadataExposed(metadata);
		}, meta, meta_len);
	}

	void init(const uint8_t *payload) {
		// Reset state variables
		symbol_number = 0; // Reset the symbol number for the encoder
		count_down = 5; // Reset the count down for the encoder
		noise_count = noise_symbols; // Reset the noise count for the encoder
		
		// Clear guard buffer
		for (int i = 0; i < guard_length; ++i) {
			guard[i] = 0; // Reset the guard buffer for the encoder
		}
		
		// Scramble the input payload
		CODE::Xorshift32 scrambler;
		for (int i = 0; i < mesg_bytes; ++i) {
			mesg[i] = payload[i] ^ scrambler(); // Scramble the input payload for the encoder
		}
		
		// Encode using polar code and shuffle
		polar(code, mesg); // Encode the payload using the polar code for the encoder
		shuffle(code); // Shuffle the code for the encoder
	}
};

