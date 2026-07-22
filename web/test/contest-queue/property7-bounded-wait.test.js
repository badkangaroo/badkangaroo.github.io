/**
 * property7-bounded-wait.test.js
 *
 * Spec: contest-queue-timing-audit (task 6.2)
 *
 * Feature: contest-queue-timing-audit, Property 7: Every queued message
 * transmits within the bounded wait.
 *
 * Validates: Requirements 4.3, 4.4, 5.3
 *
 * For any simulation run with N peak concurrent contending operators, every
 * queued message is granted a transmission opportunity within Bounded_Wait(N)
 * slots, where Bounded_Wait(N) = 14 + 2N = boundedWaitSlots(N); equivalently,
 * the recorded maximum wait never exceeds the computed bound and the violations
 * list is empty.
 *
 * WHY THIS IS AN INTEGRATION-STYLE PROPERTY
 * -----------------------------------------
 * Unlike Properties 1-6 (which each pin one pure function), the bounded-wait
 * guarantee is emergent: it only appears when the mirrored scheduling functions
 * are composed into the discrete-slot contention loop the design describes
 * (design Part 3 proof sketch, Part 4). So this test builds a faithful
 * slot-stepped scheduler out of the SAME mirrored pure functions the simulator
 * uses -- carrier-sense winner selection via contentionRank over aged listen
 * offsets (listenOffsetMs), applyBackoff on the losers, the silence-threshold
 * reset (silenceReset), and HIGH promotion by attempt count -- and records each
 * operator's wait (servedSlot - enqueueSlot) when it transmits.
 *
 * MODEL FIDELITY (design Part 3 / Part 4)
 * ---------------------------------------
 *  - Layer 1 (PHY): a composite burst (~2.35 s) is LONGER than a 2 s slot, so a
 *    transmission occupies ROUND = ceil((LISTEN_MAX_MS + txMs) / slotMs) = 2
 *    consecutive slots. The channel is busy across the slot boundary and
 *    contenders must defer until it frees. We model this by advancing the slot
 *    cursor by ROUND after each transmission (the "channel busy" span), so the
 *    next contention happens at the first free slot.
 *  - Layer 2 (MAC): at each free slot, the operators whose backoffUntilSlot has
 *    elapsed are the ready contenders. They draw aged listen offsets; the
 *    winner is contentionRank-first (deferred operators floor to offset 0 and
 *    beat fresh arrivals; HIGH beats NORMAL; more-aged beats less-aged; older
 *    enqueue then lower id break remaining ties). The winner keys up and resets
 *    attempts to 0; every other ready contender defers via applyBackoff
 *    (attempts++ and a binary-exponential backoff window, or 0 for HIGH).
 *  - Saturation = worst case: every operator always has a message to send and
 *    re-enqueues a fresh message the instant it is served, so peak concurrent
 *    contenders == N for the whole run. This is the hardest case for the wait
 *    bound. Under saturation the just-served operator is always ready at the
 *    next free slot, so silent slots do not arise; silenceReset is still driven
 *    for fidelity (it is a no-op while the channel stays busy).
 *  - emergency is kept false so the bound is exercised on the pure
 *    attempt-count aging/promotion path (the mechanism the proof relies on),
 *    not short-circuited by an emergency HIGH flag.
 *
 * Offline-first: pure vanilla JS driven by the local pbt.js runner and the
 * scheduler-model.js mirror; no external dependency, no network.
 */

"use strict";

const {
  listenOffsetMs,
  applyBackoff,
  contentionRank,
  silenceReset,
  boundedWaitSlots,
  makeTestOperator,
  makeRandInt,
  CONSTANTS
} = require("./scheduler-model");
const { makeRng, forAll } = require("./pbt");

// ROUND: number of GPS slots one composite burst occupies. Because the burst
// (~2.35 s) plus a full listen window (0.4 s) exceeds the 2 s slot, a
// transmission spans ceil((LISTEN_MAX_MS + txMs) / slotMs) = 2 slots. This is
// the same "round" length boundedWaitSlots() uses (Bounded_Wait = 14 + 2N).
const ROUND = Math.ceil(
  (CONSTANTS.LISTEN_MAX_MS + CONSTANTS.txMs) / CONSTANTS.slotMs
);

/**
 * Run a discrete-slot contention simulation of N saturated operators and
 * return the observed max wait (in slots), the computed bound, and any
 * bound-violating transmissions.
 *
 * @param {number} N     peak concurrent contenders
 * @param {object} rng   seeded RNG from pbt.makeRng (drives listen-offset and
 *                       backoff draws so runs are reproducible)
 * @returns {{maxWait:number, violations:Array, bound:number, served:number}}
 */
