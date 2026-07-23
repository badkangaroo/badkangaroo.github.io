# Implementation Plan: Operator ACK Accumulation

## Overview

Implement the operator ACK accumulation and distribution system for Contest Mode (Type 2) messages. This introduces four cooperating JavaScript modules (`ackAccumulator.js`, `ackPacker.js`, `ackDistributor.js`, `ackProcessor.js`) in `web/scripts/`, integrating with the existing `messageCodec.js` encode/decode pipeline. Property-based tests validate 10 correctness properties using the existing PBT infrastructure.

## Tasks

- [x] 1. Implement ACK Packer (wire format serialization/deserialization)
  - [x] 1.1 Create `web/scripts/ackPacker.js` with ACKPacker class
    - Implement `encodeEntry(entry)` — serialize a single ACK entry to 84-bit bitstream (Callsign[48] + Timestamp[31] + Emergency[1] + HopCount[4])
    - Implement `decodeEntry(bits)` — deserialize 84-bit block to ACK entry object
    - Implement `pack(contactConfirmations)` — snapshot entries from accumulator, apply priority sort, select up to 22 entries, serialize to 8-bit count + N × 84-bit entries + zero-pad
    - Implement `static unpack(bitstream)` — read 8-bit count, decode entries, return `{ entries, count }` or `{ entries: [], count: 0 }` on malformed input
    - Implement priority sort comparator: first-hand > relayed, first-time > retransmission, unconfirmed > confirmed, FIFO tiebreaker
    - Use existing 6-bit alphanum encoding from `messageCodec.js` (ALPHANUMBIT_ENCODE) for callsign fields
    - Export constants: `MAX_ENTRIES=22`, `ENTRY_BITS=84`, `COUNT_BITS=8`, `MAX_ACK_FIELD_BITS=1920`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.6, 8.2, 8.7_

  - [x] 1.2 Write property test for ACK entry serialization round-trip
    - **Property 1: ACK Entry Serialization Round-Trip**
    - Generate random callsigns (1–8 alphanum chars), random 31-bit timestamps, random boolean emergency flag, random 4-bit hop count (0–15)
    - Assert encode then decode produces identical fields
    - Test file: `web/test/contest-queue/ackPacker.property.test.js`
    - **Validates: Requirements 2.7, 7.6**

  - [x] 1.3 Write property test for ACK array serialization round-trip
    - **Property 2: ACK Array Serialization Round-Trip (Order-Preserving)**
    - Generate lists of 0–22 random valid ACK entries
    - Assert pack then unpack produces same entries in same order with all fields matching
    - Test file: `web/test/contest-queue/ackPacker.property.test.js`
    - **Validates: Requirements 7.1, 7.6**

  - [x] 1.4 Write property test for priority ordering stability
    - **Property 6: Priority Ordering Stability**
    - Generate Pending_ACK_Lists with entries spanning all 8 priority tiers
    - Assert packing selection always prefers higher-priority entries: first-hand before relayed, first-time before retransmissions, unconfirmed before confirmed
    - Test file: `web/test/contest-queue/ackPacker.property.test.js`
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [x] 2. Implement ACK Accumulator (pending list management)
  - [x] 2.1 Create `web/scripts/ackAccumulator.js` with ACKAccumulator class
    - Implement `addFromDecode(messageId, senderCallsign, currentSlot)` — add decoded message ID to pending list with duplicate/self filtering
    - Implement `addRelay(messageId, hopCount, currentSlot)` — add third-party relay entry with Relayed_ACK_Set deduplication
    - Implement `takeForPacking(maxEntries)` — snapshot and remove top entries for packing
    - Implement `returnEntries(entries)` — return entries on transmission failure with original age preserved
    - Implement `confirmTransmission(entries)` — add relayed entries to Relayed_ACK_Set
    - Implement `expireEntries(currentSlot)` — remove stale entries exceeding expiration interval, skip in-flight entries
    - Implement `markInFlight(entries)` / `unmarkInFlight(entries)` — in-flight protection
    - Enforce capacity limit of 50 entries with oldest-eviction on overflow
    - Maintain Relayed_ACK_Set with same expiration interval as Pending_ACK_List
    - Default config: `maxPendingEntries=50`, `expirationSlots=60`, `maxHopCount=3`, `localCallsign`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 8.3, 8.4, 8.5, 8.6, 8.10_

  - [x] 2.2 Write property test for pending list deduplication
    - **Property 3: Pending List Deduplication Invariant**
    - Generate random sequences of Message_IDs with deliberate duplicates interspersed
    - Assert Pending_ACK_List never contains two entries with the same 80-bit Message_ID
    - Test file: `web/test/contest-queue/ackAccumulator.property.test.js`
    - **Validates: Requirements 1.3**

  - [x] 2.3 Write property test for self-exclusion
    - **Property 4: Self-Exclusion Invariant**
    - Generate random Contest_Messages where sender callsign equals local operator callsign
    - Assert list size remains unchanged after processing self-originated messages
    - Test file: `web/test/contest-queue/ackAccumulator.property.test.js`
    - **Validates: Requirements 1.5**

  - [x] 2.4 Write property test for capacity-bounded invariant
    - **Property 5: Capacity-Bounded Invariant**
    - Generate sequences of 50+ unique entries added to the accumulator
    - Assert list size never exceeds 50 and oldest entry is evicted when at capacity
    - Test file: `web/test/contest-queue/ackAccumulator.property.test.js`
    - **Validates: Requirements 1.8**

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement ACK Processor (incoming ACK parsing and contact confirmation)
  - [x] 4.1 Create `web/scripts/ackProcessor.js` with ACKProcessor class
    - Implement `processIncoming(senderCallsign, ackBitstream, localTransmittedIds)` — parse ACK array, match against local IDs, create Contact_Confirmations, re-queue third-party entries
    - Implement `getContactLog()` — return queryable contact log entries
    - Implement `getConfirmationsFor(messageId)` — query confirmations for a specific Message_ID
    - Implement `isConfirmed(operatorCallsign, messageId)` — check if contact is confirmed
    - On match with local ID: create ContactConfirmation (idempotent — no duplicates for same pair)
    - On non-local entry: call `accumulator.addRelay(messageId, hopCount+1, currentSlot)` if under hop limit
    - On malformed ACK array (count × 84 > available bits): discard entire array, return zero entries
    - On zero-count ACK array: no-op
    - Maintain contact log with full Message_ID, relayer callsign, UTC timestamp (1-second precision)
    - Deduplicate contact log entries by (Message_ID, relayer callsign) pair
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 7.4, 7.5, 7.7, 8.1, 8.2, 8.3, 8.4, 8.8, 8.9_

  - [x] 4.2 Write property test for hop count relay termination
    - **Property 7: Hop Count Relay Termination**
    - Generate third-party ACK entries with hop counts at and above the configured maximum (default 3)
    - Assert entries at or above hop limit are never re-queued into Pending_ACK_List
    - Test file: `web/test/contest-queue/ackProcessor.property.test.js`
    - **Validates: Requirements 8.3**

  - [x] 4.3 Write property test for malformed ACK array safety
    - **Property 9: Malformed ACK Array Safety**
    - Generate bitstreams where count × 84 exceeds remaining available bits
    - Assert processor returns zero entries and does not throw or enter error state
    - Test file: `web/test/contest-queue/ackProcessor.property.test.js`
    - **Validates: Requirements 4.7, 7.5**

  - [x] 4.4 Write property test for contact confirmation idempotence
    - **Property 10: Contact Confirmation Idempotence**
    - Generate repeated ACK entries for the same (operator_callsign, message_id) pair
    - Assert confirmation set contains at most one entry per pair
    - Test file: `web/test/contest-queue/ackProcessor.property.test.js`
    - **Validates: Requirements 4.5**

