/**
 * pbt.js — minimal offline property-based testing helper.
 *
 * Spec: contest-queue-timing-audit (task 7.1)
 *
 * WHY A LOCAL HELPER
 * ------------------
 * AgentGuidance/OFFLINE_FIRST.md forbids new external dependencies / CDNs, so
 * we do not pull in fast-check. This provides just enough: a seeded PRNG (so
 * counterexamples are reproducible), a small set of generators, and a `forAll`
 * runner that reports the first failing example. The property/example test
 * tasks (2.4, 4.2, 4.4, 4.6, 4.7, 4.9, 6.2) plug their generators + predicate
 * into `forAll`.
 *
 * Pure vanilla JS. No dependency, no network.
 */

"use strict";

// ── Seeded PRNG (mulberry32) — deterministic, reproducible counterexamples ──
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A random-source object bundling the raw float source plus integer/choice
// helpers, so generators can be written compactly.
function makeRng(seed) {
  const rand = mulberry32(seed);
  return {
    rand,
    // integer in inclusive [lo, hi]
    int(lo, hi) {
      return lo + Math.floor(rand() * (hi - lo + 1));
    },
    // float in [lo, hi)
    float(lo, hi) {
      return lo + rand() * (hi - lo);
    },
    bool(p = 0.5) {
      return rand() < p;
    },
    pick(arr) {
      return arr[Math.floor(rand() * arr.length)];
    }
  };
}

// ── Generators: functions (rng) => value ───────────────────────────────────
const gen = {
  int: (lo, hi) => (rng) => rng.int(lo, hi),
  float: (lo, hi) => (rng) => rng.float(lo, hi),
  bool: (p) => (rng) => rng.bool(p),
  pick: (arr) => (rng) => rng.pick(arr),
  // tuple([g1, g2, ...]) => array of generated values
  tuple: (gens) => (rng) => gens.map((g) => g(rng)),
  // record({k: gen, ...}) => object of generated values
  record: (shape) => (rng) => {
    const out = {};
    for (const k of Object.keys(shape)) out[k] = shape[k](rng);
    return out;
  },
  // array(gen, minLen, maxLen)
  array: (g, minLen, maxLen) => (rng) => {
    const n = rng.int(minLen, maxLen);
    const out = [];
    for (let i = 0; i < n; i++) out.push(g(rng));
    return out;
  }
};

/**
 * forAll(generator, predicate, options)
 *
 * Runs `predicate(value)` for `iterations` generated values. The predicate
 * should return true (or undefined) to pass, or false / throw to fail. On the
 * first failure it throws an Error whose message contains the failing example
 * (as JSON) and the seed, so the counterexample is reproducible.
 *
 * @param {(rng) => any} generator
 * @param {(value) => boolean|void} predicate
 * @param {{iterations?: number, seed?: number, label?: string}} [options]
 */
function forAll(generator, predicate, options = {}) {
  const iterations = options.iterations != null ? options.iterations : 100;
  const baseSeed = options.seed != null ? options.seed : 0x1234abcd;
  const label = options.label || "property";

  for (let i = 0; i < iterations; i++) {
    const seed = (baseSeed + i * 2654435761) >>> 0; // per-iteration seed
    const rng = makeRng(seed);
    const value = generator(rng);
    let ok = true;
    let thrown = null;
    try {
      const result = predicate(value);
      ok = result === undefined || result === true;
    } catch (err) {
      ok = false;
      thrown = err;
    }
    if (!ok) {
      const example = safeStringify(value);
      const detail = thrown ? ` (threw: ${thrown.message})` : "";
      throw new Error(
        `${label} FAILED on iteration ${i + 1}/${iterations}${detail}\n` +
          `  seed: ${seed}\n` +
          `  counterexample: ${example}`
      );
    }
  }
  return true;
}

function safeStringify(value) {
  try {
    return JSON.stringify(value, (k, v) => {
      if (v instanceof Set) return Array.from(v);
      if (v instanceof Map) return Array.from(v.entries());
      return v;
    });
  } catch (e) {
    return String(value);
  }
}

module.exports = { mulberry32, makeRng, gen, forAll, safeStringify };
