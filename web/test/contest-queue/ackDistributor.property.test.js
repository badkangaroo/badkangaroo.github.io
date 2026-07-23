/**
 * ackDistributor.property.test.js
 *
 * Spec: operator-ack-accumulation (task 5.2)
 *
 * Property 8: Transmission Success Removes Exactly Packed Entries
 */

"use strict";

const { ACKAccumulator } = require("../../scripts/ackAccumulator.js");
const { ACKPacker, messageIdFromFields } = require("../../scripts/ackPacker.js");
const { ACKDistributor } = require("../../scripts/ackDistributor.js");
const { forAll } = require("./pbt");
const { genCallsign, genAckEntry } = require("./ack-test-helpers");

describe("Feature: operator-ack-accumulation, Property 8: Transmission Success Removes Exactly Packed Entries", () => {
  test("pack-transmit-confirm removes exactly packed entries; post-snapshot additions remain", () => {
    const generator = (rng) => {
      const initialCount = rng.int(5, 30);
      const interleaveCount = rng.int(1, 10);
      const initial = [];
      for (let i = 0; i < initialCount; i++) {
        initial.push({
          callsign: genCallsign(rng, 4, 6),
          timestamp: rng.int(1, 0x7fffffff),
          emergency: false,
        });
      }
      const interleaved = [];
      for (let i = 0; i < interleaveCount; i++) {
        interleaved.push({
          callsign: genCallsign(rng, 4, 6),
          timestamp: rng.int(1, 0x7fffffff),
          emergency: false,
        });
      }
      return { initial, interleaved };
    };

    expect(() =>
      forAll(
        generator,
        ({ initial, interleaved }) => {
          const accum = new ACKAccumulator({
            localCallsign: "LOCAL1",
            maxPendingEntries: 50,
          });
          const packer = new ACKPacker(accum);
          const distributor = new ACKDistributor(accum, packer);

          let slot = 0;
          for (const e of initial) {
            accum.addFromDecode(e, e.callsign, slot++);
          }

          const { inFlightEntries } = distributor.preparePayload(new Set());
          const packedIds = new Set(
            inFlightEntries.map((e) => e.messageId)
          );

          // Interleave new additions after snapshot
          const interleavedIds = [];
          for (const e of interleaved) {
            const ok = accum.addFromDecode(e, e.callsign, slot++);
            if (ok) {
              interleavedIds.push(
                messageIdFromFields({
                  callsign: e.callsign,
                  timestamp: e.timestamp,
                  emergency: e.emergency,
                })
              );
            }
          }

          distributor.onTransmitSuccess();

          // Packed entries must be gone
          for (const id of packedIds) {
            if (accum.pendingList.some((e) => e.messageId === id)) {
              return false;
            }
          }

          // Interleaved entries must remain
          for (const id of interleavedIds) {
            if (!accum.pendingList.some((e) => e.messageId === id)) {
              return false;
            }
          }

          return true;
        },
        {
          iterations: 100,
          label: "Property 8: transmission success removes exactly packed",
        }
      )
    ).not.toThrow();
  });
});
