/**
 * property2-bounded-backoff.test.js
 *
 * Spec: contest-queue-timing-audit (task 4.4)
 *
 * Feature: contest-queue-timing-audit, Property 2: Binary exponential backoff
 * is bounded.
 *
 * Validates: Requirements 3.5
 *
 * For any operator with attempt count `a`, a computed NORMAL-priority backoff
 * is an integer number of slots in [1, 2^min(a, 4)] and never exceeds 16 slots.
 *
 * The increment happens INSIDE applyBackoff, so the exponent uses the
 * post-increment attempt count. To keep the operator NORMAL through the draw we
 * generate pre-increment attempt counts whose post-increment value stays at or
 * below AGING_PROMOTE_ATTEMPTS (= 3); the exponent-clamp branch is exercised
 * separately with large attempt counts (which floor to the max exponent 4,
 * still capping backoff at 16 slots) while forcing the operator to remain NORMAL
 * by not marking it emergency and by clamping via the promotion threshold check.
 *
 * Offline-first: pure vanilla JS driven by the local pbt.js runner and the
 * scheduler-model.js mirror; no external dependency, no network.
 */

"use strict";

const {
  applyBackoff,
  priorityClass,
  makeTestOperator,
  makeRandInt,
  CONSTANTS
} = require("./scheduler-model");
const { makeRng, gen, forAll } = require("./pbt");

const { MAX_BACKOFF_EXP, AGING_PROMOTE_ATTEMPTS } = CONSTANTS;

describe("Feature: contest-queue-timing-audit, Property 2: Binary exponential backoff is bounded", () => {
  test("NORMAL backoff is an integer in [1, 2^min(attemptsAfterIncrement, 4)] and never exceeds 16", () => {
    // Pre-increment attempts in [0, AGING_PROMOTE_ATTEMPTS - 1] so that the
    // post-increment count (which drives the exponent) stays <= 3 and the
    // operator remains NORMAL for the distance check. currentSlot and seed are
    // generated for determinism/reproducibility.
    const generator = gen.record({
      preAttempts: gen.int(0, AGING_PROMOTE_ATTEMPTS - 1),
      currentSlot: gen.int(0, 1_000_000),
      seed: gen.int(0, 0x7fffffff)
    });

    expect(() =>
      forAll(
        generator,
        ({ preAttempts, currentSlot, seed }) => {
          const randInt = makeRandInt(makeRng(seed).rand);
          const op = makeTestOperator({ attempts: preAttempts, emergency: false });

          const dist = applyBackoff(op, { currentSlot, randInt });

          // Operator must still be NORMAL for this distance-bound check.
          if (priorityClass(op) !== "NORMAL") return false;

          const a = op.attempts; // post-increment attempts
          const upper = 1 << Math.min(a, MAX_BACKOFF_EXP); // 2^min(a,4)

          // Integer in [1, 2^min(a,4)], and globally never exceeds 16 slots.
          const isInteger = Number.isInteger(dist);
          const inRange = dist >= 1 && dist <= upper;
          const underCap = dist <= (1 << MAX_BACKOFF_EXP); // <= 16

          // backoffUntilSlot must equal currentSlot + dist.
          const targetOk = op.backoffUntilSlot === currentSlot + dist;

          return isInteger && inRange && underCap && targetOk;
        },
        {
          iterations: 200,
          label: "Property 2: NORMAL backoff integer in [1, 2^min(a,4)], <= 16"
        }
      )
    ).not.toThrow();
  });

  test("exponent clamp holds for large attempt counts: distance stays an integer in [1, 16]", () => {
    // Large pre-increment attempt counts drive the exponent well past
    // MAX_BACKOFF_EXP so the clamp (min(a, 4)) is what bounds the draw. These
    // counts would normally promote to HIGH; to isolate the NORMAL backoff-draw
    // clamp we bump AGING_PROMOTE_ATTEMPTS out of the way via a custom constants
    // object so priorityClass stays NORMAL and applyBackoff takes the
    // exponential branch.
    const loosePromotion = Object.assign({}, CONSTANTS, {
      AGING_PROMOTE_ATTEMPTS: Number.MAX_SAFE_INTEGER
    });
    const cap = 1 << MAX_BACKOFF_EXP; // 16

    const generator = gen.record({
      preAttempts: gen.int(MAX_BACKOFF_EXP, MAX_BACKOFF_EXP + 50),
      currentSlot: gen.int(0, 1_000_000),
      seed: gen.int(0, 0x7fffffff)
    });

    expect(() =>
      forAll(
        generator,
        ({ preAttempts, currentSlot, seed }) => {
          const randInt = makeRandInt(makeRng(seed).rand);
          const op = makeTestOperator({ attempts: preAttempts, emergency: false });

          const dist = applyBackoff(op, { currentSlot, randInt }, loosePromotion);

          // With attempts >> 4, exponent clamps to MAX_BACKOFF_EXP => cap 16.
          return (
            Number.isInteger(dist) &&
            dist >= 1 &&
            dist <= cap &&
            op.backoffUntilSlot === currentSlot + dist
          );
        },
        {
          iterations: 200,
          label: "Property 2: clamped backoff integer in [1, 16] for large attempts"
        }
      )
    ).not.toThrow();
  });

  test("per-level upper bounds: attemptsAfterIncrement of 1/2/3 cap at 2/4/8", () => {
    // Pin the exact per-level ceilings by sweeping many seeds at each level and
    // confirming the observed maximum never exceeds 2^a and the minimum is >= 1.
    for (const a of [1, 2, 3, 4]) {
      const upper = 1 << Math.min(a, MAX_BACKOFF_EXP);
      let seenMin = Infinity;
      let seenMax = -Infinity;
      for (let seed = 1; seed <= 300; seed++) {
        const randInt = makeRandInt(makeRng(seed).rand);
        // pre-increment = a - 1 so post-increment == a
        const op = makeTestOperator({ attempts: a - 1, emergency: false });
        // Keep NORMAL by loosening promotion when a would otherwise promote.
        const C =
          a > AGING_PROMOTE_ATTEMPTS
            ? Object.assign({}, CONSTANTS, {
                AGING_PROMOTE_ATTEMPTS: Number.MAX_SAFE_INTEGER
              })
            : CONSTANTS;
        const dist = applyBackoff(op, { currentSlot: 0, randInt }, C);
        expect(Number.isInteger(dist)).toBe(true);
        expect(dist).toBeGreaterThanOrEqual(1);
        expect(dist).toBeLessThanOrEqual(upper);
        seenMin = Math.min(seenMin, dist);
        seenMax = Math.max(seenMax, dist);
      }
      // Sanity: draws cover a nontrivial range and hit the floor of 1.
      expect(seenMin).toBe(1);
      expect(seenMax).toBeLessThanOrEqual(upper);
    }
  });

  test("HIGH-priority operators skip backoff (distance 0), confirming the branch split", () => {
    // Not the core property, but pins the complementary branch so the NORMAL
    // distance bound is unambiguous: an emergency operator returns 0 slots.
    const randInt = makeRandInt(makeRng(42).rand);
    const op = makeTestOperator({ attempts: 0, emergency: true });
    const dist = applyBackoff(op, { currentSlot: 5, randInt });
    expect(dist).toBe(0);
    expect(priorityClass(op)).toBe("HIGH");
    expect(op.backoffUntilSlot).toBe(5);
  });
});
