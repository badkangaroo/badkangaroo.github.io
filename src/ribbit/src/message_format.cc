/*
Ribbit Message Format Encoder/Decoder Implementation

Copyright 2025
*/

#include "message_format.hh"
#include <stdio.h>
#include <time.h>

// Write bits to buffer at arbitrary bit offset
void write_bits(uint8_t* buffer, int bit_offset, uint64_t value, int bit_count) {
    int byte_offset = bit_offset / 8;
    int bit_shift = bit_offset % 8;
    
    int bits_written = 0;
    while (bits_written < bit_count) {
        int bits_in_byte = 8 - bit_shift;
        int bits_to_write = (bit_count - bits_written < bits_in_byte) ? 
                           (bit_count - bits_written) : bits_in_byte;
        
        uint8_t mask = ((1 << bits_to_write) - 1) << bit_shift;
        uint8_t bits = ((value >> bits_written) & ((1 << bits_to_write) - 1)) << bit_shift;
        
        buffer[byte_offset] = (buffer[byte_offset] & ~mask) | bits;
        
        bits_written += bits_to_write;
        byte_offset++;
        bit_shift = 0;
    }
}

// Read bits from buffer at arbitrary bit offset
uint64_t read_bits(const uint8_t* buffer, int bit_offset, int bit_count) {
    uint64_t result = 0;
    int byte_offset = bit_offset / 8;
    int bit_shift = bit_offset % 8;
    
    int bits_read = 0;
    while (bits_read < bit_count) {
        int bits_in_byte = 8 - bit_shift;
        int bits_to_read = (bit_count - bits_read < bits_in_byte) ? 
                          (bit_count - bits_read) : bits_in_byte;
        
        uint8_t mask = (1 << bits_to_read) - 1;
        uint64_t bits = (buffer[byte_offset] >> bit_shift) & mask;
        
        result |= bits << bits_read;
        
        bits_read += bits_to_read;
        byte_offset++;
        bit_shift = 0;
    }
    
    return result;
}

// Pack Unix timestamp into 31 bits
uint32_t pack_timestamp(uint32_t unix_time) {
    time_t t = (time_t)unix_time;
    struct tm* timeinfo = gmtime(&t);
    
    if (!timeinfo) {
        return 0;
    }
    
    int year = timeinfo->tm_year + 1900 - 2026;
    int month = timeinfo->tm_mon;
    int month_year = year * 12 + month;  // 10 bits (0-1023)
    
    int day = timeinfo->tm_mday - 1;     // 5 bits (0-30)
    int hour = timeinfo->tm_hour;        // 5 bits (0-23)
    int minute = timeinfo->tm_min;       // 6 bits (0-59)
    int second = timeinfo->tm_sec / 2;   // 5 bits (0-29, 2-sec resolution)
    
    // Clamp values to valid ranges
    if (month_year < 0) month_year = 0;
    if (month_year > 1023) month_year = 1023;
    if (day < 0) day = 0;
    if (day > 30) day = 30;
    if (hour < 0) hour = 0;
    if (hour > 23) hour = 23;
    if (minute < 0) minute = 0;
    if (minute > 59) minute = 59;
    if (second < 0) second = 0;
    if (second > 29) second = 29;
    
    // Pack into 31 bits
    uint32_t packed = 0;
    packed |= (month_year & 0x3FF);         // Bits 0-9
    packed |= (day & 0x1F) << 10;           // Bits 10-14
    packed |= (hour & 0x1F) << 15;          // Bits 15-19
    packed |= (minute & 0x3F) << 20;        // Bits 20-25
    packed |= (second & 0x1F) << 26;        // Bits 26-30
    
    return packed;
}

