# Design Document

## Overview

This feature audits and corrects the timing model of the contest queue simulator
(`web/contest_queue_simulator.html`) against the authoritative Ribbit contest
transport design (`Docs/contest_queue_algorithm.md`, `Docs/contesting_mode.md`),
then strengthens the simulator's fairness scheduler so that the worst-case wait
for any queued message is provably bounded. The work also records the audit
findings and extends the README's "Transmit / Receive Architecture (Protocol
Layering)" section with a detailed transmit/receive write-up.

The simulator is a self-contained HTML file with vanilla ES6 JavaScript in a
single IIFE. There is no build step and no external dependency (this is a hard
project constraint — see `AgentGuidance/OFFLINE_FIRST.md`). All simulator changes
are therefore in-place edits to the `<script>` block of that file. Code examples
below are JavaScript to match the target.

### Framing: this is a Layer 2 MAC over a half-duplex channel

The README already frames the Tx/Rx component using the OSI model. This design
stays inside that frame and treats every timing decision as a **Layer 2
Media-Access-Control** concern operating over a **Layer 1 PHY** whose
authoritative timing constant is the composite on-air burst:

- **Layer 1 (PHY) — fixed constraint.** A transmission occupies the channel for
  the full composite burst: 200 ms of 300 Hz VOX tone + 100 ms silence + 2.048 s
  Ribbit waveform (16384 samples at 8 kHz) ≈ **2.35 s**. This is not tunable by
  the MAC; the MAC must schedule *around* it.
- **Layer 2 (MAC) — what this feature edits.** GPS-aligned 2 s slots, a 50–400 ms
  carrier-sense listen window before keying up, binary exponential backoff on
  contention, a silence-threshold reset, and the new **attempt-count aging** rule
  that guarantees bounded wait.

The single most important consequence of grounding the model in the real PHY is
that **the burst (~2.35 s) is longer than the slot (2 s)**. A burst legitimately
spans a slot boundary; competing operators must keep deferring (carrier sense)
until the burst ends. The current simulator cannot represent this because its
listen model is defined as `slot − tx`, which goes to zero (or negative) once the
burst exceeds the slot. Correcting that abstraction is central to this design.

## Architecture

The feature has four work products across three files:

```
Docs/contest_queue_timing_audit.md   (NEW)  — Timing_Audit findings record
    ├── authoritative transmission time + breakdown + citations   (R1)
    ├── per-constant comparison table (sim vs model, match/diff)   (R2)
    └── fairness-bound verification results (observed vs computed)  (R5)

web/contest_queue_simulator.html    (EDIT)  — Contest_Queue_Simulator + Fairness_Scheduler
    ├── timing constants block (~lines 723-740)                    (R3)
    ├── scheduleNextTx / applyBackoff / listen-window model        (R3, R4)
    ├── aging + priority + bounded-wait scheduler                  (R4)
    └── fairness instrumentation (per-op wait, max wait, bound)    (R5)

README.md                           (EDIT)  — Documentation_Set
    └── extend "Transmit / Receive Architecture" with Tx/Rx process (R6)
```

Data flow inside the simulator's discrete-time loop (unchanged in shape, changed
in the scheduling internals):

```
tick(dt)
  simMs += dt
  reapChannels()            → onChannelEnd(): count burst, deliver RX/ACK, reset attempts
  maybeSpawn / maybeDepart
  for each crossed slot boundary:
      resolveSlotBoundary(s) → silence tracking + silence-threshold backoff reset
  processScheduledTx()       → carrier sense; winner keys up, losers applyBackoff()
  update* (map, tiles, stats, fairness monitor)
```

## Part 1 — Timing Audit (Requirements 1, 2)

The audit is a documented comparison, produced by reading the current constants
and the authoritative model. The findings are recorded in a new file
`Docs/contest_queue_timing_audit.md` and later summarized in the README (R6).

### Authoritative transmission time (R1)

