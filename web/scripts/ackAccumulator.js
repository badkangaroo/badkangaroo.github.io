"use strict";

/**
 * ACKAccumulator — Pending ACK list management for Contest Mode.
 *
 * Spec: operator-ack-accumulation (task 2.1)
 *
 * Maintains Pending_ACK_List and Relayed_ACK_Set with deduplication,
 * self-exclusion, capacity limits, expiration, and in-flight protection.
 *
 * Requirements: 1.1–1.8, 6.1–6.6, 8.3–8.6, 8.10
 */

const {
    messageIdFromFields,
    fieldsFromMessageId,
} = typeof module !== "undefined" && module.exports
    ? require("./ackPacker.js")
    : globalThis.__ribbitAckPacker;

const DEFAULT_CONFIG = {
    maxPendingEntries: 50,
    expirationSlots: 60,
    minExpirationSlots: 5,
    maxExpirationSlots: 300,
    maxHopCount: 3,
    localCallsign: "",
};

class ACKAccumulator {
    /**
     * @param {Object} [config]
     * @param {number} [config.maxPendingEntries=50]
     * @param {number} [config.expirationSlots=60]
     * @param {number} [config.maxHopCount=3]
     * @param {string} [config.localCallsign]
     */
    constructor(config = {}) {
        const expirationSlots = clamp(
            config.expirationSlots != null ? config.expirationSlots : DEFAULT_CONFIG.expirationSlots,
            DEFAULT_CONFIG.minExpirationSlots,
            DEFAULT_CONFIG.maxExpirationSlots
        );
        const maxHopCount = clamp(
            config.maxHopCount != null ? config.maxHopCount : DEFAULT_CONFIG.maxHopCount,
            1,
            7
        );

        this.config = {
            maxPendingEntries: config.maxPendingEntries || DEFAULT_CONFIG.maxPendingEntries,
            expirationSlots,
            maxHopCount,
            localCallsign: (config.localCallsign || DEFAULT_CONFIG.localCallsign).toUpperCase(),
        };

        /** @type {Array<Object>} */
        this.pendingList = [];
        /** @type {Map<string, number>} messageId → addedAtSlot */
        this.relayedSet = new Map();
    }

    get pendingCount() {
        return this.pendingList.length;
    }

    get relayedSetSize() {
        return this.relayedSet.size;
    }

    /**
     * Add a decoded message's ID to the pending list.
     * @param {string|Object} messageId - Hex Message_ID or {callsign,timestamp,emergency}
     * @param {string} senderCallsign
     * @param {number} currentSlot
     * @returns {boolean} true if added
     */
    addFromDecode(messageId, senderCallsign, currentSlot) {
        const local = this.config.localCallsign;
        const sender = (senderCallsign || "").toUpperCase();
        if (local && sender === local) {
            return false;
        }

        const entry = this._normalizeEntry(messageId, sender, 0, currentSlot);
        if (!entry) return false;

        if (this._hasPending(entry.messageId)) {
            return false;
        }

        this._evictOldestIfFull();
        this.pendingList.push(entry);
        return true;
    }

    /**
     * Add a third-party relay entry.
     * @param {string|Object} messageId
     * @param {number} hopCount - Already-incremented hop count
     * @param {number} currentSlot
     * @returns {boolean}
     */
    addRelay(messageId, hopCount, currentSlot) {
        if (hopCount >= this.config.maxHopCount) {
            return false;
        }

        const entry = this._normalizeEntry(messageId, null, hopCount, currentSlot);
        if (!entry) return false;

        if (this._hasPending(entry.messageId)) {
            return false;
        }
        if (this.relayedSet.has(entry.messageId)) {
            return false;
        }

        this._evictOldestIfFull();
        this.pendingList.push(entry);
        return true;
    }

    /**
     * Snapshot and remove up to maxEntries from the pending list (FIFO order).
     * Packer applies priority sort after taking a full snapshot.
     * @param {number} maxEntries
     * @returns {Array}
     */
    takeForPacking(maxEntries) {
        const n = Math.max(0, Math.min(maxEntries, this.pendingList.length));
        if (n === 0) return [];
        return this.pendingList.splice(0, n);
    }

    /**
     * Return entries to the list on transmission failure (preserve original age).
     * @param {Array} entries
     */
    returnEntries(entries) {
        if (!entries || entries.length === 0) return;
        for (const entry of entries) {
            if (!entry || !entry.messageId) continue;
            if (this._hasPending(entry.messageId)) continue;
            entry.isInFlight = false;
            this.pendingList.push(entry);
        }
        // Bound capacity after return
        while (this.pendingList.length > this.config.maxPendingEntries) {
            this._evictOldest();
        }
    }

    /**
     * Confirm successful transmission — add relayed entries to Relayed_ACK_Set.
     * Entries are already removed by takeForPacking; this only updates the set.
     * @param {Array} entries
     */
    confirmTransmission(entries) {
        if (!entries || entries.length === 0) return;
        // Use a sentinel slot of 0; caller should pass current slot via mark — we
        // store addedAtSlot from when they were packed if present, else 0.
        for (const entry of entries) {
            if (!entry || !entry.messageId) continue;
            if ((entry.hopCount || 0) > 0) {
                const slot = entry.addedAtSlot != null ? entry.addedAtSlot : 0;
                this.relayedSet.set(entry.messageId, slot);
            }
            entry.isInFlight = false;
        }
    }

