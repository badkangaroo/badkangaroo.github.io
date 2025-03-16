/*
CA-SCL polar coding for Ribbit

Copyright 2023 Ahmet Inan <inan@aicodix.de>

A Polar encoder and decoder for the CA-SCL protocol.
The Polar encoder and decoder are used to encode and decode the payload message.

*/

#pragma once

#include <cmath>
#include <iostream>
#include <algorithm>

#include "crc.hh"
#include "bitman.hh"
#include "polar_tables.hh"
#include "polar_helper.hh"
#include "polar_encoder.hh"
#include "polar_list_decoder.hh"

template<typename code_type>
class PolarEncoder {
	static const int code_order = 12; // Define the code order for the encoder
	static const int data_bits = 2048; // Define the data bits for the encoder
	static const int mesg_bits = data_bits + 32; // Define the mesg bits for the encoder
	CODE::CRC<uint32_t> crc; // Define the crc for the encoder
	CODE::PolarSysEnc<code_type> encode; // Define the encode for the encoder
	int8_t mesg[mesg_bits]; // Define the mesg for the encoder

	static int nrz(bool bit) {
		return 1 - 2 * bit; // Define the nrz for the encoder
	}

public:
	PolarEncoder() : crc(0x8F6E37A0) {} // Define the constructor for the encoder

	void operator()(code_type *code, const uint8_t *message) {
		for (int i = 0; i < data_bits; ++i) // Loop through the data_bits for the encoder
			mesg[i] = nrz(CODE::get_le_bit(message, i)); // Set the mesg for the encoder
		crc.reset(); // Reset the crc for the encoder
		for (int i = 0; i < data_bits / 8; ++i) // Loop through the data_bits for the encoder
			crc(message[i]); // Reset the crc for the encoder
		for (int i = 0; i < 32; ++i) // Loop through the 32 for the encoder
			mesg[i + data_bits] = nrz((crc() >> i) & 1); // Set the mesg for the encoder
		encode(code, mesg, frozen_4096_2080, code_order); // Encode the code using the encode for the encoder
	}
};

template<typename code_type>
class PolarDecoder {
#ifdef __AVX2__
	typedef SIMD<code_type, 32 / sizeof(code_type)> mesg_type; // Define the mesg type for the decoder
#else
	typedef SIMD<code_type, 16 / sizeof(code_type)> mesg_type; // Define the mesg type for the decoder
#endif
	typedef typename CODE::PolarHelper<mesg_type>::PATH metric_type; // Define the metric for the decoder
	static const int code_order = 12; // Define the code order for the decoder
	static const int code_len = 1 << code_order; // Define the code length for the decoder
	static const int data_bits = 2048; // Define the data bits for the decoder
	static const int mesg_bits = data_bits + 32; // Define the mesg bits for the decoder
	CODE::CRC<uint32_t> crc; // Define the crc for the decoder
	CODE::PolarEncoder<mesg_type> encode; // Define the encode for the decoder
	CODE::PolarListDecoder<mesg_type, code_order> decode; // Define the decode for the decoder
	mesg_type mesg[mesg_bits], mess[code_len]; // Define the mesg and mess for the decoder

	void systematic(const uint32_t *frozen_bits) {
		encode(mess, mesg, frozen_bits, code_order); // Encode the mesg using the encode for the decoder
		for (int i = 0, j = 0; i < code_len && j < mesg_bits; ++i) // Loop through the code_len and mesg_bits for the decoder
			if (!((frozen_bits[i / 32] >> (i % 32)) & 1)) // If the frozen_bits is 1 for the decoder
				mesg[j++] = mess[i]; // Set the mesg for the decoder
	}

public:
	PolarDecoder() : crc(0x8F6E37A0) {} // Define the constructor for the decoder

	int operator()(uint8_t *message, const code_type *code) {
		metric_type metric[mesg_type::SIZE];	// Define the metric for the decoder
		decode(metric, mesg, code, frozen_4096_2080, code_order); // Decode the codeword using the decoder
		systematic(frozen_4096_2080); // Systematic the codeword using the systematic function
		int order[mesg_type::SIZE]; // Define the order for the decoder
		for (int k = 0; k < mesg_type::SIZE; ++k) // Loop through the order for the decoder
			order[k] = k; // Set the order for the decoder
		std::sort(order, order + mesg_type::SIZE, [metric](int a, int b) { return metric[a] < metric[b]; }); // Sort the order for the decoder
		int best = -1; // Define the best for the decoder
		for (int k = 0; k < mesg_type::SIZE; ++k) { // Loop through the best for the decoder
			crc.reset(); // Reset the crc for the decoder
			for (int i = 0; i < mesg_bits; ++i) // Loop through the mesg_bits for the decoder
				crc(mesg[i].v[order[k]] < 0); // Reset the crc for the decoder
			if (crc() == 0) { // If the crc is 0 for the decoder
				best = order[k]; // Set the best for the decoder
				break; // Break the loop for the decoder
			}
		}
		if (best < 0) // If the best is less than 0 for the decoder
			return -1; // Return -1 for the decoder
		int flips = 0; // Define the flips for the decoder
		for (int i = 0, j = 0; i < data_bits; ++i, ++j) { // Loop through the data_bits for the decoder
			while ((frozen_4096_2080[j / 32] >> (j % 32)) & 1) // While the frozen_4096_2080 is 1 for the decoder
				++j; // Increment the j for the decoder
			bool received = code[j] < 0; // Define the received for the decoder
			bool decoded = mesg[i].v[best] < 0; // Define the decoded for the decoder
			flips += received != decoded; // Increment the flips for the decoder
			CODE::set_le_bit(message, i, decoded); // Set the message for the decoder
		}
		return flips; // Return the flips for the decoder
	}
};

