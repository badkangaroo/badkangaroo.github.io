/*
Fast complex math

Copyright 2018 Ahmet Inan <inan@aicodix.de>
*/

#pragma once

namespace DSP {

// Complex number class for DSP operations
// This class represents complex numbers in the form a + bi where:
// - a is the real part
// - b is the imaginary part
// - i is the imaginary unit (sqrt(-1))
template <typename TYPE>
class Complex
{
public:
	// Type alias for template metaprogramming
	typedef TYPE value_type;

private:
	// Real and imaginary components of the complex number
	TYPE re, im;

public:
	// Default constructor initializes to 0 + 0i
	Complex() : re(0), im(0) {}

	// Constructor from real and imaginary parts
	Complex(TYPE r, TYPE i) : re(r), im(i) {}

	// Constructor from real number (imaginary part = 0)
	Complex(TYPE r) : re(r), im(0) {}

	// Get real part
	TYPE real() const { return re; }

	// Get imaginary part
	TYPE imag() const { return im; }

	// Set real part
	void real(TYPE r) { re = r; }

	// Set imaginary part
	void imag(TYPE i) { im = i; }

	// Complex addition: (a + bi) + (c + di) = (a + c) + (b + d)i
	Complex operator+(const Complex &z) const
	{
		return Complex(re + z.re, im + z.im);
	}

	// Complex subtraction: (a + bi) - (c + di) = (a - c) + (b - d)i
	Complex operator-(const Complex &z) const
	{
		return Complex(re - z.re, im - z.im);
	}

	// Complex multiplication: (a + bi) * (c + di) = (ac - bd) + (ad + bc)i
	Complex operator*(const Complex &z) const
	{
		return Complex(re * z.re - im * z.im, re * z.im + im * z.re);
	}

	// Complex division: (a + bi) / (c + di) = ((ac + bd)/(c² + d²)) + ((bc - ad)/(c² + d²))i
	Complex operator/(const Complex &z) const
	{
		TYPE d = z.re * z.re + z.im * z.im;
		return Complex((re * z.re + im * z.im) / d, (im * z.re - re * z.im) / d);
	}

	// Compound assignment operators
	Complex& operator+=(const Complex &z)
	{
		re += z.re;
		im += z.im;
		return *this;
	}

	Complex& operator-=(const Complex &z)
	{
		re -= z.re;
		im -= z.im;
		return *this;
	}

	Complex& operator*=(const Complex &z)
	{
		TYPE tmp_re = re * z.re - im * z.im;
		TYPE tmp_im = re * z.im + im * z.re;
		re = tmp_re;
		im = tmp_im;
		return *this;
	}

	Complex& operator/=(const Complex &z)
	{
		TYPE d = z.re * z.re + z.im * z.im;
		TYPE tmp_re = (re * z.re + im * z.im) / d;
		TYPE tmp_im = (im * z.re - re * z.im) / d;
		re = tmp_re;
		im = tmp_im;
		return *this;
	}

	Complex& operator*=(TYPE scalar)
	{
		re *= scalar;
		im *= scalar;
		return *this;
	}

	Complex& operator/=(TYPE scalar)
	{
		re /= scalar;
		im /= scalar;
		return *this;
	}

	// Complex conjugate: (a + bi)* = a - bi
	Complex conj() const { return Complex(re, -im); }

	// Complex magnitude (absolute value): |a + bi| = sqrt(a² + b²)
	TYPE abs() const { return sqrt(re * re + im * im); }

	// Complex squared magnitude: |a + bi|² = a² + b²
	TYPE norm() const { return re * re + im * im; }

	// Complex argument (phase): arg(a + bi) = atan2(b, a)
	TYPE arg() const { return atan2(im, re); }

	// Complex exponential: exp(a + bi) = exp(a) * (cos(b) + i*sin(b))
	Complex exp() const
	{
		TYPE e = ::exp(re);
		return Complex(e * cos(im), e * sin(im));
	}

	// Complex logarithm: log(a + bi) = log|a + bi| + i*arg(a + bi)
	Complex log() const
	{
		return Complex(::log(abs()), arg());
	}

	// Complex power: (a + bi)^(c + di) = exp((c + di) * log(a + bi))
	Complex pow(const Complex &z) const
	{
		return (z * log()).exp();
	}

	// Complex sine: sin(a + bi) = sin(a)cosh(b) + i*cos(a)sinh(b)
	Complex sin() const
	{
		return Complex(::sin(re) * cosh(im), ::cos(re) * sinh(im));
	}

	// Complex cosine: cos(a + bi) = cos(a)cosh(b) - i*sin(a)sinh(b)
	Complex cos() const
	{
		return Complex(::cos(re) * cosh(im), -::sin(re) * sinh(im));
	}

	// Complex tangent: tan(a + bi) = sin(a + bi) / cos(a + bi)
	Complex tan() const
	{
		return sin() / cos();
	}
};

template <typename T>
static constexpr Complex<T> operator + (Complex<T> a, Complex<T> b)
{
	return Complex<T>(a.real() + b.real(), a.imag() + b.imag());
}

template <typename T>
static constexpr Complex<T> operator + (Complex<T> a)
{
	return a;
}

template <typename T>
static constexpr Complex<T> operator - (Complex<T> a, Complex<T> b)
{
	return Complex<T>(a.real() - b.real(), a.imag() - b.imag());
}

template <typename T>
static constexpr Complex<T> operator - (Complex<T> a)
{
	return Complex<T>(-a.real(), -a.imag());
}

template <typename T>
static constexpr Complex<T> operator * (T a, Complex<T> b)
{
	return Complex<T>(a * b.real(), a * b.imag());
}

template <typename T>
static constexpr Complex<T> operator / (Complex<T> a, T b)
{
	return Complex<T>(a.real() / b, a.imag() / b);
}

template <typename T>
static constexpr Complex<T> operator * (Complex<T> a, Complex<T> b)
{
	return Complex<T>(a.real() * b.real() - a.imag() * b.imag(), a.real() * b.imag() + a.imag() * b.real());
}

template <typename T>
static constexpr Complex<T> operator / (Complex<T> a, Complex<T> b)
{
	return Complex<T>((a.real() * b.real() + a.imag() * b.imag()) / (b.real() * b.real() + b.imag() * b.imag()),
			(a.imag() * b.real() - a.real() * b.imag()) / (b.real() * b.real() + b.imag() * b.imag()));
}

template <typename T>
static constexpr Complex<T> conj(Complex<T> a)
{
	return Complex<T>(a.real(), -a.imag());
}

template <typename T>
static constexpr T norm(Complex<T> a)
{
	return a.real() * a.real() + a.imag() * a.imag();
}

template <typename T>
static constexpr T abs(Complex<T> a)
{
	return sqrt(norm(a));
}

template <typename T>
static constexpr T arg(Complex<T> a)
{
	return atan2(a.imag(), a.real());
}

template <typename T>
static constexpr Complex<T> polar(T a, T b)
{
	return Complex<T>(a * cos(b), a * sin(b));
}

}

