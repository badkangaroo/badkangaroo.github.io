# Requirements Document

## Introduction

This feature audits the timing model of the contest queue simulator
(`web/contest_queue_simulator.html`) against the authoritative Ribbit contest
transport design documented in `Docs/contest_queue_algorithm.md` and
`Docs/contesting_mode.md`, then corrects any discrepancies. The authoritative
unit of channel occupation is the full composite on-air burst (a 300 Hz VOX
wake-up tone, a short silence gap, and the Ribbit waveform), which totals
approximately 2.35 seconds. The simulator currently exposes transmission-time
defaults, minimums, and maximums (2–5 s, default 3 s) that do not derive from
this burst, and its slot/window abstraction diverges from the documented
2-second GPS slot, 50–400 ms listen window, and binary exponential backoff
model.

The work has four outcomes: (1) audit the simulator timing constants against the
authoritative model and record the findings, (2) update the simulator's timing
values so they align with the composite burst and the documented slot, listen
window, and backoff parameters, (3) strengthen the starvation-prevention
mechanism with an explicit attempt-count aging rule so that the worst-case wait
for any queued message is provably bounded, and (4) add a detailed transmit and
receive process write-up to `README.md` that reflects the audited timing and the
strengthened fairness behavior.

## Glossary

- **Timing_Audit**: The analysis activity and its recorded output that compares the simulator's timing constants against the authoritative model and lists each match and mismatch.
- **Contest_Queue_Simulator**: The self-contained HTML and vanilla-JavaScript discrete-time simulator implemented in `web/contest_queue_simulator.html`.
- **Fairness_Scheduler**: The portion of the Contest_Queue_Simulator that selects transmission timing for queued operators, including backoff, silence reset, and the new attempt-count aging rule.
- **Documentation_Set**: The Markdown files updated by this feature, comprising the audit findings record and the `README.md` transmit/receive write-up.
- **Composite_Burst**: The full on-air transmission consisting of a 200 ms 300 Hz VOX wake-up tone, a 100 ms silence gap, and a 2.048 s Ribbit waveform (16384 samples at 8000 Hz), totaling approximately 2.35 seconds.
- **Authoritative_Model**: The contest transport parameters defined in `Docs/contest_queue_algorithm.md` and `Docs/contesting_mode.md`: a 2-second GPS slot, a 50–400 ms random listen window, binary exponential backoff with a maximum exponent of 4 (up to 16 slots / 32 seconds), high-priority promotion after more than 3 attempts, and a silence threshold of 3 slots.
- **Slot**: A 2-second interval aligned to even UTC seconds, as defined in the Authoritative_Model.
- **Timing_Constant**: A named numeric value in the Contest_Queue_Simulator that governs transmission duration, slot or window length, contention framing, or backoff.
- **Bounded_Wait**: A finite maximum number of Slots, expressed as a function of the number of contending operators, within which any queued message is guaranteed a transmission opportunity.

## Requirements

### Requirement 1 — Establish the authoritative transmission time

**User Story:** As a Ribbit maintainer, I want the audit to use the full composite on-air burst as the authoritative transmission time, so that simulator timing reflects real channel occupation.

#### Acceptance Criteria

1. THE Timing_Audit SHALL define the authoritative transmission time as the Composite_Burst duration of approximately 2.35 seconds.
2. THE Timing_Audit SHALL record the Composite_Burst breakdown as 200 ms VOX tone plus 100 ms silence plus 2.048 s Ribbit waveform.
3. THE Timing_Audit SHALL cite `Docs/contest_queue_algorithm.md` and `Docs/contesting_mode.md` as the source of the authoritative transmission time.

### Requirement 2 — Audit simulator timing against the authoritative model

**User Story:** As a Ribbit maintainer, I want each simulator timing constant compared against the authoritative model, so that every discrepancy is identified and documented.

#### Acceptance Criteria

