/*
Encoder for Simplex codes

Copyright 2020 Ahmet Inan <inan@aicodix.de>

This code implements a simplex encoder for simplex codes.
The simplex codes are a type of linear block code that are used in communication systems.
The encoder takes a message and returns an array of codewords.
The codewords are represented as int8_t arrays, which means they can only hold values between -128 and 127.
The encoder uses a simple sum and difference calculation to encode the message.

Purpose:
- Encode a message into a simplex code
- The simplex codes are a type of linear block code that are used in communication systems
- The encoder takes a message and returns an array of codewords
- The codewords are represented as int8_t arrays, which means they can only hold values between -128 and 127
- The encoder uses a simple sum and difference calculation to encode the message

Process Flow:
1. Initialize the codewords
2. Loop through the codewords
3. Calculate the sum of the codewords
4. Calculate the difference of the codewords
5. Return the codewords

Input:
- A message

Output:
- An array of codewords

Example:
- Input: "Hello, World!"
- Output: [1, 2, 3, 4]

Usage:
- Initialize the encoder
- Call the encoder with the message
- Get the codewords
*/

#pragma once

namespace CODE {

// SimplexEncoder class template for different code lengths
template <int K> 
class SimplexEncoder
{
	static const int W = 1 << K; // Calculate the number of possible codewords
	static const int N = (1 << K) - 1; // Calculate the number of codewords
	int8_t mod[W]; // Initialize the codewords

	// Parity function to check if the codeword is even or odd
	static bool parity(unsigned x)
	{
		x ^= x >> 16; // XOR the codeword with itself right-shifted by 16 bits
		x ^= x >> 8; // XOR the codeword with itself right-shifted by 8 bits
		x ^= x >> 4; // XOR the codeword with itself right-shifted by 4 bits
		x ^= x >> 2; // XOR the codeword with itself right-shifted by 2 bits
		x ^= x >> 1; // XOR the codeword with itself right-shifted by 1 bit
		return x & 1;
	}
public:
	SimplexEncoder()
	{
		for (int i = 0; i < W; ++i)
			mod[i] = 1 - 2 * parity(i); // Calculate the codewords
	}
	void operator()(int8_t *code, int msg)
	{
		for (int i = 0; i < N; ++i)
			code[i] = mod[msg&(i+1)]; // Calculate the codewords
	}
};

}

