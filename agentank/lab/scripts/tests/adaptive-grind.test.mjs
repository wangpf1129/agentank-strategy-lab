import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildAdaptiveQueue,
  buildOpponentMemoryFromRuns,
  normalizeLeaderboardRows,
  parseNumericIds,
  resolveClimbPolicyOptions,
  shouldStopForDrawdown,
} from "../lib/adaptive-grind.mjs";

test("normalizes leaderboard rows from agent payloads", () => {
  const rows = normalizeLeaderboardRows({
    rows: [
      { tankId: 9, tankName: "Usami", rankScore: 118, skillType: "stun" },
      { tankId: 691, tankName: "StunF2T1", rankScore: 157, skillType: "freeze" },
    ],
  });

  assert.deepEqual(rows.map((row) => row.id), [9, 691]);
  assert.deepEqual(rows.map((row) => row.name), ["Usami", "StunF2T1"]);
});

test("builds an adaptive queue that prefers prior winners and excludes hard losses", () => {
  const queue = buildAdaptiveQueue({
    currentScore: 420,
    selfTankId: 947,
    explicitOpponentIds: [691, 3629, 3679],
    seedOpponentIds: [691],
    leaderboardRows: normalizeLeaderboardRows({
      rows: [
        { tankId: 3679, tankName: "Tank-729481", rankScore: 465, skillType: "boost" },
        { tankId: 3629, tankName: "Tank-F2F51952", rankScore: 406, skillType: "freeze" },
      ],
    }),
    lossIds: [3679],
    winsByOpponent: { 691: 2 },
    attemptsByOpponent: { 691: 1, 3629: 0 },
    maxPerOpponent: 2,
  });

  assert.deepEqual(queue.map((item) => item.id), [691, 3629]);
});

test("explicit-only adaptive queue does not add leaderboard fallback candidates", () => {
  const queue = buildAdaptiveQueue({
    currentScore: 420,
    selfTankId: 947,
    explicitOpponentIds: [691],
    explicitOnly: true,
    leaderboardRows: normalizeLeaderboardRows({
      rows: [
        { tankId: 691, tankName: "StunF2T1", rankScore: 402, skillType: "freeze" },
        { tankId: 3629, tankName: "Tank-F2F51952", rankScore: 406, skillType: "freeze" },
      ],
    }),
  });

  assert.deepEqual(queue.map((item) => item.id), [691]);
  assert.equal(queue[0].name, "StunF2T1");
});

test("builds opponent memory from prior executed runs for the same tank", () => {
  const memory = buildOpponentMemoryFromRuns([
    {
      startedAt: "2026-06-15T07:00:00.000Z",
      execute: true,
      tankCodename: "teleport-main",
      results: [
        { opponentId: 855, outcome: { result: "win", delta: 18 } },
        { opponentId: 145, outcome: { result: "loss", delta: -27 } },
      ],
      errors: [
        { opponentId: 1992, kind: "too_far" },
      ],
    },
    {
      startedAt: "2026-06-15T06:59:00.000Z",
      execute: true,
      tankCodename: "teleport-main",
      results: [
        { opponentId: 3989, outcome: { result: "win", delta: 18 } },
      ],
    },
    {
      startedAt: "2026-06-15T07:01:00.000Z",
      execute: true,
      tankCodename: "freeze-main",
      results: [
        { opponentId: 855, outcome: { result: "loss", delta: -20 } },
      ],
    },
  ], {
    tankCodename: "teleport-main",
    since: "2026-06-15T07:00:00.000Z",
  });

  assert.deepEqual(memory.attemptsByOpponent, { 145: 1, 855: 1 });
  assert.deepEqual(memory.winsByOpponent, { 855: 1 });
  assert.deepEqual(memory.lossIds, [145]);
  assert.deepEqual(memory.gatedIds, [1992]);
});

test("adaptive queue excludes opponents after the configured global win cap", () => {
  const queue = buildAdaptiveQueue({
    currentScore: 602,
    selfTankId: 947,
    explicitOpponentIds: [855, 3989, 3330],
    explicitOnly: true,
    leaderboardRows: normalizeLeaderboardRows({
      rows: [
        { tankId: 855, tankName: "poison", rankScore: 624 },
        { tankId: 3989, tankName: "freeze", rankScore: 591 },
        { tankId: 3330, tankName: "fresh", rankScore: 533 },
      ],
    }),
    winsByOpponent: { 855: 2, 3989: 2 },
    attemptsByOpponent: { 855: 2, 3989: 2 },
    maxWinsPerOpponent: 2,
  });

  assert.deepEqual(queue.map((item) => item.id), [3330]);
});

test("detects peak score drawdown stops", () => {
  assert.equal(shouldStopForDrawdown({
    currentScore: 660,
    peakScore: 700,
    drawdownStop: 40,
  }), true);
  assert.equal(shouldStopForDrawdown({
    currentScore: 661,
    peakScore: 700,
    drawdownStop: 40,
  }), false);
  assert.equal(shouldStopForDrawdown({
    currentScore: 602,
    peakScore: 700,
    drawdownStop: 0,
  }), false);
});

test("climb policy tightens rotation and stops above 700 score", () => {
  assert.deepEqual(resolveClimbPolicyOptions({
    currentScore: 750,
    climbPolicy: true,
    maxWinsPerOpponent: null,
    drawdownStop: 0,
    stopOnLoss: false,
  }), {
    maxWinsPerOpponent: 1,
    drawdownStop: 25,
    stopOnLoss: true,
  });
});

test("climb policy keeps wider push windows below 700 score", () => {
  assert.deepEqual(resolveClimbPolicyOptions({
    currentScore: 650,
    climbPolicy: true,
    maxWinsPerOpponent: null,
    drawdownStop: 0,
    stopOnLoss: false,
  }), {
    maxWinsPerOpponent: 2,
    drawdownStop: 35,
    stopOnLoss: true,
  });
});

test("explicit climb policy options override score-band defaults", () => {
  assert.deepEqual(resolveClimbPolicyOptions({
    currentScore: 760,
    climbPolicy: true,
    maxWinsPerOpponent: 3,
    drawdownStop: 12,
    stopOnLoss: false,
  }), {
    maxWinsPerOpponent: 3,
    drawdownStop: 12,
    stopOnLoss: true,
  });
});

test("disabled climb policy preserves existing runner options", () => {
  assert.deepEqual(resolveClimbPolicyOptions({
    currentScore: 760,
    climbPolicy: false,
    maxWinsPerOpponent: null,
    drawdownStop: 0,
    stopOnLoss: false,
  }), {
    maxWinsPerOpponent: null,
    drawdownStop: 0,
    stopOnLoss: false,
  });
});

test("parses numeric id lists and rejects invalid values", () => {
  assert.deepEqual(parseNumericIds("9,691"), [9, 691]);
  assert.throws(() => parseNumericIds("9,abc"), /Invalid opponents id/);
});
