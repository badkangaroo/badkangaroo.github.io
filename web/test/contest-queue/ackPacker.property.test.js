/**
 * ackPacker.property.test.js
 *
 * Spec: operator-ack-accumulation (tasks 1.2, 1.3, 1.4)
 *
 * Properties 1, 2, 6 for ACK packer wire format and priority ordering.
 */

"use strict";

const { ACKPacker, compareACKPriority, messageIdFromFields } = require("../../scripts/ackPacker.js");
const { gen, forAll } = require("./pbt");
const { genCallsign, genAckEntry, entriesEqualWireFields } = require("./ack-test-helpers");

describe("Feature: operator-ack-accumulation, Property 1: ACK Entry Serialization Round-Trip", () => {
  test("encode then decode produces identical wire fields", () => {
    const generator = (rng) => genAckEntry(rng, {
      // Restrict hop to 0–15; callsign alphanum only
      hopCount: rng.int(0, 15),
      transmitAttempts: 0,
      addedAtSlot: 0,
    });

    expect(() =>
      forAll(
        generator,
        (entry) => {
          const bits = ACKPacker.encodeEntry(entry);
          expect(bits.length).toBe(84);
          const decoded = ACKPacker.decodeEntry(bits);
          return entriesEqualWireFields(entry, decoded);
        },
        {
          iterations: 100,
          label: "Property 1: ACK entry encode/decode round-trip",
        }
      )
    ).not.toThrow();
  });
});

describe("Feature: operator-ack-accumulation, Property 2: ACK Array Serialization Round-Trip (Order-Preserving)", () => {
  test("packEntries then unpack preserves order and fields", () => {
    const generator = (rng) => {
      const n = rng.int(0, 22);
      const entries = [];
      for (let i = 0; i < n; i++) {
        entries.push(genAckEntry(rng, { transmitAttempts: 0, addedAtSlot: i }));
      }
      return entries;
    };

    expect(() =>
      forAll(
        generator,
        (entries) => {
          const { bitstream, count } = ACKPacker.packEntries(entries);
          expect(count).toBe(entries.length);
          const unpacked = ACKPacker.unpack(bitstream);
          if (unpacked.count !== entries.length) return false;
          if (unpacked.entries.length !== entries.length) return false;
          for (let i = 0; i < entries.length; i++) {
            if (!entriesEqualWireFields(entries[i], unpacked.entries[i])) {
              return false;
            }
          }
          return true;
        },
        {
          iterations: 100,
          label: "Property 2: ACK array pack/unpack order-preserving",
        }
      )
    ).not.toThrow();
  });
});

describe("Feature: operator-ack-accumulation, Property 6: Priority Ordering Stability", () => {
  test("packing prefers first-hand > relayed, first-time > retransmission, unconfirmed > confirmed", () => {
    // Mock accumulator that holds a provided list
    class MockAccum {
      constructor(list) {
        this.list = list.slice();
      }
      get pendingCount() {
        return this.list.length;
      }
      takeForPacking(n) {
        return this.list.splice(0, Math.min(n, this.list.length));
      }
      returnEntries(entries) {
        this.list.push(...entries);
      }
    }

    const generator = (rng) => {
      // Build entries spanning all 8 priority tiers (more than 22 to force selection)
      const entries = [];
      let slot = 0;
      for (const hop of [0, 1]) {
        for (const attempts of [0, 1]) {
          for (const confirmed of [false, true]) {
            // Several entries per tier
            for (let k = 0; k < 4; k++) {
              const callsign = genCallsign(rng, 4, 6);
              entries.push({
                callsign,
                timestamp: rng.int(0, 0x7fffffff),
                emergency: false,
                hopCount: hop,
                transmitAttempts: attempts,
                addedAtSlot: slot++,
                isInFlight: false,
                _confirmed: confirmed,
              });
            }
          }
        }
      }
      // Shuffle so FIFO order ≠ priority order
      for (let i = entries.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        const tmp = entries[i];
        entries[i] = entries[j];
        entries[j] = tmp;
      }
      return entries;
    };

    expect(() =>
      forAll(
        generator,
        (entries) => {
          const confirmed = new Set(
            entries.filter((e) => e._confirmed).map((e) => e.callsign)
          );
          const accum = new MockAccum(entries);
          const packer = new ACKPacker(accum, { maxEntries: 22 });
          const { packedEntries } = packer.pack(confirmed);

          // Every packed entry should have priority >= any non-packed entry
          const packedSet = new Set(packedEntries.map((e) => e.callsign + e.addedAtSlot));
          const notPacked = entries.filter(
            (e) => !packedSet.has(e.callsign + e.addedAtSlot)
          );

          for (const p of packedEntries) {
            for (const n of notPacked) {
              // compareACKPriority: negative if p has higher priority than n
              const cmp = compareACKPriority(p, n, confirmed);
              // p should not be lower priority than a left-out entry
              if (cmp > 0) {
                return false;
              }
            }
          }

          // Also verify relative ordering within packed list is sorted
          for (let i = 1; i < packedEntries.length; i++) {
            const cmp = compareACKPriority(
              packedEntries[i - 1],
              packedEntries[i],
              confirmed
            );
            if (cmp > 0) return false;
          }
          return true;
        },
        {
          iterations: 100,
          label: "Property 6: priority ordering stability",
        }
      )
    ).not.toThrow();
  });
});
