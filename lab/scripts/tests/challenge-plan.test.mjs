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

  assert.deepEqual(tanks.map((tank) => tank.codename), ["freeze-main", "dark-edge", "teleport-main", "shield-main"]);
  assert.deepEqual(tanks.map((tank) => tank.envName), [
    "AGENTANK_FREEZE_KEY",
    "AGENTANK_DARK_EDGE_KEY",
    "AGENTANK_TELEPORT_KEY",
    "AGENTANK_SHIELD_KEY",
  ]);
  assert.deepEqual(tanks.map((tank) => tank.skill), ["freeze", "overload", "teleport", "boost"]);
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
    "dark-edge",
    "teleport-main",
    "shield-main",
    "freeze-main",
  ]);
  assert.deepEqual(plan.map((item) => item.opponentId), [1, 1, 1, 1, 1]);
  assert.deepEqual(plan.map((item) => item.mapId), [
    "random",
    "random",
    "random",
    "random",
    "arena",
  ]);
});

test("builds challenge request body with AgentTank's targeted opponent field", () => {
  assert.deepEqual(
    buildChallengeRequestBody({ opponentId: 70, mapId: "arena" }),
    { opponentTankId: 70, mapId: "arena" },
  );
});

test("builds challenge request body for a server-selected random opponent", () => {
  assert.deepEqual(
    buildChallengeRequestBody({ randomOpponent: true, mapId: "classic" }),
    { randomOpponent: true, mapId: "classic" },
  );
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
