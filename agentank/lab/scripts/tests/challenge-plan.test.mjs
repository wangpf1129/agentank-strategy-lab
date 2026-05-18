import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildChallengePlan,
  buildChallengeRequestBody,
  extractMatchId,
  resolveTankConfigs,
} from "../lib/challenge-plan.mjs";

test("resolves all primary tank configs without exposing secrets", () => {
  const tanks = resolveTankConfigs("all");

  assert.deepEqual(tanks.map((tank) => tank.codename), ["freeze-main", "teleport-main"]);
  assert.deepEqual(tanks.map((tank) => tank.envName), [
    "AGENTANK_FREEZE_KEY",
    "AGENTANK_TELEPORT_KEY",
  ]);
  assert.ok(tanks.every((tank) => !("key" in tank)));
});

test("builds a bounded real challenge plan across tanks, opponents, maps, and repeats", () => {
  const plan = buildChallengePlan({
    tanks: "all",
    opponents: "1,2",
    maps: "random,arena",
    repeat: 2,
    limit: 5,
  });

  assert.deepEqual(plan.map((item) => item.tankCodename), [
    "freeze-main",
    "teleport-main",
    "freeze-main",
    "teleport-main",
    "freeze-main",
  ]);
  assert.deepEqual(plan.map((item) => item.opponentId), [1, 1, 1, 1, 2]);
  assert.deepEqual(plan.map((item) => item.mapId), [
    "random",
    "random",
    "arena",
    "arena",
    "random",
  ]);
});

test("builds challenge request body with AgentTank's targeted opponent field", () => {
  assert.deepEqual(
    buildChallengeRequestBody({ opponentId: 70, mapId: "arena" }),
    { opponentTankId: 70, mapId: "arena" },
  );
});

test("builds random-opponent real challenge plans and request bodies", () => {
  const plan = buildChallengePlan({
    tanks: "teleport-main",
    randomOpponent: true,
    maps: "random,classic",
    limit: 2,
  });

  assert.deepEqual(plan, [
    {
      tankCodename: "teleport-main",
      tankId: 947,
      skill: "teleport",
      envName: "AGENTANK_TELEPORT_KEY",
      randomOpponent: true,
      mapId: "random",
      round: 1,
    },
    {
      tankCodename: "teleport-main",
      tankId: 947,
      skill: "teleport",
      envName: "AGENTANK_TELEPORT_KEY",
      randomOpponent: true,
      mapId: "classic",
      round: 1,
    },
  ]);
  assert.deepEqual(buildChallengeRequestBody(plan[0]), {
    randomOpponent: true,
    mapId: "random",
  });
});

test("extracts match ids from nested challenge responses", () => {
  assert.equal(
    extractMatchId({ data: { match: { id: "mat_abc123XYZ" } } }),
    "mat_abc123XYZ",
  );
  assert.equal(
    extractMatchId({ url: "https://agentank.ai/history/mat_nested987" }),
    "mat_nested987",
  );
  assert.equal(extractMatchId({ ok: true }), null);
});
