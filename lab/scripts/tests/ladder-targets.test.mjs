import assert from "node:assert/strict";
import test from "node:test";

import { buildStepwiseTargets } from "../lib/ladder-targets.mjs";

test("selects only same-band and slightly higher ladder targets", () => {
  const targets = buildStepwiseTargets({
    ownTankId: 947,
    ownMetrics: { rankScore: 765 },
    leaderboard: [
      { tankId: 947, tankName: "山大王", rankScore: 765, wins: 10, losses: 5, draws: 0 },
      { tankId: 253, tankName: "biubiu", rankScore: 757, wins: 50, losses: 20, draws: 0 },
      { tankId: 1004, tankName: "🍺", skillType: "overload", rankScore: 800, wins: 14, losses: 6, draws: 0 },
      { tankId: 1009, tankName: "屠夫", skillType: "freeze", rankScore: 893, wins: 11, losses: 5, draws: 0 },
      { tankId: 70, tankName: "🛡", skillType: "overload", rankScore: 2036, wins: 3000, losses: 500, draws: 0 },
    ],
    maxScoreGap: 120,
  });

  assert.deepEqual(targets.map((target) => target.tankId), [1004]);
  assert.equal(targets[0].scoreGap, 35);
});

test("allows the next target band to start at the current score", () => {
  const targets = buildStepwiseTargets({
    ownTankId: 941,
    ownMetrics: { rankScore: 515 },
    leaderboard: [
      { tankId: 160, tankName: "灰烬之灵", skillType: "cloak", rankScore: 522, wins: 54, losses: 29, draws: 0 },
      { tankId: 338, tankName: "keke", skillType: "boost", rankScore: 586, wins: 5432, losses: 1127, draws: 0 },
      { tankId: 829, tankName: "DDerek tank", skillType: "boost", rankScore: 601, wins: 1223, losses: 400, draws: 0 },
    ],
    maxScoreGap: 90,
  });

  assert.deepEqual(targets.map((target) => target.tankId), [160, 338, 829]);
  assert.deepEqual(targets.map((target) => target.scoreGap), [7, 71, 86]);
});

test("filters low-sample placement targets by default", () => {
  const targets = buildStepwiseTargets({
    ownTankId: 947,
    ownMetrics: { rankScore: 765 },
    leaderboard: [
      { tankId: 1088, tankName: "placement", rankScore: 800, wins: 1, losses: 0, draws: 0 },
      { tankId: 1004, tankName: "🍺", rankScore: 800, wins: 14, losses: 6, draws: 0 },
    ],
  });

  assert.deepEqual(targets.map((target) => target.tankId), [1004]);
});
