# Requirements Document

## Introduction

This feature implements the operator ACK accumulation and distribution system for Ribbit's Contest Mode. Each operator accumulates acknowledgements from decoded transmissions — building an array of Message IDs representing "I heard you" confirmations. This ACK array is packed into the available bit space of outgoing Contest Mode (Type 2) messages and distributed to other operators via normal Ribbit data packets. Receiving operators process incoming ACK arrays to confirm two-way contact. When available bit space cannot fit all pending ACKs, a prioritization scheme selects which ACKs to include.

The ACK system piggybacks on the next outbound transmission rather than consuming a separate channel slot, maximizing channel efficiency. The wire format uses the existing 80-bit Message ID structure (Callsign[48] + Timestamp[31] + Emergency[1]) per ACK entry, packed sequentially into the variable-length ACK Array field at the end of Contest Mode messages.

## Glossary

- **ACK_Accumulator**: The component that records decoded Message IDs and maintains the pending ACK list for the local operator.
- **ACK_Packer**: The component that serializes pending ACK entries into the available bit space of an outgoing Contest Mode message.
- **ACK_Distributor**: The component that includes the packed ACK array in outgoing Ribbit data packets for distribution to other operators.
- **ACK_Processor**: The component that receives and parses ACK arrays from incoming transmissions and updates contact confirmation state.
- **ACK_Entry**: A single acknowledgement record consisting of a Message ID (80 bits: Callsign[48] + Timestamp[31] + Emergency[1]) representing a decoded transmission.
- **Pending_ACK_List**: The ordered collection of ACK_Entries awaiting inclusion in the next outbound transmission.
- **Available_Bit_Space**: The number of bits remaining in a Contest Mode message after the header, gridsquare, flags, name, and message-length fields are packed — the space allocated to the ACK Array field (0–1920 bits).
- **Contact_Confirmation**: The state achieved when an operator observes its own Message ID in a received ACK array, proving two-way communication.
- **Message_ID**: The 80-bit unique identifier (Callsign[48] + Timestamp[31] + Emergency[1]) used for deduplication and acknowledgement.
- **Contest_Message**: A Type 2 (Contest) Ribbit message using bitwise-packed format, where the payload is primarily an ACK array.
- **ACK_Priority**: The ordering criterion used to select which pending ACK entries are included when Available_Bit_Space cannot fit all entries.
- **Operator**: A Ribbit station participating in Contest Mode, identified by its callsign.
- **Relayed_ACK_Set**: The set of Message_IDs that this Operator has previously relayed (retransmitted as third-party ACKs), used for deduplication to prevent re-relaying the same ACK entry.

## Requirements

### Requirement 1 — Accumulate ACKs from decoded transmissions

**User Story:** As a contest operator, I want my station to automatically record the Message IDs of transmissions I decode, so that I can acknowledge other operators without manual intervention.

#### Acceptance Criteria

1. WHEN the ACK_Accumulator successfully decodes a Contest_Message from another Operator, THE ACK_Accumulator SHALL extract the Message_ID and add a corresponding ACK_Entry to the Pending_ACK_List in arrival order.
2. THE ACK_Accumulator SHALL store each ACK_Entry with the full 80-bit Message_ID (Callsign[48] + Timestamp[31] + Emergency[1]).
3. IF the ACK_Accumulator decodes a Contest_Message whose Message_ID already exists in the Pending_ACK_List, THEN THE ACK_Accumulator SHALL not add a duplicate ACK_Entry.
4. THE ACK_Accumulator SHALL record the Slot index (2-second UTC grid) at which each ACK_Entry was added to the Pending_ACK_List.
5. WHEN the ACK_Accumulator decodes a Contest_Message from the local Operator (same callsign), THE ACK_Accumulator SHALL not add an ACK_Entry for that transmission.
6. WHEN ACK_Entries from the Pending_ACK_List are included in a successfully transmitted outbound Contest_Message, THE ACK_Accumulator SHALL remove those transmitted ACK_Entries from the Pending_ACK_List.
7. IF the Pending_ACK_List contains more entries than can fit in the ACK payload of a single outbound Contest_Message, THEN THE ACK_Accumulator SHALL include the oldest entries first (by addition order) and retain the remaining entries for subsequent transmissions.
8. THE ACK_Accumulator SHALL limit the Pending_ACK_List to a maximum of 50 ACK_Entries; IF a new ACK_Entry arrives when the list is at capacity, THEN THE ACK_Accumulator SHALL discard the oldest ACK_Entry to make room for the new entry.