| Item | Value | Source |
|------|-------|--------|
| Composite burst total | ≈ 2.35 s | `Docs/contest_queue_algorithm.md` (On-air timing), `Docs/contesting_mode.md` (Quick Reference) |
| VOX wake-up tone | 300 Hz, 200 ms | same |
| Silence gap | 100 ms | same |
| Ribbit waveform | 2.048 s (16384 samples @ 8 kHz) | same, `Docs/codec.md` |

### Per-constant comparison (R2)

Current simulator constants (from `web/contest_queue_simulator.html`, timing
block near lines 723-740) compared to the authoritative model. "Diff" is the
signed numeric difference (simulator − authoritative) where both are numeric.

| Timing_Constant | Simulator (current) | Authoritative_Model | Match? | Diff / Note |
|-----------------|---------------------|---------------------|--------|-------------|
| TX time default (`txTimeSec`) | 3.0 s | 2.35 s (composite burst) | ✗ | +0.65 s |
| TX time min (`TX_TIME_MIN`) | 2.0 s | range must include 2.35 s | ~ | 2.0 ≤ 2.35, low end OK; default wrong |
| TX time max (`TX_TIME_MAX`) | 5.0 s | range must include 2.35 s | ~ | 5.0 ≥ 2.35, arbitrary upper |
| Slot / timing window (`timingWindowSec`) | 10.0 s | 2.0 s GPS slot | ✗ | +8.0 s |
| Slot ≥ tx coupling (`timingWindowMinSec`) | slot ≥ `txTimeSec` | slot (2 s) < burst (2.35 s) allowed | ✗ | model forbids the real case |
| Listen window (frame model) | `(slot − tx)/txFrames`, tx-frame quantized | random uniform 50–400 ms | ✗ | wrong basis; not 50–400 ms |
| Backoff (`applyBackoff`) | reschedule to next window, no growth | binary exponential, max exp 4 (≤16 slots) | ✗ | no exponential backoff |
| Silence threshold (`SILENCE_SLOTS`) | 3 slots | 3 slots | ✓ | 0 |
| Aging / promotion | none | promote when attempts > 3 | ✗ | missing |

The audit's headline conclusions:

1. The transmission unit must be the composite burst (2.35 s), not the arbitrary
   2–5 s / default-3 s slider.
2. The slot must be a fixed 2 s GPS grid, decoupled from burst duration; bursts
   span slot boundaries by design.
3. The contention resolver must be a 50–400 ms listen window, independent of
   burst length — replacing the `slot − tx` frame basis.
4. Backoff must be binary exponential (max exponent 4).
5. A starvation-prevention aging rule is missing and must be added (Part 3).

## Part 2 — Simulator Timing Value Updates (Requirement 3)

### Constant changes

The timing block is rewritten. New named constants make the PHY/MAC split
explicit and keep the burst as the authoritative unit.

```javascript
// ── Layer 1 (PHY): composite on-air burst — authoritative TX unit ──
const COMPOSITE_BURST_SEC = 2.35;   // 0.2 VOX + 0.1 silence + 2.048 waveform
const TX_TIME_MIN = 2.0;            // range includes the burst (R3.2)
const TX_TIME_MAX = 5.0;
const TIMING_STEP = 0.05;           // finer step so 2.35 is representable (was 0.1)
let   txTimeSec   = COMPOSITE_BURST_SEC;   // default = burst (R3.1)

// ── Layer 2 (MAC): GPS slot + carrier-sense listen window ──
const SLOT_SEC = 2.0;               // fixed GPS grid (R3.3); slot may be < burst
let   slotSec  = SLOT_SEC;
const LISTEN_MIN_MS = 50;           // carrier-sense listen window (R3.4)
const LISTEN_MAX_MS = 400;
const SILENCE_SLOTS = 3;            // unchanged, already correct (R3.6)

// ── Backoff (binary exponential) ──
const MAX_BACKOFF_EXP = 4;          // max window 2^4 = 16 slots (R3.5)
const AGING_PROMOTE_ATTEMPTS = 3;   // attempts > 3 ⇒ HIGH priority (R4.2)

let slotMs = slotSec * 1000;        // 2000
let txMs   = txTimeSec * 1000;      // 2350
```

