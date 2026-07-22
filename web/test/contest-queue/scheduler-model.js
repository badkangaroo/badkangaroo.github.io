/**
 * scheduler-model.js — offline test harness mirror of the contest-queue
 * simulator's pure scheduling functions.
 *
 * Spec: contest-queue-timing-audit (task 7.1)
 *
 * WHY THIS EXISTS
 * ---------------
 * The live simulator logic lives inline in an HTML <script> block
 * (web/contest_queue_simulator.html) inside a single IIFE, so its pure
 * scheduling functions cannot be `require`d directly. This module MIRRORS
 * those pure functions so the property/example tests (tasks 2.4, 4.2, 4.4,
 * 4.6, 4.7, 4.9, 6.2, 7.2, 7.3) can drive them with generated inputs.
 *
 * MIRROR-DRIFT WARNING
 * --------------------
 * These are COPIES, not imports. The tests validate this mirror, NOT the live
 * inline <script>. Every mirrored function below is annotated with its source
 * function name and approximate line range in
 * web/contest_queue_simulator.html so a reviewer can diff the mirror against
 * the cited source. ANY change to a mirrored function in the inline source
 * MUST update the mirror here AND the cited line range in the same change.
 *
 * Line ranges verified against web/contest_queue_simulator.html after the
 * scheduling / fairness implementation (tasks 2–6). Re-verify after any edit
 * to the mirrored functions in the live source.
 *
 * OFFLINE-FIRST
 * -------------
 * Pure vanilla JS, no external dependency, no CDN. Runs under the vendored
 * Jest install with no network access, per AgentGuidance/OFFLINE_FIRST.md.
 */

"use strict";

// ── Timing constants ─────────────────────────────────────────────────────
// mirrors timing constants block — contest_queue_simulator.html ~L725-750
const CONSTANTS = Object.freeze({
  // Layer 1 (PHY): composite on-air burst — authoritative TX unit
  COMPOSITE_BURST_SEC: 2.35, // 0.2 VOX + 0.1 silence + 2.048 waveform
  TX_TIME_MIN: 2.0,
  TX_TIME_MAX: 5.0,
  TIMING_STEP: 0.05,

  // Layer 2 (MAC): GPS slot + carrier-sense listen window
  SLOT_SEC: 2.0,
  LISTEN_MIN_MS: 50,
  LISTEN_MAX_MS: 400,
  SILENCE_SLOTS: 3,

  // Backoff (binary exponential)
  MAX_BACKOFF_EXP: 4, // max window 2^4 = 16 slots
  AGING_PROMOTE_ATTEMPTS: 3, // attempts > 3 => HIGH priority

  // Aging band — contest_queue_simulator.html ~L1099
  // Full listen window, so any operator with attempts >= 1 floors its aged
  // offset to 0.
  AGE_BAND_MS: 400, // = LISTEN_MAX_MS

  // Derived (seconds -> ms)
  slotMs: 2000, // SLOT_SEC * 1000
  txMs: 2350 // COMPOSITE_BURST_SEC * 1000
});

// ── Randomness (injectable so property tests stay deterministic) ──────────
// mirrors randInt helper — contest_queue_simulator.html ~L768
// randInt(lo, hi) draws an integer in the inclusive range [lo, hi].
function makeRandInt(rand) {
  const r = typeof rand === "function" ? rand : Math.random;
  return (lo, hi) => lo + ((r() * (hi - lo + 1)) | 0);
}
const defaultRandInt = makeRandInt(Math.random);

// ── Slot index ────────────────────────────────────────────────────────────
// mirrors currentSlotIndex — contest_queue_simulator.html ~L1045-1047
// design: `Math.floor(simMs / slotMs)`.
function currentSlotIndex(simMs, slotMs = CONSTANTS.slotMs) {
  return Math.floor(simMs / slotMs);
}

// ── Priority classification ────────────────────────────────────────────────
// mirrors priorityClass — contest_queue_simulator.html ~L1049-1051
// HIGH iff emergency OR attempts > AGING_PROMOTE_ATTEMPTS, else NORMAL.
function priorityClass(op, C = CONSTANTS) {
  return op.emergency || op.attempts > C.AGING_PROMOTE_ATTEMPTS
    ? "HIGH"
    : "NORMAL";
}

// ── Listen window span + frame step ────────────────────────────────────────
// mirrors listenSpanMs — contest_queue_simulator.html ~L1085-1087
// Span is the fixed 50–400 ms carrier-sense window (= 350 ms), independent of
// burst length.
function listenSpanMs(C = CONSTANTS) {
  return C.LISTEN_MAX_MS - C.LISTEN_MIN_MS; // 350
}

// mirrors frameStepMs — contest_queue_simulator.html ~L1089-1091
// Guards txFrames <= 0 to avoid /0.
function frameStepMs(txFrames, C = CONSTANTS) {
  return txFrames > 0 ? listenSpanMs(C) / txFrames : 0;
}

// ── Base carrier-sense offset draw (before aging) ──────────────────────────
// mirrors the base-offset portion of listenOffsetMs —
// contest_queue_simulator.html ~L1122-1126.
// base = LISTEN_MIN_MS + frame * frameStepMs().
// The degenerate txFrames <= 1 case yields exactly LISTEN_MIN_MS (50).
function drawBaseOffsetMs(txFrames, randInt = defaultRandInt, C = CONSTANTS) {
  const frame = txFrames > 1 ? randInt(0, txFrames - 1) : 0;
  return C.LISTEN_MIN_MS + frame * frameStepMs(txFrames, C);
}

