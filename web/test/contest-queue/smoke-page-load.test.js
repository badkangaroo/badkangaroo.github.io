/**
 * smoke-page-load.test.js — page-load smoke test for the contest queue simulator.
 *
 * Spec: contest-queue-timing-audit (task 7.3)
 * Validates: Requirement 3.7 — "WHEN the Contest_Queue_Simulator runs after the
 * timing values are updated, THE Contest_Queue_Simulator SHALL execute without
 * JavaScript runtime errors."
 *
 * APPROACH: real jsdom (no new dependency).
 * -----------------------------------------------------------------------------
 * The project already vendors `jsdom` and `jest-environment-jsdom` offline
 * (see web/package.json devDependencies + web/node_modules), and Jest is
 * configured with `testEnvironment: "jsdom"`. Per AgentGuidance/OFFLINE_FIRST.md
 * we add NO new external dependency / CDN — this test uses only the already
 * installed jsdom.
 *
 * We load the actual simulator HTML file, execute its inline <script> (the whole
 * simulator lives in a single IIFE), and then DRIVE THE TICK LOOP so the test
 * exercises real per-frame behaviour (slot boundaries, spawns, scheduling,
 * carrier sense, transmission) rather than merely parsing the file. Two
 * independent drivers are used:
 *
 *   1. The "play" loop: the boot sequence calls reset() which sets running=true
 *      and schedules loop() via requestAnimationFrame. We install a controllable
 *      requestAnimationFrame in beforeParse and flush its queued callbacks with
 *      advancing timestamps, driving many tick() iterations deterministically.
 *
 *   2. The "step" control: after pausing (btnPause), each btnStep click calls
 *      stepOnce() -> tick(100), advancing the sim one tick at a time.
 *
 * Any JavaScript runtime error is captured three ways: jsdom's virtualConsole
 * "jsdomError" event, the window "error"/"unhandledrejection" events, and a
 * try/catch around every rAF callback we invoke. The test asserts none were
 * raised AND that the DOM actually updated (the #simTime stat advances past its
 * initial "0.0 s"), proving the loop ran rather than just the page parsing.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const HTML_PATH = path.resolve(__dirname, "../../contest_queue_simulator.html");

/**
 * Load the simulator page into a fresh jsdom instance with a controllable
 * requestAnimationFrame and full runtime-error capture.
 */
function loadSimulator() {
  const html = fs.readFileSync(HTML_PATH, "utf8");
  const errors = [];

  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (e) => errors.push(e));

  // Controllable animation-frame queue so the test — not a wall-clock timer —
  // drives the tick loop.
  const rafQueue = [];
  let rafSeq = 1;

  const dom = new JSDOM(html, {
    runScripts: "dangerously", // execute the inline simulator <script>
    pretendToBeVisual: false, // we supply our own rAF below
    url: "http://localhost/",
    virtualConsole,
    beforeParse(window) {
      window.requestAnimationFrame = (cb) => {
        const id = rafSeq++;
        rafQueue.push({ id, cb });
        return id;
      };
      window.cancelAnimationFrame = (id) => {
        const i = rafQueue.findIndex((x) => x.id === id);
        if (i >= 0) rafQueue.splice(i, 1);
      };
      window.addEventListener("error", (ev) => {
        errors.push(ev.error || new Error(ev.message || "window error"));
      });
      window.addEventListener("unhandledrejection", (ev) => {
        errors.push(ev.reason || new Error("unhandledrejection"));
      });
    }
  });

  return { dom, window: dom.window, errors, rafQueue };
}

/**
 * Flush the animation-frame queue `frames` times with advancing timestamps.
 * loop() re-queues itself each frame, so this drives a continuous tick loop.
 * Each callback is wrapped so a thrown runtime error is recorded (satisfying
 * R3.7's "no runtime errors" check) rather than aborting the whole test.
 */
function driveRafLoop(rafQueue, errors, frames, stepMs) {
  let now = 0;
  for (let i = 0; i < frames; i++) {
    now += stepMs;
    const pending = rafQueue.splice(0, rafQueue.length);
    for (const { cb } of pending) {
      try {
        cb(now);
      } catch (err) {
        errors.push(err);
      }
    }
  }
}

function errorSummary(errors) {
  return errors
    .map((e) => (e && (e.stack || e.message)) || String(e))
    .join("\n---\n");
}

describe("contest queue simulator — page-load smoke test (R3.7)", () => {
  test("HTML file exists and contains the simulator script", () => {
    expect(fs.existsSync(HTML_PATH)).toBe(true);
    const html = fs.readFileSync(HTML_PATH, "utf8");
    expect(html).toContain("<script>");
    expect(html).toContain('id="simTime"');
  });

  test("boots without runtime errors", () => {
    const { window, errors } = loadSimulator();
    // The IIFE (buildGrid + initTimingControls + reset) ran during construction.
    expect(errorSummary(errors)).toBe("");
    // Boot wired up the DOM: the sim-time stat exists and shows its initial value.
    const simTime = window.document.getElementById("simTime");
    expect(simTime).not.toBeNull();
    expect(simTime.textContent).toContain("s");
  });

  test("drives the play loop over many frames with no runtime errors", () => {
    const { window, errors, rafQueue } = loadSimulator();
    expect(errorSummary(errors)).toBe(""); // clean boot first

    const simTime = window.document.getElementById("simTime");
    const before = simTime.textContent;

    // 60 frames * 50 ms real => sped-up sim advances several seconds, crossing
    // many 2 s slot boundaries and exercising spawn/schedule/transmit paths.
    driveRafLoop(rafQueue, errors, 60, 50);

    expect(errorSummary(errors)).toBe("");

    // Prove the loop actually ran (DOM updated), not just parsed.
    const after = simTime.textContent;
    expect(after).not.toBe(before);
    const seconds = parseFloat(after);
    expect(Number.isFinite(seconds)).toBe(true);
    expect(seconds).toBeGreaterThan(0);
  });

  test("drives the tick loop via the pause + step controls with no runtime errors", () => {
    const { window, errors, rafQueue } = loadSimulator();
    const doc = window.document;
    expect(errorSummary(errors)).toBe("");

    const simTime = doc.getElementById("simTime");
    const btnPause = doc.getElementById("btnPause");
    const btnStep = doc.getElementById("btnStep");
    expect(btnPause).not.toBeNull();
    expect(btnStep).not.toBeNull();

    // Pause the running loop so stepOnce() (which no-ops while running) works.
    btnPause.click();
    // Drain any frame the running loop had queued before we paused.
    rafQueue.splice(0, rafQueue.length);

    const before = simTime.textContent;

    // Each Step click => stepOnce() => tick(100). Drive several ticks.
    for (let i = 0; i < 25; i++) {
      try {
        btnStep.click();
      } catch (err) {
        errors.push(err);
      }
    }

    expect(errorSummary(errors)).toBe("");

    const after = simTime.textContent;
    expect(after).not.toBe(before);
    expect(parseFloat(after)).toBeGreaterThan(parseFloat(before));
  });
});