- [x] 5. Implement ACK Distributor (outbound integration and in-flight management)
  - [x] 5.1 Create `web/scripts/ackDistributor.js` with ACKDistributor class
    - Implement `preparePayload(contactConfirmations)` — call packer, mark entries in-flight, return `{ bitstream, inFlightEntries }`
    - Implement `onTransmitSuccess()` — call `accumulator.confirmTransmission()` for relayed entries, remove packed entries
    - Implement `onTransmitFailure()` — call `accumulator.returnEntries()` and `accumulator.unmarkInFlight()`
    - Track in-flight state with `isInFlight` getter
    - Snapshot at encoding time — entries added after snapshot are not affected
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 5.2 Write property test for transmission success removes exactly packed entries
    - **Property 8: Transmission Success Removes Exactly Packed Entries**
    - Simulate pack-transmit-confirm cycles with interleaved additions between packing and confirmation
    - Assert exactly the N packed entries are removed; entries added after snapshot remain
    - Test file: `web/test/contest-queue/ackDistributor.property.test.js`
    - **Validates: Requirements 1.6, 3.3, 3.7**

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integrate with existing MessageCodec and application layer
  - [x] 7.1 Modify `web/scripts/messageCodec.js` to support ACK array encoding/decoding
    - In `EncodeMessage()`: when `messageType === 2` and `data.ackPayload` is present, append the pre-packed ACK bitstream after message content bits
    - In `DecodeMessage()`: when `messageType === 2` and bits remain after message content, extract ACK array via `ACKPacker.unpack(remainingBitstream)` and include in returned object as `ackArray`
    - Handle edge case: if no remaining bits, set `ackArray = { entries: [], count: 0 }`
    - _Requirements: 2.1, 3.1, 7.1, 7.4_

  - [x] 7.2 Modify `web/scripts/index.js` to wire ACK components into decode/encode paths
    - In `handleWasmDecodedMessage`: on Contest_Message decode, call `ackAccumulator.addFromDecode()` and `ackProcessor.processIncoming()`
    - In `handleEncode`: before transmission of Contest_Message, call `ackDistributor.preparePayload()` and attach `ackPayload` to encode data
    - Wire `onTransmitSuccess` / `onTransmitFailure` to existing transmission lifecycle callbacks
    - Initialize ACKAccumulator, ACKPacker, ACKDistributor, ACKProcessor with local callsign config
    - Hook slot-tick (2-second) timer to call `ackAccumulator.expireEntries(currentSlot)`
    - _Requirements: 1.1, 1.6, 3.2, 3.3, 3.5, 3.8, 4.1, 6.1_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties defined in the design
- Unit tests validate specific examples and edge cases
- The ACK Packer is implemented first because other components depend on its serialization/deserialization functions
- The 84-bit entry format (80-bit Message_ID + 4-bit hop count) is used throughout, matching the design's wire format specification
- Integration with `messageCodec.js` and `index.js` is done last to ensure all components are tested independently first

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["1.4", "2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["4.1", "5.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "5.2"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["7.2"] }
  ]
}
```
