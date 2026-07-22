/**
 * example-constants-and-audit.test.js
 *
 * Spec: contest-queue-timing-audit (task 7.2)
 *
 * EXAMPLE (non-property) tests covering:
 *   1. The updated simulator timing constants (R3.1-R3.4) as they appear in the
 *      live source (web/contest_queue_simulator.html) and as mirrored in the
 *      offline harness (scheduler-model.js). Asserting against the live source
 *      text (rather than only the mirror) guards against mirror drift for the
 *      values this task is responsible for.
 *   2. The timing-audit findings document (Docs/contest_queue_timing_audit.md):
 *      the authoritative transmission time, its breakdown, the required
 *      citations, and a complete per-constant comparison table (R1, R2).
 *
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4
 *
 * Offline-first: pure Node fs/path reads plus the local scheduler-model mirror;
 * no external dependency, no network, per AgentGuidance/OFFLINE_FIRST.md.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const { CONSTANTS } = require("./scheduler-model");

// Repo-relative paths resolved from __dirname (web/test/contest-queue/).
const SIMULATOR_HTML = path.resolve(
  __dirname,
  "..",
  "..",
  "contest_queue_simulator.html"
);
const AUDIT_DOC = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "Docs",
  "contest_queue_timing_audit.md"
);

const simulatorSrc = fs.readFileSync(SIMULATOR_HTML, "utf8");
const auditDoc = fs.readFileSync(AUDIT_DOC, "utf8");

describe("Example: updated simulator timing constants (R3.1-R3.4)", () => {
  describe("live source (web/contest_queue_simulator.html)", () => {
    test("COMPOSITE_BURST_SEC is 2.35 (composite on-air burst) — R3.1", () => {
      expect(simulatorSrc).toMatch(
        /const\s+COMPOSITE_BURST_SEC\s*=\s*2\.35\b/
      );
    });

    test("txTimeSec defaults to COMPOSITE_BURST_SEC (2.35 s) — R3.1", () => {
      expect(simulatorSrc).toMatch(
        /let\s+txTimeSec\s*=\s*COMPOSITE_BURST_SEC\b/
      );
    });

    test("TX time range (min/max) includes the 2.35 s burst — R3.2", () => {
      expect(simulatorSrc).toMatch(/const\s+TX_TIME_MIN\s*=\s*2\.0\b/);
      expect(simulatorSrc).toMatch(/const\s+TX_TIME_MAX\s*=\s*5\.0\b/);
      // Sanity: the range actually brackets the burst.
      expect(CONSTANTS.TX_TIME_MIN).toBeLessThanOrEqual(2.35);
      expect(CONSTANTS.TX_TIME_MAX).toBeGreaterThanOrEqual(2.35);
    });

    test("SLOT_SEC is the fixed 2.0 s GPS slot — R3.3", () => {
      expect(simulatorSrc).toMatch(/const\s+SLOT_SEC\s*=\s*2\.0\b/);
    });

    test("listen window is 50-400 ms — R3.4", () => {
      expect(simulatorSrc).toMatch(/const\s+LISTEN_MIN_MS\s*=\s*50\b/);
      expect(simulatorSrc).toMatch(/const\s+LISTEN_MAX_MS\s*=\s*400\b/);
    });
  });

  describe("harness mirror (scheduler-model.js) agrees with the source", () => {
    test("mirrored constants match the live simulator values", () => {
      expect(CONSTANTS.COMPOSITE_BURST_SEC).toBe(2.35);
      expect(CONSTANTS.SLOT_SEC).toBe(2.0);
      expect(CONSTANTS.LISTEN_MIN_MS).toBe(50);
      expect(CONSTANTS.LISTEN_MAX_MS).toBe(400);
      expect(CONSTANTS.slotMs).toBe(2000);
      expect(CONSTANTS.txMs).toBe(2350);
    });

    test("derived ms values are consistent with the seconds constants", () => {
      expect(CONSTANTS.slotMs).toBe(CONSTANTS.SLOT_SEC * 1000);
      expect(CONSTANTS.txMs).toBe(CONSTANTS.COMPOSITE_BURST_SEC * 1000);
    });
  });
});

describe("Example: timing-audit findings document (R1, R2)", () => {
  describe("authoritative transmission time + breakdown (R1)", () => {
    test("records the composite burst of ~2.35 s — R1.1", () => {
      expect(auditDoc).toMatch(/composite/i);
      expect(auditDoc).toMatch(/2\.35/);
    });

    test("records the 200 ms VOX + 100 ms silence + 2.048 s waveform breakdown — R1.2", () => {
      expect(auditDoc).toMatch(/200\s*ms/i);
      expect(auditDoc).toMatch(/VOX/i);
      expect(auditDoc).toMatch(/100\s*ms/i);
      expect(auditDoc).toMatch(/silence/i);
      expect(auditDoc).toMatch(/2\.048/);
      expect(auditDoc).toMatch(/waveform/i);
      // 16384 samples @ 8 kHz.
      expect(auditDoc).toMatch(/16384/);
      expect(auditDoc).toMatch(/8000\s*Hz|8\s*kHz/i);
    });

    test("cites the authoritative design documents — R1.3", () => {
      expect(auditDoc).toContain("Docs/contest_queue_algorithm.md");
      expect(auditDoc).toContain("Docs/contesting_mode.md");
    });
  });

  describe("per-constant comparison table (R2)", () => {
    test("contains a markdown comparison table with sim vs model + match column — R2.1, R2.2", () => {
      // Header row naming both sides and the match/diff columns.
      expect(auditDoc).toMatch(/Timing_Constant/);
      expect(auditDoc).toMatch(/Authoritative_Model/);
      expect(auditDoc).toMatch(/Match\?/);
      // A markdown table separator row is present.
      expect(auditDoc).toMatch(/\|\s*-+/);
    });

    test("covers tx-time default, minimum, and maximum — R2.4", () => {
      expect(auditDoc).toMatch(/txTimeSec/);
      expect(auditDoc).toMatch(/TX_TIME_MIN/);
      expect(auditDoc).toMatch(/TX_TIME_MAX/);
    });

    test("covers the slot / timing-window length — R2.4", () => {
      expect(auditDoc).toMatch(/timingWindow/i);
      expect(auditDoc).toMatch(/2\.0\s*s\s*GPS\s*slot|GPS\s*slot/i);
    });

    test("covers the listen-window range — R2.4", () => {
      expect(auditDoc).toMatch(/Listen\s*window/i);
      expect(auditDoc).toMatch(/50[–\-]400\s*ms/i);
    });

    test("covers the backoff parameters — R2.4", () => {
      expect(auditDoc).toMatch(/[Bb]ackoff/);
      expect(auditDoc).toMatch(/exponential/i);
    });

    test("covers the silence threshold — R2.4", () => {
      expect(auditDoc).toMatch(/SILENCE_SLOTS|[Ss]ilence\s*threshold/);
      expect(auditDoc).toMatch(/3\s*slots/i);
    });

    test("records at least one mismatch with a signed numeric difference — R2.3", () => {
      // e.g. the tx-time default row: at-audit 3.0 s vs 2.35 s => +0.65 s.
      expect(auditDoc).toMatch(/[+\-]\d/);
    });

    test("labels the comparison table as pre-fix / at-audit findings, not live current values", () => {
      // After resolutions land, the table must remain a historical findings
      // record — not claim the old 3.0 s / 10 s values are still "current".
      expect(auditDoc).toMatch(/pre-fix|at audit/i);
      expect(auditDoc).not.toMatch(
        /compares each timing constant currently in/i
      );
    });
  });

  describe("fairness-bound verification subsection (R5)", () => {
    test("records observed max wait, computed Bound, and empty violations — R5.1-R5.3", () => {
      expect(auditDoc).toMatch(/Fairness-Bound Verification/i);
      expect(auditDoc).toMatch(/Bounded_Wait\(N\)\s*=\s*14\s*\+\s*2N/);
      expect(auditDoc).toMatch(/Observed maximum wait/i);
      expect(auditDoc).toMatch(/Violations/);
      expect(auditDoc).toMatch(/no violations|empty/i);
    });
  });
});
