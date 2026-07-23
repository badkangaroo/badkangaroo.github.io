# Contesting Mode

Making the most efficient use of time on the air.

## Overview

Contesting Mode is Ribbit's high-efficiency operating mode designed for amateur radio contests. When many operators are competing on the same frequency, every second counts. Contest Mode uses a **bitwise-packed message format** (40–60% smaller than Chat Mode) combined with an intelligent **message queue system** that coordinates transmissions across multiple independent stations—all without requiring a central server.

**Key capabilities:**

- **Compact messages** — Structured fields packed into minimal bits, not UTF-8 strings
- **Automatic collision avoidance** — GPS-synchronized scheduling prevents stations from talking over each other
- **Fair channel access** — Every station gets airtime, even in crowded pileups
- **Asymmetric RX vs TX** — **PWR** sets who hears *you*; **Gain (+1…+10 dB)** extends who *you* hear and what counts as “channel busy,” so you often copy more stations than copy you (hidden-node realism)
- **Acknowledgment tracking** — Know who received your transmission (ACK arrays)
- **Timestamps** — 31-bit UTC timestamp (2-second resolution) embedded in every message

---

## Message Modes: Chat vs Contest

Ribbit supports two operating modes that use the message payload differently:

### Chat Mode (Type 1) — Text Messaging

The **default mode** for personal communication. The payload after the message header contains free-form UTF-8 text.

```
┌─────────────────────────────────────────────────────────┐
│ Header                │ Payload (Text Body)             │
│ Callsign, Grid, etc.  │ "Hello from the field! 73"      │
└─────────────────────────────────────────────────────────┘
```

- **Use case:** Casual QSOs, ragchewing, personal messages
- **Format:** `Name|Callsign|Gridsquare&=Message`
- **Payload:** Any UTF-8 characters (letters, numbers, emoji, etc.)
- **Overhead:** Higher — UTF-8 encoding uses 8 bits per character

### Contest Mode (Type 2) — ACK-Optimized

The **high-efficiency mode** for contesting. The payload is used for structured acknowledgments to confirm contacts, not free-form text.

```
┌─────────────────────────────────────────────────────────┐
│ Header                │ Payload (ACK Array)             │
│ Callsign, Grid, Time  │ [ACK₁][ACK₂][ACK₃]...           │
└─────────────────────────────────────────────────────────┘
```

- **Use case:** Contests, rapid QSO exchanges, contact confirmation
- **Format:** Bitwise-packed structured fields
- **Payload:** Array of Message IDs being acknowledged
- **Overhead:** Lower — 40–60% smaller than Chat Mode

### Why the Difference?

| Mode | Payload Purpose | Optimized For |
|------|-----------------|---------------|
| **Chat** | Free-form text messages | Human-readable content, flexibility |
| **Contest** | ACK arrays (Message IDs) | Throughput, confirmation tracking |

In a contest, you don't need to send "Hello!" — you need to confirm that you received the other station. The payload space is better spent on **acknowledgments** that prove two-way contact. This design allows a single transmission to ACK multiple stations, maximizing the information exchanged per slot.

---

## The Problem

In a contest, you're trying to maximize the number of contacts (QSOs) in a fixed time window. The challenge:

| Constraint | Impact |
|------------|--------|
| **Half-duplex** | You cannot transmit and receive simultaneously on the same frequency |
| **No central server** | Stations operate independently with no coordinator |
| **Shared channel** | Multiple stations contending for the same frequency |
| **Destructive collisions** | Overlapping transmissions destroy both signals—there's no collision detection at the RF layer |
| **Noisy conditions** | Band noise, QRM, and weak signals reduce decode success |

Traditional digital modes often suffer from **collisions** (two stations transmitting simultaneously) or **starvation** (everyone listens, nobody transmits). Ribbit's Contest Mode solves both.

---

## The Solution: GPS-Slotted Queue System

