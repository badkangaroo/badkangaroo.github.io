# Contest Mode: Message Queue Transmission Algorithm

## Status: Draft for Review

This document describes the proposed algorithm for scheduling message transmissions
in Contest Mode across multiple isolated nodes sharing a single SSB channel. It is
intended as a design specification for discussion before implementation.

**Open questions are marked `[REVIEW]` throughout.**

---

## Problem Statement

Multiple Ribbit nodes are transmitting on the same SSB frequency. There is no
central coordinator — each node is independently operated. Transmissions that
overlap in time interfere destructively on SSB; unlike some digital modes, there
is no collision detection or recovery at the signal layer. The goals are:

1. **Maximize throughput** — as many messages delivered per unit time as possible
2. **Minimize collisions** — overlapping transmissions must be rare
3. **Prevent channel starvation** — avoid states where everyone is listening and nobody transmitting
4. **Fairness** — no single node should monopolize the channel
5. **No coordination** — the algorithm must work with zero inter-node communication beyond the transmissions themselves

---

## Foundation: GPS Time Synchronization

All Ribbit nodes already carry GPS-derived UTC time at 2-second resolution
(see `codec.md`, Timestamp Encoding). This gives every node on the channel a
shared, synchronized clock without any network infrastructure.

The key property: all nodes agree on when a **slot boundary** occurs. A slot
is a 2-second interval aligned to even UTC seconds (00:00:00, 00:00:02,
00:00:04, ...). Every Ribbit message transmission takes approximately one full
slot to complete.

```
UTC time:  ...│ :00 │ :02 │ :04 │ :06 │ :08 │...
               └─────┴─────┴─────┴─────┴─────┘
                  slot  slot  slot  slot  slot
                   0     1     2     3     4
```

**Key assumption:** GPS 1PPS (pulse-per-second) accuracy is ±1 microsecond.
All nodes will agree on slot boundaries to within a few milliseconds — well
within the tolerance needed for this algorithm.

`[REVIEW]` — GPS lock may be unavailable (indoors, portable operation). What
is the degradation behaviour when a node falls back to internal clock drift?

---

## Slot States

At any slot boundary, a node is in one of three states:

| State | Description |
|-------|-------------|
| `TRANSMITTING` | Node is sending a queued message in this slot |
| `LISTENING` | Node is monitoring the channel for incoming transmissions |
| `IDLE` | Node has nothing queued; passively listening |

The algorithm determines whether a node enters `TRANSMITTING` or `LISTENING`
at each boundary.

---

## The Queue Structure

Each node maintains a local **message queue** — an ordered list of outbound
messages waiting to be transmitted.

```
MessageQueueEntry {
  message_id:      uint80    // unique ID (callsign + timestamp + emergency)
  payload:         bytes     // encoded message ready to transmit
  enqueue_time:    uint32    // GPS slot number when enqueued
  attempts:        uint8     // number of failed transmission attempts
  backoff_until:   uint32    // slot number before which this entry must not transmit
}
```

Queue ordering: **FIFO within priority class**, with two priority classes:

| Priority | Condition |
|----------|-----------|
| HIGH | `emergency` flag set, or `attempts > 3` (aging promotion) |
| NORMAL | All other messages |

`[REVIEW]` — Should Contest Mode messages have an expiry? e.g. drop after N
slots undelivered. Time-critical contest exchanges become stale quickly.

---

## The Algorithm: GPS-Slotted p-Persistent CSMA

The algorithm is a variant of **p-persistent Carrier Sense Multiple Access**
adapted for GPS-slotted HF radio. Each node independently follows this logic
at every slot boundary.

### Step 1 — Slot Boundary Check

At every even UTC second, evaluate the queue:

```
if queue is empty:
    enter IDLE (passive listen)
    return

candidate = queue.front()  // highest-priority, oldest eligible entry

if candidate.backoff_until > current_slot:
    enter LISTENING  // still in backoff, don't contend
    return

proceed to Step 2
```

### Step 2 — Carrier Sense (Pre-Transmission Listen)

Before committing to transmit, sample the channel for a brief listen window.
This is the **carrier sense** component — detect if another node has already
started transmitting in this slot.

```
listen_duration = random_uniform(T_min, T_max)
    where T_min = 50ms, T_max = 400ms

listen for listen_duration milliseconds

if channel_is_active():   // audio energy detected above threshold
    enter LISTENING
    apply_backoff(candidate)
    return

proceed to Step 3
```

The random `listen_duration` is the core contention resolution mechanism.
Nodes that draw a short value start transmitting early and win the slot. Nodes
that draw longer values detect the winner's signal and defer.

```
Timeline within one slot:

  :00.000  slot boundary — all nodes evaluate queue
  :00.050  node A finishes listen (T=50ms) → channel quiet → begins TX
  :00.120  node B finishes listen (T=120ms) → detects A's signal → defers
  :00.310  node C finishes listen (T=310ms) → detects A's signal → defers
  :02.000  slot boundary — A's transmission complete
```

`[REVIEW]` — What constitutes `channel_is_active()` on SSB? The energy
threshold must distinguish Ribbit signal onset from band noise. Should this
use the existing decoder's signal detection path, or a lightweight energy
threshold on the raw audio buffer?

### Step 3 — Transmit

```
mark candidate as in_flight
begin transmission of candidate.payload

on transmission complete:
    queue.remove(candidate)
    log success
```

### Step 4 — Backoff (on deferral)

When a node detects the channel is busy and must defer, it calculates a
**binary exponential backoff** before it will contend again:

```
apply_backoff(entry):
    entry.attempts += 1
    backoff_slots = random_uniform(1, 2^min(entry.attempts, MAX_BACKOFF_EXP))
    entry.backoff_until = current_slot + backoff_slots
```