The existing `txFrames` slider is **repurposed**: it now quantizes the 50–400 ms
listen window into discrete listen frames (contention resolution granularity)
rather than dividing `slot − tx`. This preserves the existing UI control while
giving it a correct meaning.

### Decoupling slot from burst duration

`timingWindowMinSec()` currently forces `slot ≥ txTimeSec`, which makes the
authoritative case (2 s slot, 2.35 s burst) unreachable. The slot becomes a fixed
2 s grid independent of the burst; the "timing window" slider is repointed at the
slot value with an independent range (e.g. 1–4 s) so a user can still experiment,
but it no longer depends on `txTimeSec`.

```javascript
function timingWindowMinSec() { return 1.0; }               // was: return txTimeSec
function timingWindowMaxSec() { return 4.0; }               // was: txTimeSec + SPAN
```

### Listen-window scheduling (replaces frame-over-(slot−tx))

`contentionRangeMs()` is redefined to be the listen window span, independent of
`txMs`. The transmission then occupies `[offset, offset + txMs]`, which may run
past the 2 s boundary — that is the intended half-duplex behavior.

```javascript
function listenSpanMs()  { return LISTEN_MAX_MS - LISTEN_MIN_MS; } // 350
function frameStepMs()   { return txFrames > 0 ? listenSpanMs() / txFrames : 0; }

// Draw a carrier-sense listen offset in [LISTEN_MIN_MS, LISTEN_MAX_MS],
// biased earlier by attempt count (aging — see Part 3).
function listenOffsetMs(op) {
  const frame = (txFrames > 1) ? randInt(0, txFrames - 1) : 0;
  const base  = LISTEN_MIN_MS + frame * frameStepMs();
  return agedOffset(base, op);   // Part 3
}
```

Carrier sense already models "channel busy across the slot boundary" correctly:
`channelBusyForOp(op, atMs)` tests membership in `[ch.startMs, ch.endMs)` where
`ch.endMs = startMs + txMs`. Because `txMs` (2350) > `slotMs` (2000), an occupied
channel naturally remains busy into the next slot, and contenders defer. No change
is needed there beyond the constant updates.

### No-runtime-error requirement (R3.7)

All edits stay within the existing IIFE, keep the same function signatures where
possible, and avoid new globals. After the edits the page is loaded and the tick
loop is driven (via the existing `stepOnce()` / play controls) to confirm no
thrown errors, satisfying R3.7. This is a smoke check, not a property.

## Part 3 — Strengthened Fairness with Bounded Wait (Requirement 4)

### The problem with the current scheduler

`applyBackoff` simply reschedules to the next window with a fresh random frame.
There is no exponential backoff, no priority, and no aging. Under contention a
message can lose arbitrarily many times — the wait is unbounded in the worst case.

### Design of the aging scheduler

The operator record already has `attempts` (incremented on defer, reset to 0 on
transmit). We keep `attempts` as the **aging counter** and add an `enqueueSlot`
and a `backoffUntilSlot` field, plus a derived priority class.

```javascript
// added to makeOperator():
enqueueSlot: currentSlotIndex(),   // slot when it entered contention
backoffUntilSlot: -1,              // may not contend before this slot
// attempts already exists (deferral / aging counter)

function currentSlotIndex() { return Math.floor(simMs / slotMs); }

function priorityClass(op) {
  return (op.emergency || op.attempts > AGING_PROMOTE_ATTEMPTS) ? "HIGH" : "NORMAL";
}
```

**Three coordinated mechanisms:**