### Requirement 2 — Pack ACK array into available bit space

**User Story:** As a contest operator, I want my pending ACKs packed into my next outgoing transmission, so that I acknowledge other operators efficiently without consuming a separate channel slot.

#### Acceptance Criteria

1. WHEN the ACK_Packer prepares an outbound Contest_Message, THE ACK_Packer SHALL calculate the Available_Bit_Space as 1912 bits (the 1920-bit ACK Array field capacity minus the 8-bit count field).
2. THE ACK_Packer SHALL serialize each ACK_Entry as a contiguous 80-bit block (Callsign[48] + Timestamp[31] + Emergency[1]) using the existing alphanum encoding for callsigns and composite encoding for timestamps.
3. THE ACK_Packer SHALL pack ACK_Entries from the Pending_ACK_List in FIFO order (oldest first), up to a maximum of 23 entries or until the remaining Available_Bit_Space is fewer than 80 bits, whichever limit is reached first.
4. THE ACK_Packer SHALL include an 8-bit unsigned integer count field preceding the ACK array entries to indicate the number of ACK_Entries packed in the message (valid range: 0 to 23).
5. IF the Pending_ACK_List is empty, THEN THE ACK_Packer SHALL set the count field to zero and include no ACK_Entry data in the ACK Array field.
6. WHEN the ACK_Packer has successfully packed ACK_Entries into the outbound Contest_Message, THE ACK_Packer SHALL remove those packed entries from the Pending_ACK_List.
7. THE ACK_Packer SHALL produce a packed ACK array that can be unpacked back to the original ACK_Entries with all fields (Callsign, Timestamp, Emergency flag) matching their pre-packing values exactly (round-trip property).

### Requirement 3 — Distribute ACK array via outbound transmissions

**User Story:** As a contest operator, I want my ACK array transmitted as part of my normal contest messages, so that other operators receive my acknowledgements without extra channel overhead.

#### Acceptance Criteria

1. WHEN the ACK_Distributor transmits a Contest_Message, THE ACK_Distributor SHALL include the packed ACK array produced by the ACK_Packer in the ACK Array field of the message.
2. THE ACK_Distributor SHALL piggyback the ACK array on the next scheduled outbound transmission rather than initiating a separate transmission for ACK delivery.
3. WHEN the ACK_Distributor completes audio playback of a Contest_Message (the in_flight flag transitions from true to false without interruption), THE ACK_Distributor SHALL remove the ACK_Entries that were packed into that transmitted message from the Pending_ACK_List.
4. IF the ACK_Distributor transmits fewer ACK_Entries than exist in the Pending_ACK_List (due to bit space constraints), THEN THE ACK_Distributor SHALL retain the remaining ACK_Entries in the Pending_ACK_List for inclusion in the next outbound transmission.
5. THE ACK_Distributor SHALL not add latency to a scheduled transmission to wait for additional ACK_Entries to accumulate; the ACK_Packer SHALL snapshot the Pending_ACK_List at the moment of message encoding and include only the entries present at that time.
6. IF the Pending_ACK_List is empty at the time the ACK_Packer snapshots entries for a Contest_Message, THEN THE ACK_Packer SHALL produce a zero-count ACK array (count field set to 0 with no entry blocks).
7. IF new ACK_Entries arrive in the Pending_ACK_List after the ACK_Packer has snapshotted entries for an in-flight transmission, THEN THE ACK_Distributor SHALL not remove those new entries upon transmission completion — only entries included in the transmitted message are eligible for removal.
8. IF audio playback of a Contest_Message is interrupted before completion (the in_flight flag transitions from true to false due to an interruption), THEN THE ACK_Distributor SHALL retain all ACK_Entries that were packed into that message in the Pending_ACK_List for inclusion in the next outbound transmission.

### Requirement 4 — Process received ACK arrays to confirm contacts

**User Story:** As a contest operator, I want to know when another operator has acknowledged my transmission, so that I can confirm two-way contact for contest logging.

#### Acceptance Criteria

