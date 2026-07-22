# Implementation Plan: Contest Queue Timing Audit

## Overview

This plan implements the timing audit and fairness strengthening of the contest
queue simulator in build order: first record the audit findings, then correct the
simulator timing constants and scheduling model, then add the aging/bounded-wait
scheduler, then instrument and verify fairness, then cover it all with property
and example tests, and finally extend the README write-up.

All simulator edits are in-place inside the existing IIFE `<script>` block of
`web/contest_queue_simulator.html`. There is no build step and no external
dependency — every artifact must run offline with no CDN or runtime dependency
(see `AgentGuidance/OFFLINE_FIRST.md`). Implementation language is JavaScript
(vanilla ES6), matching the target file and test harness.

## Tasks

- [x] 1. Record the timing audit findings document
  - Create new file `Docs/contest_queue_timing_audit.md`
  - Document the authoritative transmission time as the composite burst ≈ 2.35 s, with the breakdown 200 ms VOX tone + 100 ms silence + 2.048 s Ribbit waveform (16384 samples @ 8 kHz)
  - Cite `Docs/contest_queue_algorithm.md` and `Docs/contesting_mode.md` as the source of the authoritative transmission time
  - Add the per-constant comparison table (Timing_Constant, simulator current value, authoritative model value, match?, signed diff/note) covering tx-time default/min/max, slot/timing-window, listen-window range, backoff parameters, and silence threshold
  - Add a placeholder "Fairness-Bound Verification" subsection to be filled in by task 6 (observed max wait, peak N, computed bound, violations list)
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4_

- [x] 2. Update simulator timing constants and decouple slot from burst
  - [x] 2.1 Rewrite the timing constants block (~lines 723-740) in `web/contest_queue_simulator.html`
    - Add PHY constant `COMPOSITE_BURST_SEC = 2.35`; set `txTimeSec` default to `COMPOSITE_BURST_SEC`
    - Keep `TX_TIME_MIN = 2.0` / `TX_TIME_MAX = 5.0` so the range includes 2.35 s; reduce `TIMING_STEP` to `0.05` so 2.35 is representable on the grid
    - Add MAC constants `SLOT_SEC = 2.0`, `LISTEN_MIN_MS = 50`, `LISTEN_MAX_MS = 400`, keep `SILENCE_SLOTS = 3`
    - Add `MAX_BACKOFF_EXP = 4` and `AGING_PROMOTE_ATTEMPTS = 3`
    - Derive `slotMs` / `txMs` from the new constants
    - Keep all edits inside the existing IIFE with no new globals
    - _Requirements: 3.1, 3.2, 3.3, 3.6_

  - [x] 2.2 Decouple the slot from the burst duration
    - Change `timingWindowMinSec()` / `timingWindowMaxSec()` to a fixed independent range (e.g. 1.0–4.0 s) instead of `txTimeSec`-derived bounds
    - Ensure the slot value no longer forces `slot >= txTimeSec`, so the 2 s slot / 2.35 s burst case is reachable
    - _Requirements: 3.3_

  - [x] 2.3 Replace the frame-over-(slot-tx) listen model with the 50-400 ms carrier-sense window
    - Repurpose the `txFrames` slider to quantize the 50-400 ms listen window (`listenSpanMs()`, `frameStepMs()` guarding `txFrames <= 0`)
    - Implement `listenOffsetMs(op)` drawing a base offset in `[LISTEN_MIN_MS, LISTEN_MAX_MS]` (aging bias hook wired in task 4)
    - Confirm `channelBusyForOp` keeps a channel busy for the full `txMs` past the slot boundary (no change needed beyond constants), so contenders defer across the boundary
    - _Requirements: 3.4_

  - [x] 2.4 Write property test for the listen window range
    - **Property 1: Listen window stays within 50-400 ms**
    - **Validates: Requirements 3.4**
    - Tag: Feature: contest-queue-timing-audit, Property 1
    - Minimum 100 randomized iterations; assert every pre-aging draw satisfies 50 <= offset <= 400 (strict bound check). Treat range-span loosely: for txFrames > 1 draws distribute across the window (upper end approached, not necessarily reached); exclude the degenerate txFrames = 1 case (which yields only 50 ms) from span coverage

