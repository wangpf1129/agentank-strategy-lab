import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeMatch,
  classifyOutcome,
  normalizeMatch,
  renderBatchReport,
  renderMatchReport,
  summarizeBatch,
  summarizeTimeline,
} from "../lib/match-analysis.mjs";

function baseMatch(overrides = {}) {
  return {
    match: {
      urlId: "mat_test",
      mapId: "public-map-test",
      mapName: "Test Map",
      resultReason: "crashed",
      winnerRole: "defender",
      winnerTankName: "Shield",
      ...overrides.match,
    },
    participants: {
      challenger: { tankId: 941, tankName: "Captain" },
      defender: { tankId: 70, tankName: "Shield" },
      ...overrides.participants,
    },
    replayData: {
      map: { id: "public-map-test", map: [["x"], ["."]] },
      replay: {
        meta: {
          players: [
            { runTime: 120, tank: { id: "our-tank", position: [2, 2], direction: "right" } },
            { runTime: 500, tank: { id: "enemy-tank", position: [10, 2], direction: "left" } },
          ],
          result: { type: "game", reason: "crashed", winner: 1 },
          ...overrides.meta,
        },
        records: overrides.records ?? [
          [{ action: "created", position: [5, 2], type: "star" }],
          [{ action: "go", objectId: "our-tank", position: [3, 2], type: "tank" }],
          [{ action: "collected", by: 0, type: "star" }],
          [
            {
              action: "created",
              direction: "left",
              objectId: "bullet-a",
              tank: { id: "enemy-tank", position: [8, 2], direction: "left" },
              type: "bullet",
            },
            {
              action: "go",
              direction: "left",
              objectId: "bullet-a",
              position: [3, 2],
              tank: { id: "enemy-tank", position: [8, 2], direction: "left" },
              type: "bullet",
            },
            { action: "crashed", objectId: "our-tank", type: "tank" },
          ],
        ],
      },
    },
  };
}

test("normalizes AgentTank replay metadata and frame records", () => {
  const normalized = normalizeMatch(baseMatch());

  assert.equal(normalized.matchId, "mat_test");
  assert.equal(normalized.mapId, "public-map-test");
  assert.equal(normalized.frameCount, 4);
  assert.equal(normalized.players[0].role, "challenger");
  assert.equal(normalized.players[0].name, "Captain");
  assert.equal(normalized.players[1].role, "defender");
  assert.equal(normalized.players[1].objectId, "enemy-tank");
  assert.equal(normalized.result.reason, "crashed");
  assert.equal(normalized.result.winnerIndex, 1);
});

test("counts collected stars per player", () => {
  const normalized = normalizeMatch(baseMatch({
    records: [
      [{ action: "collected", by: 0, type: "star" }],
      [{ action: "collected", by: 1, type: "star" }],
      [{ action: "collected", by: 0, type: "star" }],
    ],
  }));

  assert.deepEqual(normalized.scores, { challenger: 2, defender: 1 });
});

test("classifies bullet crash losses with victim and killer", () => {
  const outcome = classifyOutcome(normalizeMatch(baseMatch()));

  assert.equal(outcome.category, "bullet_crash");
  assert.equal(outcome.winnerRole, "defender");
  assert.equal(outcome.victimRole, "challenger");
  assert.equal(outcome.killerRole, "defender");
  assert.equal(outcome.decidingFrame, 3);
});

test("classifies star wins from result reason and scores", () => {
  const outcome = classifyOutcome(normalizeMatch(baseMatch({
    match: { resultReason: "stars", winnerRole: "challenger", winnerTankName: "Captain" },
    meta: { result: { type: "game", reason: "stars", winner: 0 } },
    records: [
      [{ action: "collected", by: 0, type: "star" }],
      [{ action: "collected", by: 0, type: "star" }],
      [{ action: "collected", by: 1, type: "star" }],
    ],
  })));

  assert.equal(outcome.category, "star_win");
  assert.equal(outcome.winnerRole, "challenger");
  assert.equal(outcome.scoreLine, "2-1");
});

test("classifies runtime results", () => {
  const outcome = classifyOutcome(normalizeMatch(baseMatch({
    match: { resultReason: "runtime", winnerRole: "challenger", winnerTankName: "Captain" },
    meta: { result: { type: "game", reason: "runtime", winner: 0 } },
    records: [[{ action: "turn", objectId: "our-tank", type: "tank" }]],
  })));

  assert.equal(outcome.category, "runtime");
  assert.equal(outcome.winnerRole, "challenger");
});

