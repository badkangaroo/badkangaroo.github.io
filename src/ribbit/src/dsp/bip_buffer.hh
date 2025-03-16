/*
Bip buffer

Copyright 2020 Ahmet Inan <inan@aicodix.de>

Purpose:
- A buffer that can be used to store and retrieve data in a circular manner
- The buffer is used to store and retrieve data in a circular manner

Input:
- A buffer that can be used to store and retrieve data in a circular manner

Output:
- A buffer that can be used to store and retrieve data in a circular manner

Process Flow:
1. Initialize the buffer
2. Store and retrieve data in a circular manner

*/

#pragma once
namespace DSP {

template <typename TYPE, int NUM>
class BipBuffer
{
	TYPE buf[2*NUM]; // Define the buffer
	int pos0, pos1; // Define the positions
public:
	BipBuffer() : pos0(0), pos1(NUM) // Initialize the buffer
	{
		for (int i = 0; i < 2*NUM; ++i)
			buf[i] = 0; // Initialize the buffer
	}
	const TYPE *operator () ()
	{
		return buf + min(pos0, pos1); // Return the buffer
	}
	const TYPE *operator () (TYPE input)
	{
		buf[pos0] = buf[pos1] = input; // Store the input in the buffer
		if (++pos0 >= 2*NUM) // Increment the position
			pos0 = 0; // Reset the position
		if (++pos1 >= 2*NUM) // Increment the position
			pos1 = 0; // Reset the position
		return operator () (); // Return the buffer
	}
};

}