// Unpack 31-bit timestamp to Unix time
uint32_t unpack_timestamp(uint32_t packed) {
    int month_year = packed & 0x3FF;
    int day = (packed >> 10) & 0x1F;
    int hour = (packed >> 15) & 0x1F;
    int minute = (packed >> 20) & 0x3F;
    int second = ((packed >> 26) & 0x1F) * 2;
    
    int year = month_year / 12 + 2026;
    int month = month_year % 12;
    
    struct tm timeinfo = {0};
    timeinfo.tm_year = year - 1900;
    timeinfo.tm_mon = month;
    timeinfo.tm_mday = day + 1;
    timeinfo.tm_hour = hour;
    timeinfo.tm_min = minute;
    timeinfo.tm_sec = second;
    
    return (uint32_t)mktime(&timeinfo);
}

// Pack contest mode message
int pack_contest_message(
    const char* callsign,
    uint32_t timestamp,
    const char* gridsquare,
    uint8_t flags,
    const char* first_name,
    const char* last_name,
    const uint8_t* message,
    uint16_t message_len,
    uint8_t* output,
    uint16_t max_output_len
) {
    if (!callsign || !gridsquare || !output) {
        return -1;
    }
    
    // Initialize output buffer
    memset(output, 0, max_output_len);
    
    int bit_pos = 0;
    
    // Message Type (2 bits) - Contest = 0b10
    write_bits(output, bit_pos, MSG_CONTEST, 2);
    bit_pos += 2;
    
    // Callsign (48 bits = 8 chars × 6 bits)
    for (int i = 0; i < MAX_CALLSIGN_LEN; i++) {
        char c = (i < strlen(callsign)) ? callsign[i] : ' ';
        if (c >= 'a' && c <= 'z') c = c - 'a' + 'A';  // Uppercase
        uint8_t value = ALPHANUMBIT_ENCODE[(uint8_t)c];
        write_bits(output, bit_pos, value, 6);
        bit_pos += 6;
    }
    
    // Timestamp (31 bits)
    uint32_t packed_time = pack_timestamp(timestamp);
    write_bits(output, bit_pos, packed_time, 31);
    bit_pos += 31;
    
    // Emergency bit (1 bit) - part of Message ID
    write_bits(output, bit_pos, (flags >> 2) & 0x01, 1);
    bit_pos += 1;
    // Message ID complete: Callsign (48) + Timestamp (31) + Emergency (1) = 80 bits
    
    // Gridsquare (28 bits = 5+5+4+4+5+5)
    if (strlen(gridsquare) >= 6) {
        // Field (letters) - 5 bits each
        write_bits(output, bit_pos, ALPHABIT_ENCODE[(uint8_t)gridsquare[0]], 5);
        bit_pos += 5;
        write_bits(output, bit_pos, ALPHABIT_ENCODE[(uint8_t)gridsquare[1]], 5);
        bit_pos += 5;
        
        // Square (numbers) - 4 bits each
        write_bits(output, bit_pos, NIBBLE_ENCODE[(uint8_t)gridsquare[2]], 4);
        bit_pos += 4;
        write_bits(output, bit_pos, NIBBLE_ENCODE[(uint8_t)gridsquare[3]], 4);
        bit_pos += 4;
        
        // Subsquare (letters) - 5 bits each
        write_bits(output, bit_pos, ALPHABIT_ENCODE[(uint8_t)gridsquare[4]], 5);
        bit_pos += 5;
        write_bits(output, bit_pos, ALPHABIT_ENCODE[(uint8_t)gridsquare[5]], 5);
        bit_pos += 5;
    } else {
        // Invalid gridsquare, write spaces
        bit_pos += 28;
    }
    
    // Flags (2 bits: ntp, gps) - emergency already written as part of Message ID
    write_bits(output, bit_pos, flags & 0x03, 2);
    bit_pos += 2;
    
    // Name lengths (8 bits: 4 bits first name, 4 bits last name)
    uint8_t first_len = first_name ? strlen(first_name) : 0;
    uint8_t last_len = last_name ? strlen(last_name) : 0;
    if (first_len > MAX_NAME_LEN) first_len = MAX_NAME_LEN;
    if (last_len > MAX_NAME_LEN) last_len = MAX_NAME_LEN;
    
    write_bits(output, bit_pos, (first_len << 4) | last_len, 8);
    bit_pos += 8;
    
    // First name (5 bits per character)
    if (first_name) {
        for (int i = 0; i < first_len; i++) {
            char c = first_name[i];
            if (c >= 'a' && c <= 'z') c = c - 'a' + 'A';
            write_bits(output, bit_pos, ALPHABIT_ENCODE[(uint8_t)c], 5);
            bit_pos += 5;
        }
    }
    
    // Last name (5 bits per character)
    if (last_name) {
        for (int i = 0; i < last_len; i++) {
            char c = last_name[i];
            if (c >= 'a' && c <= 'z') c = c - 'a' + 'A';
            write_bits(output, bit_pos, ALPHABIT_ENCODE[(uint8_t)c], 5);
            bit_pos += 5;
        }
    }
    
    // Message length (8 bits)
    if (message_len > MAX_MESSAGE_LEN) message_len = MAX_MESSAGE_LEN;
    write_bits(output, bit_pos, message_len, 8);
    bit_pos += 8;
    
    // Message bytes (8 bits each)
    // Align to byte boundary for easier handling
    int byte_pos = (bit_pos + 7) / 8;
    if (message && message_len > 0) {
        if (byte_pos + message_len <= max_output_len) {
            memcpy(output + byte_pos, message, message_len);
            bit_pos = byte_pos * 8 + message_len * 8;
        } else {
            // Not enough space
            return -2;
        }
    }
    
    // Return total bytes used
    return (bit_pos + 7) / 8;
}

