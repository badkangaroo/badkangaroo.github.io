/**
 * harness.test.js — sanity checks for the contest-queue offline test harness.
 *
 * Spec: contest-queue-timing-audit (task 7.1)
 *
 * This validates the HARNESS INFRASTRUCTURE only (that the mirror module loads,
 * exports the mirrored pure functions, and that the offline PBT runner behaves
 * correctly). The spec's numbered correctness properties (Properties 1–7) and
 * example/smoke tests are implemented by the dedicated test tasks
 * (2.4, 4.2, 4.4, 4.6, 4.7, 4.9, 6.2, 7.2, 7.3), which plug into this harness.
 */

"use strict";

const model = require("./scheduler-model");
const { makeRng, gen, forAll } = require("./pbt");

describe("contest-queue test harness — scheduler-model exports", () => {
  test("exposes all mirrored pure functions and constants", () => {
    expect(typeof model.CONSTANTS).toBe("object");
    for (const fn of [
      "currentSlotIndex",
      "priorityClass",
      "listenSpanMs",
      "frameStepMs",
      "drawBaseOffsetMs",
      "agedOffset",
      "listenOffsetMs",
      "applyBackoff",
      "contentionRank",
      "silenceReset",
      "boundedWaitSlots",
      "makeTestOperator",
      "makeRandInt"
    ]) {
      expect(typeof model[fn]).toBe("function");
    }
  });

  test("mirrored constants match the rewritten timing block", () => {
    const C = model.CONSTANTS;
    expect(C.COMPOSITE_BURST_SEC).toBe(2.35);
    expect(C.SLOT_SEC).toBe(2.0);
    expect(C.LISTEN_MIN_MS).toBe(50);
    expect(C.LISTEN_MAX_MS).toBe(400);
    expect(C.MAX_BACKOFF_EXP).toBe(4);
    expect(C.AGING_PROMOTE_ATTEMPTS).toBe(3);
    expect(C.slotMs).toBe(2000);
    expect(C.txMs).toBe(2350);
  });

  test("mirrored functions return sane spot values", () => {
    expect(model.listenSpanMs()).toBe(350);
    expect(model.frameStepMs(0)).toBe(0); // guards divide-by-zero
    expect(model.frameStepMs(10)).toBeCloseTo(35);
    expect(model.currentSlotIndex(5000)).toBe(2); // floor(5000/2000)
    expect(model.boundedWaitSlots(0)).toBe(14); // ramp-up only
    expect(model.boundedWaitSlots(5)).toBe(24); // 14 + 5*2

    // aged offset floors any deferred operator to 0
    const fresh = model.makeTestOperator({ attempts: 0 });
    const deferred = model.makeTestOperator({ attempts: 1 });
    expect(model.agedOffset(400, fresh)).toBe(400);
    expect(model.agedOffset(400, deferred)).toBe(0);

    // priority promotion by attempt count
    expect(model.priorityClass(model.makeTestOperator({ attempts: 3 }))).toBe("NORMAL");
    expect(model.priorityClass(model.makeTestOperator({ attempts: 4 }))).toBe("HIGH");
    expect(model.priorityClass(model.makeTestOperator({ emergency: true }))).toBe("HIGH");
  });

  test("applyBackoff is injectable/deterministic and bounded", () => {
    const randInt = model.makeRandInt(makeRng(42).rand);
    const op = model.makeTestOperator({ attempts: 0 });
    const dist = model.applyBackoff(op, { currentSlot: 10, randInt });
    expect(op.attempts).toBe(1); // single-source increment
    expect(dist).toBeGreaterThanOrEqual(1);
    expect(dist).toBeLessThanOrEqual(16); // <= 2^4
    expect(op.backoffUntilSlot).toBe(10 + dist);
  });
});

describe("contest-queue test harness — offline PBT runner", () => {
  test("seeded RNG is deterministic and reproducible", () => {
    const a = makeRng(123);
    const b = makeRng(123);
    const seqA = [a.int(0, 1000), a.int(0, 1000), a.float(0, 1)];
    const seqB = [b.int(0, 1000), b.int(0, 1000), b.float(0, 1)];
    expect(seqA).toEqual(seqB);
  });

  test("forAll passes a true property over 100 iterations", () => {
    expect(() =>
      forAll(gen.int(-1000, 1000), (n) => Number.isInteger(n) && n >= -1000 && n <= 1000, {
        iterations: 100,
        label: "int stays in range"
      })
    ).not.toThrow();
  });

  test("forAll reports a counterexample with seed when a property fails", () => {
    let message = "";
    try {
      forAll(gen.int(0, 10), (n) => n < 5, { iterations: 100, label: "always < 5" });
    } catch (err) {
      message = err.message;
    }
    expect(message).toContain("always < 5 FAILED");
    expect(message).toContain("seed:");
    expect(message).toContain("counterexample:");
  });

  test("record/tuple generators build structured operator inputs", () => {
    const opGen = gen.record({
      id: gen.int(1, 100),
      attempts: gen.int(0, 8),
      emergency: gen.bool(0.2)
    });
    expect(() =>
      forAll(
        opGen,
        (raw) => {
          const op = model.makeTestOperator(raw);
          const cls = model.priorityClass(op);
          return cls === "HIGH" || cls === "NORMAL";
        },
        { iterations: 100, label: "priorityClass total" }
      )
    ).not.toThrow();
  });
});