Ribbit's contest queue uses a **GPS-slotted p-persistent CSMA** (Carrier Sense Multiple Access) algorithm. This is a collision-avoidance scheme that:

1. **Synchronizes all stations** to a common clock (GPS-derived UTC)
2. **Divides time into slots** (2-second intervals aligned to even UTC seconds)
3. **Uses carrier sense** to detect if someone else is already transmitting
4. **Applies random backoff** to resolve contention when multiple stations want to transmit

The result: stations take turns efficiently, collisions become rare, and channel utilization can reach **70–90%** even with many competing operators.

### How It Works

```
UTC time:  │ :00 │ :02 │ :04 │ :06 │ :08 │ :10 │
           └─────┴─────┴─────┴─────┴─────┴─────┘
              slot  slot  slot  slot  slot  slot
               0     1     2     3     4     5
```

At each **slot boundary** (every even UTC second), a station with queued messages:

1. **Listens** for a random duration (50–400 ms)
2. **Checks** if the channel is busy (carrier sense)
3. **Transmits** if quiet, or **defers** if someone else started first

Stations that draw a short listen window win the slot. Stations that draw longer windows detect the winner's signal and back off.

### Example Timeline

```
t = 0 ms     Slot boundary — all stations evaluate their queues
t = 50 ms    Station A finishes listening (drew 50 ms) → channel quiet → starts TX
t = 120 ms   Station B finishes listening (drew 120 ms) → hears A → defers
t = 310 ms   Station C finishes listening (drew 310 ms) → hears A → defers
t ≈ 2400 ms  Station A's transmission ends (~2.35s on-air time)
t = 2000 ms  Next slot boundary — B and C contend again
```

### Backoff and Fairness

When a station defers, it calculates a **binary exponential backoff**:

| Attempt | Backoff Window | Maximum Wait |
|---------|----------------|--------------|
| 1 | 1–2 slots | 4 seconds |
| 2 | 1–4 slots | 8 seconds |
| 3 | 1–8 slots | 16 seconds |
| 4+ | 1–16 slots | 32 seconds |

After 3 failed attempts, a message is promoted to **high priority** so it can't be blocked indefinitely by newer traffic.

### Preventing Channel Starvation

If the channel goes silent for **3 consecutive slots** (6 seconds) and stations have queued messages, all backoff timers reset. This prevents the failure mode where everyone is waiting and nobody transmits.

---

## Queue Structure

Each station maintains a local message queue:

```
MessageQueueEntry {
  message_id:      80-bit unique ID (Callsign + Timestamp + Emergency flag)
  payload:         Encoded message bytes ready for transmission
  enqueue_time:    Slot index when added to queue
  attempts:        Number of transmission attempts
  backoff_until:   Slot number before which entry must not transmit
}
```

**Priority classes:**

| Priority | Condition |
|----------|-----------|
| HIGH | Emergency flag set, or `attempts > 3` (aging promotion) |
| NORMAL | All other messages |

Within each priority class, messages are processed **FIFO** (first-in, first-out).

---

## Throughput and Efficiency

### Comparison to Slotted ALOHA

| Protocol | Theoretical Max Throughput |
|----------|---------------------------|
| Slotted ALOHA (no carrier sense) | ~37% (1/e) |
| p-Persistent CSMA (Ribbit Contest) | **70–90%** |

The improvement comes from **carrier sense**: stations detect ongoing transmissions and defer, rather than blindly colliding.

### Collision Probability

For two competing stations:

```
P(collision) ≈ propagation_delay / T_max

HF worst case (3000 km path): propagation ≈ 10 ms
With T_max = 400 ms: P(collision) ≈ 2.5%
```

Propagation delay on HF is negligible compared to the 400 ms listen window, so collision probability is dominated by the random draw overlap.

---

## GPS Time Synchronization

All Ribbit nodes carry GPS-derived UTC time. The message header includes a **31-bit timestamp with 2-second resolution**, and slot boundaries align to this same grid.

