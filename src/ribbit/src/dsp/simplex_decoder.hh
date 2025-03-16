/*
Soft decoder for Simplex codes

Copyright 2020 Ahmet Inan <inan@aicodix.de>

This code implements a soft decoder for simplex codes.
The simplex codes are a type of linear block code that are used in communication systems.
The decoder takes an array of codewords and returns the index of the codeword with the highest magnitude.
The codewords are represented as int8_t arrays, which means they can only hold values between -128 and 127.
The decoder uses a simple sum and difference calculation to decode the codewords.

Purpose:
- Decode the codewords and return the index of the codeword with the highest magnitude.
- The codewords are represented as int8_t arrays, which means they can only hold values between -128 and 127.
- The decoder uses a simple sum and difference calculation to decode the codewords.

Input:
- An array of codewords

Output:
- The index of the codeword with the highest magnitude

Example:
- Input: [1, 2, 3, 4]
- Output: 3

Usage:
- Initialize the decoder
- Call the decoder with the codewords
- Get the index of the codeword with the highest magnitude

Process Flow:
1. Initialize an array to store the sum of the codewords
2. Initialize the first codeword
3. Initialize the second codeword
4. Loop through the codewords
5. Calculate the sum of the codewords
6. Calculate the difference of the codewords
7. Return the index of the codeword with the highest magnitude

*/

#pragma once

