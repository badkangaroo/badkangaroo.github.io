/*
Class of pseudorandom number generators, discovered by George Marsaglia

Copyright 2018 Ahmet Inan <inan@aicodix.de>

Purpose:
- A class of pseudorandom number generators, discovered by George Marsaglia
- The class is used to generate pseudorandom numbers

Input:
- A class of pseudorandom number generators, discovered by George Marsaglia

Output:
- A class of pseudorandom number generators, discovered by George Marsaglia

Process Flow:
1. Initialize the pseudorandom number generators
2. Generate pseudorandom numbers
*/
#pragma once

namespace CODE {

class Xorshift32
{
	static const uint32_t Y = 2463534242; // Define the seed
	uint32_t y_; // Define the seed
public:
	typedef uint32_t result_type; // Define the result type
	static constexpr result_type min()
	{
		return 0; // Return the minimum value
	}
	static constexpr result_type max()
	{
		return UINT32_MAX; // Return the maximum value
	}
	Xorshift32(uint32_t y = Y) : y_(y) {} // Initialize the seed
	void reset(uint32_t y = Y)
	{
		y_ = y; // Reset the seed
	}
	uint32_t operator()()
	{
		y_ ^= y_ << 13; // XOR the seed with the seed left-shifted by 13
		y_ ^= y_ >> 17; // XOR the seed with the seed right-shifted by 17
		y_ ^= y_ << 5; // XOR the seed with the seed left-shifted by 5
		return y_; // Return the seed
	}
};

class Xorshift64
{
	static const uint64_t X = 88172645463325252; // Define the seed
	uint64_t x_; // Define the seed
public:
	typedef uint64_t result_type; // Define the result type
	static constexpr result_type min()
	{
		return 0; // Return the minimum value
	}
	static constexpr result_type max()
	{
		return UINT64_MAX; // Return the maximum value
	}
	Xorshift64(uint64_t x = X) : x_(x) {} // Initialize the seed
	void reset(uint64_t x = X)
	{
		x_ = x; // Reset the seed
	}
	uint64_t operator()()
	{
		x_ ^= x_ << 13; // XOR the seed with the seed left-shifted by 13
		x_ ^= x_ >> 7; // XOR the seed with the seed right-shifted by 7
		x_ ^= x_ << 17; // XOR the seed with the seed left-shifted by 17
		return x_; // Return the seed
	}
};

class Xorwow
{
	static const uint32_t X = 123456789; // Define the seed
	static const uint32_t Y = 362436069; // Define the seed
	static const uint32_t Z = 521288629; // Define the seed
	static const uint32_t W = 88675123; // Define the seed
	static const uint32_t V = 5783321; // Define the seed
	static const uint32_t D = 6615241; // Define the seed
	uint32_t x_, y_, z_, w_, v_, d_; // Define the seed
public:
	typedef uint32_t result_type; // Define the result type
	
	// Return the minimum value
	static constexpr result_type min()
	{
		return 0; // Return the minimum value
	}

	// Return the maximum value
	static constexpr result_type max()
	{
		return UINT32_MAX; // Return the maximum value
	}

	// Initialize the seed
	Xorwow(uint32_t x = X, uint32_t y = Y,
		uint32_t z = Z, uint32_t w = W,
		uint32_t v = V, uint32_t d = D) :
		x_(x), y_(y), z_(z), w_(w), v_(v), d_(d) {} // Initialize the seed

	// Reset the seed
	void reset(uint32_t x = X, uint32_t y = Y,
		uint32_t z = Z, uint32_t w = W,
		uint32_t v = V, uint32_t d = D)
	{
		x_ = x; // Reset the seed
		y_ = y; // Reset the seed
		z_ = z; // Reset the seed
		w_ = w; // Reset the seed
		v_ = v; // Reset the seed
		d_ = d; // Reset the seed
	}

	// Generate a pseudorandom number
	uint32_t operator()()
	{
		uint32_t t = x_ ^ (x_ >> 2); // XOR the seed with the seed right-shifted by 2
		x_ = y_; y_ = z_; z_ = w_; w_ = v_; // Update the seed
		v_ = (v_ ^ (v_ << 4)) ^ (t ^ (t << 1)); // XOR the seed with the seed left-shifted by 4 and XOR the seed with the seed left-shifted by 1
		d_ += 362437; // Add 362437 to the seed
		return d_ + v_; // Return the seed
	}
};

// Xorshift128 class
class Xorshift128
{
	static const uint32_t X = 123456789; // Define the seed
	static const uint32_t Y = 362436069; // Define the seed
	static const uint32_t Z = 521288629; // Define the seed
	static const uint32_t W = 88675123; // Define the seed
	uint32_t x_, y_, z_, w_; // Define the seed
public:
	typedef uint32_t result_type; // Define the result type

	// Return the minimum value
	static constexpr result_type min()
	{
		return 0; // Return the minimum value
	}

	// Return the maximum value
	static constexpr result_type max()
	{
		return UINT32_MAX; // Return the maximum value
	}

	// Initialize the seed
	Xorshift128(uint32_t x = X, uint32_t y = Y,
		uint32_t z = Z, uint32_t w = W) :
		x_(x), y_(y), z_(z), w_(w) {} // Initialize the seed

	// Reset the seed
	void reset(uint32_t x = X, uint32_t y = Y,
		uint32_t z = Z, uint32_t w = W)
	{
		x_ = x; // Reset the seed
		y_ = y; // Reset the seed
		z_ = z; // Reset the seed
		w_ = w; // Reset the seed
	}

	// Generate a pseudorandom number
	uint32_t operator()()
	{
		uint32_t t = (x_ ^ (x_ << 11)); // XOR the seed with the seed left-shifted by 11
		x_ = y_; y_ = z_; z_ = w_; // Update the seed
		w_ = (w_ ^ (w_ >> 19)) ^ (t ^ (t >> 8)); // XOR the seed with the seed right-shifted by 19 and XOR the seed with the seed left-shifted by 8
		return w_; // Return the seed
	}
};

}

