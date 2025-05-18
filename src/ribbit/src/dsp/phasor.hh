/*
Numerically controlled oscillator

Copyright 2019 Ahmet Inan <inan@aicodix.de>
*/

#include "unit_circle.hh"

#pragma once

namespace DSP {

// Numerically Controlled Oscillator (NCO) for frequency correction
// This class implements a complex exponential generator that can be used to:
// 1. Correct carrier frequency offset in received signals
// 2. Generate complex sinusoids for frequency shifting
// 3. Implement phase-locked loops and frequency synthesizers
//
// The NCO generates a complex exponential signal: e^(jωt)
// where:
// - ω is the angular frequency set by omega()
// - t is the time step (implicit in the operator())
//
// Key features:
// - Maintains phase continuity between samples
// - Normalizes output to unit magnitude
// - Supports both discrete and continuous frequency settings
//
// Usage example:
//   Phasor<Complex<float>> nco;
//   nco.omega(frequency_offset);  // Set the frequency
//   complex_signal *= nco();      // Apply frequency correction
//
// The class is particularly useful in:
// - Digital communication systems for carrier recovery
// - Software-defined radio for frequency translation
// - Signal processing applications requiring precise frequency control
template <typename TYPE>
class Phasor
{
	typedef TYPE complex_type;
	typedef typename complex_type::value_type value_type;
	complex_type prev, delta;
public:
	constexpr Phasor() : prev(1, 0), delta(1, 0)
	{
	}
	void omega(int n, int N)
	{
		delta = complex_type(
			UnitCircle<value_type>::cos(n, N),
			UnitCircle<value_type>::sin(n, N));
	}
	void omega(value_type v)
	{
		delta = complex_type(cos(v), sin(v));
	}
	void freq(value_type v)
	{
		omega(Const<value_type>::TwoPi() * v);
	}
	void reset()
	{
		prev = complex_type(1, 0);
	}
	complex_type operator()()
	{
		complex_type tmp = prev;
		prev *= delta;
		prev /= abs(prev);
		return tmp;
	}
};

}