**Key property:** All stations agree on when slot boundaries occur to within a few milliseconds—well within tolerance for the algorithm.

**Fallback behavior:** If GPS lock is lost, a station can continue on its internal clock, but timing drift may cause occasional collisions. The algorithm remains functional but less efficient.

---

## Message Deduplication

The 80-bit **Message ID** (Callsign + Timestamp + Emergency flag) provides automatic deduplication:

1. When a station successfully decodes an incoming message, it extracts the Message ID
2. If that ID matches a queued outbound message, the queue entry is removed
3. This prevents relay stations from re-transmitting messages the originator already sent

---

## Acknowledgments

The message format reserves space for **ACK arrays**—lists of Message IDs that confirm receipt.

### How ACKs Work

1. **Recording transmissions** — When a station successfully decodes another operator's transmission, it records the Message ID in its received log
2. **Queueing ACKs** — The receiving station adds the sender's Message ID to its pending ACK list
3. **Batching** — After its own TX, a station skips the immediately following window and **listens through it**. If that window is silent (or the ACK queue hits the threshold), it contends on the **next** window after that with a **fresh random frame**
4. **Piggybacking** — That next transmission includes ACKs for everyone in the pending list
5. **Confirmation** — The original sender sees its Message ID acknowledged and marks the contact as confirmed

### ACK Behavior in Contest Mode

| Event | Action |
|-------|--------|
| Decode incoming message | Record Message ID, add to pending ACK list |
| After own TX completes | Skip next window; listen for activity |
| Following window silent **or** pending heard ≥ threshold | Arm TX for the window after that + **new random frame** |
| Transmit own message | Include pending ACKs in payload, clear pending list |
| Receive ACK for own Message ID | Mark contact as **confirmed** (two-way) |

ACKs piggyback on regular messages rather than consuming separate slots. Raising the **ACK queue** slider batches more hears per TX; lowering it ACKs sooner.

See [codec.md](codec.md) for the ACK field layout and packing details.

---

## Interactive Simulator

Test the algorithm visually with the **Contest Queue Simulator**:

**URL:** `http://localhost:8000/web/contest_queue_simulator.html`

### Core Algorithm Model

The simulator implements:
- Large-scale operator simulation (scalable to many simultaneous users)
- 2-second slots with ~2.4s on-air bursts
- 50–400 ms random listen windows
- Binary exponential backoff
- Silence floor (3 slots)
- Real-time visualization of transmissions, deferrals, and confirmations

Adjust the speed multiplier to watch the algorithm in slow motion or fast-forward to completion.

### Dynamic User Rotation

The simulator continuously rotates operators to model a realistic contest where stations join and leave throughout the event:

- **New arrivals** — Operators "join" the contest at random intervals
- **Active population** — Visualize how many users can operate simultaneously
- **Scalability testing** — Observe algorithm behavior as population grows

This helps validate that the queue system scales gracefully and maintains fairness even as the contest population changes.

### Geographic Visualization

The simulator map is a **flat grid world** for visual debugging of the queue algorithm. Maidenhead-style field labels and “lat/lon” placement are **cosmetic** — they do not model a spherical Earth, great-circle paths, or antimeridian wrap. What you see on the map is the simulation’s spatial truth.

#### Operator Placement

Each operator is assigned:
- A **random position** on the flat map (displayed with a cosmetic Maidenhead-style label, format `AA00aa`)
- A **unique color** for their map dot (randomly assigned at simulation start)
- A **callsign** displayed on their tile
- A **TX Power level** that sets the **green range disk** radius — anyone inside that disk hears the transmission
- A **Gain** value **+1 dB … +10 dB** shown on tiles for flavor; in this flat model Gain is **assumed uniform** and does **not** change who can hear whom

Operators appear as colored dots at their map positions. Each has a translucent **green TX range disk** (thin border, radial fill) sized from **PWR**.