// ── Attempt-count aging bias ───────────────────────────────────────────────
// mirrors agedOffset — contest_queue_simulator.html ~L1100-1103
// Full-window band: any operator with attempts >= 1 floors to 0, giving
// deferred operators carrier-sense priority over fresh (attempts == 0)
// arrivals. Not a graduated per-attempt separation.
function agedOffset(baseMs, op, C = CONSTANTS) {
  const shift = op.attempts * C.AGE_BAND_MS; // attempts>=1 => floored to 0
  return Math.max(0, baseMs - shift);
}

// ── Full listen offset (base draw + aging) ─────────────────────────────────
// mirrors listenOffsetMs — contest_queue_simulator.html ~L1122-1127
function listenOffsetMs(op, opts = {}, C = CONSTANTS) {
  const txFrames = opts.txFrames != null ? opts.txFrames : 20;
  const randInt = opts.randInt || defaultRandInt;
  const base = drawBaseOffsetMs(txFrames, randInt, C);
  return agedOffset(base, op, C);
}

// ── Binary exponential backoff ─────────────────────────────────────────────
// mirrors applyBackoff — contest_queue_simulator.html ~L1174-1188
// Mutates op: increments attempts (SINGLE SOURCE of aging increment) and sets
// backoffUntilSlot. Returns the backoff distance in slots (0 for HIGH).
function applyBackoff(op, opts = {}, C = CONSTANTS) {
  const nowSlot =
    opts.currentSlot != null
      ? opts.currentSlot
      : currentSlotIndex(opts.simMs || 0, C.slotMs);
  const randInt = opts.randInt || defaultRandInt;

  op.attempts += 1; // single-source aging increment (design Property 4)

  if (priorityClass(op, C) === "HIGH") {
    op.backoffUntilSlot = nowSlot; // HIGH: contend every slot
    return 0;
  }
  const exp = Math.min(op.attempts, C.MAX_BACKOFF_EXP); // <= 4
  const backoffSlots = randInt(1, 1 << exp); // 1 .. 2^exp, <= 16
  op.backoffUntilSlot = nowSlot + backoffSlots;
  return backoffSlots;
}

// ── Deterministic contention tie-break ─────────────────────────────────────
// mirrors contentionRank — contest_queue_simulator.html ~L1109-1117
// Used by processScheduledTx (~L1211). Order: earliest listen offset, then
// HIGH-before-NORMAL, then more-aged (higher attempts), then older
// enqueueSlot, then lower id. This tie-break — not the aged offset — is the
// primary fairness mechanism.
function contentionRank(a, b, C = CONSTANTS) {
  const pa = priorityClass(a, C) === "HIGH" ? 0 : 1;
  const pb = priorityClass(b, C) === "HIGH" ? 0 : 1;
  return (
    (a.nextTxMs - b.nextTxMs) || // earliest listen offset wins carrier sense
    (pa - pb) || // HIGH before NORMAL at equal offset
    (b.attempts - a.attempts) || // more-aged wins
    (a.enqueueSlot - b.enqueueSlot) || // older enqueue wins
    (a.id - b.id) // stable final tie-break
  );
}

// ── Silence-threshold backoff reset ────────────────────────────────────────
// mirrors resolveSlotBoundary silence handling —
// contest_queue_simulator.html ~L1224-1247 (reset body ~L1230-1242).
// After 3 consecutive silent slots every queued operator's backoffUntilSlot is
// cleared to <= currentSlot. Mutates the operators array; returns the reset
// silent-slot counter (0 when a reset fired, else the incoming count).
function silenceReset(operators, consecutiveSilentSlots, currentSlot, C = CONSTANTS) {
  if (consecutiveSilentSlots < C.SILENCE_SLOTS) {
    return consecutiveSilentSlots;
  }
  for (const op of operators) {
    if (op.needsSend) {
      op.backoffUntilSlot = currentSlot; // clear backoff (<= currentSlot)
    }
  }
  return 0;
}

// ── Bounded-wait computation ───────────────────────────────────────────────
// mirrors boundedWaitSlots — contest_queue_simulator.html ~L1056-1060
// Bounded_Wait(n) = ramp-up (14) + n * round, where
// round = ceil((LISTEN_MAX_MS + txMs) / slotMs).
function boundedWaitSlots(n, opts = {}, C = CONSTANTS) {
  const slotMs = opts.slotMs != null ? opts.slotMs : C.slotMs;
  const txMs = opts.txMs != null ? opts.txMs : C.txMs;
  const rampup = (1 << 1) + (1 << 2) + (1 << 3); // 2 + 4 + 8 = 14
  const round = Math.ceil((C.LISTEN_MAX_MS + txMs) / slotMs); // 2
  return rampup + n * round;
}

// ── Operator factory for tests ─────────────────────────────────────────────
// mirrors the scheduling-relevant fields of makeOperator —
// contest_queue_simulator.html ~L984-1019 (aging / fairness fields at
// ~L1000-1005: attempts, emergency, enqueueSlot, backoffUntilSlot,
// lastServedSlot, maxWaitSlots).
function makeTestOperator(overrides = {}) {
  const enqueueSlot = overrides.enqueueSlot != null ? overrides.enqueueSlot : 0;
  return Object.assign(
    {
      id: 1,
      attempts: 0,
      emergency: false,
      needsSend: true,
      nextTxMs: 0,
      enqueueSlot,
      backoffUntilSlot: -1,
      lastServedSlot: enqueueSlot,
      maxWaitSlots: 0
    },
    overrides
  );
}

module.exports = {
  CONSTANTS,
  makeRandInt,
  defaultRandInt,
  currentSlotIndex,
  priorityClass,
  listenSpanMs,
  frameStepMs,
  drawBaseOffsetMs,
  agedOffset,
  listenOffsetMs,
  applyBackoff,
  contentionRank,
  silenceReset,
  boundedWaitSlots,
  makeTestOperator
};