1. WHEN the ACK_Processor decodes a Contest_Message containing an ACK array with a count field value between 1 and 255, THE ACK_Processor SHALL extract each ACK_Entry from the packed array using the count field and 80-bit entry format, processing entries sequentially from first to last.
2. WHEN the ACK_Processor finds an ACK_Entry whose Message_ID exactly matches one of the local Operator's previously transmitted Message_IDs, THE ACK_Processor SHALL create a Contact_Confirmation associating the matched Message_ID with the acknowledging Operator's callsign.
3. WHEN the ACK_Processor creates a Contact_Confirmation, THE ACK_Processor SHALL record the acknowledging Operator's callsign (decoded from the received message header Callsign field) alongside the confirmed Message_ID.
4. IF the ACK_Processor receives an ACK_Entry for a Message_ID the local Operator did not transmit, THEN THE ACK_Processor SHALL discard that ACK_Entry and continue processing remaining entries in the same ACK array without entering an error state.
5. THE ACK_Processor SHALL not create duplicate Contact_Confirmations for the same Operator callsign and Message_ID pair; subsequent ACK_Entries matching an already-confirmed pair SHALL be discarded.
6. IF the ACK_Processor decodes an ACK array whose count field value is 0, THEN THE ACK_Processor SHALL take no action and not create any Contact_Confirmation from that message.
7. IF the ACK_Processor decodes an ACK array whose count field indicates more entries than the remaining message payload can contain (count × 80 bits exceeds available payload bits), THEN THE ACK_Processor SHALL discard the entire ACK array without processing any entries and without entering an error state.

### Requirement 5 — Prioritize ACK entries when space is limited

**User Story:** As a contest operator, I want the most valuable ACKs included first when bit space is limited, so that contact confirmations are maximized even in congested conditions.

#### Acceptance Criteria

1. WHEN the Pending_ACK_List contains more ACK_Entries than can be packed into the Available_Bit_Space (maximum 23 entries at 80 bits each), THE ACK_Packer SHALL select the highest-priority subset by evaluating priority criteria in the following precedence order: first-time transmission status (criterion 2), then unconfirmed contact status (criterion 3), then addition timestamp age (criterion 4).
2. THE ACK_Packer SHALL assign higher ACK_Priority to ACK_Entries that have not been previously included in any transmitted message (first-time ACKs) over ACK_Entries that are retransmissions where the recipient Operator has not yet confirmed receipt.
3. THE ACK_Packer SHALL assign higher ACK_Priority to ACK_Entries for Operators from whom the local station has not yet received a reciprocal Contact_Confirmation (unconfirmed contacts) over ACK_Entries for Operators who have already confirmed, within the same transmission-attempt class (first-time or retransmission).
4. THE ACK_Packer SHALL assign higher ACK_Priority to ACK_Entries with earlier addition timestamps (FIFO) when entries share the same transmission-attempt class and the same unconfirmed-contact status.
5. IF two or more ACK_Entries remain tied after applying all preceding priority criteria, THEN THE ACK_Packer SHALL select the entry with the earlier addition timestamp.
6. WHEN ACK_Entries are not selected due to insufficient Available_Bit_Space, THE ACK_Packer SHALL retain those entries in the Pending_ACK_List for evaluation in the next transmission opportunity.

### Requirement 6 — ACK entry expiration

**User Story:** As a contest operator, I want stale ACK entries removed from my pending list, so that bit space is not wasted on acknowledgements that are no longer useful.

#### Acceptance Criteria

1. WHEN an ACK_Entry has remained in the Pending_ACK_List for longer than the configured expiration interval without being included in a successfully transmitted message, THE ACK_Accumulator SHALL remove the ACK_Entry from the Pending_ACK_List.
2. THE ACK_Accumulator SHALL use a default expiration interval of 120 seconds (60 Slots), configurable within the range of 10 seconds (5 Slots) to 600 seconds (300 Slots).
3. THE ACK_Accumulator SHALL measure the age of each ACK_Entry from the Slot at which the entry was added to the Pending_ACK_List.
4. WHEN an ACK_Entry expires, THE ACK_Accumulator SHALL log the expiration event including the associated Message_ID and the age in Slots at the time of removal.
5. WHILE an ACK_Entry is included in an in-flight transmission, THE ACK_Accumulator SHALL not expire that ACK_Entry regardless of its age.
6. IF an in-flight transmission fails, THEN THE ACK_Accumulator SHALL return the included ACK_Entries to the Pending_ACK_List with their original age preserved.

### Requirement 7 — ACK array wire format serialization and deserialization

