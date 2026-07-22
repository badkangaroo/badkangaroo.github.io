/**
 * property6-high-priority-promotion.test.js
 *
 * Spec: contest-queue-timing-audit (task 4.2)
 *
 * Feature: contest-queue-timing-audit, Property 6: High-priority promotion by
 * attempt count.
 *
 * Validates: Requirements 4.2
 *
 * For any operator, its priority class is HIGH if and only if its emergency
 * flag is set OR its attempt count exceeds the promotion threshold
 * (AGING_PROMOTE_ATTEMPTS = 3); otherwise it is NORMAL. This is a strict
 * biconditional that holds on every draw.
 *
 * The attempt-count generator deliberately spans below (0..2), at (3), and
 * above (4..N) the threshold so that both sides of the biconditional — and the
 * exact boundary between them — are exercised.
 *
 * Offline-first: pure vanilla JS driven by the local pbt.js runner and the
 * scheduler-model.js mirror; no external dependency, no network.
 */

"use strict";

const { priorityClass, makeTestOperator, CONSTANTS } = require("./scheduler-model");
const { gen, forAll } = require("./pbt");

const { AGING_PROMOTE_ATTEMPTS } = CONSTANTS;

describe("Feature: contest-queue-timing-audit, Property 6: High-priority promotion by attempt count", () => {
  test("priorityClass is HIGH iff emergency OR attempts > 3 (strict biconditional)", () => {
    // Attempts range spans below (0,1,2), at (3), and above (4..12) the
    // AGING_PROMOTE_ATTEMPTS threshold of 3; emergency is a random boolean.
    const generator = gen.record({
      emergency: gen.bool(0.5),
      attempts: gen.int(0, AGING_PROMOTE_ATTEMPTS + 9)
    });

    expect(() =>
      forAll(
        generator,
        ({ emergency, attempts }) => {
          const op = makeTestOperator({ emergency, attempts });
          const expected =
            emergency || attempts > AGING_PROMOTE_ATTEMPTS ? "HIGH" : "NORMAL";
          return priorityClass(op) === expected;
        },
        {
          iterations: 200,
          label: "Property 6: HIGH iff emergency || attempts > 3"
        }
      )
    ).not.toThrow();
  });

  test("boundary cases pin the exact threshold (attempts 3 vs 4, emergency override)", () => {
    // At the threshold: attempts == 3 is NOT promoted (strictly greater than),
    // attempts == 4 is promoted.
    expect(priorityClass(makeTestOperator({ attempts: 3, emergency: false }))).toBe("NORMAL");
    expect(priorityClass(makeTestOperator({ attempts: 4, emergency: false }))).toBe("HIGH");

    // Emergency forces HIGH regardless of a below-threshold attempt count.
    expect(priorityClass(makeTestOperator({ attempts: 0, emergency: true }))).toBe("HIGH");
    expect(priorityClass(makeTestOperator({ attempts: 3, emergency: true }))).toBe("HIGH");

    // Below threshold without emergency stays NORMAL.
    expect(priorityClass(makeTestOperator({ attempts: 0, emergency: false }))).toBe("NORMAL");
  });
});
