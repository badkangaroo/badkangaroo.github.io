/*
Ribbit Message Format Encoder/Decoder
Supports dual-mode messaging:
- Chat Mode (Type 1): UTF-8 free-form text
- Contest Mode (Type 2): Bitwise-packed structured data

Copyright 2025
*/

#ifndef MESSAGE_FORMAT_HH
#define MESSAGE_FORMAT_HH

#include <cstdint>
#include <cstring>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

#ifdef __cplusplus
extern "C" {
#endif

// Message type constants
#define MSG_EMERGENCY 0
#define MSG_CHAT 1
#define MSG_CONTEST 2
#define MSG_OTHER 3

// Maximum lengths
#define MAX_CALLSIGN_LEN 8
#define MAX_GRIDSQUARE_LEN 6
#define MAX_NAME_LEN 15
#define MAX_MESSAGE_LEN 240
#define MAX_PACKED_SIZE 512

// Lookup table for 6-bit alphanumeric encoding (callsign)
static const uint8_t ALPHANUMBIT_ENCODE[128] = {
    ['0'] = 0,  ['1'] = 1,  ['2'] = 2,  ['3'] = 3,  ['4'] = 4,
    ['5'] = 5,  ['6'] = 6,  ['7'] = 7,  ['8'] = 8,  ['9'] = 9,
    ['A'] = 10, ['B'] = 11, ['C'] = 12, ['D'] = 13, ['E'] = 14,
    ['F'] = 15, ['G'] = 16, ['H'] = 17, ['I'] = 18, ['J'] = 19,
    ['K'] = 20, ['L'] = 21, ['M'] = 22, ['N'] = 23, ['O'] = 24,
    ['P'] = 25, ['Q'] = 26, ['R'] = 27, ['S'] = 28, ['T'] = 29,
    ['U'] = 30, ['V'] = 31, ['W'] = 32, ['X'] = 33, ['Y'] = 34,
    ['Z'] = 35, ['/'] = 36, ['?'] = 37, ['~'] = 38, ['!'] = 39,
    ['@'] = 40, ['#'] = 41, ['$'] = 43, ['%'] = 44, ['^'] = 45,
    ['&'] = 46, ['*'] = 47, ['('] = 48, [')'] = 49, ['-'] = 50,
    ['='] = 51, ['['] = 52, [']'] = 53, ['\\'] = 54, ['|'] = 55,
    ['`'] = 56, ['_'] = 57, ['+'] = 58, [':'] = 59, ['"'] = 60,
    [';'] = 61, [','] = 62, ['.'] = 63, [' '] = 63
};

// Reverse lookup for 6-bit alphanumeric
static const char ALPHANUMBIT_DECODE[64] = {
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y', 'Z', '/', '?', '~', '!',
    '@', '#', ' ', '$', '%', '^', '&', '*', '(', ')',
    '-', '=', '[', ']', '\\', '|', '`', '_', '+', ':',
    '"', ';', ',', '.'
};

// Lookup table for 5-bit alphabet encoding (names, gridsquare)
static const uint8_t ALPHABIT_ENCODE[128] = {
    [' '] = 0,
    ['A'] = 1,  ['B'] = 2,  ['C'] = 3,  ['D'] = 4,  ['E'] = 5,
    ['F'] = 6,  ['G'] = 7,  ['H'] = 8,  ['I'] = 9,  ['J'] = 10,
    ['K'] = 11, ['L'] = 12, ['M'] = 13, ['N'] = 14, ['O'] = 15,
    ['P'] = 16, ['Q'] = 17, ['R'] = 18, ['S'] = 19, ['T'] = 20,
    ['U'] = 21, ['V'] = 22, ['W'] = 23, ['X'] = 24, ['Y'] = 25,
    ['Z'] = 26, ['@'] = 27, ['.'] = 28, [':'] = 29, ['/'] = 30,
    ['-'] = 31,
    // Lowercase maps to uppercase
    ['a'] = 1,  ['b'] = 2,  ['c'] = 3,  ['d'] = 4,  ['e'] = 5,
    ['f'] = 6,  ['g'] = 7,  ['h'] = 8,  ['i'] = 9,  ['j'] = 10,
    ['k'] = 11, ['l'] = 12, ['m'] = 13, ['n'] = 14, ['o'] = 15,
    ['p'] = 16, ['q'] = 17, ['r'] = 18, ['s'] = 19, ['t'] = 20,
    ['u'] = 21, ['v'] = 22, ['w'] = 23, ['x'] = 24, ['y'] = 25,
    ['z'] = 26
};

// Reverse lookup for 5-bit alphabet
static const char ALPHABIT_DECODE[32] = {
    ' ', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
    'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
    'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '@', '.', ':',
    '/', '-'
};

// Lookup table for 4-bit nibble encoding (gridsquare numbers)
static const uint8_t NIBBLE_ENCODE[128] = {
    ['0'] = 0, ['1'] = 1, ['2'] = 2, ['3'] = 3, ['4'] = 4,
    ['5'] = 5, ['6'] = 6, ['7'] = 7, ['8'] = 8, ['9'] = 9,
    ['A'] = 10, ['B'] = 11, ['C'] = 12, ['D'] = 13, ['E'] = 14,
    [' '] = 15
};

// Reverse lookup for 4-bit nibble
static const char NIBBLE_DECODE[16] = {
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'A', 'B', 'C', 'D', 'E', ' '
};

// Bit manipulation helpers
void write_bits(uint8_t* buffer, int bit_offset, uint64_t value, int bit_count);
uint64_t read_bits(const uint8_t* buffer, int bit_offset, int bit_count);

// Contest mode packing/unpacking
#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
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
);

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
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
);

// Timestamp encoding helpers
uint32_t pack_timestamp(uint32_t unix_time);
uint32_t unpack_timestamp(uint32_t packed);

// Message ID helpers (80 bits: Callsign 48 + Timestamp 31 + Emergency 1)
// Note: Returns only the lower 64 bits; upper 16 bits must be handled separately
#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
void pack_message_id(
    const char* callsign,
    uint32_t timestamp,
    uint8_t emergency,
    uint8_t* output
);

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_KEEPALIVE
#endif
void unpack_message_id(
    const uint8_t* input,
    char* callsign,
    uint32_t* timestamp,
    uint8_t* emergency
);

#ifdef __cplusplus
}
#endif

#endif // MESSAGE_FORMAT_HH

