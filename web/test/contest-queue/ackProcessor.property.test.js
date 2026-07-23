/**
 * ackProcessor.property.test.js
 *
 * Spec: operator-ack-accumulation (tasks 4.2, 4.3, 4.4)
 *
 * Properties 7, 9, 10 for ACK processor.
 */

"use strict";

const { ACKAccumulator } = require("../../scripts/ackAccumulator.js");
const { ACKProcessor } = require("../../scripts/ackProcessor.js");
const { ACKPacker, messageIdFromFields } = require("../../scripts/ackPacker.js");
const { forAll } = require("./pbt");
const { genCallsign, genAckEntry } = require("./ack-test-helpers");

describe("Feature: operator-ack-accumulation, Property 7: Hop Count Relay Termination", () => {
  test("entries at or above hop limit are never re-queued", () => {
    const generator = (rng) => {
      const maxHop = rng.int(1, 7);
      const n = rng.int(5, 15);
      const entries = [];
      for (let i = 0; i < n; i++) {
        // Mix: some below limit, some at/above
        const atOrAbove = rng.bool();
        const hopCount = atOrAbove
          ? rng.int(maxHop, 15)
          : rng.int(0, Math.max(0, maxHop - 1));
        entries.push(
          genAckEntry(rng, {
            hopCount,
            transmitAttempts: 0,
            addedAtSlot: i,
          })
        );
      }
      return { maxHop, entries };
    };

    expect(() =>
      forAll(
        generator,
        ({ maxHop, entries }) => {
          const accum = new ACKAccumulator({
            localCallsign: "LOCAL1",
            maxHopCount: maxHop,
          });
          const processor = new ACKProcessor(accum, { maxHopCount: maxHop });
          const { bitstream } = ACKPacker.packEntries(entries);

          const before = accum.pendingCount;
          processor.processIncoming("W1AW", bitstream, new Set(), 10);
          // Any re-queued entry must have nextHop = incoming+1 < maxHop
          // i.e. incoming hop < maxHop-1... wait: nextHop >= maxHop means not queued
          // so only entries with hopCount+1 < maxHop i.e. hopCount < maxHop-1? 
          // Design: "If hopCount >= maxHopCount, do not re-queue"
          // Processor sets nextHop = incoming+1, then addRelay checks hopCount >= maxHopCount
          // So entries with incoming hopCount where hopCount+1 >= maxHop are rejected
          // i.e. incoming >= maxHop-1 are rejected? 
          // addRelay(messageId, hopCount, ...) with hopCount = incoming+1
          // if (hopCount >= maxHopCount) return false
          // So incoming+1 >= maxHop → incoming >= maxHop-1 rejected
          // AND also if incoming hop was already >= maxHop, nextHop even larger

          for (const entry of accum.pendingList) {
            if (entry.hopCount >= maxHop) return false;
          }

          // Entries that were at or above maxHop incoming should not appear
          for (const e of entries) {
            if (e.hopCount >= maxHop) {
              const id = messageIdFromFields(e);
              if (accum.pendingList.some((p) => p.messageId === id)) {
                return false;
              }
            }
            // Also: if e.hopCount + 1 >= maxHop, should not be queued
            if (e.hopCount + 1 >= maxHop) {
              const id = messageIdFromFields(e);
              if (accum.pendingList.some((p) => p.messageId === id)) {
                return false;
              }
            }
          }
          return true;
        },
        {
          iterations: 100,
          label: "Property 7: hop count relay termination",
        }
      )
    ).not.toThrow();
  });
});

describe("Feature: operator-ack-accumulation, Property 9: Malformed ACK Array Safety", () => {
  test("malformed bitstreams return zero entries without throwing", () => {
    const generator = (rng) => {
      // Build a bitstream where count claims more entries than bits allow
      const claimedCount = rng.int(5, 40);
      const availableEntryBits = rng.int(0, claimedCount * 84 - 1);
      // Ensure claimed * 84 > available
      const countBits = claimedCount.toString(2).padStart(8, "0");
      // Provide fewer bits than needed after count
      let body = "";
      for (let i = 0; i < availableEntryBits; i++) {
        body += rng.bool() ? "1" : "0";
      }
      return countBits + body;
    };

    expect(() =>
      forAll(
        generator,
        (bitstream) => {
          const accum = new ACKAccumulator({ localCallsign: "LOCAL1" });
          const processor = new ACKProcessor(accum);
          let threw = false;
          let result;
          try {
            result = processor.processIncoming("W1AW", bitstream, new Set(), 0);
          } catch (e) {
            threw = true;
          }
          if (threw) return false;
          if (!result) return false;
          if (result.confirmations.length !== 0) return false;
          if (result.relayed !== 0) return false;
          // Also verify unpack itself is safe
          const unpacked = ACKPacker.unpack(bitstream);
          return unpacked.count === 0 && unpacked.entries.length === 0;
        },
        {
          iterations: 100,
          label: "Property 9: malformed ACK array safety",
        }
      )
    ).not.toThrow();
  });
});

describe("Feature: operator-ack-accumulation, Property 10: Contact Confirmation Idempotence", () => {
  test("same (operator, message_id) pair yields at most one confirmation", () => {
    const generator = (rng) => {
      const localId = messageIdFromFields({
        callsign: genCallsign(rng, 4, 6),
        timestamp: rng.int(0, 0x7fffffff),
        emergency: false,
      });
      // Reconstruct entry fields from a known local message for the ACK
      const ackEntry = genAckEntry(rng, { hopCount: 0 });
      // Force the ACK entry to reference our local message id fields
      // by building entry whose messageId equals localId
      const fields = (() => {
        // Build entry matching localId by decoding
        let bits = "";
        for (let i = 0; i < 20; i++) {
          bits += parseInt(localId[i], 16).toString(2).padStart(4, "0");
        }
        return ACKPacker.decodeEntry(bits + "0000");
      })();
      const entry = {
        callsign: fields.callsign,
        timestamp: fields.timestamp,
        emergency: fields.emergency,
        hopCount: 0,
      };
      const sender = genCallsign(rng, 4, 6);
      const repeats = rng.int(2, 8);
      return { localId, entry, sender, repeats };
    };

    expect(() =>
      forAll(
        generator,
        ({ localId, entry, sender, repeats }) => {
          const accum = new ACKAccumulator({ localCallsign: "LOCAL1" });
          const processor = new ACKProcessor(accum);
          const localIds = new Set([localId]);
          const { bitstream } = ACKPacker.packEntries([entry]);

          for (let i = 0; i < repeats; i++) {
            processor.processIncoming(sender, bitstream, localIds, i);
          }

          const confs = processor.getConfirmationsFor(localId);
          const forPair = confs.filter(
            (c) => c.acknowledgerCallsign === sender.toUpperCase()
          );
          return forPair.length === 1 && processor.isConfirmed(sender, localId);
        },
        {
          iterations: 100,
          label: "Property 10: contact confirmation idempotence",
        }
      )
    ).not.toThrow();
  });
});