#### Visual State Indicators

| State | Map Indicator | Description |
|-------|---------------|-------------|
| **Idle** | Colored dot (no outline) | Station is listening or has empty queue |
| **Transmitting** | **Red outline** | Station is actively transmitting |
| **Receiving** | **Green outline** | Listener is inside the transmitter’s green range disk |
| **TX range** | Green disk around each operator | Max signal range for that station’s **PWR** |

When an operator transmits:
1. Their dot gains a **red outline** for the duration of the transmission
2. Every other operator **inside that transmitter’s green disk** gets a **green outline** and a live RX path line
3. Operators **outside** the disk do not hear the signal and do not treat the channel as busy for carrier sense (hidden-node relative to that disk). If a listener is inside **two or more** active TX disks at once, audio overlaps: they **decode neither** message and show a **red X** (RX collision).

#### Contact graph (operator selected)

When an operator is **selected**—by **clicking their tile** or by **choosing them in the operator list** (same data as the tiles)—the map draws **lines** from that operator’s dot to each contact’s dot:

| Line style | Meaning |
|------------|---------|
| **Grey dotted** | **Heard** — this operator decoded the other station’s transmission (copy in the log), but the contact is **not** yet ACK-confirmed in the simulator’s sense |
| **Solid white** | **ACKed** — mutual confirmation: the relationship counts as **acked** (e.g. your Message ID was acknowledged by them, or the pair meets the simulator’s two-way ACK rule) |

Lines are straight segments on the **flat map**. Clearing the selection or choosing another operator updates or removes the overlay.

### Operator Tiles

Below the grid-square map, each operator is displayed as a **tile** in a flex container (and may also appear in a **scrollable operator list**). The tile’s background color matches the operator’s dot color on the map. **Selecting an operator** (tile click or list row) opens the **contacts popup** (see next subsection) and draws the **contact graph** on the map (see above).

#### Tile Layout

```
┌─────────────────────────────────────┐
│ W1AW   FN31pr   PWR: 5   Gain: +7 dB │  ← Callsign, Grid, TX Power, RX gain
│─────────────────────────────────────│
│ Backoff  [████████░░░░░░░░] 62%     │  ← Progress through current backoff window
│ Next TX  0:06                       │  ← Countdown until next transmit attempt
│─────────────────────────────────────│
│ TX: 12    RX: 8     ACK: 6          │  ← Transmit count, Receive count, Confirmed ACKs
│ Made: 14   Time: 00:04:24           │  ← Contacts made (distinct), time since first TX
└─────────────────────────────────────┘
```

#### Backoff progress bar

Each tile includes a **small horizontal progress bar** for **backoff**:

- **Meaning** — How far through the current **backoff** period the operator is (from last deferral / collision until `backoff_until` is satisfied and they may contend again). Empty or minimal fill = backoff just applied; full = backoff complete and the station is **eligible** at the next slot boundary (subject to carrier sense).
- **Visual** — Compact bar (e.g. 100–120px) with a fill ratio matching **elapsed / total** backoff time, or **(current_slot − backoff_start) / (backoff_until − backoff_start)** in slot units. Optional numeric label (`62%`) or slot count remaining.

When the operator is **not** in backoff (queue empty, or `backoff_until ≤ current_slot`), the bar can sit at **100%** (ready), **0%** with a “Ready” label, or hide — pick one convention in the implementation and keep it consistent.

#### Next transmit countdown

Each tile shows a **countdown** for when this operator is **planning to transmit** (their next **contention attempt**, not a guarantee they will win the channel):

- **Typical definition** — Time until the **next slot boundary** at which this station evaluates the queue **and** is no longer blocked by backoff (e.g. “in 6 seconds” / `0:06`). If they are still in backoff, the countdown should reflect **backoff end** first, then the following slot boundary if those differ.
- **During active TX** — Show `—` or `On air` until the burst ends, then resume countdown to the next attempt.
- **Idle / empty queue** — Show `—`, `Idle`, or no countdown so the UI does not imply a transmission is queued.

