import assert from "node:assert/strict";
import test from "node:test";

import { analyzeMatch } from "../lib/match-analysis.mjs";
import { scoreBehavior } from "../lib/behavior-score.mjs";

function baseMatch(overrides = {}) {
  return {
    match: {
      urlId: "mat_behavior",
      mapId: "public-map-test",
      mapName: "Test Map",
      resultReason: "stars",
      winnerRole: "challenger",
      winnerTankName: "Shield",
      ...overrides.match,
    },
    participants: {
      challenger: { tankId: 4839, tankName: "Shield" },
      defender: { tankId: 70, tankName: "Enemy" },
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
          result: { type: "game", reason: "stars", winner: 0 },
          ...overrides.meta,
        },
        records: overrides.records ?? [
          [{ action: "collected", by: 0, type: "star" }],
          [
            {
              action: "created",
              direction: "right",
              objectId: "bullet-a",
              tank: { id: "our-tank", position: [2, 2], direction: "right" },
              type: "bullet",
            },
            {
              action: "shot_hit",
              objectId: "bullet-a",
              tank: { id: "our-tank", position: [2, 2], direction: "right" },
              type: "bullet",
            },
          ],
        ],
      },
    },
  };
}

function ids(items) {
  return items.map((item) => item.id);
}

test("behavior score preserves star tempo and pressure from wins", () => {
  const analysis = analyzeMatch(baseMatch());
  const behavior = scoreBehavior(analysis, "challenger");

  assert.equal(behavior.won, true);
  assert.ok(ids(behavior.preserve).includes("preserve-star-tempo-win"));
  assert.ok(ids(behavior.preserve).includes("preserve-clear-kill-pressure"));
  assert.ok(ids(behavior.braveBaseline).includes("brave-safe-star"));
  assert.ok(behavior.score > 50);
});

test("behavior score promotes bullet deaths into hard constraints", () => {
  const analysis = analyzeMatch(baseMatch({
    match: { resultReason: "crashed", winnerRole: "defender", winnerTankName: "Enemy" },
    meta: { result: { type: "game", reason: "crashed", winner: 1 } },
    records: [
      [
        {
          action: "created",
          direction: "left",
          objectId: "bullet-b",
          tank: { id: "enemy-tank", position: [8, 2], direction: "left" },
          type: "bullet",
        },
        {
          action: "go",
          direction: "left",
          objectId: "bullet-b",
          position: [3, 2],
          tank: { id: "enemy-tank", position: [8, 2], direction: "left" },
          type: "bullet",
        },
        { action: "crashed", objectId: "our-tank", type: "tank" },
      ],
    ],
  }));
  const behavior = scoreBehavior(analysis, "challenger");

  assert.ok(ids(behavior.fix).includes("fix-bullet-death"));
  assert.ok(ids(behavior.hardConstraints).includes("hard-current-bullet-eta"));
  assert.ok(behavior.score < 50);
});

test("behavior score catches late wandering without pressure", () => {
  const records = [
    [{ action: "collected", by: 0, type: "star" }],
    ...Array.from({ length: 8 }, (_, index) => [
      {
        action: "go",
        objectId: "our-tank",
        position: index % 2 === 0 ? [15, 4] : [15, 5],
        type: "tank",
      },
    ]),
  ];
  const analysis = analyzeMatch(baseMatch({ records }));
  const behavior = scoreBehavior(analysis, "challenger");

  assert.ok(ids(behavior.fix).includes("fix-late-loop"));
  assert.ok(ids(behavior.fix).includes("fix-facing-without-shot"));
  assert.ok(ids(behavior.braveBaseline).includes("risk-unstick-overrides-value"));
});

test("behavior score catches lost close mutual trades", () => {
  const analysis = analyzeMatch(baseMatch({
    match: { resultReason: "crashed", winnerRole: "defender", winnerTankName: "Enemy" },
    meta: { result: { type: "game", reason: "crashed", winner: 1 } },
    records: [
      [
        { action: "crashed", objectId: "our-tank", type: "tank" },
        { action: "crashed", objectId: "enemy-tank", type: "tank" },
      ],
    ],
  }));
  const behavior = scoreBehavior(analysis, "challenger");

  assert.ok(ids(behavior.fix).includes("fix-unshielded-mutual-trade"));
  assert.ok(ids(behavior.hardConstraints).includes("hard-close-aimed-duel"));
});

test("behavior score catches breakable cover opened before a lethal lane", () => {
  const analysis = analyzeMatch(baseMatch({
    match: { resultReason: "star", winnerRole: "defender", winnerTankName: "Enemy" },
    meta: { result: { type: "game", reason: "star", winner: 1 } },
    records: [
      [{ action: "collected", by: 1, type: "star" }],
      [{ action: "destroyed", position: [10, 11], tile: "m", type: "map" }],
      [
        { action: "crashed", objectId: "enemy-tank", type: "tank" },
        { action: "crashed", objectId: "our-tank", type: "tank" },
      ],
    ],
  }));
  const behavior = scoreBehavior(analysis, "challenger");

  assert.ok(ids(behavior.fix).includes("fix-breakable-cover-lane"));
  assert.ok(ids(behavior.hardConstraints).includes("hard-breakable-cover-shot"));
});
