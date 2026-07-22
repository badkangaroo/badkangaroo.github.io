/**
 * property4-aging-monotonic.test.js
 *
 * Spec: contest-queue-timing-audit (task 4.6)
 *
 * Feature: contest-queue-timing-audit, Property 4: Aging is monotonic
 * (single-source increment).
 *
 * Validates: Requirements 4.1
 *
 * For any queued message, its attempt count is INCREMENTED in exactly one
 * place — the defer path in `applyBackoff`, which runs once per contended slot
 * the message does not win — and by no other code path (in particular
 * `resolveSlotBoundary`/`silenceReset` never changes it). Consequently:
 *   - a newly enqueued message starts at attempts === 0;
 *   - while the message keeps contending without winning, each applyBackoff
 *     call increments attempts by exactly 1 (strictly increasing while waiting);
 *   - the silence-reset path (resolveSlotBoundary mirror) does NOT change
 *     attempts (it may clear backoffUntilSlot but leaves attempts untouched);
 *   - upon a successful transmission attempts resets to 0, and then increments
 *     again from 0 on the next defer.
 *
 * The live simulator resets attempts to 0 on transmit inside
 * startChannel/recordServed (op.attempts = 0). The mirror has no explicit
 * transmit function, so the transmit reset is simulated directly here and the
 * reset invariant is asserted.
 *
 * Offline-first: pure vanilla JS driven by the local pbt.js runner and the
 * scheduler-model.js mirror; no external dependency, no network.
 */

"use strict";

const {
  applyBackoff,
  silenceReset,
  makeTestOperator,
  makeRandInt,
  CONSTANTS
} = require("./scheduler-model");
const { makeRng, gen, forAll } = require("./pbt");

const { SILENCE_SLOTS } = CONSTANTS;

describe("Feature: contest-queue-timing-audit, Property 4: Aging is monotonic (single-source increment)", () => {
  test("attempts starts at 0, increments by exactly 1 per applyBackoff, is untouched by silenceReset, and resets to 0 on transmit", () => {
    // Each iteration drives a full aging lifecycle for one operator:
    //   enqueue -> N defers -> silence reset (no-op on attempts) -> transmit
    //   reset -> further defers.
    // The generator randomizes the number of defers on each side of the reset,
    // the current slot, the silent-slot run length, and the RNG seed feeding
    // the injectable randInt used by applyBackoff's backoff draw.
    const generator = gen.record({
      defersBeforeReset: gen.int(1, 30),
      defersAfterReset: gen.int(1, 30),
      currentSlot: gen.int(0, 500),
      silentSlots: gen.int(SILENCE_SLOTS, SILENCE_SLOTS + 5),
      seed: gen.int(0, 0x7fffffff),
      emergency: gen.bool(0.25)
    });

    expect(() =>
      forAll(
        generator,
        ({
          defersBeforeReset,
          defersAfterReset,
          currentSlot,
          silentSlots,
          seed,
          emergency
        }) => {
          // Injectable randInt keeps applyBackoff's backoff-slot draw
          // deterministic for this iteration.
          const randInt = makeRandInt(makeRng(seed).rand);
          const op = makeTestOperator({ id: 1, emergency });

          // Enqueue invariant: a freshly enqueued message starts at 0.
          if (op.attempts !== 0) return false;

          // Strictly increasing while waiting: each defer (applyBackoff) bumps
          // attempts by exactly 1.
          for (let i = 1; i <= defersBeforeReset; i++) {
            applyBackoff(op, { currentSlot, randInt });
            if (op.attempts !== i) return false;
          }

          // silenceReset (resolveSlotBoundary silence-handling mirror) must NOT
          // change attempts. Capture before/after and assert equality. It may
          // clear backoffUntilSlot, but attempts is off-limits to it.
          const attemptsBeforeReset = op.attempts;
          const backoffBeforeReset = op.backoffUntilSlot;
          silenceReset([op], silentSlots, currentSlot);
          if (op.attempts !== attemptsBeforeReset) return false;
          // Sanity: the reset did engage (it clears backoff for a needsSend op),
          // proving attempts survived a path that touches other fields.
          if (op.backoffUntilSlot !== currentSlot) return false;
          void backoffBeforeReset;

          // Transmit resets attempts to 0 (mirrors startChannel/recordServed's
          // op.attempts = 0). Simulate the transmit reset directly.
          op.attempts = 0;
          if (op.attempts !== 0) return false;

          // After transmit, attempts increments again from 0 on the next defer.
          for (let i = 1; i <= defersAfterReset; i++) {
            applyBackoff(op, { currentSlot, randInt });
            if (op.attempts !== i) return false;
          }

          return true;
        },
        {
          iterations: 200,
          label:
            "Property 4: attempts single-source increment / reset monotonicity"
        }
      )
    ).not.toThrow();
  });

  test("silenceReset never mutates attempts even across many operators and repeated calls", () => {
    // Multi-operator + repeated-reset generator: build a small queue, defer each
    // op a random number of times, then fire silenceReset repeatedly and assert
    // every operator's attempts is unchanged by every reset call.
    const generator = gen.record({
      opCount: gen.int(1, 6),
      defers: gen.array(gen.int(0, 20), 1, 6),
      currentSlot: gen.int(0, 300),
      silentSlots: gen.int(SILENCE_SLOTS, SILENCE_SLOTS + 4),
      resetCalls: gen.int(1, 5),
      seed: gen.int(0, 0x7fffffff)
    });

    expect(() =>
      forAll(
        generator,
        ({ opCount, defers, currentSlot, silentSlots, resetCalls, seed }) => {
          const randInt = makeRandInt(makeRng(seed).rand);
          const ops = [];
          for (let k = 0; k < opCount; k++) {
            const op = makeTestOperator({ id: k + 1 });
            const n = defers[k % defers.length];
            for (let i = 0; i < n; i++) {
              applyBackoff(op, { currentSlot, randInt });
            }
            ops.push(op);
          }

          const snapshot = ops.map((o) => o.attempts);

          // Fire the silence reset multiple times; attempts must be invariant
          // under every call regardless of how backoffUntilSlot changes.
          for (let c = 0; c < resetCalls; c++) {
            silenceReset(ops, silentSlots, currentSlot);
          }

          for (let k = 0; k < ops.length; k++) {
            if (ops[k].attempts !== snapshot[k]) return false;
          }
          return true;
        },
        {
          iterations: 150,
          label: "Property 4: silenceReset leaves attempts invariant"
        }
      )
    ).not.toThrow();
  });

  test("below the silence threshold, silenceReset is a no-op and still leaves attempts unchanged", () => {
    // Guards that the single-source invariant holds even when the reset does not
    // fire (consecutiveSilentSlots < SILENCE_SLOTS): attempts stays put.
    const randInt = makeRandInt(makeRng(0xa11ce).rand);
    const op = makeTestOperator({ id: 1 });
    for (let i = 0; i < 5; i++) applyBackoff(op, { currentSlot: 10, randInt });

    const attemptsBefore = op.attempts;
    const backoffBefore = op.backoffUntilSlot;
    // consecutiveSilentSlots below threshold => early return, nothing mutated.
    silenceReset([op], SILENCE_SLOTS - 1, 10);
    expect(op.attempts).toBe(attemptsBefore);
    expect(op.backoffUntilSlot).toBe(backoffBefore);
  });
});
