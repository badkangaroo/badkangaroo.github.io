"use strict";

/**
 * ACKProcessor — Incoming ACK parsing and contact confirmation.
 *
 * Spec: operator-ack-accumulation (task 4.1)
 *
 * Parses received ACK arrays, matches against local transmitted Message_IDs,
 * creates Contact_Confirmations, and re-queues third-party entries for relay.
 *
 * Requirements: 4.1–4.7, 7.4, 7.5, 7.7, 8.1–8.4, 8.8, 8.9
 */

const { ACKPacker, messageIdFromFields } =
    typeof module !== "undefined" && module.exports
        ? require("./ackPacker.js")
        : globalThis.__ribbitAckPacker;

class ACKProcessor {
    /**
     * @param {Object} accumulator - ACKAccumulator instance
     * @param {Object} [config]
     * @param {number} [config.maxHopCount=3]
     * @param {() => number} [config.getCurrentSlot] - slot provider
     */
    constructor(accumulator, config = {}) {
        this.accumulator = accumulator;
        this.config = {
            maxHopCount:
                config.maxHopCount != null
                    ? config.maxHopCount
                    : accumulator && accumulator.config
                      ? accumulator.config.maxHopCount
                      : 3,
            getCurrentSlot:
                typeof config.getCurrentSlot === "function"
                    ? config.getCurrentSlot
                    : () => 0,
        };

        /** @type {Array<Object>} */
        this.confirmations = [];
        /** @type {Set<string>} */
        this.confirmationKeys = new Set();

        /** @type {Array<Object>} */
        this.contactLog = [];
        /** @type {Set<string>} */
        this.contactLogKeys = new Set();
    }

    /**
     * Process a decoded Contest_Message's ACK array.
     *
     * @param {string} senderCallsign
     * @param {string|{entries:Array,count:number}} ackBitstream
     * @param {Set<string>|Array<string>|Map} localTransmittedIds
     * @param {number} [currentSlot]
     * @returns {{ confirmations: Array, relayed: number, discarded: number }}
     */
    processIncoming(senderCallsign, ackBitstream, localTransmittedIds, currentSlot) {
        const result = { confirmations: [], relayed: 0, discarded: 0 };
        const slot =
            currentSlot != null ? currentSlot : this.config.getCurrentSlot();
        const sender = (senderCallsign || "").toUpperCase();

        const unpacked = this._unpack(ackBitstream);
        if (!unpacked || unpacked.count === 0 || !unpacked.entries.length) {
            return result;
        }

        const localIds = toIdSet(localTransmittedIds);

        for (const entry of unpacked.entries) {
            if (!entry || !entry.callsign) {
                result.discarded++;
                continue;
            }

            const messageId =
                entry.messageId ||
                messageIdFromFields({
                    callsign: entry.callsign,
                    timestamp: entry.timestamp,
                    emergency: entry.emergency,
                });

            if (localIds.has(messageId)) {
                const confirmation = this._addConfirmation(
                    messageId,
                    sender,
                    slot
                );
                if (confirmation) {
                    result.confirmations.push(confirmation);
                }
                this._addContactLog(messageId, sender, entry.hopCount || 0);
                continue;
            }

            this._addContactLog(messageId, sender, entry.hopCount || 0);

            const nextHop = (entry.hopCount || 0) + 1;
            if (nextHop >= this.config.maxHopCount) {
                result.discarded++;
                continue;
            }

            const added = this.accumulator.addRelay(
                {
                    messageId,
                    callsign: entry.callsign,
                    timestamp: entry.timestamp,
                    emergency: entry.emergency,
                },
                nextHop,
                slot
            );
            if (added) {
                result.relayed++;
            } else {
                result.discarded++;
            }
        }

        return result;
    }

    getContactLog() {
        return this.contactLog.slice();
    }

    getConfirmationsFor(messageId) {
        const id = (messageId || "").toLowerCase();
        return this.confirmations.filter((c) => c.messageId === id);
    }

    isConfirmed(operatorCallsign, messageId) {
        return this.confirmationKeys.has(
            confirmationKey(messageId, operatorCallsign)
        );
    }

    _unpack(ackBitstream) {
        if (!ackBitstream) {
            return { entries: [], count: 0 };
        }
        if (
            typeof ackBitstream === "object" &&
            Array.isArray(ackBitstream.entries)
        ) {
            return {
                entries: ackBitstream.entries,
                count:
                    ackBitstream.count != null
                        ? ackBitstream.count
                        : ackBitstream.entries.length,
            };
        }
        if (typeof ackBitstream === "string") {
            return ACKPacker.unpack(ackBitstream);
        }
        return { entries: [], count: 0 };
    }

    _addConfirmation(messageId, acknowledgerCallsign, slot) {
        const key = confirmationKey(messageId, acknowledgerCallsign);
        if (this.confirmationKeys.has(key)) {
            return null;
        }
        this.confirmationKeys.add(key);
        const confirmation = {
            messageId: (messageId || "").toLowerCase(),
            acknowledgerCallsign: (acknowledgerCallsign || "").toUpperCase(),
            confirmedAtSlot: slot,
            confirmedAtUTC: new Date(),
        };
        this.confirmations.push(confirmation);
        return confirmation;
    }

    _addContactLog(messageId, relayerCallsign, hopCount) {
        const key = `${(messageId || "").toLowerCase()}|${(relayerCallsign || "").toUpperCase()}`;
        if (this.contactLogKeys.has(key)) {
            return;
        }
        this.contactLogKeys.add(key);
        const now = new Date();
        now.setUTCMilliseconds(0);
        this.contactLog.push({
            messageId: (messageId || "").toLowerCase(),
            relayerCallsign: (relayerCallsign || "").toUpperCase(),
            receivedAtUTC: now,
            hopCount: hopCount || 0,
        });
    }
}

function confirmationKey(messageId, callsign) {
    return `${(messageId || "").toLowerCase()}|${(callsign || "").toUpperCase()}`;
}

function toIdSet(localTransmittedIds) {
    if (!localTransmittedIds) return new Set();
    if (localTransmittedIds instanceof Set) {
        return new Set(
            Array.from(localTransmittedIds).map((id) => String(id).toLowerCase())
        );
    }
    if (localTransmittedIds instanceof Map) {
        return new Set(
            Array.from(localTransmittedIds.keys()).map((id) =>
                String(id).toLowerCase()
            )
        );
    }
    if (Array.isArray(localTransmittedIds)) {
        return new Set(
            localTransmittedIds.map((id) => String(id).toLowerCase())
        );
    }
    return new Set(
        Object.keys(localTransmittedIds).map((id) => id.toLowerCase())
    );
}

const api = { ACKProcessor };

if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
}
if (typeof globalThis !== "undefined") {
    globalThis.__ribbitAckProcessor = api;
}
