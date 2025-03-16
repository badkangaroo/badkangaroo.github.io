/*
Reversible permutations

Copyright 2023 Ahmet Inan <inan@aicodix.de>

This code implements two types of reversible permutations:

1. Fisher-Yates Shuffle: This is a well-known algorithm that randomly shuffles an array.
2. Reverse Fisher-Yates Shuffle: This is the inverse of the Fisher-Yates Shuffle,
which rearranges the array back to its original order.

The Fisher-Yates Shuffle algorithm works by iterating through the array and swapping each element
with a randomly selected element that comes after it in the array. The Reverse Fisher-Yates Shuffle
algorithm works by iterating through the array and swapping each element with the element that comes
before it in the array.

The code also includes a static function, BitReversalPermute, which performs a bit-reversal
permutation on an array. This function is used to rearrange the elements of an array in a
bit-reversal order, which is useful for certain types of signal processing tasks.

Fisher-Yates Shuffle:

	1. Initialize a random number generator.
	2. Iterate through the array from the first element to the second-to-last element.
	3. For each element, generate a random number.
	4. Swap the current element with the element at the random index.

Reverse Fisher-Yates Shuffle:

	1. Initialize a random number generator.
	2. Iterate through the array from the first element to the second-to-last element.
	3. For each element, generate a random number.
	4. Swap the current element with the element at the random index.

BitReversalPermute:

	1. Initialize a bit-reversal index.
	2. Iterate through the array from the first element to the second-to-last element.
	3. For each element, generate a bit-reversal index.
	4. Swap the current element with the element at the bit-reversal index.

Fisher-Yates shuffle is used to randomize the order of elements in an array.
Reverse Fisher-Yates shuffle is used to restore the original order of elements in an array.
BitReversalPermute is used to rearrange the elements of an array in a bit-reversal order.

In the context of the ribbit project, the Fisher-Yates shuffle is used to randomize the order of
elements in the code array, which is used to interleave the code symbols. The Reverse Fisher-Yates
shuffle is used to restore the original order of the code symbols, which is used to deinterleave
the code symbols. The BitReversalPermute function is used to rearrange the elements of the code
array in a bit-reversal order, which is used to scramble the code symbols.

This ensures that the code symbols are interleaved and scrambled, which helps to prevent
frequency-selective fading and other channel impairments from causing errors in the decoded
data.
*/

#pragma once

#include "xorshift.hh"

namespace CODE {

template <int SIZE>
struct FisherYatesShuffle
{
	template <typename TYPE>
	void operator()(TYPE *array)
	{
		CODE::Xorshift32 prng;
		for (int i = 0; i < SIZE-1; ++i)
			std::swap(array[i], array[i + prng() % (SIZE - i)]);
	}
};

template <int SIZE>
class ReverseFisherYatesShuffle
{
	int seq[SIZE-1];
public:
	ReverseFisherYatesShuffle()
	{
		CODE::Xorshift32 prng;
		for (int i = 0; i < SIZE-1; ++i)
			seq[i] = i + prng() % (SIZE - i);
	}
	template <typename TYPE>
	void operator()(TYPE *array)
	{
		for (int i = SIZE-2; i >= 0; --i)
			std::swap(array[i], array[seq[i]]);
	}
};

template <int SIZE, typename TYPE>
static void BitReversalPermute(TYPE *array)
{
	static_assert(SIZE > 0 && (SIZE & (SIZE - 1)) == 0, "SIZE not power of two");
	for (int i = 0, j = 0; i < SIZE - 1; ++i) {
		if (i < j)
			std::swap(array[i], array[j]);
		int k = SIZE >> 1;
		while (j & k) {
			j ^= k;
			k >>= 1;
		}
		j ^= k;
	}
}

}

