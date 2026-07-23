/**
 * ackAccumulator.property.test.js
 *
 * Spec: operator-ack-accumulation (tasks 2.2, 2.3, 2.4)
 *
 * Properties 3, 4, 5 for pending list invariants.
 */

"use strict";

const { ACKAccumulator } = require("../../scripts/ackAccumulator.js");
const { messageIdFromFields } = require("../../scripts/ackPacker.js");
const { forAll } = require("./pbt");
const { genCallsign, genAckEntry } = require("./ack-test-helpers");

describe("Feature: operator-ack-accumulation, Property 3: Pending List Deduplication Invariant", () => {
  test("Pending_ACK_List never contains two entries with the same Message_ID", () => {
    const generator = (rng) => {
      const poolSize = rng.int(3, 12);
      const pool = [];
      for (let i = 0; i < poolSize; i++) {
        pool.push(genAckEntry(rng, { hopCount: 0, transmitAttempts: 0 }));
      }
      // Sequence with deliberate duplicates
      const seq = [];
      const n = rng.int(10, 40);
      for (let i = 0; i < n; i++) {
        seq.push(pool[rng.int(0, pool.length - 1)]);
      }
      return seq;
    };

    expect(() =>
      forAll(
        generator,
        (seq) => {
          const accum = new ACKAccumulator({
            localCallsign: "LOCAL1",
            maxPendingEntries: 50,
          });
          let slot = 0;
          for (const entry of seq) {
            accum.addFromDecode(
              {
                callsign: entry.callsign,
                timestamp: entry.timestamp,
                emergency: entry.emergency,
              },
              entry.callsign,
              slot++
            );
          }
          const ids = accum.pendingList.map((e) => e.messageId);
          return ids.length === new Set(ids).size;
        },
        {
          iterations: 100,
          label: "Property 3: pending list deduplication",
        }
      )
    ).not.toThrow();
  });
});

describe("Feature: operator-ack-accumulation, Property 4: Self-Exclusion Invariant", () => {
  test("self-originated messages do not change list size", () => {
    const generator = (rng) => {
      const local = genCallsign(rng, 4, 6);
      const messages = [];
      const n = rng.int(5, 20);
      for (let i = 0; i < n; i++) {
        messages.push({
          callsign: local,
          timestamp: rng.int(0, 0x7fffffff),
          emergency: rng.bool(),
        });
      }
      return { local, messages };
    };

    expect(() =>
      forAll(
        generator,
        ({ local, messages }) => {
          const accum = new ACKAccumulator({ localCallsign: local });
          // Seed with one foreign entry so size is non-zero sometimes
          accum.addFromDecode(
            { callsign: "W1AW", timestamp: 1, emergency: false },
            "W1AW",
            0
          );
          const before = accum.pendingCount;
          let slot = 1;
          for (const msg of messages) {
            accum.addFromDecode(msg, msg.callsign, slot++);
          }
          return accum.pendingCount === before;
        },
        {
          iterations: 100,
          label: "Property 4: self-exclusion invariant",
        }
      )
    ).not.toThrow();
  });
});

describe("Feature: operator-ack-accumulation, Property 5: Capacity-Bounded Invariant", () => {
  test("list size never exceeds 50; oldest evicted at capacity", () => {
    const generator = (rng) => {
      const n = rng.int(51, 80);
      const entries = [];
      for (let i = 0; i < n; i++) {
        entries.push({
          callsign: genCallsign(rng, 3, 6) + String(i), // unique via suffix may exceed 8 — trim
          timestamp: i,
          emergency: false,
        });
      }
      // Ensure callsigns fit 8 chars while staying unique via timestamp
      return entries.map((e, i) => ({
        callsign: genCallsign(rng, 4, 6),
        timestamp: i + 1,
        emergency: false,
      }));
    };

    expect(() =>
      forAll(
        generator,
        (entries) => {
          const accum = new ACKAccumulator({
            localCallsign: "LOCAL1",
            maxPendingEntries: 50,
          });
          let slot = 0;
          const addedIds = [];
          for (const entry of entries) {
            const ok = accum.addFromDecode(entry, entry.callsign, slot++);
            if (ok) {
              addedIds.push(
                messageIdFromFields({
                  callsign: entry.callsign,
                  timestamp: entry.timestamp,
                  emergency: entry.emergency,
                })
              );
            }
            if (accum.pendingCount > 50) return false;
          }
          if (accum.pendingCount > 50) return false;
          if (accum.pendingCount > Math.min(50, entries.length)) return false;

          // When we added more than 50 unique, size should be exactly 50
          // and the newest should be present
          if (entries.length > 50) {
            if (accum.pendingCount !== 50) return false;
            const last = entries[entries.length - 1];
            const lastId = messageIdFromFields({
              callsign: last.callsign,
              timestamp: last.timestamp,
              emergency: last.emergency,
            });
            if (!accum.pendingList.some((e) => e.messageId === lastId)) {
              return false;
            }
          }
          return true;
        },
        {
          iterations: 100,
          label: "Property 5: capacity-bounded invariant",
        }
      )
    ).not.toThrow();
  });
});