Format: **`M:SS`** (e.g. `0:06`, `1:24`) or total seconds, aligned with the simulator’s **2 s** slot grid and backoff rules in `contest_queue_algorithm.md`.

#### Tile fields

| Field | Description | Example |
|-------|-------------|---------|
| **Callsign** | Operator's call sign | `W1AW` |
| **Gridsquare** | Cosmetic map label (Maidenhead-style) | `FN31pr` |
| **PWR** | TX Power; sets green **TX range disk** radius | `5` |
| **Gain** | Display only (+1…+10 dB); assumed uniform in flat-disk model | `+7 dB` |
| **Backoff bar** | Progress through current **backoff** window (queue algorithm) | `62%` fill |
| **Next TX** | Countdown to next **planned transmit attempt** (slot + backoff alignment) | `0:06` |
| **TX** | Number of transmissions sent | `12` |
| **RX** | Number of transmissions received | `8` |
| **ACK** | ACKs received / confirmed receipts (per simulator rules) | `6` |
| **Made** | **Contacts made** — count of **distinct** other operators in this station’s contact list (anyone they have copied or worked; same cardinality as rows in the contacts popup) | `14` |
| **Time** | Time since first transmission | `00:04:24` |

The **Made** count is always visible on the tile so you can see how large each operator’s footprint is without opening the popup. Subset breakdown (**heard** vs **acked**) appears in the popup and on the map lines.

#### Contacts popup (selected operator)

Selecting an operator opens a **popup** (modal or side panel) that lists **contacts** for that operator:

- Each row: other callsign, gridsquare, and status (**Heard** vs **ACKed**)
- Optional columns: last seen time, number of decodes, pending ACK

The same list drives the **map overlay**: one line per contact from the selected operator’s dot to the peer’s dot, using the line styles in the table above.

#### Tile visual states

| State | Tile Indicator |
|-------|----------------|
| **Idle** | Background color only (no outline) |
| **Transmitting** | **Red outline** around tile |
| **Receiving** | **Green outline** around tile |

The tile outlines mirror the map dot outlines, making it easy to track activity in both views.

### TX Power, RX Gain, and propagation range

The simulator uses a **flat-grid** range model so visual debugging stays trustworthy:

- **TX range disk** = `baseRadius × PWR` (Euclidean distance on the map). Drawn as the green circle around each operator.
- **Anyone inside that disk hears** the transmission (decode + carrier sense).
- **Gain** is assumed the same for everyone and does **not** stretch or shrink the disk.

#### Carrier sense and hidden nodes

A station treats the channel as **busy** only if it lies **inside** an active transmitter’s green disk. Operators outside that disk may still contend (hidden-node relative to that transmitter).

#### Power levels (transmit footprint reference)

| Power Level | Description | Typical TX disk (order of magnitude, map units) |
|-------------|-------------|---------------------------------------------|
| 1 | QRP minimum | ~400 |
| 5 | QRP typical | ~2000 |
| 10 | QRP maximum | ~4000 |
| — | *Full power (regular preset)* | *scales with PWR × baseRadius* |

#### RX Gain (display only in simulator)

| Gain | Meaning in simulator |
|------|--------|
| **+1 dB … +10 dB** | Shown on tiles/popup; **not** used for hear / CS range in the flat-disk model |

#### Contest Types

The simulator supports different contest modes:

| Contest Type | Power Range | Max TX Power | Typical Range |
|--------------|-------------|--------------|---------------|
| **QRP Contest** | 1–10 | 5W equivalent | Limited (tests skill) |
| **Regular Contest** | 1–100 | Up to 1500W PEP | Larger disks / more overlap |