1. **Binary exponential backoff (R3.5)** — governs *when a deferring NORMAL
   message re-contends*, spreading load for throughput.

   ```javascript
   function applyBackoff(op) {
     op.attempts += 1;
     totalDefers++;
     if (priorityClass(op) === "HIGH") {
       op.backoffUntilSlot = currentSlotIndex();      // HIGH: contend every slot
     } else {
       const exp = Math.min(op.attempts, MAX_BACKOFF_EXP);   // ≤ 4
       const backoffSlots = randInt(1, 1 << exp);            // 1 .. 2^exp, ≤ 16
       op.backoffUntilSlot = currentSlotIndex() + backoffSlots;
     }
     scheduleNextTx(op);
   }
   ```

2. **Attempt-count aging bias (R4.1, R4.5) — a coarse two-tier bias, not a
   graduated per-level separation.** The aging band is deliberately set to the
   full listen window (`AGE_BAND_MS = LISTEN_MAX_MS = 400`). Because every base
   offset lies in `[50, 400]`, any operator that has deferred at least once
   (`attempts >= 1`) has its aged offset floored to `0`, while a freshly enqueued
   operator (`attempts = 0`) keeps its drawn offset in `[50, 400]`. So the aged
   offset does **not** produce a distinct, strictly-decreasing offset per attempt
   level (all deferred operators collapse to `0`); it produces a two-tier bias:
   *deferred* operators win carrier sense over *fresh* arrivals. Ordering **within**
   the collapsed offset-0 group is not decided here — it is decided by the
   deterministic tie-break in step 3, which is the primary fairness mechanism.
   The aged offset is therefore a secondary bias that guarantees any contended
   message keys up no later than any brand-new arrival.

   ```javascript
   // Full-window band: any operator with attempts >= 1 floors to offset 0,
   // giving all deferred operators carrier-sense priority over fresh arrivals
   // (attempts == 0). Ordering within the offset-0 group is by contentionRank.
   const AGE_BAND_MS = LISTEN_MAX_MS;   // = 400; collapses deferred operators to 0
   function agedOffset(baseMs, op) {
     const shift = op.attempts * AGE_BAND_MS;   // attempts>=1 ⇒ floored to 0
     return Math.max(0, baseMs - shift);
   }
   ```

3. **Deterministic tie-break + HIGH promotion (R4.2) — the primary fairness
   mechanism.** All deferred operators share the floored offset `0`, so the winner
   among them is chosen deterministically by (priority HIGH first, then higher
   attempts, then older `enqueueSlot`, then lower `id`). This tie-break, not the
   aged offset, is what actually orders contended operators and delivers fairness.
   HIGH-priority messages skip backoff and contend every slot, so the most-aged
   message is always present to win.

   ```javascript
   function contentionRank(a, b) {
     const pa = priorityClass(a) === "HIGH" ? 0 : 1;
     const pb = priorityClass(b) === "HIGH" ? 0 : 1;
     return (a.nextTxMs - b.nextTxMs)   // earliest listen offset wins carrier sense
         || (pa - pb)                   // HIGH before NORMAL at equal offset
         || (b.attempts - a.attempts)   // more-aged wins
         || (a.enqueueSlot - b.enqueueSlot)
         || (a.id - b.id);
   }
   // processScheduledTx() sorts ready ops with contentionRank instead of nextTxMs-only.
   ```

`scheduleNextTx` respects `backoffUntilSlot` (it targets the first window at or
after `backoffUntilSlot`) and uses `listenOffsetMs(op)` for the intra-window
offset.

**Single source of truth for `attempts`.** `attempts` is incremented in exactly
one place — the defer path in `applyBackoff` — and nowhere else. Since a defer is
precisely what happens on a contended slot the operator does not win, this means
`attempts` advances by exactly one per contended-and-lost slot, with no risk of
double-counting. `resolveSlotBoundary` deliberately does **not** touch `attempts`;
it only performs silence tracking and, on the 3-silent-slot reset, clears
`backoffUntilSlot` (forcing everyone out of backoff, per the authoritative silence
floor).

### The bounded-wait guarantee (R4.3, R4.4)

**Two invariants** make the wait provably finite:

