/**
 * property5-aging-priority.test.js
 *
 * Spec: contest-queue-timing-audit (task 4.7)
 *
 * Feature: contest-queue-timing-audit, Property 5: Aged offset floors deferred
 * operators, tie-break orders them.
 *
 * Validates: Requirements 4.1, 4.5
 *
 * Two-part property:
 *
 *   Part A — aged-offset flooring (Requirement 4.5 bias / 4.1 aging).
 *     For any two operators where the first has a STRICTLY HIGHER attempt count
 *     than the second, the first's effective (aged) listen offset is <= the
 *     second's, for any base offsets in [LISTEN_MIN_MS, LISTEN_MAX_MS] = [50,400].
 *     Because AGE_BAND_MS = LISTEN_MAX_MS = 400 and every base offset lies in
 *     [50,400], any operator with attempts >= 1 floors to offset 0, while a
 *     fresh operator (attempts == 0) keeps its base in [50,400]. A strictly
 *     higher attempt count therefore never yields a LARGER aged offset. This is
 *     a coarse two-tier bias (deferred vs fresh), not a graduated per-attempt
 *     separation: all deferred operators collapse to 0.
 *
 *   Part B — deterministic tie-break (Requirement 4.5 ordering / 4.1).
 *     Ordering WITHIN the collapsed offset-0 group is decided by contentionRank:
 *     earliest offset, then HIGH-before-NORMAL, then more-aged (higher attempts),
 *     then older enqueueSlot, then lower id. For a group of operators sharing an
 *     equal listen offset, the unique most-aged / highest-priority contender
 *     (per that documented ordering) sorts first.
 *
 * The Part B oracle computes the expected winner independently via a
 * lexicographic key tuple (not by reusing contentionRank), so the test verifies
 * that contentionRank, used as a sort comparator, reproduces the documented
 * ordering rather than being compared against itself.
 *
 * Offline-first: pure vanilla JS driven by the local pbt.js runner and the
 * scheduler-model.js mirror; no external dependency, no network.
 */

"use strict";

const {
  agedOffset,
  contentionRank,
  priorityClass,
  makeTestOperator,
  CONSTANTS
} = require("./scheduler-model");
const { gen, forAll } = require("./pbt");

const { LISTEN_MIN_MS, LISTEN_MAX_MS } = CONSTANTS;

// Independent oracle: lexicographic sort key matching the documented ordering
// (earliest offset, HIGH-before-NORMAL, higher attempts, older enqueueSlot,
// lower id). Expressed as a tuple + comparison rather than reusing
// contentionRank, so it is a genuine cross-check of the comparator.
function orderingKey(op) {
  return [
    op.nextTxMs, // earliest listen offset wins carrier sense
    priorityClass(op) === "HIGH" ? 0 : 1, // HIGH before NORMAL
    -op.attempts, // more-aged (higher attempts) wins => smaller key
    op.enqueueSlot, // older enqueue wins
    op.id // lowest id is the final, always-unique tie-break
  ];
}

function keyLessThan(ka, kb) {
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] < kb[i]) return true;
    if (ka[i] > kb[i]) return false;
  }
  return false;
}

// Expected unique winner: the operator whose ordering key is lexicographically
// smallest. ids are unique across the group, so the key (and thus the winner)
// is unique.
function expectedWinner(ops) {
  return ops.reduce((best, op) =>
    keyLessThan(orderingKey(op), orderingKey(best)) ? op : best
  );
}