- [x] 3. Checkpoint - constants load and page runs
  - Ensure all tests pass, ask the user if questions arise.
  - Drive the tick loop (via `stepOnce()` / play controls) and confirm no JavaScript runtime errors after the constant updates
  - _Requirements: 3.7_

- [x] 4. Implement the aging + bounded-wait fairness scheduler
  - [x] 4.1 Add operator aging state and priority classification
    - Extend `makeOperator()` with `enqueueSlot` (= `currentSlotIndex()`) and `backoffUntilSlot = -1`; keep existing `attempts` as the aging counter
    - Add `currentSlotIndex()` and `priorityClass(op)` (HIGH iff `emergency` or `attempts > AGING_PROMOTE_ATTEMPTS`)
    - _Requirements: 4.1, 4.2_

  - [x] 4.2 Write property test for high-priority promotion
    - **Property 6: High-priority promotion by attempt count**
    - **Validates: Requirements 4.2**
    - Tag: Feature: contest-queue-timing-audit, Property 6
    - Minimum 100 randomized iterations over emergency flag and attempt counts

  - [x] 4.3 Implement binary exponential backoff
    - Rewrite `applyBackoff(op)` to increment `attempts`, set `backoffUntilSlot` to the current slot for HIGH priority (contend every slot), else `currentSlotIndex() + randInt(1, 1 << min(attempts, MAX_BACKOFF_EXP))`
    - Clamp the exponent by `MAX_BACKOFF_EXP` so backoff never exceeds 16 slots
    - Call `scheduleNextTx(op)` which targets the first window at/after `backoffUntilSlot`
    - _Requirements: 3.5_

  - [x] 4.4 Write property test for bounded backoff
    - **Property 2: Binary exponential backoff is bounded**
    - **Validates: Requirements 3.5**
    - Tag: Feature: contest-queue-timing-audit, Property 2
    - Minimum 100 randomized iterations; assert NORMAL backoff is an integer in [1, 2^min(a,4)] and never exceeds 16 slots

  - [x] 4.5 Implement attempt-count aging bias and deterministic tie-break
    - Add `AGE_BAND_MS = LISTEN_MAX_MS` (= 400) and `agedOffset(baseMs, op)` shifting earlier by `attempts * AGE_BAND_MS` (floored at 0); wire into `listenOffsetMs`. Note this is a coarse two-tier bias: any operator with `attempts >= 1` floors to offset 0 (deferred operators get carrier-sense priority over fresh `attempts == 0` arrivals), not a graduated per-attempt separation
    - Add `contentionRank(a, b)` ordering by earliest offset, then HIGH-before-NORMAL, then higher attempts, then older `enqueueSlot`, then lower `id` — this deterministic tie-break (which orders the collapsed offset-0 group) is the primary fairness mechanism; the aged offset is a secondary bias
    - Sort ready operators in `processScheduledTx()` with `contentionRank` instead of `nextTxMs`-only
    - _Requirements: 4.1, 4.5_

  - [x] 4.6 Write property test for aging monotonicity
    - **Property 4: Aging is monotonic**
    - **Validates: Requirements 4.1**
    - Tag: Feature: contest-queue-timing-audit, Property 4
    - Minimum 100 randomized iterations; assert attempts is incremented only via the defer path in `applyBackoff` (once per contended slot) and by no other path (in particular `resolveSlotBoundary` never changes it), so attempts strictly increases while waiting, resets to 0 on transmit, and starts at 0 on enqueue

  - [x] 4.7 Write property test for aging priority ordering
    - **Property 5: Aged offset floors deferred operators, tie-break orders them**
    - **Validates: Requirements 4.1, 4.5**
    - Tag: Feature: contest-queue-timing-audit, Property 5
    - Minimum 100 randomized iterations; assert a strictly higher attempt count never yields a larger aged offset (deferred operators with attempts >= 1 floor to 0, fresh attempts == 0 sit in [50,400]), and that the deterministic tie-break orders the tied offset-0 group so the unique most-aged contender wins

  - [x] 4.8 Implement silence-threshold backoff reset
    - In `resolveSlotBoundary`, track channel silence and, on 3 consecutive silent slots, clear every queued operator's `backoffUntilSlot`
    - Do NOT increment `attempts` here: `attempts` is incremented exactly once per contended slot in `applyBackoff` (the defer path) as the single source of truth, so aging must not be double-counted at the slot boundary
    - _Requirements: 3.6_

  - [x] 4.9 Write property test for silence reset
    - **Property 3: Silence reset clears backoff**
    - **Validates: Requirements 3.6**
    - Tag: Feature: contest-queue-timing-audit, Property 3
    - Minimum 100 randomized iterations; after 3 consecutive silent slots with a waiting operator, assert all `backoffUntilSlot <= currentSlot`