1. THE Timing_Audit SHALL compare each Timing_Constant in the Contest_Queue_Simulator against the corresponding value in the Authoritative_Model.
2. THE Timing_Audit SHALL record, for each Timing_Constant, the current simulator value, the Authoritative_Model value, and whether the two values match.
3. WHERE a Timing_Constant differs from the Authoritative_Model value, THE Timing_Audit SHALL record the discrepancy as a mismatch with the numeric difference.
4. THE Timing_Audit SHALL cover the transmission-time default, minimum, and maximum, the slot or timing-window length, the listen-window range, the backoff parameters, and the silence-threshold value.

### Requirement 3 — Update simulator timing values to align with the authoritative model

**User Story:** As a Ribbit maintainer, I want the simulator's timing values corrected, so that the simulator models the documented composite burst, slot, listen window, and backoff behavior.

#### Acceptance Criteria

1. THE Contest_Queue_Simulator SHALL set the default transmission time to the Composite_Burst duration of 2.35 seconds.
2. THE Contest_Queue_Simulator SHALL set the transmission-time minimum and maximum to a range that includes the Composite_Burst duration of 2.35 seconds.
3. THE Contest_Queue_Simulator SHALL represent the Slot as 2 seconds consistent with the Authoritative_Model.
4. THE Contest_Queue_Simulator SHALL represent the listen window as a random uniform draw between 50 ms and 400 ms.
5. THE Contest_Queue_Simulator SHALL apply binary exponential backoff with a maximum exponent of 4, yielding a maximum backoff of 16 Slots.
6. THE Contest_Queue_Simulator SHALL reset backoff after 3 consecutive silent Slots.
7. WHEN the Contest_Queue_Simulator runs after the timing values are updated, THE Contest_Queue_Simulator SHALL execute without JavaScript runtime errors.

### Requirement 4 — Strengthen starvation prevention with bounded fairness

**User Story:** As a contest operator, I want a guarantee that my queued message will transmit within a bounded time, so that no operator is starved during a busy contest.

#### Acceptance Criteria

1. THE Fairness_Scheduler SHALL increase a queued message's transmission opportunity as its attempt count increases.
2. WHEN a queued message's attempt count exceeds 3, THE Fairness_Scheduler SHALL promote the message to high priority.
3. THE Fairness_Scheduler SHALL guarantee a Bounded_Wait for every queued message, expressed as a finite function of the number of contending operators.
4. WHILE a message is queued, THE Fairness_Scheduler SHALL grant the message a transmission opportunity within its Bounded_Wait.
5. THE Fairness_Scheduler SHALL bias operators with higher attempt counts toward earlier contention timing than operators with lower attempt counts.

### Requirement 5 — Verify the fairness bound

**User Story:** As a Ribbit maintainer, I want the bounded-wait guarantee verified against a simulated run, so that the fairness claim is evidence-based.

#### Acceptance Criteria

1. WHEN the Contest_Queue_Simulator runs with multiple contending operators, THE Fairness_Scheduler SHALL record the maximum number of Slots any operator waits before transmitting.
2. THE Timing_Audit SHALL record the observed maximum wait and compare it against the computed Bounded_Wait.
3. IF an operator's observed wait exceeds the computed Bounded_Wait, THEN THE Timing_Audit SHALL record the violation with the operator identity and the observed wait.

### Requirement 6 — Document the transmit and receive process in README

**User Story:** As a new contributor, I want a detailed transmit and receive process description in the README, so that I understand contest slot timing, carrier sense, transmission, and acknowledgment without reading the full design docs.

#### Acceptance Criteria

1. THE Documentation_Set SHALL add a transmit and receive process section to `README.md`.
2. THE `README.md` transmit and receive section SHALL describe Slot timing, carrier sense, transmission of the Composite_Burst, and reception with acknowledgment.
3. THE `README.md` transmit and receive section SHALL include the Timing_Audit findings, including each recorded mismatch and its resolution.
4. THE `README.md` transmit and receive section SHALL describe the strengthened fairness behavior, including the attempt-count aging rule and the Bounded_Wait guarantee.
5. THE `README.md` transmit and receive section SHALL state timing values consistent with the updated Contest_Queue_Simulator and the Authoritative_Model.