In a **QRP contest**, operators are limited to low power (levels 1–10), making contacts more challenging and rewarding. Operators must work harder to be heard, and the queue algorithm helps ensure fair access even when signals are weak.

In a **regular contest**, operators can run full legal power (up to 1500W PEP in the US), dramatically increasing their effective range but also increasing QRM potential.

### Propagation Model

| Parameter | Description |
|-----------|-------------|
| **World** | Flat map grid; Maidenhead labels are cosmetic |
| **TX footprint** | Green disk from **transmitter PWR** only |
| **Who hears** | Every operator inside that disk |
| **Gain** | Assumed uniform (not applied to range) |
| **Distance** | Euclidean distance in map / SVG space |

**Example:** **A** (PWR 5) transmits → every station inside **A’s** green disk gets a green outline and may log/ACK; stations outside the disk neither hear nor defer for **A**.

### ACK Flow Visualization

The simulator demonstrates the full acknowledgment cycle:

```
1. Station A transmits (PWR: 5)     → A gets magenta on-air ring; green TX disk visible
2. B inside A’s disk copies A       → B red hearing ring, logs A; pending ACK queue += A
3. After TX, A skips next window    → following window left free for other ops
4. A arms for next-next + new frame → when ACK queue ≥ threshold or following window starts
5. Station B wins a later slot      → B transmits with ACK for A (and others pending)
6. Station A receives B's ACK       → A marks contact with B as confirmed (if A is inside B’s disk)
```

### Statistics Dashboard

The simulator tracks aggregate statistics:

| Metric | Description |
|--------|-------------|
| **Active operators** | Current number of stations in the contest |
| **Total TX** | Sum of all transmissions |
| **Total ACKs** | Sum of all confirmed acknowledgments |
| **Collisions** | Number of transmission collisions/deferrals |
| **Channel utilization** | Percentage of slots with successful transmissions |
| **Avg contacts/operator** | Mean confirmed contacts per station |

### Mission Complete Condition

The simulation tracks progress toward the mission goal: **every operator has been decoded by at least one peer**. The mission timer stops when all operators have a confirmed reception (green confirmation dot in their tile header). **Contacts made** and the contact graph are for analysis; they do not need to match the mission-complete predicate unless you configure them that way.

---

## Implementation Status

| Feature | Status |
|---------|--------|
| Contest message encoding (Type 2) | ✅ Complete |
| Bitwise-packed format | ✅ Complete |
| 31-bit UTC timestamp | ✅ Complete |
| 80-bit Message ID | ✅ Complete |
| Queue algorithm design | ✅ Specified |
| Queue simulator (basic) | ✅ Complete |
| Simulator: flat grid map (cosmetic Maidenhead labels) | ✅ Complete |
| Simulator: operator tile grid | ✅ Complete |
| Simulator: tile backoff bar + next-TX countdown | ✅ Complete |
| Simulator: contact list popup + map lines (heard / ACKed) | ✅ Complete |
| Simulator: dynamic user rotation | ✅ Complete |
| Simulator: TX Power / green range-disk modeling | ✅ Complete |
| Simulator: flat-disk hear / CS (Gain display-only) | ✅ Complete |
| Simulator: QRP vs Regular contest presets | ✅ Complete |
| Simulator: ACK flow (piggyback on next TX) | ✅ Complete |
| Simulator: statistics dashboard | ✅ Complete |
| Live carrier sense integration (production app) | 🚧 In progress |
| ACK array packing (wire format) | 📋 Planned |
| Contest UI in main app | 📋 Planned |
| ADIF/Cabrillo export | 📋 Planned |

---

## Related Documentation