**User Story:** As a Ribbit developer, I want a well-defined wire format for the ACK array, so that all implementations encode and decode ACK data consistently.

#### Acceptance Criteria

1. THE ACK_Packer SHALL encode the ACK array wire format as: an 8-bit count field followed by sequential 80-bit ACK_Entry blocks, with any remaining bits in the final byte zero-padded to a byte boundary.
2. THE ACK_Packer SHALL encode the count field as an 8-bit unsigned integer representing the number of ACK_Entries (0–23 maximum, since 23 × 80 + 8 = 1848 bits fits within the 1920-bit maximum ACK Array field).
3. THE ACK_Packer SHALL encode each ACK_Entry in the same bit layout as the Message_ID: Callsign[48] + Timestamp[31] + Emergency[1], using 6-bit alphanum encoding per character for the callsign, right-padded with the space character (value 63) if the callsign is shorter than 8 characters.
4. THE ACK_Processor SHALL decode the ACK array by reading the 8-bit count field, then reading exactly count × 80 bits as sequential ACK_Entries.
5. IF the ACK_Processor encounters a count value that implies more bits than are available in the remaining message, THEN THE ACK_Processor SHALL treat the ACK array as malformed, discard all entries, and return a count of zero to the caller.
6. THE ACK_Packer SHALL produce an ACK array that, when decoded by the ACK_Processor, yields the same ACK_Entries in the same order as the original Pending_ACK_List (order-preserving round-trip property).
7. IF the ACK_Processor encounters a count field value of zero, THEN THE ACK_Processor SHALL return an empty ACK_Entry list without reading additional bits.

### Requirement 8 — Relay of third-party ACKs (gossip propagation)

**User Story:** As a contest operator, I want my station to relay ACKs received from other operators, so that contact confirmations propagate network-wide and all operators eventually learn who worked who — even without direct reception.

#### Acceptance Criteria

1. WHEN the ACK_Processor decodes ACK_Entries from an incoming Contest_Message that do not reference the local Operator's Message_IDs, THE ACK_Processor SHALL re-queue those third-party ACK_Entries into the local Pending_ACK_List for retransmission on the next outbound Contest_Message.
2. THE ACK_Processor SHALL assign each re-queued third-party ACK_Entry a hop count equal to the incoming entry's hop count plus one; THE ACK_Packer SHALL encode a 4-bit hop count field per ACK_Entry immediately following the 80-bit Message_ID (total entry size: 84 bits).
3. IF a third-party ACK_Entry's hop count equals or exceeds the configured maximum hop limit, THEN THE ACK_Processor SHALL not re-queue that entry into the Pending_ACK_List (preventing infinite relay loops). THE ACK_Accumulator SHALL use a default maximum hop limit of 3, configurable within the range of 1 to 7.
4. IF the ACK_Processor receives a third-party ACK_Entry whose Message_ID already exists in the Pending_ACK_List or has been previously relayed by this Operator (tracked in the Relayed_ACK_Set), THEN THE ACK_Processor SHALL not add a duplicate entry to the Pending_ACK_List.
5. THE ACK_Accumulator SHALL maintain a Relayed_ACK_Set containing the Message_IDs of all ACK_Entries previously relayed by this Operator, to prevent re-relaying ACKs already transmitted.
6. WHEN a relayed ACK_Entry is successfully included in a transmitted outbound Contest_Message, THE ACK_Accumulator SHALL add its Message_ID to the Relayed_ACK_Set.
7. THE ACK_Packer SHALL assign lower ACK_Priority to third-party relayed ACK_Entries (hop count greater than zero) than to first-hand ACK_Entries (hop count zero, generated from direct decode events) when selecting entries for packing into Available_Bit_Space.
8. THE ACK_Processor SHALL store each received third-party ACK_Entry in a contact log that is queryable by the local UI or test harness, retaining the full 80-bit Message_ID, the relaying Operator's callsign (from the incoming Contest_Message header), and the UTC timestamp of reception with at least one-second precision.
9. IF the ACK_Processor receives a third-party ACK_Entry whose Message_ID and relaying Operator callsign pair already exists in the contact log, THEN THE ACK_Processor SHALL not add a duplicate contact log entry.
10. THE ACK_Accumulator SHALL expire entries in the Relayed_ACK_Set after the same configurable expiration interval used for Pending_ACK_List entries (default 120 seconds), to bound memory usage.