- [x] 5. Checkpoint - scheduler behavior verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement fairness instrumentation and bound verification
  - [x] 6.1 Add the fairness monitor and bound computation
    - Add per-operator `lastServedSlot` and `maxWaitSlots`; add globals `fairnessPeakN`, `fairnessMaxWait`, `fairnessViolations`
    - Implement `boundedWaitSlots(n)` = ramp-up (14) + `n * ceil((LISTEN_MAX_MS + txMs) / slotMs)` and track peak concurrent contenders (`needsSend === true`)
    - Implement `recordServed(op)` computing the wait on each successful transmit, updating max wait, pushing to `fairnessViolations` when `wait > boundedWaitSlots(fairnessPeakN)`, then resetting `attempts`
    - _Requirements: 5.1, 5.3_

  - [x] 6.2 Write property test for the bounded-wait guarantee
    - **Property 7: Every queued message transmits within the bounded wait**
    - **Validates: Requirements 4.3, 4.4, 5.3**
    - Tag: Feature: contest-queue-timing-audit, Property 7
    - Minimum 100 randomized runs with varying peak N; assert recorded max wait never exceeds `Bounded_Wait(N) = 14 + 2N` slots and the violations list is empty

  - [x] 6.3 Record verification results into the audit document
    - Run the simulator/harness with varying operator counts to populate the monitor
    - Fill the "Fairness-Bound Verification" subsection of `Docs/contest_queue_timing_audit.md` with peak N, observed max wait, computed `Bounded_Wait(N)`, and the (empty for a correct impl) violations list
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Build the offline test harness and example/smoke tests
  - [x] 7.1 Create an offline JS test harness mirroring the inline scheduling functions
    - Extract/mirror the pure functions (`listenOffsetMs`/offset draw, `applyBackoff`, `agedOffset`, `contentionRank`, `priorityClass`, `boundedWaitSlots`, silence reset) into a plain JS module driven by the property/example tests
    - Keep the mirror in sync with source: the tests validate the mirror, not the live inline `<script>`, so annotate each mirrored function with its source function name and approximate line range in `web/contest_queue_simulator.html` (e.g. `// mirrors listenOffsetMs — contest_queue_simulator.html ~L730-745`) so drift between the harness and the live source is detectable in review; any change to a mirrored function in the inline source must update the mirror and its cited line range in the same change
    - No external dependency or CDN — must run offline per `AgentGuidance/OFFLINE_FIRST.md`
    - _Requirements: 3.4, 3.5, 4.1, 4.2, 4.5_

  - [x] 7.2 Write example tests for updated constants and audit content
    - Assert `txTimeSec` default = 2.35, slot = 2.0, listen window = 50-400 ms (R3.1-R3.4)
    - Assert `Docs/contest_queue_timing_audit.md` contains the authoritative time, breakdown, citations, and a complete comparison table (R1, R2)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [x] 7.3 Write the page-load smoke test
    - Load the page and drive the tick loop; assert no JavaScript runtime errors
    - _Requirements: 3.7_

