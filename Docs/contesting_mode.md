# Contesting Mode

Making the most efficient use of time on the air.

## Overview

Contesting Mode is Ribbit's high-efficiency operating mode designed for amateur radio contests. When many operators are competing on the same frequency, every second counts. Contest Mode uses a **bitwise-packed message format** (40–60% smaller than Chat Mode) combined with an intelligent **message queue system** that coordinates transmissions across multiple independent stations—all without requiring a central server.

**Key capabilities:**

- **Compact messages** — Structured fields packed into minimal bits, not UTF-8 strings
- **Automatic collision avoidance** — GPS-synchronized scheduling prevents stations from talking over each other
- **Fair channel access** — Every station gets airtime, even in crowded pileups
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
- A **TX Power level** (1–10) that determines transmission range

The map displays operators as colored dots at their geographic positions, providing a visual representation of a real-world contest scenario.

#### Visual State Indicators

| State | Map Indicator | Description |
|-------|---------------|-------------|
| **Idle** | Colored dot (no outline) | Station is listening or has empty queue |
| **Transmitting** | **Red outline** | Station is actively transmitting |
| **Receiving** | **Green outline** | Station is within range and decoding the transmission |

When an operator transmits:
1. Their dot gains a **red outline** for the duration of the transmission (~2.4s)
2. All operators **within propagation range** gain a **green outline** indicating they can hear the signal
3. Operators outside range remain unchanged (simulating skip zones or distance limits)

### Operator Tiles

Below the grid-square map, each operator is displayed as a **tile** in a flex container. The tile's background color matches the operator's dot color on the map.

#### Tile Layout

```
┌─────────────────────────────────────┐
│ W1AW            FN31pr    PWR: 5    │  ← Callsign, Grid, TX Power
│─────────────────────────────────────│
│ TX: 12    RX: 8     ACK: 6          │  ← Transmit count, Receive count, Confirmed ACKs
│ Time: 00:04:24      Contacts: 6     │  ← Time since first TX, Total confirmed contacts
└─────────────────────────────────────┘
```

#### Tile Fields

| Field | Description | Example |
|-------|-------------|---------|
| **Callsign** | Operator's call sign | `W1AW` |
| **Gridsquare** | Maidenhead locator (6-char) | `FN31pr` |
| **PWR** | TX Power level (1–10) | `5` |
| **TX** | Number of transmissions sent | `12` |
| **RX** | Number of transmissions received | `8` |
| **ACK** | Number of ACKs received (confirmed receipts) | `6` |
| **Time** | Time since first transmission | `00:04:24` |
| **Contacts** | Total two-way confirmed contacts | `6` |

#### Tile Visual States

| State | Tile Indicator |
|-------|----------------|
| **Idle** | Background color only (no outline) |
| **Transmitting** | **Red outline** around tile |
| **Receiving** | **Green outline** around tile |

The tile outlines mirror the map dot outlines, making it easy to track activity in both views.

### TX Power and Propagation Range

TX Power affects how far a signal can travel. The simulator models this as a multiplier on the base propagation range.

#### Power Levels

| Power Level | Description | Effective Range |
|-------------|-------------|-----------------|
| 1 | QRP minimum | ~400 km |
| 5 | QRP typical | ~2000 km |
| 10 | QRP maximum | ~4000 km |
| — | *Full power (1500W PEP)* | *~8000+ km* |

The relationship between power and range follows an approximate inverse-square model scaled for HF propagation characteristics.

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
| **Base range** | ~400 km per power unit |
| **Maximum range** | Power level × base range |
| **Minimum range** | Optional skip zone (signals don't decode too close) |
| **Distance calculation** | Great-circle (Haversine) from grid square centers |

**Example:** An operator with TX Power 5 can reach stations up to ~2000 km away. An operator with TX Power 10 can reach ~4000 km.

Operators outside the transmitting station's range will not decode the message and will not send an ACK.

### ACK Flow Visualization

The simulator demonstrates the full acknowledgment cycle:

```
1. Station A transmits (PWR: 5)  → A gets red outline
2. Stations B, C within 2000 km  → B, C get green outlines, record A's Message ID
3. Station D at 3000 km          → D does NOT hear A (out of range)
4. A's transmission ends         → Outlines clear
5. Station B wins next slot      → B transmits with ACK for A
6. Station A receives B's ACK    → A marks contact with B as confirmed
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

The simulation tracks progress toward the mission goal: **every operator has been decoded by at least one peer**. The mission timer stops when all operators have a confirmed reception (green confirmation dot in their tile header).

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
| Dynamic user rotation | 📋 Planned |
| TX Power / range modeling | 📋 Planned |
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
| Green outline | Receiving | Station is decoding incoming signal |
| No outline | Idle | Station is listening or waiting |

### Operator Tile Fields

| Field | Format | Description |
|-------|--------|-------------|
| Callsign | `W1AW` | Station call sign |
| Gridsquare | `FN31pr` | 6-character Maidenhead locator |
| PWR | `1`–`10` | TX Power level (QRP scale) |
| TX | Integer | Transmissions sent |
| RX | Integer | Transmissions received |
| ACK | Integer | Confirmed acknowledgments |
| Time | `00:04:24` | Time since first TX (HH:MM:SS) |
| Contacts | Integer | Two-way confirmed contacts |

### TX Power Levels

| Level | Type | Effective Range |
|-------|------|-----------------|
| 1 | QRP min | ~400 km |
| 5 | QRP typical | ~2000 km |
| 10 | QRP max | ~4000 km |
| 100 | Full power (1500W) | ~8000+ km |

### Contest Types

| Type | Power Range | Description |
|------|-------------|-------------|
| QRP Contest | 1–10 | Low power, skill-based |
| Regular Contest | 1–100 | Up to 1500W PEP (US max) |

### Propagation Model

| Parameter | Default | Description |
|-----------|---------|-------------|
| Max range | ~4000 km | Typical 20m band daytime skip |
| Min range | 0 km | Optional skip zone (configurable) |
| Calculation | Great-circle | Haversine formula from grid centers |

