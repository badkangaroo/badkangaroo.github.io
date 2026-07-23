"use strict";

/**
 * Shared generators for operator-ack-accumulation property tests.
 */

const ALPHANUM =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function genCallsign(rng, minLen = 1, maxLen = 8) {
  const len = rng.int(minLen, maxLen);
  let s = "";
  for (let i = 0; i < len; i++) {
    s += ALPHANUM[rng.int(0, ALPHANUM.length - 1)];
  }
  return s;
}

function genAckEntry(rng, overrides = {}) {
  return {
    callsign: overrides.callsign != null ? overrides.callsign : genCallsign(rng),
    timestamp:
      overrides.timestamp != null
        ? overrides.timestamp
        : rng.int(0, 0x7fffffff),
    emergency:
      overrides.emergency != null ? overrides.emergency : rng.bool(),
    hopCount:
      overrides.hopCount != null ? overrides.hopCount : rng.int(0, 15),
    addedAtSlot:
      overrides.addedAtSlot != null ? overrides.addedAtSlot : rng.int(0, 1000),
    transmitAttempts:
      overrides.transmitAttempts != null
        ? overrides.transmitAttempts
        : rng.int(0, 3),
    isInFlight: false,
  };
}

function entriesEqualWireFields(a, b) {
  return (
    a.callsign === b.callsign &&
    a.timestamp === b.timestamp &&
    a.emergency === b.emergency &&
    a.hopCount === b.hopCount
  );
}

module.exports = {
  ALPHANUM,
  genCallsign,
  genAckEntry,
  entriesEqualWireFields,
};
