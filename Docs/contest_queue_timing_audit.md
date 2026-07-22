# Contest Queue Timing Audit

## Status: Complete (findings + resolutions + fairness verification)

This document records the timing audit of the contest queue simulator
(`web/contest_queue_simulator.html`) against the authoritative Ribbit contest
transport design. It establishes the authoritative transmission time, compares
each simulator timing constant against the authoritative model (as found at
audit time), and records the fairness-bound verification results.

Related feature spec: `contest-queue-timing-audit`.

Simulator timing/scheduler resolutions from this audit are implemented in
`web/contest_queue_simulator.html` and summarized in the README
"Transmit / Receive Process" write-up. Section 2 below is the **pre-fix**
findings table (what the simulator had when audited); it is intentionally not
rewritten to the post-fix values.

---

## 1. Authoritative transmission time

The authoritative unit of channel occupation is the full **composite on-air
burst**, not an arbitrary 2–5 s / default-3 s transmission-time slider. The
composite burst totals **approximately 2.35 seconds**.

### Breakdown

| Component | Value | Notes |
|-----------|-------|-------|
| VOX wake-up tone | 300 Hz, **200 ms** | Prepended by `playAudio()` in the production app |
| Silence gap | **100 ms** | Between the VOX tone and the Ribbit waveform |
| Ribbit waveform | **2.048 s** | 16384 samples at 8000 Hz (8 kHz mono) |
| **Composite burst total** | **≈ 2.35 s** | 0.200 + 0.100 + 2.048 = 2.348 s ≈ 2.35 s |

### Sources

The authoritative transmission time is defined by the Ribbit contest transport
design documents:

- **`Docs/contest_queue_algorithm.md`** — "On-air timing" describes the Ribbit
  waveform as ~2.0 s (16384 samples at 8 kHz, i.e. 2.048 s) and the composite
  buffer (300 Hz VOX for 200 ms, then 100 ms silence, then the encoded message)
  as budgeting ~2.35 s of airtime.
- **`Docs/contesting_mode.md`** — the "Quick Reference" parameter table lists the
  on-air time as ~2.35 s (including the 300 Hz VOX preamble) alongside the 2 s
  slot, 50–400 ms listen window, 16-slot max backoff, and 3-slot silence
  threshold.
- **`Docs/codec.md`** — corroborates the 16384-sample / 8 kHz Ribbit waveform and
  the 2-second timestamp resolution that the slot grid aligns to.

The single most important consequence: the **burst (~2.35 s) is longer than the
slot (2 s)**. A burst legitimately spans a slot boundary, and competing operators
must keep deferring (carrier sense) until the burst ends. This is by design, not
an error.

---

## 2. Per-constant comparison (pre-fix findings)

The table below records each timing constant **as found in
`web/contest_queue_simulator.html` at audit time** (pre-fix timing/UI block)
against the corresponding value in the authoritative model. "Diff / Note" gives
the signed numeric difference (simulator − authoritative) where both values are
numeric, or a note where the comparison is qualitative.

Legend: ✓ match · ✗ mismatch · ~ partial / range-dependent

| Timing_Constant | Simulator (at audit) | Authoritative_Model | Match? | Diff / Note |
|-----------------|----------------------|---------------------|--------|-------------|
| TX time default (`txTimeSec`) | 3.0 s | 2.35 s (composite burst) | ✗ | +0.65 s |
| TX time min (`TX_TIME_MIN`) | 2.0 s | range must include 2.35 s | ~ | 2.0 ≤ 2.35, low end OK; default wrong |
| TX time max (`TX_TIME_MAX`) | 5.0 s | range must include 2.35 s | ~ | 5.0 ≥ 2.35, arbitrary upper bound |
| Slot / timing window (`timingWindowSec`) | 10.0 s | 2.0 s GPS slot | ✗ | +8.0 s |
| Slot ≥ tx coupling (`timingWindowMinSec`) | slot ≥ `txTimeSec` | slot (2 s) < burst (2.35 s) allowed | ✗ | model forbids the real (burst-spans-slot) case |
| Listen window (frame model) | `(slot − tx)/txFrames`, tx-frame quantized | random uniform 50–400 ms | ✗ | wrong basis; not a 50–400 ms carrier-sense window |
| Backoff (`applyBackoff`) | reschedule to next window, no growth | binary exponential, max exponent 4 (≤ 16 slots / 32 s) | ✗ | no exponential backoff |
| Silence threshold (`SILENCE_SLOTS`) | 3 slots | 3 slots (6 s) | ✓ | 0 |
| Aging / promotion | none | promote when attempts > 3 (HIGH priority) | ✗ | missing starvation-prevention aging rule |