- **Monotonic aging (P4):** while a message waits it does not transmit, so on each
  contended slot it loses, the single-source increment in `applyBackoff` advances
  its `attempts` by exactly one; on transmission `attempts` resets to 0. A newly
  enqueued message starts at `attempts = 0`.
- **Aging priority (P5):** any operator that has deferred at least once
  (`attempts >= 1`) has its aged offset floored to `0`, so a strictly higher
  `attempts` never yields a *larger* offset than a lower one (deferred operators
  tie at `0`; fresh `attempts = 0` operators sit in `[50, 400]`). Ordering among
  the tied offset-0 operators is then decided by the deterministic tie-break —
  HIGH first, then higher attempts, then older enqueue, then id — so the unique
  most-aged contender always wins its window.

**Proof sketch of the bound.** Consider message `m` once it is HIGH priority. It
reaches HIGH after at most `AGING_PROMOTE_ATTEMPTS + 1 = 4` deferrals. The three
pre-promotion deferrals (raising `attempts` to 1, 2, then 3) draw NORMAL backoff
windows of at most `2^1 = 2`, `2^2 = 4`, and `2^3 = 8` slots respectively; the
fourth deferral raises `attempts` to 4, which promotes `m` to HIGH and applies no
further backoff. The pre-promotion ramp-up is therefore at most
`2 + 4 + 8 = 14` slots. While HIGH, `m` skips backoff and
contends every slot. Any other operator `o` that transmits before `m` must win a
window while `m` waits; immediately afterward `o.attempts = 0 < m.attempts`, and
`m` keeps aging, so `o` can never out-age `m` again before `m` transmits. New
arrivals start at `attempts = 0 < m.attempts`. Therefore each of the at most
`N − 1` other operators contending during `m`'s wait transmits **at most once**
before `m`, so `m` transmits within `N` contention rounds, where `N` is the peak
number of concurrent contenders.

Each contention round occupies the channel for one burst plus up to one listen
window: `LISTEN_MAX_MS + txMs = 0.4 + 2.35 = 2.75 s`, which spans
`⌈2.75 / 2⌉ = 2` GPS slots. Hence:

```
Bounded_Wait(N)  =  R_rampup  +  N × R_round     (contention rounds / slots)
                 ≤  14 slots  +  2N slots
                 =  (28 + 4N) seconds            (at SLOT_SEC = 2 s)
```

This is a finite function of the number of contending operators `N`, satisfying
R4.3 and R4.4. The bound is conservative (the ramp-up term is a worst case); the
essential result is finiteness and linear growth in `N`.

## Part 4 — Fairness-Bound Verification (Requirement 5)

The simulator is instrumented to measure the actual worst-case wait and compare
it against `Bounded_Wait(N)`.

### Data model additions

```javascript
// per operator:
lastServedSlot: enqueueSlot,          // slot of most recent transmit (or enqueue)
maxWaitSlots:   0,                    // longest wait this operator has observed

// global fairness monitor:
let fairnessPeakN   = 0;              // peak concurrent contenders observed
let fairnessMaxWait = 0;              // max wait across all operators (R5.1)
let fairnessViolations = [];          // { id, callsign, observedWait, bound } (R5.3)
```

### Measurement (R5.1) and bound check (R5.2, R5.3)

On each successful transmission (`startChannel`), compute the wait for that
message and update the monitor. `N` is the number of operators with
`needsSend === true` during the wait window (tracked as a running peak).

```javascript
function recordServed(op) {
  const now  = currentSlotIndex();
  const wait = now - op.lastServedSlot;
  op.maxWaitSlots = Math.max(op.maxWaitSlots, wait);
  fairnessMaxWait = Math.max(fairnessMaxWait, wait);        // R5.1
  const bound = boundedWaitSlots(fairnessPeakN);            // computed bound
  if (wait > bound) {                                       // R5.3
    fairnessViolations.push({
      id: op.id, callsign: op.callsign, observedWait: wait, bound
    });
  }
  op.lastServedSlot = now;
  op.attempts = 0;
}

function boundedWaitSlots(n) {
  const rampup = (1 << 1) + (1 << 2) + (1 << 3);   // 14
  const round  = Math.ceil((LISTEN_MAX_MS + txMs) / slotMs); // 2
  return rampup + n * round;
}
```