- **[Queue.md](Queue.md)** — How the transmission queue works; operator states and `web/queue.html` UI reference
- **[contest_queue_timing_audit.md](contest_queue_timing_audit.md)** — Simulator timing audit (composite burst, listen window, backoff, fairness bound)
- **[codec.md](codec.md)** — Message format, timestamp encoding, Message ID structure, ACK layout
- **[contest_queue_algorithm.md](contest_queue_algorithm.md)** — Full technical specification with pseudocode and open questions
- **[ribbit_wasm.md](ribbit_wasm.md)** — WASM API for encoding/decoding contest messages
- **[README_WASM_API.md](README_WASM_API.md)** — Developer API for message handling

---

## Quick Reference

### Queue Algorithm Parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| Slot duration | 2 seconds | Aligned to even UTC seconds |
| On-air time | ~2.35 seconds | Includes 300 Hz VOX preamble |
| Listen window | 50–400 ms | Random uniform draw |
| Max backoff | 16 slots (32 s) | After 4+ attempts |
| Silence threshold | 3 slots (6 s) | Resets all backoffs |
| Timestamp resolution | 2 seconds | 31-bit UTC encoding |
| Message ID | 80 bits | Callsign[48] + Timestamp[31] + Emergency[1] |

### Map & Tile Visualization

| Element | Indicator | Meaning |
|---------|-----------|---------|
| Operator dot/tile | Random color | Unique station identifier |
| Red outline | Transmitting | Station is sending |
| Green outline | Receiving | This station decodes the TX (distance, other **PWR**, this station **Gain**) |
| No outline | Idle | Station is listening or waiting |

### Operator Tile Fields

| Field | Format | Description |
|-------|--------|-------------|
| Callsign | `W1AW` | Station call sign |
| Gridsquare | `FN31pr` | 6-character Maidenhead locator |
| PWR | `1`–`10` (or preset max) | TX Power — green **range disk** radius on the flat map |
| Gain | `+1` … `+10` dB | Display only in simulator; assumed uniform (does not change disk) |
| TX | Integer | Transmissions sent |
| RX | Integer | Transmissions received |
| ACK | Integer | Confirmed acknowledgments |
| Made | Integer | **Contacts made** — distinct other operators in this station's contact list |
| Time | `00:04:24` | Time since first TX (HH:MM:SS) |

### Tile queue UI (backoff + countdown)

| Control | Meaning |
|---------|---------|
| Backoff bar | Fill = progress through current **backoff** until eligible to contend again |
| Next TX | **`M:SS`** countdown to next **planned transmit attempt** (slot boundary + backoff); `On air` / `—` when transmitting or idle |

### Contact graph (selected operator)

| Line style | Meaning |
|------------|---------|
| Grey dotted | **Heard** — decoded the other station; not ACK-confirmed |
| Solid white | **ACKed** — mutual confirmation per simulator rules |

Selecting an operator (tile or list row) opens the **contacts popup**; the same rows drive one map line per contact from the selected dot to the peer's dot. **Dismiss** the popup or pick another operator to clear or replace the overlay.

### TX footprint (PWR only, flat map)

| Level | Type | Order-of-magnitude TX disk (map units) |
|-------|------|--------------------------------|
| 1 | QRP min | ~400 |
| 5 | QRP typical | ~2000 |
| 10 | QRP max | ~4000 |
| 100 | Full power (regular) | scales with PWR × baseRadius |

### RX Gain (simulator)

| Gain | Effect |
|------|--------|
| +1 … +10 dB | Shown on UI; **not** applied to hear / CS range |

**Flat disk:** Anyone inside the transmitter’s green circle hears; anyone outside does not. Hidden nodes are simply operators outside that disk.

### Propagation model (summary)

| Parameter | Role |
|-----------|------|
| World | Flat grid map; labels cosmetic |
| TX footprint | From **transmitter PWR** only (green disk) |
| Who hears / CS | Euclidean map distance ≤ disk radius |
| Gain | Assumed uniform (display only) |

### Contest types

| Type | Power range | Description |
|------|-------------|-------------|
| QRP Contest | 1–10 | Low power, skill-based |
| Regular Contest | 1–100 | Up to 1500W PEP (US max) |