describe("Feature: contest-queue-timing-audit, Property 5: Aged offset floors deferred operators, tie-break orders them", () => {
  test("Part A: strictly higher attempts never yields a larger aged offset (deferred floor to 0, fresh in [50,400])", () => {
    // Generate a base offset for each operator anywhere in the full listen
    // window [50,400], and two attempt counts where higher > lower. The higher
    // one always has attempts >= 1 (it is strictly greater than a >= 0 count),
    // so it floors to 0.
    const generator = gen.record({
      baseHigher: gen.int(LISTEN_MIN_MS, LISTEN_MAX_MS),
      baseLower: gen.int(LISTEN_MIN_MS, LISTEN_MAX_MS),
      lowerAttempts: gen.int(0, 7),
      // extra gap so higherAttempts is strictly greater than lowerAttempts
      gap: gen.int(1, 5)
    });

    expect(() =>
      forAll(
        generator,
        ({ baseHigher, baseLower, lowerAttempts, gap }) => {
          const higherAttempts = lowerAttempts + gap; // strictly greater
          const opHigher = makeTestOperator({ id: 1, attempts: higherAttempts });
          const opLower = makeTestOperator({ id: 2, attempts: lowerAttempts });

          const agedHigher = agedOffset(baseHigher, opHigher);
          const agedLower = agedOffset(baseLower, opLower);

          // Core invariant: more-aged never gets a larger offset.
          if (!(agedHigher <= agedLower)) return false;

          // The strictly higher (>= 1) attempt count floors to exactly 0.
          if (agedHigher !== 0) return false;

          // A fresh (attempts == 0) operator keeps its base in [50,400];
          // any deferred (attempts >= 1) operator floors to 0.
          const expectedLower =
            lowerAttempts === 0 ? baseLower : 0;
          if (agedLower !== expectedLower) return false;

          return true;
        },
        {
          iterations: 200,
          label: "Property 5A: aged offset floors deferred, monotone in attempts"
        }
      )
    ).not.toThrow();
  });

  test("Part B: contentionRank orders an equal-offset group so the unique most-aged/highest-priority contender wins", () => {
    // A group of operators sharing an equal listen offset (nextTxMs = 0, the
    // collapsed deferred group). Unique ids guarantee a unique winner. Attempts,
    // emergency flag, and enqueueSlot vary so HIGH-before-NORMAL, attempt aging,
    // and enqueue-age tie-break levels are all exercised.
    const generator = (rng) => {
      const n = rng.int(2, 8);
      const ops = [];
      for (let i = 0; i < n; i++) {
        ops.push(
          makeTestOperator({
            id: i, // unique within the group
            attempts: rng.int(0, 8),
            emergency: rng.bool(0.3),
            enqueueSlot: rng.int(0, 5),
            nextTxMs: 0 // equal offset for the whole group
          })
        );
      }
      // Shuffle so the input order never coincidentally matches the winner.
      for (let i = ops.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        const tmp = ops[i];
        ops[i] = ops[j];
        ops[j] = tmp;
      }
      return ops;
    };

    expect(() =>
      forAll(
        generator,
        (ops) => {
          const want = expectedWinner(ops);
          const sorted = ops.slice().sort((a, b) => contentionRank(a, b));
          return sorted[0].id === want.id;
        },
        {
          iterations: 200,
          label: "Property 5B: contentionRank winner is the documented most-aged/highest-priority op"
        }
      )
    ).not.toThrow();
  });

  test("Part A boundary: fresh keeps base, first deferral already floors to 0", () => {
    const fresh = makeTestOperator({ attempts: 0 });
    expect(agedOffset(LISTEN_MIN_MS, fresh)).toBe(LISTEN_MIN_MS);
    expect(agedOffset(LISTEN_MAX_MS, fresh)).toBe(LISTEN_MAX_MS);

    const deferredOnce = makeTestOperator({ attempts: 1 });
    expect(agedOffset(LISTEN_MAX_MS, deferredOnce)).toBe(0);
    expect(agedOffset(LISTEN_MIN_MS, deferredOnce)).toBe(0);
  });

  test("Part B scenario: among equal-offset NORMAL operators, the uniquely most-aged wins", () => {
    // All NORMAL (attempts <= 3, no emergency), all share offset 0, distinct
    // attempts. The highest attempt count must win.
    const ops = [
      makeTestOperator({ id: 3, attempts: 1, nextTxMs: 0, enqueueSlot: 2 }),
      makeTestOperator({ id: 1, attempts: 3, nextTxMs: 0, enqueueSlot: 4 }),
      makeTestOperator({ id: 2, attempts: 2, nextTxMs: 0, enqueueSlot: 1 })
    ];
    const sorted = ops.slice().sort((a, b) => contentionRank(a, b));
    expect(sorted[0].id).toBe(1); // attempts = 3 is most-aged
  });

  test("Part B scenario: HIGH priority beats a more-aged NORMAL at equal offset", () => {
    // An emergency operator (HIGH) with few attempts must outrank a NORMAL
    // operator with more attempts, because HIGH-before-NORMAL precedes the
    // attempt-count level in the tie-break.
    const highFewAttempts = makeTestOperator({
      id: 5,
      attempts: 1,
      emergency: true, // => HIGH
      nextTxMs: 0
    });
    const normalMoreAttempts = makeTestOperator({
      id: 6,
      attempts: 3, // NORMAL (not > 3)
      emergency: false,
      nextTxMs: 0
    });
    const sorted = [normalMoreAttempts, highFewAttempts].sort((a, b) =>
      contentionRank(a, b)
    );
    expect(sorted[0].id).toBe(5); // HIGH wins despite fewer attempts
  });

  test("Part B scenario: at equal offset/priority/attempts, older enqueue then lower id break the tie", () => {
    const olderEnqueue = makeTestOperator({
      id: 9,
      attempts: 2,
      enqueueSlot: 1,
      nextTxMs: 0
    });
    const newerEnqueue = makeTestOperator({
      id: 8,
      attempts: 2,
      enqueueSlot: 5,
      nextTxMs: 0
    });
    let sorted = [newerEnqueue, olderEnqueue].sort((a, b) =>
      contentionRank(a, b)
    );
    expect(sorted[0].id).toBe(9); // older enqueueSlot wins

    const idLo = makeTestOperator({ id: 2, attempts: 2, enqueueSlot: 3, nextTxMs: 0 });
    const idHi = makeTestOperator({ id: 7, attempts: 2, enqueueSlot: 3, nextTxMs: 0 });
    sorted = [idHi, idLo].sort((a, b) => contentionRank(a, b));
    expect(sorted[0].id).toBe(2); // lowest id is the final tie-break
  });
});