The verification results (peak `N`, observed max wait, computed bound, and any
violations) are written into `Docs/contest_queue_timing_audit.md` (R5.2, R5.3).
For a correct implementation the violations list is empty.

## Part 5 — README Transmit/Receive Write-up (Requirement 6)

The README already has a "Transmit / Receive Architecture (Protocol Layering)"
section. This feature **extends** it (does not replace it) with a
"Transmit / Receive Process" subsection that stays consistent with the OSI
layering already established:

1. **Slot timing (MAC):** 2 s GPS-aligned slots; the burst is 2.35 s and spans a
   slot boundary. (R6.2)
2. **Carrier sense (MAC):** 50–400 ms listen window before keying up; asymmetric
   PWR/Gain detection and hidden nodes. (R6.2)
3. **Transmission (PHY):** the composite burst (200 ms VOX + 100 ms silence +
   2.048 s waveform ≈ 2.35 s). (R6.2)
4. **Reception with acknowledgment:** decode → record Message ID → piggyback ACK
   on next outbound burst → confirm. (R6.2)
5. **Audit findings + resolutions:** a compact version of the Part 1 table, each
   mismatch with its resolution. (R6.3)
6. **Strengthened fairness:** the attempt-count aging rule and the
   `Bounded_Wait(N)` guarantee. (R6.4)
7. **Timing values** stated to match the updated simulator and the authoritative
   model (2 s slot, ~2.35 s burst, 50–400 ms listen, ≤16-slot backoff, 3-slot
   silence reset). (R6.5)

The write-up reuses the OSI vocabulary (PHY / MAC / framing / application) so the
new content reads as a continuation of the existing layering discussion, with the
~2.35 s burst named as the authoritative Layer 1 timing constraint.

## Error Handling

- **Slot shorter than burst.** Intended, not an error: `channelBusyForOp` keeps
  the channel busy for the full `txMs` past the boundary; contenders defer.
- **`contentionRange` / `frameStep` at zero.** `frameStepMs()` guards
  `txFrames <= 0` and returns 0 (offset floors to `LISTEN_MIN_MS`); no division by
  zero.
- **Off-grid default (2.35).** `TIMING_STEP` is reduced to 0.05 so the default and
  slider values remain representable; `setTxTimeSec` still snaps to the grid.
- **Backoff overflow.** The exponent is clamped by `MAX_BACKOFF_EXP`, so
  `1 << exp` never exceeds `1 << 4 = 16`; backoff can never exceed 16 slots.
- **Empty population / no contenders.** `boundedWaitSlots(0)` returns the ramp-up
  constant; monitor updates are skipped when no operator needs to send.
- **Runtime safety (R3.7).** Edits stay inside the existing IIFE with no new
  globals; the page is exercised after editing to confirm no thrown errors.

## Testing Strategy

**Dual approach.** Property tests cover the universal scheduler invariants;
example/smoke tests cover constant values, documentation content, and page load.
Because the simulator logic lives inline in an HTML `<script>`, the pure
scheduling functions (offset draw, backoff, aging comparison, bounded-wait
computation, silence reset) are exercised by extracting/mirroring them into a
small test harness (plain JS) so they can be driven with generated inputs. The
harness must run offline with no external dependency, consistent with
`AgentGuidance/OFFLINE_FIRST.md`.

**Mirror-drift risk.** The harness copies these functions rather than importing
them, so the tests validate the *mirror*, not the live inline `<script>`. If the
inline source changes and the mirror does not (or vice versa), the tests can pass
while the shipped simulator diverges. To make drift detectable, every mirrored
function is annotated in the harness with its source function name and its
approximate line range in `web/contest_queue_simulator.html` — e.g.
`// mirrors listenOffsetMs — contest_queue_simulator.html ~L730-745` — so a
reviewer can diff the mirror against the cited source. Any change to a mirrored
function in the inline source must be reflected in the harness (and its cited line
range updated) as part of the same change.

