/*
Discrete Hilbert transformation

Copyright 2020 Ahmet Inan <inan@aicodix.de>

Purpose:
- The Hilbert transform is a mathematical operation that converts a real-valued
signal into a complex-valued signal.
- It is a useful tool for analyzing the frequency content of a signal.
*/

#pragma once

#include "window.hh"

namespace DSP
{

	// Hilbert transform class template
	template <typename TYPE, int TAPS>
	class Hilbert
	{
		static_assert((TAPS - 1) % 4 == 0, "TAPS-1 not divisible by four"); // assert that TAPS-1 is divisible by four
		typedef TYPE complex_type; // define the complex type
		typedef typename TYPE::value_type value_type; // define the value type
		value_type real[TAPS]; // define the real array
		value_type imco[(TAPS - 1) / 4]; // define the imaginary coefficients array
		value_type reco; // define the reconstruction coefficient

	public:
		// constructor
		Hilbert(value_type a = value_type(2)) 
		{
			Kaiser<value_type> win(a); // create a kaiser window
			reco = win((TAPS - 1) / 2, TAPS); // calculate the reconstruction coefficient
			for (int i = 0; i < (TAPS - 1) / 4; ++i) // loop through the imaginary coefficients
				imco[i] = win((2 * i + 1) + (TAPS - 1) / 2, TAPS) * 2 / ((2 * i + 1) * Const<value_type>::Pi());
			for (int i = 0; i < TAPS; ++i)
				real[i] = 0; // initialize the real array
		}

		// apply the hilbert transform
		complex_type operator()(value_type input) 
		{
			value_type re = reco * real[(TAPS - 1) / 2]; // calculate the real part
			value_type im = imco[0] * (real[(TAPS - 1) / 2 - 1] - real[(TAPS - 1) / 2 + 1]); // calculate the imaginary part
			for (int i = 1; i < (TAPS - 1) / 4; ++i) // loop through the imaginary coefficients
				im += imco[i] * (real[(TAPS - 1) / 2 - (2 * i + 1)] - real[(TAPS - 1) / 2 + (2 * i + 1)]); // calculate the imaginary part
			for (int i = 0; i < TAPS - 1; ++i) // loop through the real array
				real[i] = real[i + 1]; // shift the real array
			real[TAPS - 1] = input; // update the last element of the real array
			return complex_type(re, im); // return the complex result
		}
	};

}