    /**
     * Remove stale entries exceeding expiration interval; skip in-flight.
     * @param {number} currentSlot
     * @returns {Array} expired entries
     */
    expireEntries(currentSlot) {
        const expired = [];
        const keep = [];
        for (const entry of this.pendingList) {
            if (entry.isInFlight) {
                keep.push(entry);
                continue;
            }
            const age = currentSlot - (entry.addedAtSlot || 0);
            if (age >= this.config.expirationSlots) {
                expired.push(entry);
                if (typeof console !== "undefined" && console.debug) {
                    console.debug(
                        `ACK expired: ${entry.messageId} age=${age} slots`
                    );
                }
            } else {
                keep.push(entry);
            }
        }
        this.pendingList = keep;
        this._expireRelayedSet(currentSlot);
        return expired;
    }

    /**
     * Mark entries as in-flight (prevents expiration).
     * @param {Array} entries
     */
    markInFlight(entries) {
        if (!entries) return;
        const ids = new Set(entries.map((e) => e && e.messageId).filter(Boolean));
        for (const entry of this.pendingList) {
            if (ids.has(entry.messageId)) {
                entry.isInFlight = true;
            }
        }
        // Also mark the provided objects (may already be removed from list)
        for (const entry of entries) {
            if (entry) {
                entry.isInFlight = true;
                entry.transmitAttempts = (entry.transmitAttempts || 0) + 1;
            }
        }
    }

    /**
     * Unmark in-flight status.
     * @param {Array} entries
     */
    unmarkInFlight(entries) {
        if (!entries) return;
        const ids = new Set(entries.map((e) => e && e.messageId).filter(Boolean));
        for (const entry of this.pendingList) {
            if (ids.has(entry.messageId)) {
                entry.isInFlight = false;
            }
        }
        for (const entry of entries) {
            if (entry) entry.isInFlight = false;
        }
    }

    // ── Internal helpers ────────────────────────────────────────────────────

    _hasPending(messageId) {
        return this.pendingList.some((e) => e.messageId === messageId);
    }

    _evictOldestIfFull() {
        if (this.pendingList.length >= this.config.maxPendingEntries) {
            this._evictOldest();
        }
    }

    _evictOldest() {
        // Prefer non-in-flight oldest; fall back to absolute oldest
        let idx = -1;
        let oldestSlot = Infinity;
        for (let i = 0; i < this.pendingList.length; i++) {
            const e = this.pendingList[i];
            if (e.isInFlight) continue;
            if ((e.addedAtSlot || 0) < oldestSlot) {
                oldestSlot = e.addedAtSlot || 0;
                idx = i;
            }
        }
        if (idx < 0 && this.pendingList.length > 0) {
            idx = 0;
        }
        if (idx >= 0) {
            this.pendingList.splice(idx, 1);
        }
    }

    _expireRelayedSet(currentSlot) {
        for (const [id, addedAtSlot] of this.relayedSet.entries()) {
            if (currentSlot - addedAtSlot >= this.config.expirationSlots) {
                this.relayedSet.delete(id);
            }
        }
    }

    /**
     * Normalize messageId input into a full ACKEntry.
     */
    _normalizeEntry(messageId, senderCallsign, hopCount, currentSlot) {
        let callsign, timestamp, emergency, id;

        if (messageId && typeof messageId === "object") {
            callsign = (messageId.callsign || senderCallsign || "").toUpperCase();
            timestamp = messageId.timestamp >>> 0;
            emergency = !!messageId.emergency;
            id = messageId.messageId || messageIdFromFields({ callsign, timestamp, emergency });
        } else if (typeof messageId === "string") {
            id = messageId.toLowerCase();
            const fields = fieldsFromMessageId(id);
            if (fields) {
                callsign = fields.callsign;
                timestamp = fields.timestamp;
                emergency = fields.emergency;
            } else {
                callsign = (senderCallsign || "").toUpperCase();
                timestamp = 0;
                emergency = false;
                // If not valid hex, derive id from sender fields when possible
                if (callsign) {
                    id = messageIdFromFields({ callsign, timestamp, emergency });
                } else {
                    return null;
                }
            }
            if (senderCallsign) {
                callsign = senderCallsign.toUpperCase();
            }
        } else {
            return null;
        }

        if (!callsign && senderCallsign) {
            callsign = senderCallsign.toUpperCase();
        }
        if (!id) {
            id = messageIdFromFields({ callsign, timestamp, emergency });
        }

        return {
            messageId: id,
            callsign: callsign || "",
            timestamp: timestamp >>> 0,
            emergency: !!emergency,
            hopCount: hopCount || 0,
            addedAtSlot: currentSlot || 0,
            transmitAttempts: 0,
            isInFlight: false,
        };
    }
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

const api = { ACKAccumulator, DEFAULT_CONFIG };

if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
}
if (typeof globalThis !== "undefined") {
    globalThis.__ribbitAckAccumulator = api;
}
