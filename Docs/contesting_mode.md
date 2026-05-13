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
3. **Piggybacking** — When the receiver transmits its next message, it includes ACKs for all recently received stations
4. **Confirmation** — The original sender sees its Message ID acknowledged and marks the contact as confirmed

### ACK Behavior in Contest Mode

| Event | Action |
|-------|--------|
| Decode incoming message | Record Message ID, add to pending ACK list |
| Transmit own message | Include pending ACKs in payload, clear pending list |
| Receive ACK for own Message ID | Mark contact as **confirmed** (two-way) |

ACKs piggyback on regular messages rather than consuming separate slots—this maximizes channel efficiency. A single transmission can acknowledge multiple received stations.

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

The simulator includes a **world map** (grid square view) that models realistic HF propagation by placing operators at random locations on the globe.

#### Operator Placement

Each operator is assigned:
- A **random Maidenhead grid square** location (format: `AA00aa`, e.g., `FN31pr`)
- A **unique color** for their map dot (randomly assigned at simulation start)
- A **callsign** displayed on their tile
- A **TX Power level** (1–10) that determines **transmit footprint** — how far *others* can decode this station when it transmits
- A **Gain** value **+1 dB … +10 dB** that increases **listening range only** — how far away this station can *decode* (and treat as “channel busy” for carrier sense) compared to the baseline implied by the other station’s TX power

The map displays operators as colored dots at their geographic positions, providing a visual representation of a real-world contest scenario.

#### Visual State Indicators

| State | Map Indicator | Description |
|-------|---------------|-------------|
| **Idle** | Colored dot (no outline) | Station is listening or has empty queue |
| **Transmitting** | **Red outline** | Station is actively transmitting |
| **Green outline** | **Receiving** — This listener decodes the transmission (distance, **transmitter PWR**, and **listener Gain**); not everyone at the same geographic distance sees green |

When an operator transmits:
1. Their dot gains a **red outline** for the duration of the transmission (~2.4s)
2. Each other operator gets a **green outline** only if they are **within their own receive range** of that transmission — i.e. distance and the **listener’s Gain** (and the **transmitter’s PWR**) together determine decode / “I hear you,” not a single symmetric circle
3. Operators who are **too far to detect the carrier** (for that listener’s RX chain) do **not** get a green outline and, in the full queue model, **do not** treat the channel as busy when picking a slot — they behave like a **hidden node** relative to that transmitter

That last point is deliberate: on a real band, a big antenna and quiet location (**higher Gain**) let you **hear** more stations than will reliably **hear you** at your **PWR**. Distant stations often **do not know** someone else is occupying the channel when they decide to transmit.

#### Contact graph (operator selected)

When an operator is **selected**—by **clicking their tile** or by **choosing them in the operator list** (same data as the tiles)—the map draws **lines** from that operator’s dot to each contact’s dot:

| Line style | Meaning |
|------------|---------|
| **Grey dotted** | **Heard** — this operator decoded the other station’s transmission (copy in the log), but the contact is **not** yet ACK-confirmed in the simulator’s sense |
| **Solid white** | **ACKed** — mutual confirmation: the relationship counts as **acked** (e.g. your Message ID was acknowledged by them, or the pair meets the simulator’s two-way ACK rule) |

Lines are drawn in the **grid-square map** coordinate space (great-circle or projected segment between the two locators). Clearing the selection or choosing another operator updates or removes the overlay.

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
| **Gridsquare** | Maidenhead locator (6-char) | `FN31pr` |
| **PWR** | TX Power level (1–10); sets **transmit** decode range for others | `5` |
| **Gain** | RX gain **+1 dB … +10 dB**; extends **listening** / decode-of-others and **carrier-sense** range, not transmit footprint | `+7 dB` |
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

**Transmit footprint** is driven only by **PWR**: how far from the transmitter another station can still decode *that* transmission (subject to skip/min distance rules). **PWR does not** increase how well you hear others.

**Listening footprint** is asymmetric: when station **A** transmits, whether station **B** decodes (green outline, log copy, ACK opportunity) depends on **distance**, **A’s PWR**, and **B’s Gain** (+1 dB … +10 dB). Each step of Gain stretches the maximum distance at which **B** can copy **A** (implementation may use a dB-per-km curve, a multiplier on the PWR-implied radius, or equivalent).

Typical outcome: **you hear more stations than can hear you** — big **Gain**, modest **PWR** matches “loud signals in the headphones, they still ask for repeats.”

#### Carrier sense and hidden nodes

For slot picking / **carrier sense**, a station should treat the channel as **busy** only if it **detects** the ongoing transmission — i.e. the same (or stricter) criterion as “would I decode or at least see energy,” keyed off **its own Gain** and the **other station’s PWR**. Operators in **distant** grid squares who are **outside** that detection range **do not** know a transmission is in progress and may still contend for the slot, which is more realistic than a single global “everyone hears everyone” disk.

#### Power levels (transmit footprint reference)

| Power Level | Description | Typical TX footprint (order of magnitude) |
|-------------|-------------|---------------------------------------------|
| 1 | QRP minimum | ~400 km |
| 5 | QRP typical | ~2000 km |
| 10 | QRP maximum | ~4000 km |
| — | *Full power (1500W PEP)* | *~8000+ km* |