Where `MAX_BACKOFF_EXP = 4` gives a maximum window of 16 slots (32 seconds).

| Attempt | Backoff window (slots) | Max wait |
|---------|----------------------|----------|
| 1 | 1–2 | 4s |
| 2 | 1–4 | 8s |
| 3 | 1–8 | 16s |
| 4+ | 1–16 | 32s |

After `attempts > 3`, the entry is promoted to HIGH priority (see Queue
Structure above) so it can't be blocked indefinitely by newer messages.

---

## Channel Starvation Prevention

A failure mode exists where all nodes are simultaneously in backoff and nobody
transmits. To prevent this, each node applies a **minimum transmission floor**:

```
at every slot boundary, before checking queue:

if channel has been silent for SILENCE_THRESHOLD slots:
    if local queue is non-empty:
        force candidate out of backoff (set backoff_until = current_slot)
        proceed to Step 2 with T_min = 0  // no minimum listen window
```

`SILENCE_THRESHOLD = 3 slots (6 seconds)` — if the channel has been quiet for
3 consecutive slots and you have something to send, attempt transmission
immediately on the next slot boundary with zero forced wait.

Multiple nodes may do this simultaneously. The random `listen_duration` in
Step 2 still resolves the contention; the silence threshold only removes the
artificial backoff delay.

`[REVIEW]` — Should `SILENCE_THRESHOLD` be user-configurable? Low-activity
nets might want a longer threshold to avoid aggressive "channel filling" that
interrupts listeners expecting silence.

---

## Throughput Analysis

For a channel with N active nodes each carrying one queued message:

**Slotted ALOHA (no carrier sense, reference baseline):**
- Optimal throughput: `1/e ≈ 36.8%` at offered load = 1 message/slot/node

**p-persistent CSMA (this algorithm):**
- Theoretical optimum with carrier sense and random defer: **70–90% utilization**
  for moderate N (5–20 nodes)
- Collisions occur only when two nodes draw nearly identical `listen_duration`
  values — probability decreases as `(T_max - T_min)` increases

**Collision probability for two competing nodes:**

```
P(collision) ≈ propagation_delay / T_max

For HF (worst case 3000km path): propagation ≈ 10ms
With T_max = 400ms:  P(collision) ≈ 2.5%
```

Propagation delay on HF is negligible compared to the 400ms listen window,
so collision probability is dominated by the random draw overlap rather than
physical signal travel time.

`[REVIEW]` — The 400ms maximum listen window uses up 20% of the 2-second
slot. Is this acceptable? Shorter T_max increases collision probability;
longer T_max wastes channel time.

---

## Interaction with the Existing Message ID System

The existing 80-bit Message ID (`Callsign[48] + Timestamp[31] + Emergency[1]`)
provides deduplication across nodes. When a node successfully receives a
transmission from another node during its LISTENING state, it:

1. Extracts the Message ID from the decoded payload
2. Checks its own queue for any matching Message ID
3. If found, removes it — the network has already delivered equivalent
   information

This is relevant when multiple nodes may be carrying the same contest exchange
(relaying). It prevents the same logical message from being re-transmitted by
a relay node after the originator has already transmitted it.

---

## Pseudocode Summary

```
loop at every slot boundary (even UTC second):

    if queue is empty: IDLE; continue

    candidate ← queue.front()

    if candidate.backoff_until > now: LISTEN; continue

    T ← random_uniform(T_min=50ms, T_max=400ms)
    wait T milliseconds
    sample channel energy

    if channel_active:
        candidate.attempts++
        candidate.backoff_until ← now + random_uniform(1, 2^min(attempts, 4))
        LISTEN; continue

    // channel is quiet — we won contention
    transmit(candidate.payload)
    queue.remove(candidate)
```

---

## Open Questions for Project Lead Review

1. **`[REVIEW]` Carrier detection threshold** — How should the existing audio
   pipeline expose a "channel busy" signal to the queue scheduler? A lightweight
   energy gate on the raw PCM buffer, or should it hook into the decoder's signal
   detection logic?

2. **`[REVIEW]` Message expiry** — Should contest queue entries expire after a
   fixed number of slots? A contest exchange that is 30 seconds old is likely
   no longer useful.

3. **`[REVIEW]` T_max tuning** — The 50–400ms listen window is a first estimate.
   Should this be a runtime setting (adjustable per band conditions), or fixed?

4. **`[REVIEW]` GPS fallback** — What is the behaviour when GPS lock is lost mid-
   contest? Should the node stop contending entirely, or continue on internal
   clock with a penalty (extended T_min)?

5. **`[REVIEW]` Multi-message slots** — Is there ever a case where a node might
   want to queue two messages back-to-back in consecutive slots without releasing
   the channel between them? If so, the algorithm needs a "hold" state.

6. **`[REVIEW]` Silence threshold** — Is 6 seconds (3 slots) the right silence
   floor for starvation prevention? Higher-traffic contests might want 2 seconds
   (1 slot); low-traffic roundtables might want 20+ seconds.

7. **`[REVIEW]` ACK integration** — The existing ACK array field in the message
   format is not yet implemented. When it is, should acknowledgements consume a
   full slot or piggyback on the next outbound transmission? The latter changes
   queue scheduling significantly.

---

## Related Documents

- `Docs/codec.md` — Message format, timestamp encoding, Message ID structure
- `Docs/RELEASE_PLAN.md` — Contest Mode UI integration plans
- `web/scripts/messageCodec.js` — Message encoding/decoding implementation
- `web/scripts/index.js` — Audio I/O and app state machine (RibbitApp class)
