/**
 * property3-silence-reset.test.js
 *
 * Spec: contest-queue-timing-audit (task 4.9)
 *
 * Feature: contest-queue-timing-audit, Property 3: Silence reset clears backoff.
 *
 * Validates: Requirements 3.6
 *
 * For any slot history in which the channel is silent for 3 consecutive slots
 * (SILENCE_SLOTS) while at least one operator needs to send, every queued
 * operator's backoffUntilSlot is at or before the current slot afterward (all
 * backoffs cleared). Conversely, when the silent-slot run is below the
 * threshold, silenceReset is a no-op: it returns the incoming count unchanged
 * and mutates no backoffUntilSlot value.
 *
 * silenceReset(operators, consecutiveSilentSlots, currentSlot):
 *   - returns early (no change) when consecutiveSilentSlots < SILENCE_SLOTS
 *   - when >= SILENCE_SLOTS, clears each needsSend operator's backoffUntilSlot
 *     to currentSlot and returns 0
 *
 * Offline-first: pure vanilla JS driven by the local pbt.js runner and the
 * scheduler-model.js mirror; no external dependency, no network.
 */

"use strict";

const { silenceReset, makeTestOperator, CONSTANTS } = require("./scheduler-model");
const { gen, forAll } = require("./pbt");

const { SILENCE_SLOTS } = CONSTANTS;

// Generate a random set of waiting operators. Each operator needs to send
// (needsSend = true) and carries a random backoffUntilSlot that can sit before,
// at, or well after the eventual currentSlot so the reset has something to
// actually clear. id/enqueueSlot are kept plausible but irrelevant here.
function genWaitingOperators(rng) {
  const n = rng.int(1, 8);
  const ops = [];
  for (let i = 0; i < n; i++) {
    ops.push(
      makeTestOperator({
        id: i + 1,
        needsSend: true,
        // backoff can be earlier or (mostly) later than currentSlot
        backoffUntilSlot: rng.int(-5, 500),
        enqueueSlot: rng.int(0, 200),
        attempts: rng.int(0, 6)
      })
    );
  }
  return ops;
}

describe("Feature: contest-queue-timing-audit, Property 3: Silence reset clears backoff", () => {
  test("after >= 3 consecutive silent slots, every waiting operator has backoffUntilSlot <= currentSlot", () => {
    const generator = gen.record({
      operators: genWaitingOperators,
      currentSlot: gen.int(0, 400),
      // consecutiveSilentSlots at or above the threshold (3..12)
      silentExtra: gen.int(0, 9)
    });

    expect(() =>
      forAll(
        generator,
        ({ operators, currentSlot, silentExtra }) => {
          const consecutiveSilentSlots = SILENCE_SLOTS + silentExtra; // >= 3
          const ret = silenceReset(operators, consecutiveSilentSlots, currentSlot);

          // Reset fired => counter returns to 0.
          if (ret !== 0) return false;

          // Every waiting operator's backoff is now at or before currentSlot.
          return operators.every(
            (op) => !op.needsSend || op.backoffUntilSlot <= currentSlot
          );
        },
        {
          iterations: 200,
          label: "Property 3: silence reset clears all backoffs (>= 3 silent slots)"
        }
      )
    ).not.toThrow();
  });

  test("below the threshold (< 3 silent slots), no reset occurs and backoffs are untouched", () => {
    const generator = gen.record({
      operators: genWaitingOperators,
      currentSlot: gen.int(0, 400),
      // consecutiveSilentSlots strictly below the threshold (0..2)
      silentBelow: gen.int(0, SILENCE_SLOTS - 1)
    });

    expect(() =>
      forAll(
        generator,
        ({ operators, currentSlot, silentBelow }) => {
          const before = operators.map((op) => op.backoffUntilSlot);
          const ret = silenceReset(operators, silentBelow, currentSlot);

          // No reset => counter is returned unchanged.
          if (ret !== silentBelow) return false;

          // No backoffUntilSlot value was modified.
          return operators.every((op, i) => op.backoffUntilSlot === before[i]);
        },
        {
          iterations: 200,
          label: "Property 3 (complement): no reset below the silence threshold"
        }
      )
    ).not.toThrow();
  });

  test("boundary: exactly 3 silent slots triggers the reset, exactly 2 does not", () => {
    // At the threshold (== SILENCE_SLOTS): reset fires.
    const atThreshold = [
      makeTestOperator({ id: 1, needsSend: true, backoffUntilSlot: 999 }),
      makeTestOperator({ id: 2, needsSend: true, backoffUntilSlot: 50 })
    ];
    const currentSlot = 10;
    expect(silenceReset(atThreshold, SILENCE_SLOTS, currentSlot)).toBe(0);
    expect(atThreshold[0].backoffUntilSlot).toBe(currentSlot);
    expect(atThreshold[1].backoffUntilSlot).toBe(currentSlot);

    // Just below the threshold (== SILENCE_SLOTS - 1): no change.
    const belowThreshold = [
      makeTestOperator({ id: 1, needsSend: true, backoffUntilSlot: 999 })
    ];
    expect(silenceReset(belowThreshold, SILENCE_SLOTS - 1, currentSlot)).toBe(
      SILENCE_SLOTS - 1
    );
    expect(belowThreshold[0].backoffUntilSlot).toBe(999);
  });

  test("operators not needing to send are left untouched by the reset", () => {
    const ops = [
      makeTestOperator({ id: 1, needsSend: true, backoffUntilSlot: 999 }),
      makeTestOperator({ id: 2, needsSend: false, backoffUntilSlot: 999 })
    ];
    const currentSlot = 7;
    expect(silenceReset(ops, SILENCE_SLOTS, currentSlot)).toBe(0);
    expect(ops[0].backoffUntilSlot).toBe(currentSlot); // waiting => cleared
    expect(ops[1].backoffUntilSlot).toBe(999); // not waiting => untouched
  });
});
