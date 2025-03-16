/*
DC Blocker

Copyright 2019 Ahmet Inan <inan@aicodix.de>

Purpose:
- Remove the DC offset from the signal
- A DC is a constant value that is added to the signal.
- The DC Blocker is a filter that removes the DC offset from the signal.
- It is a low-pass filter that is used to remove the DC offset from the signal.
- It is a problem because it can cause the signal to drift away from the center of the spectrum.

*/

#pragma once

namespace DSP
{

	// BlockDC class template
	template <typename TYPE, typename VALUE>
	class BlockDC
	{
		TYPE x1, y1; // previous input and output values
		VALUE a, b;	 // coefficients
	public:
		// constructor
		constexpr BlockDC() : x1(0), y1(0), a(0), b(0.5)
		{
		}

		// update the coefficients
		void samples(int s)
		{
			a = VALUE(s - 1) / VALUE(s);
			b = (VALUE(1) + a) / VALUE(2);
		}

		// apply the block DC
		TYPE operator()(TYPE x0)
		{
			TYPE y0 = b * (x0 - x1) + a * y1; // apply the block DC
			x1 = x0;
			y1 = y0;   // update the previous input and output values
			return y0; // return the output value
		}
	};

}