### Headline conclusions

1. The transmission unit must be the composite burst (2.35 s), not the arbitrary
   2–5 s / default-3 s slider.
2. The slot must be a fixed 2 s GPS grid, decoupled from burst duration; bursts
   span slot boundaries by design.
3. The contention resolver must be a 50–400 ms carrier-sense listen window,
   independent of burst length — replacing the `slot − tx` frame basis.
4. Backoff must be binary exponential with a maximum exponent of 4 (max 16 slots
   / 32 s).
5. A starvation-prevention aging rule (promote to HIGH after > 3 attempts, with a
   bounded worst-case wait) is missing and must be added.
6. Only the silence threshold (3 slots) already matches the authoritative model.

**Resolutions (implemented):** each mismatch above is corrected in the current
simulator (default TX = 2.35 s, fixed 2 s slot decoupled from burst, 50–400 ms
listen window, binary exponential backoff ≤ 16 slots, attempt-count aging +
HIGH promotion). Details are summarized in the README transmit/receive write-up.

---

## 3. Fairness-Bound Verification

This subsection records the evidence for the bounded-wait guarantee
`Bounded_Wait(N) = 14 + 2N` slots. The evidence was produced by the offline test
harness (`web/test/contest-queue/scheduler-model.js`), driven in a saturated,
slot-stepped discrete-time simulation across a range of peak concurrent
contender counts N. Every operator always has a message queued (maximum
sustained contention — the adversarial case for the bound), and the channel is
occupied for one burst + listen window per round
(`ceil((LISTEN_MAX_MS + txMs) / slotMs) = 2` slots), during which all contenders
defer via carrier sense.

The computed bound is:

```
Bounded_Wait(N) = ramp-up (14 slots) + N × ceil((LISTEN_MAX_MS + txMs) / slotMs)
                = 14 + N × ceil((400 + 2350) / 2000)
                = 14 + 2N   slots        (= 28 + 4N seconds at SLOT_SEC = 2 s)
```

### Per-N results

Each row is the worst observed maximum wait over 5 seeds
(`[1, 7, 42, 1337, 99991]`) at 20 000 slots per run. "Observed max wait" is the
longest wait, in slots, any queued message experienced before transmitting
(`fairnessMaxWait`); "Bounded_Wait(N)" is `boundedWaitSlots(N) = 14 + 2N`.

| Peak N | Observed max wait (slots) | Computed `Bounded_Wait(N)` = 14 + 2N (slots) | Pass? |
|--------|---------------------------|----------------------------------------------|-------|
| 1  | 2  | 16 | ✓ |
| 2  | 4  | 18 | ✓ |
| 3  | 8  | 20 | ✓ |
| 4  | 16 | 22 | ✓ |
| 5  | 16 | 24 | ✓ |
| 6  | 18 | 26 | ✓ |
| 8  | 22 | 30 | ✓ |
| 10 | 26 | 34 | ✓ |
| 12 | 30 | 38 | ✓ |

In every case the observed maximum wait stays strictly below the computed bound,
confirming the guarantee is conservative (the fixed 14-slot ramp-up term
dominates at small N; the linear `2N` growth dominates at large N).

### Summary metrics

| Metric | Value |
|--------|-------|
| Peak concurrent contenders (N) tested | 12 (range 1–12) |
| Observed maximum wait | 30 slots (at peak N = 12) |
| Computed `Bounded_Wait(N)` at peak N = 12 | 38 slots |
| Violations (observed wait > computed bound) | 0 (empty — correct implementation) |

### Violations

No operator's observed wait exceeded its computed bound across any tested N or
seed, so the violations list is empty, as expected for a correct implementation.

| Operator (id / callsign) | Observed wait (slots) | Computed bound (slots) |
|--------------------------|-----------------------|------------------------|
| _none — no violations recorded_ | | |