The relationship between **PWR** and **TX footprint** follows an approximate power–distance model (e.g. inverse-square scaled for HF). **Gain** applies on the **receive** side only.

#### RX Gain levels (listen / CS extension)

| Gain | Meaning |
|------|--------|
| **+1 dB … +10 dB** | Each step increases **maximum decode / busy-detect distance** toward other stations’ signals; **does not** extend how far **your** signal reaches |

Exact mapping from dB step to extra km is an implementation detail; the important behavior is **asymmetry** and **hidden-node** effects for distant contenders.

#### Contest Types

The simulator supports different contest modes:

| Contest Type | Power Range | Max TX Power | Typical Range |
|--------------|-------------|--------------|---------------|
| **QRP Contest** | 1–10 | 5W equivalent | Limited (tests skill) |
| **Regular Contest** | 1–100 | Up to 1500W PEP | Continental/Global |

In a **QRP contest**, operators are limited to low power (levels 1–10), making contacts more challenging and rewarding. Operators must work harder to be heard, and the queue algorithm helps ensure fair access even when signals are weak.

In a **regular contest**, operators can run full legal power (up to 1500W PEP in the US), dramatically increasing their effective range but also increasing QRM potential.

### Propagation Model

The simulator models HF propagation constraints:

| Parameter | Description |
|-----------|-------------|
| **Base TX footprint** | ~400 km per **PWR** unit (order of magnitude; tune per contest type) |
| **TX footprint** | From **transmitter PWR** only — who can decode *this* station’s transmission |
| **RX copy / CS range** | For listener **B** hearing transmitter **A**: extends with **B’s Gain**; can exceed the distance at which **A** could decode **B** if **B** runs lower **PWR** than **Gain** implies for reception |
| **Minimum range** | Optional skip zone (signals don't decode too close) |
| **Distance calculation** | Great-circle (Haversine) from grid square centers |

**Example (symmetric PWR, asymmetric perception):** **A** (PWR 5) is heard by **B** up to ~2000 km by **PWR** alone; if **B** has **Gain +6 dB**, **B** may still copy **A** somewhat beyond that model edge, while **A** without extra gain might **not** copy **B** when **B** uses the same PWR at the same distance — **one-way** copy and **hidden-node** CS behavior follow naturally.

Operators for whom the link does not meet the **decode** threshold will not log a copy and will not send an ACK for that transmission.

### ACK Flow Visualization

The simulator demonstrates the full acknowledgment cycle:

```
1. Station A transmits (PWR: 5)     → A gets red outline
2. B (Gain +8 dB) copies A          → B green outline, logs A; D (Gain +2 dB) too far → no green, D may not sense channel busy
3. Station C within A’s TX disk     → C green outline if C’s Gain allows copy at that distance
4. A's transmission ends            → Outlines clear
5. Station B wins next slot         → B transmits with ACK for A
6. Station A receives B's ACK       → A marks contact with B as confirmed (if A can decode B at that distance)
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
| Geographic map visualization | 📋 Planned |
| Operator tile grid | 📋 Planned |
| Tile backoff bar + next-TX countdown | 📋 Planned |
| Contact list popup + map lines (heard / ACKed) | 📋 Planned |
| Dynamic user rotation | 📋 Planned |
| TX Power / TX footprint modeling | 📋 Planned |
| RX Gain (+1…+10 dB) / asymmetric listen & carrier sense | 📋 Planned |
| QRP vs full-power modes | 📋 Planned |
| ACK flow in simulator | 📋 Planned |
| Statistics dashboard | 📋 Planned |
| Carrier sense integration | 🚧 In progress |
| ACK array packing | 📋 Planned |
| Contest UI in main app | 📋 Planned |
| ADIF/Cabrillo export | 📋 Planned |

---

## Related Documentation

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
| PWR | `1`–`10` | TX Power — **transmit footprint** only (who can decode you) |
| Gain | `+1` … `+10` dB | RX gain — **listening** / decode-of-others and **carrier-sense** range only; does not extend your TX range |
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

### TX footprint (PWR only)

| Level | Type | Order-of-magnitude TX footprint |
|-------|------|--------------------------------|
| 1 | QRP min | ~400 km |
| 5 | QRP typical | ~2000 km |
| 10 | QRP max | ~4000 km |
| 100 | Full power (1500W) | ~8000+ km |

### RX Gain (+1 dB … +10 dB)

| Gain | Effect |
|------|--------|
| +1 … +10 dB | Each step extends **maximum distance** at which **this** station decodes others and treats the channel as busy for CS; **does not** change how far **others** decode **this** station |

**Asymmetry:** You typically **hear** more stations than **hear you** — high **Gain**, modest **PWR**. Distant operators may transmit without sensing your pileup (**hidden node**).

### Propagation model (summary)

| Parameter | Role |
|-----------|------|
| TX footprint | From **transmitter PWR** only |
| RX / CS range | From **listener Gain** + other station **PWR** + distance |
| Min range | Optional skip zone (configurable) |
| Calculation | Great-circle (Haversine) from grid centers |

### Contest types

| Type | Power range | Description |
|------|-------------|-------------|
| QRP Contest | 1–10 | Low power, skill-based |
| Regular Contest | 1–100 | Up to 1500W PEP (US max) |

