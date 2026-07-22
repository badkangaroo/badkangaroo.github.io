/**
 * property1-listen-window.test.js
 *
 * Spec: contest-queue-timing-audit (task 2.4)
 *
 * Feature: contest-queue-timing-audit, Property 1: Listen window stays within
 * 50-400 ms.
 *
 * Validates: Requirements 3.4
 *
 * For any operator scheduled to contend, the drawn carrier-sense listen offset
 * (BEFORE aging bias) satisfies LISTEN_MIN_MS <= offset <= LISTEN_MAX_MS, i.e.
 * 50 <= offset <= 400 ms. This bound holds strictly on every draw.
 *
 * Range coverage is a SOFT expectation, not a strict guarantee: because
 * base = 50 + frame * (350 / txFrames), draws approach but never reach the
 * 400 ms upper end, and the degenerate txFrames = 1 case yields only the 50 ms
 * lower bound. Span coverage is therefore asserted loosely and only for
 * txFrames > 1.
 *
 * Offline-first: pure vanilla JS driven by the local pbt.js runner and the
 * scheduler-model.js mirror; no external dependency, no network.
 */

"use strict";

const { drawBaseOffsetMs, makeRandInt, CONSTANTS } = require("./scheduler-model");
const { makeRng, gen, forAll } = require("./pbt");

const { LISTEN_MIN_MS, LISTEN_MAX_MS } = CONSTANTS;

describe("Feature: contest-queue-timing-audit, Property 1: Listen window stays within 50-400 ms", () => {
  test("every pre-aging base offset satisfies 50 <= offset <= 400 (strict bound)", () => {
    // Generator draws a txFrames count spanning the degenerate (1) case and the
    // repurposed slider range (up to 40 listen frames). Each iteration derives a
    // deterministic randInt from the property runner's seeded RNG so the draw is
    // reproducible.
    const generator = gen.record({
      txFrames: gen.int(1, 40),
      seed: gen.int(0, 0x7fffffff)
    });

    expect(() =>
      forAll(
        generator,
        ({ txFrames, seed }) => {
          const randInt = makeRandInt(makeRng(seed).rand);
          const offset = drawBaseOffsetMs(txFrames, randInt);
          // Strict bound check on every draw.
          return offset >= LISTEN_MIN_MS && offset <= LISTEN_MAX_MS;
        },
        {
          iterations: 200,
          label: "Property 1: base listen offset in [50, 400]"
        }
      )
    ).not.toThrow();
  });

  test("draws distribute across the window for txFrames > 1 (loose span coverage)", () => {
    // Fixed multi-frame quantization: with txFrames > 1 the base offset should
    // spread across the listen window rather than collapse to the 50 ms floor.
    // The upper end is approached but not necessarily reached, so we assert the
    // observed span loosely, not that it hits exactly 400 ms.
    const txFrames = 20; // frameStep = 350 / 20 = 17.5 ms
    const rng = makeRng(0xc0ffee);
    const randInt = makeRandInt(rng.rand);

    let seenMin = Infinity;
    let seenMax = -Infinity;
    const seen = new Set();
    for (let i = 0; i < 500; i++) {
      const offset = drawBaseOffsetMs(txFrames, randInt);
      // Strict bound still holds here too.
      expect(offset).toBeGreaterThanOrEqual(LISTEN_MIN_MS);
      expect(offset).toBeLessThanOrEqual(LISTEN_MAX_MS);
      seenMin = Math.min(seenMin, offset);
      seenMax = Math.max(seenMax, offset);
      seen.add(offset);
    }

    // Loose span: the low end is reachable (frame 0 => 50), and the draws reach
    // well past the floor, approaching the upper end.
    expect(seenMin).toBe(LISTEN_MIN_MS);
    expect(seenMax).toBeGreaterThan(LISTEN_MIN_MS + 0.5 * (LISTEN_MAX_MS - LISTEN_MIN_MS));
    // Multiple distinct offsets observed => draws distribute across the window.
    expect(seen.size).toBeGreaterThan(1);
  });

  test("degenerate txFrames = 1 yields exactly the 50 ms lower bound (excluded from span coverage)", () => {
    const randInt = makeRandInt(makeRng(7).rand);
    for (let i = 0; i < 100; i++) {
      expect(drawBaseOffsetMs(1, randInt)).toBe(LISTEN_MIN_MS);
    }
  });
});
