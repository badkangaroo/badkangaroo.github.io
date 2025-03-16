/*
Schmidl & Cox correlator

Copyright 2023 Ahmet Inan <inan@aicodix.de>

This code implements a correlator for the Schmidl & Cox algorithm.
The correlator takes an array of samples and returns the position of the symbol.
The correlator uses a simple sum and difference calculation to find the position of the symbol.

Purpose:
- Find the position of the symbol in the array of samples
- The correlator uses a simple sum and difference calculation to find the position of the symbol

Input:
- An array of samples

Output:
- The position of the symbol in the array of samples

Example:
- Input: [1, 2, 3, 4]
- Output: 2

Usage:
- Initialize the correlator
- Call the correlator with the samples
- Get the position of the symbol

Process Flow:
1. Initialize the correlator
2. Call the correlator with the samples
3. Get the position of the symbol

*/

#pragma once

#include "fft.hh" // Include the FFT class
#include "sma.hh" // Include the SMA class
#include "phasor.hh" // Include the Phasor class
#include "trigger.hh" // Include the Trigger class

// SchmidlCox class template for different values, complex numbers, search position, symbol length, and guard length
template<typename value, typename cmplx, int search_pos, int symbol_len, int guard_len>
class SchmidlCox {
	typedef DSP::Const<value> Const; // Define the Const class
	static const int match_len = guard_len | 1; // Calculate the match length
	static const int match_del = (match_len - 1) / 2; // Calculate the match delay
	DSP::FastFourierTransform<symbol_len, cmplx, -1> fwd; // Define the forward FFT
	DSP::FastFourierTransform<symbol_len, cmplx, 1> bwd; // Define the backward FFT
	DSP::SMA4<cmplx, value, symbol_len, false> cor; // Define the correlation class
	DSP::SMA4<value, value, symbol_len, false> pwr; // Define the power class
	DSP::SMA4<value, value, match_len, false> match; // Define the match class
	DSP::Delay<value, match_del> align; // Define the alignment class
	DSP::SchmittTrigger<value> threshold; // Define the threshold class
	DSP::FallingEdgeTrigger falling; // Define the falling edge trigger class
	cmplx tmp0[symbol_len], tmp1[symbol_len]; // Define the temporary arrays
	cmplx kern[symbol_len]; // Define the kernel array
	value timing_max = 0; // Define the maximum timing
	value phase_max = 0; // Define the maximum phase
	int index_max = 0; // Define the maximum index

	// Calculate the bin
	static int bin(int carrier) {
		return (carrier + symbol_len) % symbol_len; // Calculate the bin
	}

	// Demodulate or erase the current value
	static cmplx demod_or_erase(cmplx curr, cmplx prev) {
		if (!(norm(prev) > 0))
			return 0; // If the previous value is not greater than 0, return 0
		cmplx cons = curr / prev; // Calculate the current value divided by the previous value
		if (!(norm(cons) <= 4)) // If the norm of the current value divided by the previous value is not less than or equal to 4, return 0
			return 0; // Return 0
		return cons; // Return the current value divided by the previous value
	}

public:
	int symbol_pos = search_pos; // Define the symbol position
	value cfo_rad = 0; // Define the CFO
	value frac_cfo = 0; // Define the fractional CFO

	// Constructor for the SchmidlCox class
	SchmidlCox(const cmplx *sequence) : threshold(value(0.2 * match_len), value(0.3 * match_len)) {
		fwd(kern, sequence); // Forward FFT the sequence
		for (int i = 0; i < symbol_len; ++i)
			kern[i] = conj(kern[i]) / value(symbol_len); // Calculate the kernel
	}

	// Operator for the SchmidlCox class
	bool operator()(const cmplx *samples) {
		cmplx P = cor(samples[search_pos] * conj(samples[search_pos + symbol_len])); // Calculate the correlation
		value R = value(0.5) * pwr(norm(samples[search_pos]) + norm(samples[search_pos + symbol_len])); // Calculate the power
		value min_R = 0.00001 * symbol_len; // Define the minimum R
		R = std::max(R, min_R); // Calculate the maximum R
		value timing = match(norm(P) / (R * R)); // Calculate the timing
		value phase = align(arg(P)); // Calculate the phase

		bool collect = threshold(timing); // Calculate the collect
		bool process = falling(collect); // Calculate the process

		if (!collect && !process) // If the collect and process are not true, return false
			return false;

		if (timing_max < timing) { // If the timing is greater than the maximum timing, update the timing
			timing_max = timing; // Update the maximum timing
			phase_max = phase; // Update the maximum phase
			index_max = match_del; // Update the maximum index
		} else if (index_max < symbol_len + guard_len + match_del) { // If the index is less than the symbol length plus the guard length plus the match delay, increment the index
			++index_max; // Increment the index
		} else if (process) { // If the process is true, reset the index, timing, and return false
			index_max = 0; // Reset the index
			timing_max = 0; // Reset the timing
			return false; // Return false
		}

		if (!process) // If the process is not true, return false
			return false; // Return false

		frac_cfo = phase_max / value(symbol_len); // Calculate the fractional CFO

		DSP::Phasor<cmplx> osc; // Define the oscillator
		osc.omega(frac_cfo); // Calculate the oscillator
		int test_pos = search_pos - index_max; // Calculate the test position
		index_max = 0; // Reset the index
		timing_max = 0; // Reset the timing
		for (int i = 0; i < symbol_len; ++i)
			tmp1[i] = samples[i + test_pos] * osc(); // Calculate the temporary array
		fwd(tmp0, tmp1); // Forward FFT the temporary array
		for (int i = 0; i < symbol_len; ++i)
			tmp1[i] = demod_or_erase(tmp0[i], tmp0[bin(i - 1)]); // Calculate the temporary array
		fwd(tmp0, tmp1); // Forward FFT the temporary array
		for (int i = 0; i < symbol_len; ++i)
			tmp0[i] *= kern[i]; // Calculate the temporary array
		bwd(tmp1, tmp0); // Backward FFT the temporary array

		int shift = 0; // Define the shift
		value peak = 0; // Define the peak
		value next = 0; // Define the next
		for (int i = 0; i < symbol_len; ++i) {
			value power = norm(tmp1[i]); // Calculate the power
			if (power > peak) { // If the power is greater than the peak, update the peak
				next = peak; // Update the next
				peak = power; // Update the peak
				shift = i; // Update the shift
			} else if (power > next) { // If the power is greater than the next, update the next
				next = power; // Update the next
			}
		}
		if (peak <= next * 4) // If the peak is less than or equal to the next times 4, return false
			return false;

		int pos_err = std::nearbyint(arg(tmp1[shift]) * symbol_len / Const::TwoPi()); // Calculate the position error
		if (abs(pos_err) > guard_len / 2) // If the absolute value of the position error is greater than the guard length divided by 2, return false
			return false; // Return false
		symbol_pos = test_pos - pos_err; // Calculate the symbol position

		cfo_rad = shift * (Const::TwoPi() / symbol_len) - frac_cfo; // Calculate the CFO
		if (cfo_rad >= Const::Pi()) // If the CFO is greater than or equal to pi, subtract two pi from the CFO
			cfo_rad -= Const::TwoPi(); // Subtract two pi from the CFO
		return true; // Return true
	}
};