- **Property tests:** minimum 100 randomized iterations each; every property test
  is tagged **Feature: contest-queue-timing-audit, Property {n}: {text}** and
  references the design property below.
- **Example tests:** assert the updated constant values (R3.1–R3.3), the audit
  table completeness (R2), and README content (R6).
- **Smoke test:** load the page and drive the tick loop; assert no errors (R3.7).
- **Integration/verification:** run the simulator with varying operator counts to
  populate the fairness monitor and confirm the bound holds (R5) — this is the
  evidence recorded in the audit document.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid
executions of a system — essentially, a formal statement about what the system
should do. Properties serve as the bridge between human-readable specifications
and machine-verifiable correctness guarantees.*

### Property 1: Listen window stays within 50–400 ms

*For any* operator scheduled to contend, the drawn carrier-sense listen offset
(before aging bias) satisfies `LISTEN_MIN_MS <= offset <= LISTEN_MAX_MS`, i.e.
`50 <= offset <= 400` ms — this bound holds strictly on every draw. Range coverage
is a soft expectation, not a strict guarantee: because `base = 50 + frame *
(350 / txFrames)`, the draws approach but never reach the 400 ms upper end, and
the degenerate `txFrames = 1` case yields only the 50 ms lower bound. Span
coverage is therefore asserted loosely and only for `txFrames > 1`.

**Validates: Requirements 3.4**

### Property 2: Binary exponential backoff is bounded

*For any* operator with attempt count `a`, a computed NORMAL-priority backoff is
an integer number of slots in `[1, 2^min(a, 4)]` and never exceeds 16 slots.

**Validates: Requirements 3.5**

### Property 3: Silence reset clears backoff

*For any* slot history in which the channel is silent for 3 consecutive slots
while at least one operator needs to send, every queued operator's
`backoffUntilSlot` is at or before the current slot afterward (all backoffs
cleared).

**Validates: Requirements 3.6**

### Property 4: Aging is monotonic (single-source increment)

*For any* queued message, its attempt count is INCREMENTED in exactly one place — the
defer path in `applyBackoff`, which runs once per contended slot the message does
not win — and by no other code path (in particular `resolveSlotBoundary` never
changes it). Consequently, while the message keeps contending without winning its
attempt count increases by exactly one per contended slot (strictly increasing);
upon a successful transmission it resets to 0; and a newly enqueued message starts
at 0.

**Validates: Requirements 4.1**

### Property 5: Aged offset floors deferred operators, tie-break orders them

*For any* two operators contending in the same window, if the first has a strictly
higher attempt count than the second, then the first's effective (aged) listen
offset is less than or equal to the second's — because any operator with
`attempts >= 1` floors to offset 0 while a fresh `attempts = 0` operator sits in
`[50, 400]`. The aged offset thus never penalizes a more-aged operator; it does
not by itself impose a strict per-attempt ordering (deferred operators tie at 0).
Ordering among tied operators is decided by the deterministic tie-break (HIGH
first, then higher attempts, then older enqueue, then id), which is the primary
fairness mechanism. Consequently the unique most-aged contender wins the window.

**Validates: Requirements 4.1, 4.5**

### Property 6: High-priority promotion by attempt count

*For any* operator, its priority class is HIGH if and only if its emergency flag
is set or its attempt count exceeds 3; otherwise it is NORMAL.

**Validates: Requirements 4.2**

### Property 7: Every queued message transmits within the bounded wait

*For any* simulation run with `N` peak concurrent contending operators, every
queued message is granted a transmission opportunity within `Bounded_Wait(N)`
slots, where `Bounded_Wait(N) = 14 + 2N` slots; equivalently, the recorded
maximum wait never exceeds the computed bound and the violations list is empty.

**Validates: Requirements 4.3, 4.4, 5.3**