- [x] 8. Extend the README Transmit/Receive write-up
  - Extend (do not replace) the "Transmit / Receive Architecture (Protocol Layering)" section in `README.md` with a "Transmit / Receive Process" subsection consistent with the existing OSI framing
  - Describe slot timing (2 s GPS slot, 2.35 s burst spanning a boundary), carrier sense (50-400 ms listen window), transmission of the composite burst (200 ms VOX + 100 ms silence + 2.048 s waveform), and reception with acknowledgment (decode -> record Message ID -> piggyback ACK -> confirm)
  - Include the audit findings: each recorded mismatch and its resolution
  - Describe the strengthened fairness: attempt-count aging rule and the `Bounded_Wait(N)` guarantee
  - State timing values consistent with the updated simulator and authoritative model (2 s slot, ~2.35 s burst, 50-400 ms listen, <=16-slot backoff, 3-slot silence reset)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Verification follow-ups (gaps found after tasks 1–9 were marked complete)

The functional work in tasks 1–9 was present and the contest-queue suite
passed (10 suites / 55 tests). Verification found two incomplete leftovers
that had been marked done prematurely:

- [x] 10. Refresh harness mirror line annotations (gap in task 7.1)
  - `web/test/contest-queue/scheduler-model.js` still carried "intended —
    design Part N" comments and stale line ranges after the live scheduler
    landed in `web/contest_queue_simulator.html`
  - Re-verify each mirrored function against the live source and update the
    cited line ranges (constants ~L725-750, `priorityClass` ~L1049,
    `boundedWaitSlots` ~L1056, `listenSpanMs`/`frameStepMs` ~L1085-1091,
    `agedOffset`/`contentionRank`/`listenOffsetMs` ~L1100-1127,
    `applyBackoff` ~L1174-1188, silence reset in `resolveSlotBoundary`
    ~L1224-1247, `makeOperator` aging fields ~L1000-1005)
  - Remove the provisional "intended / will live near" wording now that the
    source exists
  - _Requirements: 3.4, 3.5, 4.1, 4.2, 4.5_ (mirror-drift contract of 7.1)

- [x] 11. Close out the audit document after resolutions (gap in tasks 1 / 6.3)
  - Status was still "Findings record" and the intro still said the fairness
    subsection was "reserved … later", even though section 3 was filled
  - Section 2 still labeled pre-fix values as "Simulator (current)", which
    was no longer true after the simulator fixes
  - Update status to complete; clarify section 2 as the **pre-fix / at-audit**
    findings table; keep the historical mismatch rows; note that resolutions
    are implemented
  - Extend the example audit tests so the fairness-bound subsection and the
    pre-fix labeling cannot regress unnoticed
  - _Requirements: 1.1–1.3, 2.1–2.4, 5.1–5.3_

- [x] 12. Re-run final checkpoint after follow-ups
  - Re-run `web/test/contest-queue` and confirm all suites pass

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP.
- Each task references specific requirement sub-clauses for traceability.
- Property test sub-tasks each reference exactly one of the design's 7 correctness properties and require a minimum of 100 randomized iterations, tagged `Feature: contest-queue-timing-audit, Property {n}`.
- All artifacts (simulator edits, tests, harness) must run offline with no external CDN or runtime dependency, per `AgentGuidance/OFFLINE_FIRST.md`.
- Checkpoints ensure incremental validation at natural build boundaries.
- Tasks 10–12 were added during post-implementation verification when leftovers
  from 7.1 / 1 / 6.3 were found despite those tasks being marked complete.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "7.1"] },
    { "id": 2, "tasks": ["2.4", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.5", "4.8"] },
    { "id": 4, "tasks": ["4.4", "4.6", "4.7", "4.9", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "7.2", "7.3"] },
    { "id": 6, "tasks": ["8"] },
    { "id": 7, "tasks": ["10", "11"] },
    { "id": 8, "tasks": ["12"] }
  ]
}
```