namespace CODE {

// SimplexDecoder class template for different code lengths
template <int K>
class SimplexDecoder
{
	static const int W = 1 << K; // Calculate the number of possible codewords
public:
	int operator()(const int8_t *code)
	{
		int sum[W]; // Initialize an array to store the sum of the codewords
		sum[0] = code[0]; // Initialize the first codeword
		sum[1] = -code[0]; // Initialize the second codeword
		for (int i = 1; i < W-2; i += 2) { // Loop through the codewords
			sum[i+1] = code[i] + code[i+1]; // Calculate the sum of the codewords
			sum[i+2] = code[i] - code[i+1]; // Calculate the difference of the codewords
		}
		for (int h = 2; h < W; h *= 2) { // Loop through the codewords
			for (int i = 0; i < W; i += 2 * h) { // Loop through the codewords
				for (int j = i; j < i + h; ++j) { // Loop through the codewords
					int x = sum[j] + sum[j+h]; // Calculate the sum of the codewords
					int y = sum[j] - sum[j+h]; // Calculate the difference of the codewords
					sum[j] = x; // Update the codeword
					sum[j+h] = y; // Update the codeword
				}
			}
		}
		int word = 0, best = 0, next = 0; // Initialize the word, best, and next codewords
		for (int msg = 0; msg < W; ++msg) { // Loop through the codewords
			int mag = sum[msg]; // Calculate the magnitude of the codeword
			if (mag > best) { // If the magnitude is greater than the best codeword
				next = best; // Update the next codeword
				best = mag; // Update the best codeword
				word = msg; // Update the word codeword
			} else if (mag > next) { // If the magnitude is greater than the next codeword
				next = mag; // Update the next codeword
			}
		}
		if (best == next) // If the best codeword is equal to the next codeword
			return -1; // Return -1 if the best codeword is equal to the next codeword
		return word; // Return the word codeword
	}
};

// Specialization for code length 2
template <>
class SimplexDecoder<2>
{
	static const int K = 2; // Code length
	static const int W = 1 << K; // Number of possible codewords
public:
	int operator()(const int8_t *code) // Operator for code length 2
	{
		int tmp[4] = { 
			code[0], -code[0], // Initialize the codewords
			code[1] + code[2], // Calculate the sum of the codewords
			code[1] - code[2], // Calculate the difference of the codewords
		};
		int sum[W] = {
			tmp[0] + tmp[2], // Calculate the sum of the codewords
			tmp[1] + tmp[3], // Calculate the sum of the codewords
			tmp[0] - tmp[2], // Calculate the difference of the codewords
			tmp[1] - tmp[3], // Calculate the difference of the codewords
		};
		int word = 0, best = 0, next = 0; // Initialize the word, best, and next codewords
		for (int msg = 0; msg < W; ++msg) { // Loop through the codewords
			int mag = sum[msg]; // Calculate the magnitude of the codeword
			if (mag > best) { // If the magnitude is greater than the best codeword
				next = best; // Update the next codeword
				best = mag; // Update the best codeword
				word = msg; // Update the word codeword
			} else if (mag > next) { // If the magnitude is greater than the next codeword
				next = mag; // Update the next codeword
			}
		}
		if (best == next) // If the best codeword is equal to the next codeword
			return -1; // Return -1 if the best codeword is equal to the next codeword
		return word; // Return the word codeword
	}
};

// Specialization for code length 3
template <>
class SimplexDecoder<3>
{
	static const int K = 3; // Code length
	static const int W = 1 << K; // Number of possible codewords
public:
	int operator()(const int8_t *c) // Operator for code length 3
	{
		int d[8] = {
			c[0], -c[0], // Initialize the codewords
			c[1] + c[2], // Calculate the sum of the codewords
			c[1] - c[2], // Calculate the difference of the codewords
			c[3] + c[4], // Calculate the sum of the codewords
			c[3] - c[4], // Calculate the difference of the codewords
			c[5] + c[6], // Calculate the sum of the codewords
			c[5] - c[6], // Calculate the difference of the codewords
		};
		int e[8] = {
			d[0] + d[2], // Calculate the sum of the codewords
			d[1] + d[3], // Calculate the sum of the codewords
			d[0] - d[2], // Calculate the difference of the codewords
			d[1] - d[3], // Calculate the difference of the codewords
			d[4] + d[6], // Calculate the sum of the codewords
			d[5] + d[7], // Calculate the sum of the codewords
			d[4] - d[6], // Calculate the difference of the codewords
			d[5] - d[7], // Calculate the difference of the codewords
		};
		int sum[W] = {
			e[0] + e[4], // Calculate the sum of the codewords	
			e[1] + e[5], // Calculate the sum of the codewords
			e[2] + e[6], // Calculate the sum of the codewords
			e[3] + e[7], // Calculate the sum of the codewords
			e[0] - e[4], // Calculate the difference of the codewords
			e[1] - e[5], // Calculate the difference of the codewords
			e[2] - e[6], // Calculate the difference of the codewords
			e[3] - e[7], // Calculate the difference of the codewords
		};
		int word = 0, best = 0, next = 0; // Initialize the word, best, and next codewords
		for (int msg = 0; msg < W; ++msg) { // Loop through the codewords
			int mag = sum[msg]; // Calculate the magnitude of the codeword
			if (mag > best) { // If the magnitude is greater than the best codeword
				next = best; // Update the next codeword
				best = mag; // Update the best codeword
				word = msg; // Update the word codeword
			} else if (mag > next) { // If the magnitude is greater than the next codeword
				next = mag; // Update the next codeword
			}
		}
		if (best == next) // If the best codeword is equal to the next codeword
			return -1; // Return -1 if the best codeword is equal to the next codeword
		return word; // Return the word codeword
	}
};

// Specialization for code length 4
template <>
class SimplexDecoder<4>
{
	static const int K = 4; // Code length
	static const int W = 1 << K; // Number of possible codewords
public:
	int operator()(const int8_t *c) // Operator for code length 4
	{
		int d[16] = {
			c[0], -c[0], // Initialize the codewords
			c[1] + c[2], // Calculate the sum of the codewords
			c[1] - c[2], // Calculate the difference of the codewords
			c[3] + c[4], // Calculate the sum of the codewords
			c[3] - c[4], // Calculate the difference of the codewords
			c[5] + c[6], // Calculate the sum of the codewords
			c[5] - c[6], // Calculate the difference of the codewords
			c[7] + c[8], // Calculate the sum of the codewords
			c[7] - c[8], // Calculate the difference of the codewords
			c[9] + c[10], // Calculate the sum of the codewords
			c[9] - c[10], // Calculate the difference of the codewords
			c[11] + c[12], // Calculate the sum of the codewords
			c[11] - c[12], // Calculate the difference of the codewords
			c[13] + c[14], // Calculate the sum of the codewords
			c[13] - c[14], // Calculate the difference of the codewords
		};
		int e[16] = {
			d[0] + d[2], // Calculate the sum of the codewords
			d[1] + d[3], // Calculate the sum of the codewords
			d[0] - d[2], // Calculate the difference of the codewords
			d[1] - d[3], // Calculate the difference of the codewords
			d[4] + d[6], // Calculate the sum of the codewords
			d[5] + d[7], // Calculate the sum of the codewords
			d[4] - d[6], // Calculate the difference of the codewords
			d[5] - d[7], // Calculate the difference of the codewords
			d[8] + d[10], // Calculate the sum of the codewords
			d[9] + d[11], // Calculate the sum of the codewords
			d[8] - d[10], // Calculate the difference of the codewords
			d[9] - d[11], // Calculate the difference of the codewords
			d[12] + d[14], // Calculate the sum of the codewords
			d[13] + d[15], // Calculate the sum of the codewords
			d[12] - d[14], // Calculate the difference of the codewords
			d[13] - d[15], // Calculate the difference of the codewords
		};
		int f[16] = {
			e[0] + e[4], // Calculate the sum of the codewords
			e[1] + e[5], // Calculate the sum of the codewords
			e[2] + e[6], // Calculate the sum of the codewords
			e[3] + e[7], // Calculate the sum of the codewords
			e[0] - e[4], // Calculate the difference of the codewords
			e[1] - e[5], // Calculate the difference of the codewords
			e[2] - e[6], // Calculate the difference of the codewords
			e[3] - e[7], // Calculate the difference of the codewords
			e[8] + e[12], // Calculate the sum of the codewords
			e[9] + e[13], // Calculate the sum of the codewords
			e[10] + e[14], // Calculate the sum of the codewords
			e[11] + e[15], // Calculate the sum of the codewords
			e[8] - e[12], // Calculate the difference of the codewords
			e[9] - e[13], // Calculate the difference of the codewords
			e[10] - e[14], // Calculate the difference of the codewords
			e[11] - e[15], // Calculate the difference of the codewords
		};
		int sum[W] = {
			f[0] + f[8], // Calculate the sum of the codewords
			f[1] + f[9], // Calculate the sum of the codewords
			f[2] + f[10], // Calculate the sum of the codewords
			f[3] + f[11], // Calculate the sum of the codewords
			f[4] + f[12], // Calculate the sum of the codewords
			f[5] + f[13], // Calculate the sum of the codewords
			f[6] + f[14], // Calculate the sum of the codewords
			f[7] + f[15], // Calculate the sum of the codewords
			f[0] - f[8], // Calculate the difference of the codewords
			f[1] - f[9], // Calculate the difference of the codewords
			f[2] - f[10], // Calculate the difference of the codewords
			f[3] - f[11], // Calculate the difference of the codewords
			f[4] - f[12], // Calculate the difference of the codewords
			f[5] - f[13], // Calculate the difference of the codewords
			f[6] - f[14], // Calculate the difference of the codewords
			f[7] - f[15], // Calculate the difference of the codewords
		};
		int word = 0, best = 0, next = 0; // Initialize the word, best, and next codewords
		for (int msg = 0; msg < W; ++msg) { // Loop through the codewords
			int mag = sum[msg]; // Calculate the magnitude of the codeword
			if (mag > best) { // If the magnitude is greater than the best codeword
				next = best; // Update the next codeword
				best = mag; // Update the best codeword
				word = msg; // Update the word codeword
			} else if (mag > next) { // If the magnitude is greater than the next codeword
				next = mag; // Update the next codeword
			}
		}
		if (best == next) // If the best codeword is equal to the next codeword
			return -1; // Return -1 if the best codeword is equal to the next codeword
		return word; // Return the word codeword
	}
};

}

