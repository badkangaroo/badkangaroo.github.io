"use strict";

/**
 * ACKDistributor — Outbound ACK integration and in-flight management.
 *
 * Spec: operator-ack-accumulation (task 5.1)
 *
 * Snapshots pending ACKs at encode time, marks them in-flight, and handles
 * transmission success/failure cleanup.
 *
 * Requirements: 3.1–3.8
 */

class ACKDistributor {
    /**
     * @param {Object} accumulator - ACKAccumulator instance
     * @param {Object} packer - ACKPacker instance
     * @param {Object} [config]
     */
    constructor(accumulator, packer, config = {}) {
        this.accumulator = accumulator;
        this.packer = packer;
        this.config = config || {};

        /** @type {Array|null} */
        this._inFlightEntries = null;
    }

    get isInFlight() {
        return this._inFlightEntries != null && this._inFlightEntries.length > 0;
    }

    /**
     * Prepare ACK payload for the next outbound message (snapshot moment).
     *
     * @param {Set|Map|Object|Array} contactConfirmations
     * @returns {{ bitstream: string, inFlightEntries: Array }}
     */
    preparePayload(contactConfirmations) {
        // If a previous flight is still marked, treat as interrupted
        if (this._inFlightEntries && this._inFlightEntries.length > 0) {
            this.onTransmitFailure();
        }

        const result = this.packer.pack(contactConfirmations || new Set());
        const entries = result.packedEntries || [];

        if (entries.length > 0) {
            this.accumulator.markInFlight(entries);
            this._inFlightEntries = entries;
        } else {
            this._inFlightEntries = [];
        }

        return {
            bitstream: result.bitstream,
            inFlightEntries: entries.slice(),
        };
    }

    /**
     * Transmission completed successfully — confirm relayed entries.
     * Packed entries were already removed by takeForPacking.
     */
    onTransmitSuccess() {
        const entries = this._inFlightEntries || [];
        if (entries.length > 0) {
            this.accumulator.confirmTransmission(entries);
        }
        this._inFlightEntries = null;
    }

    /**
     * Transmission interrupted — return packed entries with original age.
     */
    onTransmitFailure() {
        const entries = this._inFlightEntries || [];
        if (entries.length > 0) {
            this.accumulator.unmarkInFlight(entries);
            this.accumulator.returnEntries(entries);
        }
        this._inFlightEntries = null;
    }
}

const api = { ACKDistributor };

if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
}
if (typeof globalThis !== "undefined") {
    globalThis.__ribbitAckDistributor = api;
}