test("summarizes timeline checkpoints and skill usage", () => {
  const summary = summarizeTimeline(normalizeMatch(baseMatch({
    records: [
      [{ action: "created", position: [5, 2], type: "star" }],
      [{ action: "cast", by: 0, skillType: "freeze", type: "skill" }],
      [{ action: "collected", by: 0, type: "star" }],
      [{ action: "cast", by: 1, skillType: "overload", type: "skill" }],
    ],
  })));

  assert.deepEqual(summary.starCollections, [
    { frame: 2, by: 0, role: "challenger" },
  ]);
  assert.deepEqual(summary.skillCasts, [
    { frame: 1, by: 0, role: "challenger", skillType: "freeze" },
    { frame: 3, by: 1, role: "defender", skillType: "overload" },
  ]);
});

test("produces an analysis object ready for reports", () => {
  const analysis = analyzeMatch(baseMatch());

  assert.equal(analysis.match.matchId, "mat_test");
  assert.equal(analysis.outcome.category, "bullet_crash");
  assert.equal(analysis.timeline.starCollections.length, 1);
  assert.equal(analysis.players.challenger.name, "Captain");
  assert.equal(analysis.players.defender.name, "Shield");
  assert.equal(analysis.behavior.perspectiveRole, "challenger");
  assert.ok(analysis.behavior.fix.some((item) => item.id === "fix-bullet-death"));
});

test("renders a compact markdown match report", () => {
  const report = renderMatchReport(analyzeMatch(baseMatch()));

  assert.match(report, /^# Match Review: mat_test/m);
  assert.match(report, /- Map: public-map-test/);
  assert.match(report, /- Result: defender won by bullet_crash/);
  assert.match(report, /- Score: 1-0/);
  assert.match(report, /- Deciding frame: 3/);
  assert.match(report, /- Victim: challenger/);
  assert.match(report, /- Killer: defender/);
  assert.match(report, /## Behavior Score/);
  assert.match(report, /## Preserve/);
  assert.match(report, /## Fix/);
  assert.match(report, /fix-bullet-death/);
  assert.match(report, /## Hard Constraints/);
  assert.match(report, /hard-current-bullet-eta/);
  assert.match(report, /## Brave Baseline/);
});

test("summarizes a batch of analyzed matches by result and category", () => {
  const analyses = [
    analyzeMatch(baseMatch()),
    analyzeMatch(baseMatch({
      match: { resultReason: "stars", winnerRole: "challenger", winnerTankName: "Captain" },
      meta: { result: { type: "game", reason: "stars", winner: 0 } },
      records: [[{ action: "collected", by: 0, type: "star" }]],
    })),
  ];

  const summary = summarizeBatch(analyses, "challenger");

  assert.equal(summary.total, 2);
  assert.equal(summary.wins, 1);
  assert.equal(summary.losses, 1);
  assert.deepEqual(summary.categories, { bullet_crash: 1, star_win: 1 });
  assert.deepEqual(summary.maps, { "public-map-test": 2 });
  assert.equal(summary.fix["fix-bullet-death"], 1);
  assert.equal(summary.hardConstraints["hard-current-bullet-eta"], 1);
});

test("renders a markdown batch report", () => {
  const report = renderBatchReport([
    analyzeMatch(baseMatch()),
    analyzeMatch(baseMatch({
      match: { resultReason: "runtime", winnerRole: "challenger", winnerTankName: "Captain" },
      meta: { result: { type: "game", reason: "runtime", winner: 0 } },
      records: [[{ action: "turn", objectId: "our-tank", type: "tank" }]],
    })),
  ], "challenger");

  assert.match(report, /^# Match Batch Report/m);
  assert.match(report, /- Total: 2/);
  assert.match(report, /- Wins: 1/);
  assert.match(report, /- Losses: 1/);
  assert.match(report, /\| bullet_crash \| 1 \|/);
  assert.match(report, /- Avg behavior score:/);
  assert.match(report, /## Preserve Signals/);
  assert.match(report, /## Fix Signals/);
  assert.match(report, /## Hard Constraint Breaches/);
  assert.match(report, /## Brave Baseline Signals/);
});
