import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createsImmediateFireThreat,
  hiddenCorridorThreat,
  overloadShotThreat,
} from "../lib/tactical-threats.mjs";

const openArena = Array.from({ length: 16 }, () => Array.from({ length: 11 }, () => "."));

test("overload shot threatens same lane and adjacent offset lane", () => {
  const enemy = { position: [2, 2], direction: "right" };

  assert.equal(overloadShotThreat(openArena, enemy, [12, 2], 6), true);
  assert.equal(overloadShotThreat(openArena, enemy, [12, 3], 6), true);
  assert.equal(overloadShotThreat(openArena, enemy, [12, 4], 6), false);
});

test("immediate fire threat includes one-turn aim when no bullet is active", () => {
  const enemy = { position: [12, 7], direction: "right" };

  assert.equal(
    createsImmediateFireThreat(openArena, enemy, [12, 10], { hasActiveBullet: false }),
    true,
  );
  assert.equal(
    createsImmediateFireThreat(openArena, enemy, [12, 10], { hasActiveBullet: true }),
    false,
  );
});

test("hidden corridor threat follows last seen cloak movement", () => {
  assert.equal(
    hiddenCorridorThreat({
      currentFrame: 9,
      lastSeenFrame: 4,
      lastPosition: [14, 12],
      moveDir: "up",
      target: [14, 8],
      mapWidth: 16,
      mapHeight: 16,
    }),
    true,
  );
  assert.equal(
    hiddenCorridorThreat({
      currentFrame: 60,
      lastSeenFrame: 4,
      lastPosition: [14, 12],
      moveDir: "up",
      target: [14, 8],
      mapWidth: 16,
      mapHeight: 16,
    }),
    false,
  );
});