// Unpack contest mode message
int unpack_contest_message(
    const uint8_t* input,
    uint16_t input_len,
    char* callsign,
    uint32_t* timestamp,
    char* gridsquare,
    uint8_t* flags,
    char* first_name,
    char* last_name,
    uint8_t* message,
    uint16_t* message_len
) {
    if (!input || !callsign || !timestamp || !gridsquare || 
        !flags || !first_name || !last_name || !message || !message_len) {
        return -1;
    }
    
    int bit_pos = 0;
    
    // Message Type (2 bits)
    uint8_t msg_type = (uint8_t)read_bits(input, bit_pos, 2);
    bit_pos += 2;
    
    if (msg_type != MSG_CONTEST) {
        return -2;  // Wrong message type
    }
    
    // Callsign (48 bits)
    for (int i = 0; i < MAX_CALLSIGN_LEN; i++) {
        uint8_t value = (uint8_t)read_bits(input, bit_pos, 6);
        callsign[i] = ALPHANUMBIT_DECODE[value & 0x3F];
        bit_pos += 6;
    }
    callsign[MAX_CALLSIGN_LEN] = '\0';
    
    // Timestamp (31 bits)
    uint32_t packed_time = (uint32_t)read_bits(input, bit_pos, 31);
    *timestamp = unpack_timestamp(packed_time);
    bit_pos += 31;
    
    // Emergency bit (1 bit) - part of Message ID
    uint8_t emergency = (uint8_t)read_bits(input, bit_pos, 1);
    bit_pos += 1;
    // Message ID complete: Callsign (48) + Timestamp (31) + Emergency (1) = 80 bits
    
    // Gridsquare (28 bits)
    gridsquare[0] = ALPHABIT_DECODE[read_bits(input, bit_pos, 5) & 0x1F];
    bit_pos += 5;
    gridsquare[1] = ALPHABIT_DECODE[read_bits(input, bit_pos, 5) & 0x1F];
    bit_pos += 5;
    gridsquare[2] = NIBBLE_DECODE[read_bits(input, bit_pos, 4) & 0x0F];
    bit_pos += 4;
    gridsquare[3] = NIBBLE_DECODE[read_bits(input, bit_pos, 4) & 0x0F];
    bit_pos += 4;
    gridsquare[4] = ALPHABIT_DECODE[read_bits(input, bit_pos, 5) & 0x1F];
    bit_pos += 5;
    gridsquare[5] = ALPHABIT_DECODE[read_bits(input, bit_pos, 5) & 0x1F];
    bit_pos += 5;
    gridsquare[6] = '\0';
    
    // Flags (2 bits: ntp, gps) - emergency already read as part of Message ID
    uint8_t ntp_gps = (uint8_t)read_bits(input, bit_pos, 2);
    *flags = (emergency << 2) | (ntp_gps & 0x03);  // Reconstruct flags: emergency|ntp|gps
    bit_pos += 2;
    
    // Name lengths (8 bits)
    uint8_t name_lens = (uint8_t)read_bits(input, bit_pos, 8);
    uint8_t first_len = (name_lens >> 4) & 0x0F;
    uint8_t last_len = name_lens & 0x0F;
    bit_pos += 8;
    
    // First name
    for (int i = 0; i < first_len && i < MAX_NAME_LEN; i++) {
        first_name[i] = ALPHABIT_DECODE[read_bits(input, bit_pos, 5) & 0x1F];
        bit_pos += 5;
    }
    first_name[first_len] = '\0';
    
    // Last name
    for (int i = 0; i < last_len && i < MAX_NAME_LEN; i++) {
        last_name[i] = ALPHABIT_DECODE[read_bits(input, bit_pos, 5) & 0x1F];
        bit_pos += 5;
    }
    last_name[last_len] = '\0';
    
    // Message length (8 bits)
    *message_len = (uint16_t)read_bits(input, bit_pos, 8);
    bit_pos += 8;
    
    // Message bytes
    int byte_pos = (bit_pos + 7) / 8;
    if (byte_pos + *message_len <= input_len) {
        memcpy(message, input + byte_pos, *message_len);
        message[*message_len] = '\0';
    } else {
        *message_len = 0;
        message[0] = '\0';
        return -3;  // Message truncated
    }
    
    return 0;  // Success
}

