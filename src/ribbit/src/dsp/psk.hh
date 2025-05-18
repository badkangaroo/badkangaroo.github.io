/*
Phase-shift keying (PSK) implementations for digital modulation

This header provides implementations of different PSK schemes:
1. BPSK (Binary Phase Shift Keying, NUM=2):
   - Uses 2 phase states (0° and 180°) to represent 1 bit
   - Simplest form of PSK, most robust to noise
   - Used in: GPS, deep space communications, low-rate wireless systems
   - Best for: High reliability requirements, low data rates

2. QPSK (Quadrature Phase Shift Keying, NUM=4):
   - Uses 4 phase states (45°, 135°, 225°, 315°) to represent 2 bits
   - Most common PSK scheme, good balance of efficiency and reliability
   - Used in: Satellite communications, wireless networks, digital TV
   - Best for: General-purpose digital communications

3. 8-PSK (NUM=8):
   - Uses 8 phase states to represent 3 bits
   - Higher data rate but more susceptible to noise
   - Used in: High-speed modems, some wireless standards
   - Best for: Higher data rates when signal quality is good

Each implementation provides:
- Hard decision decoding: Binary decisions (1 or -1) for each bit
- Soft decision decoding: Reliability values (-127 to 127) for error correction
- Constellation mapping: Conversion between bits and complex signal points

Copyright 2021 Ahmet Inan <inan@aicodix.de>
*/

#pragma once

template<int NUM, typename TYPE, typename CODE>
struct PhaseShiftKeying;

template<typename TYPE, typename CODE>
struct PhaseShiftKeying<2, TYPE, CODE> {
	static const int NUM = 2;
	static const int BITS = 1;
	typedef TYPE complex_type;
	typedef typename TYPE::value_type value_type;
	typedef CODE code_type;

	static constexpr value_type DIST = 2;

	static code_type quantize(value_type precision, value_type value) {
		value *= DIST * precision;
		if (std::is_integral<code_type>::value)
			value = std::nearbyint(value);
		if (std::is_same<code_type, int8_t>::value)
			value = std::min<value_type>(std::max<value_type>(value, -127), 127);
		return value;
	}

	static void hard(code_type *b, complex_type c) {
		b[0] = c.real() < value_type(0) ? code_type(-1) : code_type(1);
	}

	static void soft(code_type *b, complex_type c, value_type precision) {
		b[0] = quantize(precision, c.real());
	}

	static complex_type map(code_type *b) {
		return complex_type(b[0], 0);
	}
};

// Phase Shift Keying (PSK) implementation for digital modulation
// This template implements QPSK (Quadrature Phase Shift Keying) which:
// - Uses 4 different phase states to represent 2 bits of data
// - Maps bits to complex constellation points at 45°, 135°, 225°, and 315°
// - Provides both hard and soft decision decoding
template<typename TYPE, typename CODE>
struct PhaseShiftKeying<4, TYPE, CODE> {
	static const int NUM = 4;    // Number of possible states
	static const int BITS = 2;   // Bits per symbol
	typedef TYPE complex_type;   // Complex number type for signal representation
	typedef typename TYPE::value_type value_type;  // Value type for calculations
	typedef CODE code_type;      // Code type for bit representation

	// Normalization constant for constellation points
	// 1/√2 is used to ensure unit power constellation
	static constexpr value_type rcp_sqrt_2 = 0.70710678118654752440;
	// Distance between adjacent constellation points
	static constexpr value_type DIST = 2 * rcp_sqrt_2;

	// Quantizes a continuous value to a discrete code value
	// Parameters:
	//   precision: Scaling factor for quantization
	//   value: Input value to quantize
	// Returns: Quantized value clamped to valid range
	static code_type quantize(value_type precision, value_type value) {
		value *= DIST * precision;
		if (std::is_integral<code_type>::value)
			value = std::nearbyint(value);
		if (std::is_same<code_type, int8_t>::value)
			value = std::min<value_type>(std::max<value_type>(value, -127), 127);
		return value;
	}

	// Hard decision decoding
	// Converts received complex signal into binary decisions (1 or -1)
	// Parameters:
	//   b: Output array for decoded bits
	//   c: Input complex signal
	// The decision is made by checking which quadrant the signal falls into:
	// - First bit (b[0]): 1 if real part > 0, -1 if real part < 0
	// - Second bit (b[1]): 1 if imag part > 0, -1 if imag part < 0
	static void hard(code_type *b, complex_type c) {
		b[0] = c.real() < value_type(0) ? code_type(-1) : code_type(1);
		b[1] = c.imag() < value_type(0) ? code_type(-1) : code_type(1);
	}

	// Soft decision decoding
	// Converts received complex signal into reliability values
	// Parameters:
	//   b: Output array for soft bits
	//   c: Input complex signal
	//   precision: Scaling factor for quantization
	// The output values indicate confidence in the bit decision:
	// - Values closer to ±127: High confidence
	// - Values closer to 0: Low confidence
	// This reliability information is crucial for error correction
	static void soft(code_type *b, complex_type c, value_type precision) {
		b[0] = quantize(precision, c.real());
		b[1] = quantize(precision, c.imag());
	}

	// Maps bits back to complex constellation point
	// Parameters:
	//   b: Input bits to map
	// Returns: Complex signal point in the constellation
	// The output is normalized by 1/√2 to ensure unit power
	static complex_type map(code_type *b) {
		return rcp_sqrt_2 * complex_type(b[0], b[1]);
	}
};

template<typename TYPE, typename CODE>
struct PhaseShiftKeying<8, TYPE, CODE> {
	static const int NUM = 8;
	static const int BITS = 3;
	typedef TYPE complex_type;
	typedef typename TYPE::value_type value_type;
	typedef CODE code_type;

	// c(a(1)/2)
	static constexpr value_type cos_pi_8 = 0.92387953251128675613;
	// s(a(1)/2)
	static constexpr value_type sin_pi_8 = 0.38268343236508977173;
	// 1/sqrt(2)
	static constexpr value_type rcp_sqrt_2 = 0.70710678118654752440;

	static constexpr value_type DIST = 2 * sin_pi_8;

	static code_type quantize(value_type precision, value_type value) {
		value *= DIST * precision;
		if (std::is_integral<code_type>::value)
			value = std::nearbyint(value);
		if (std::is_same<code_type, int8_t>::value)
			value = std::min<value_type>(std::max<value_type>(value, -127), 127);
		return value;
	}

	static void hard(code_type *b, complex_type c) {
		b[1] = c.real() < value_type(0) ? code_type(-1) : code_type(1);
		b[2] = c.imag() < value_type(0) ? code_type(-1) : code_type(1);
		b[0] = std::abs(c.real()) < std::abs(c.imag()) ? code_type(-1) : code_type(1);
	}

	static void soft(code_type *b, complex_type c, value_type precision) {
		b[1] = quantize(precision, c.real());
		b[2] = quantize(precision, c.imag());
		b[0] = quantize(precision, rcp_sqrt_2 * (std::abs(c.real()) - std::abs(c.imag())));
	}

	static complex_type map(code_type *b) {
		value_type real = cos_pi_8;
		value_type imag = sin_pi_8;
		if (b[0] < code_type(0))
			std::swap(real, imag);
		return complex_type(real * b[1], imag * b[2]);
	}
};
