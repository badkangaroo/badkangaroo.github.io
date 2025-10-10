<!-- ff277fc8-1268-4038-8bd1-8ef4e4533bb1 d9d593ca-c39b-4761-9a41-4e8ac2e6ab4c -->
# Message ID Bit Order Update

## Overview

Update the message format to move the Emergency bit immediately after the Timestamp, creating an 80-bit Message ID (Callsign 48 + Timestamp 31 + Emergency 1). Add convenience functions for working with the Message ID as a single unit while reusing existing encoding functions.

## Bit Order Change

**OLD:** Callsign(48) → Timestamp(31) → Gridsquare(28) → Emergency(1) → NTP(1) → GPS(1) → ...
**NEW:** Callsign(48) → Timestamp(31) → Emergency(1) → Gridsquare(28) → NTP(1) → GPS(1) → ...

## Files to Update

### 1. Documentation Files

#### web/HeaderReadme.md

- Update the "Ordering" table (lines 61-75) to show Emergency bit comes after Timestamp and before Gridsquare
- Add a "Message ID" section after line 58 explaining the 80-bit Message ID concept
- Update bit position descriptions throughout

#### web/headerCodec.html

- Reorder the HTML sections to show Emergency input before Gridsquare (around line 96-127)
- Update JavaScript functions (lines 887-950) to extract/display fields in new order: fragmentedBits(), fragmentsToReadableText()
- Update updateTotalEncodedHeader() (lines 1139-1175) to concatenate bits in new order
- Update bit offset calculations in decoder section

### 2. JavaScript Implementation

#### web/scripts/messageCodec.js

- **Lines 450-500 (EncodeMessage)**: Reorder bitstream construction to insert Emergency bit after Timestamp and before Gridsquare
- **Lines 507-571 (DecodeMessage)**: Update offset calculations and field extraction order
- **Add new functions** after line 243:
- `GetMessageIDBitStream(callsign, timestamp, emergency)` - wrapper that calls GetCallsignBitStream, GetTimestampBitStream, and GetEmergencyBit
- `BitStreamToMessageID(bits)` - wrapper that extracts 80-bit Message ID and returns object with callsign, timestamp, emergency
- Update class documentation comment (lines 4-20) to reflect new order

#### web/scripts/message_format.js  

- **Lines 61-118 (encodeContestMode)**: Update packing order - move emergency flag handling before gridsquare
- **Lines 180-224 (decodeContestMode)**: Update unpacking order and offset calculations

#### web/scripts/messageCodecExample.js

- Update examples throughout to reflect new bit order
- Add example demonstrating Message ID functions (around line 220)

### 3. C++ Implementation

#### src/ribbit/include/message_format.hh

- Add function declarations after line 145:
- `uint64_t pack_message_id(const char* callsign, uint32_t timestamp, uint8_t emergency)`
- `void unpack_message_id(uint64_t message_id, char* callsign, uint32_t* timestamp, uint8_t* emergency)`
- Add comment documenting the 80-bit Message ID structure

#### src/ribbit/src/message_format.cc

- **Lines 122-238 (pack_contest_message)**: Move Emergency bit write from line 186 to after timestamp (after line 159), update bit_pos tracking
- **Lines 240-336 (unpack_contest_message)**: Move Emergency bit read from line 296 to after timestamp (after line 279), update bit_pos tracking
- **Add new functions** after line 336:
- `pack_message_id()` - calls existing functions and combines the 80 bits
- `unpack_message_id()` - extracts and decodes the 80 bits using existing functions

### 4. Example/Demo Files

#### web/messageCodec.html

- Reorder input fields (lines 108-127) to show Emergency checkbox before Gridsquare input
- Update JavaScript encode/decode handlers (lines 866-914) to use new bit order

#### web/message_format_demo.html

- Update form field order (lines 167-183) to match new structure
- Update encoding examples (lines 251-304) to reflect new order

### 5. Testing Considerations

- The bit position of Gridsquare changes from bit 107 to bit 108
- The bit positions of NTP and GPS remain the same relative to Gridsquare (shift by 1 bit)
- All downstream fields shift by 1 bit
- Message ID occupies bits 0-79

## Implementation Notes

- The Message ID functions are wrappers that call existing encoding functions internally
- No changes to encoding logic of individual fields (callsign, timestamp, emergency)
- Only the order and wrapper functions are new
- Maintains backward compatibility in function signatures

### To-dos

- [ ] Update HeaderReadme.md: Reorder bit layout table and add Message ID section
- [ ] Update headerCodec.html: Reorder UI fields and update JavaScript encoding/decoding functions
- [ ] Update messageCodec.js: Reorder EncodeMessage/DecodeMessage and add Message ID wrapper functions
- [ ] Update message_format.js: Reorder encodeContestMode/decodeContestMode for new bit order
- [ ] Update messageCodecExample.js: Update examples and add Message ID demonstration
- [ ] Update message_format.hh: Add pack_message_id and unpack_message_id declarations
- [ ] Update message_format.cc: Reorder pack/unpack functions and implement Message ID functions
- [ ] Update messageCodec.html and message_format_demo.html: Reorder form fields to match new structure
- [ ] Update wasm_tests.js to check messageIDs and emergency bits for functionality.