function simulateContention(N, rng) {
  const randInt = makeRandInt(rng.rand);
  const txFrames = 20; // listen-window quantization (repurposed slider default)
  const bound = boundedWaitSlots(N); // 14 + 2N

  const operators = [];
  for (let i = 0; i < N; i++) {
    operators.push(
      makeTestOperator({
        id: i,
        attempts: 0,
        emergency: false,
        needsSend: true,
        enqueueSlot: 0,
        backoffUntilSlot: -1
      })
    );
  }

  // Run long enough for the aging/promotion dynamics to reach steady state and
  // expose worst-case waits: aim for many transmissions per operator. The slot
  // cap is a generous safety valve so a scheduling bug cannot hang the test.
  const targetServed = Math.max(40, N * 12);
  const slotCap = (bound + ROUND) * (targetServed + N) + 10000;

  let slot = 0;
  let served = 0;
  let consecutiveSilentSlots = 0;
  let maxWait = 0;
  const violations = [];

  while (served < targetServed && slot <= slotCap) {
    // Ready contenders: need to send and out of backoff at this slot.
    const ready = operators.filter(
      (op) => op.needsSend && op.backoffUntilSlot <= slot
    );

    if (ready.length === 0) {
      // No one can contend this slot -> the channel is silent. Track the run of
      // silent slots; after SILENCE_SLOTS consecutive silent slots, backoff is
      // cleared for every queued operator (authoritative silence floor).
      consecutiveSilentSlots += 1;
      consecutiveSilentSlots = silenceReset(
        operators,
        consecutiveSilentSlots,
        slot
      );
      slot += 1;
      continue;
    }

    // Carrier sense: each ready operator draws an aged listen offset. Deferred
    // operators (attempts >= 1) floor to 0 and beat fresh (attempts == 0)
    // arrivals sitting in [50, 400].
    for (const op of ready) {
      op.nextTxMs = listenOffsetMs(op, { txFrames, randInt });
    }

    // Winner = contentionRank-first (earliest offset, HIGH-before-NORMAL,
    // more-aged, older enqueue, lower id).
    ready.sort((a, b) => contentionRank(a, b));
    const winner = ready[0];

    // Record the winning message's wait (servedSlot - enqueueSlot), in slots.
    const wait = slot - winner.enqueueSlot;
    if (wait > maxWait) maxWait = wait;
    if (wait > bound) {
      violations.push({
        id: winner.id,
        observedWait: wait,
        bound,
        N,
        slot,
        attemptsAtWin: winner.attempts
      });
    }
    served += 1;

    // Losers defer: applyBackoff increments attempts (single-source aging) and
    // sets the backoff window (0 slots once promoted to HIGH).
    for (const op of ready) {
      if (op !== winner) {
        applyBackoff(op, { currentSlot: slot, randInt });
      }
    }

    // Winner keys up: reset aging and immediately re-enqueue a fresh message so
    // the population stays saturated at N contenders. The new message becomes
    // eligible at the first free slot after the burst (slot + ROUND).
    winner.attempts = 0;
    winner.backoffUntilSlot = -1;
    winner.enqueueSlot = slot + ROUND;

    // A transmission occurred: not silent, and the channel is busy for the full
    // burst, which spans ROUND slots. Advance to the next free slot.
    consecutiveSilentSlots = 0;
    slot += ROUND;
  }

  return { maxWait, violations, bound, served };
}

describe("Feature: contest-queue-timing-audit, Property 7: Every queued message transmits within the bounded wait", () => {
  test("recorded max wait never exceeds Bounded_Wait(N) = 14 + 2N and the violations list is empty (varying peak N)", () => {
    // Each iteration draws a peak contender count N in [1, 12] and a seed for
    // the internal listen-offset / backoff draws, so every counterexample is
    // reproducible from (N, seed).
    const generator = (rng) => ({
      N: rng.int(1, 12),
      seed: rng.int(1, 0x7fffffff)
    });

    expect(() =>
      forAll(
        generator,
        ({ N, seed }) => {
          const { maxWait, violations, bound } = simulateContention(
            N,
            makeRng(seed)
          );
          // Both faces of the guarantee: the aggregate max wait is within the
          // bound AND no individual transmission violated it.
          return violations.length === 0 && maxWait <= bound;
        },
        {
          iterations: 150,
          label:
            "Property 7: max wait <= Bounded_Wait(N) = 14 + 2N, violations empty"
        }
      )
    ).not.toThrow();
  });

  test("Bounded_Wait(N) equals 14 + 2N (ramp-up 14 + N rounds of 2 slots)", () => {
    // Pin the bound formula the property asserts against, so a change to the
    // mirror's boundedWaitSlots is caught here rather than silently widening
    // the tolerance of the property above.
    expect(ROUND).toBe(2);
    for (let N = 0; N <= 20; N++) {
      expect(boundedWaitSlots(N)).toBe(14 + 2 * N);
    }
  });

  test("single contender (N = 1) always transmits immediately (wait 0)", () => {
    // With one operator there is never contention: it wins every free slot the
    // instant its fresh message is eligible, so the wait is exactly 0.
    const { maxWait, violations, bound } = simulateContention(1, makeRng(12345));
    expect(violations).toEqual([]);
    expect(maxWait).toBe(0);
    expect(maxWait).toBeLessThanOrEqual(bound);
  });

  test("heavy contention (N = 12) stays within the bound across many transmissions", () => {
    // A saturated 12-operator run exercises the aging ramp and HIGH promotion.
    // Sweep several seeds so the assertion is not tied to one random schedule.
    for (let seed = 1; seed <= 25; seed++) {
      const { maxWait, violations, bound, served } = simulateContention(
        12,
        makeRng(seed)
      );
      expect(served).toBeGreaterThan(0);
      expect(violations).toEqual([]);
      expect(maxWait).toBeLessThanOrEqual(bound);
    }
  });
});