// Pack Message ID (80 bits: Callsign 48 + Timestamp 31 + Emergency 1)
void pack_message_id(
    const char* callsign,
    uint32_t timestamp,
    uint8_t emergency,
    uint8_t* output
) {
    if (!callsign || !output) {
        return;
    }
    
    // Initialize output buffer (10 bytes for 80 bits)
    memset(output, 0, 10);
    
    int bit_pos = 0;
    
    // Callsign (48 bits = 8 chars × 6 bits)
    for (int i = 0; i < MAX_CALLSIGN_LEN; i++) {
        char c = (i < strlen(callsign)) ? callsign[i] : ' ';
        if (c >= 'a' && c <= 'z') c = c - 'a' + 'A';  // Uppercase
        uint8_t value = ALPHANUMBIT_ENCODE[(uint8_t)c];
        write_bits(output, bit_pos, value, 6);
        bit_pos += 6;
    }
    
    // Timestamp (31 bits)
    uint32_t packed_time = pack_timestamp(timestamp);
    write_bits(output, bit_pos, packed_time, 31);
    bit_pos += 31;
    
    // Emergency (1 bit)
    write_bits(output, bit_pos, emergency ? 1 : 0, 1);
    bit_pos += 1;
    
    // Total: 80 bits = 10 bytes
}

// Unpack Message ID (80 bits: Callsign 48 + Timestamp 31 + Emergency 1)
void unpack_message_id(
    const uint8_t* input,
    char* callsign,
    uint32_t* timestamp,
    uint8_t* emergency
) {
    if (!input || !callsign || !timestamp || !emergency) {
        return;
    }
    
    int bit_pos = 0;
    
    // Callsign (48 bits)
    for (int i = 0; i < MAX_CALLSIGN_LEN; i++) {
        uint8_t value = (uint8_t)read_bits(input, bit_pos, 6);
        callsign[i] = ALPHANUMBIT_DECODE[value & 0x3F];
        bit_pos += 6;
    }
    callsign[MAX_CALLSIGN_LEN] = '\0';
    
    // Timestamp (31 bits)
    uint32_t packed_time = (uint32_t)read_bits(input, bit_pos, 31);
    *timestamp = unpack_timestamp(packed_time);
    bit_pos += 31;
    
    // Emergency (1 bit)
    *emergency = (uint8_t)read_bits(input, bit_pos, 1);
    bit_pos += 1;
    
    // Total: 80 bits = 10 bytes
}

