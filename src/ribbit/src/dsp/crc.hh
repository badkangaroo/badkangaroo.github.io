/*
Cyclic redundancy check

Copyright 2018 Ahmet Inan <inan@aicodix.de>
*/

#pragma once

namespace CODE
{

	template <typename TYPE>
	class CRC
	{
		TYPE lut[256];					  // Define the lut for the crc
		TYPE poly;						  // Define the poly for the crc
		TYPE crc;						  // Define the crc for the crc
		TYPE update(TYPE prev, bool data) // Define the update for the crc
		{
			TYPE tmp = prev ^ data;
			return (prev >> 1) ^ ((tmp & 1) * poly);
		}

	public:
		CRC(TYPE poly, TYPE crc = 0) : poly(poly), crc(crc) // Define the constructor for the crc
		{
			for (int j = 0; j < 256; ++j)
			{							  // Loop through the 256 for the crc
				TYPE tmp = j;			  // Define the tmp for the crc
				for (int i = 8; i; --i)	  // Loop through the 8 for the crc
					tmp = update(tmp, 0); // Update the tmp for the crc
				lut[j] = tmp;			  // Set the lut for the crc
			}
		}
		void reset(TYPE v = 0) // Define the reset for the crc
		{
			crc = v; // Set the crc for the crc
		}
		TYPE operator()() // Define the operator for the crc
		{
			return crc; // Return the crc for the crc
		}
		TYPE operator()(bool data) // Define the operator for the crc
		{
			return crc = update(crc, data); // Return the crc for the crc
		}
		TYPE operator()(uint8_t data)
		{
			TYPE tmp = crc ^ data;					  // Define the tmp for the crc
			return crc = (crc >> 8) ^ lut[tmp & 255]; // Return the crc for the crc
		}

		TYPE operator()(uint16_t data)
		{
			(*this)(uint8_t(data & 255));		 // Call the operator for the crc
			(*this)(uint8_t((data >> 8) & 255)); // Call the operator for the crc
			return crc;							 // Return the crc for the crc
		}
		TYPE operator()(uint32_t data)
		{
			(*this)(uint8_t(data & 255));		  // Call the operator for the crc
			(*this)(uint8_t((data >> 8) & 255));  // Call the operator for the crc
			(*this)(uint8_t((data >> 16) & 255)); // Call the operator for the crc
			(*this)(uint8_t((data >> 24) & 255)); // Call the operator for the crc
			return crc;							  // Return the crc for the crc
		}
		TYPE operator()(uint64_t data)
		{
			(*this)(uint8_t(data & 255));		  // Call the operator for the crc
			(*this)(uint8_t((data >> 8) & 255));  // Call the operator for the crc
			(*this)(uint8_t((data >> 16) & 255)); // Call the operator for the crc
			(*this)(uint8_t((data >> 24) & 255)); // Call the operator for the crc
			(*this)(uint8_t((data >> 32) & 255)); // Call the operator for the crc
			(*this)(uint8_t((data >> 40) & 255)); // Call the operator for the crc
			(*this)(uint8_t((data >> 48) & 255)); // Call the operator for the crc
			(*this)(uint8_t((data >> 56) & 255)); // Call the operator for the crc
			return crc;							  // Return the crc for the crc
		}
	};

	template <>
	uint8_t CRC<uint8_t>::operator()(uint8_t data) // Define the operator for the crc
	{
		return crc = lut[crc ^ data]; // Return the crc for the crc
	}

}
