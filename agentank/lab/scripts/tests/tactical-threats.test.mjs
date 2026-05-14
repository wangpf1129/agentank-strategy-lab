import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createsImmediateFireThreat,
  hiddenCorridorThreat,
  postTeleportLaneTrap,
  reciprocalFireLosesRace,
  overloadThreatField,
  overloadShotThreat,
} from "../lib/tactical-threats.mjs";

const openArena = Array.from({ length: 18 }, () => Array.from({ length: 18 }, () => "."));

test("overload shot threatens same lane and adjacent offset lane", () => {
  const enemy = { position: [2, 2], direction: "right" };

  assert.equal(overloadShotThreat(openArena, enemy, [12, 2], 6), true);
  assert.equal(overloadShotThreat(openArena, enemy, [12, 3], 6), true);
  assert.equal(overloadShotThreat(openArena, enemy, [12, 4], 6), false);
});

test("active overload threatens delayed adjacent-lane setups even after turning", () => {
  const enemy = { position: [16, 12], direction: "up" };

  assert.equal(
    overloadThreatField(openArena, enemy, [8, 13], { active: true, maxFrames: 5 }),
    true,
  );
  assert.equal(
    overloadThreatField(openArena, enemy, [8, 15], { active: true, maxFrames: 5 }),
    false,
  );
});

test("bounded overload setup catches the #001 opener without banning longer star lanes", () => {
  const enemy = { position: [16, 12], direction: "down" };

  assert.equal(
    overloadThreatField(openArena, enemy, [8, 13], { active: true, maxFrames: 4 }),
    true,
  );
  assert.equal(
    overloadThreatField(openArena, enemy, [7, 13], { active: true, maxFrames: 4 }),
    false,
  );
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

test("reciprocal fire is losing when enemy bullet reaches us first", () => {
  const me = { position: [11, 2], direction: "right" };
  const enemy = { position: [15, 2], direction: "left" };
  const enemyBullet = { position: [13, 2], direction: "left" };

  assert.equal(reciprocalFireLosesRace(openArena, me, enemy, enemyBullet), true);
  assert.equal(
    reciprocalFireLosesRace(openArena, me, enemy, { position: [4, 2], direction: "left" }),
    false,
  );
});

test("post-teleport lane trap catches long one-turn shooting lanes", () => {
  const enemy = { position: [7, 10], direction: "right" };

  assert.equal(postTeleportLaneTrap(openArena, enemy, [17, 10]), true);
  assert.equal(postTeleportLaneTrap(openArena, enemy, [17, 8]), false);
  assert.equal(postTeleportLaneTrap(openArena, { ...enemy, direction: "left" }, [17, 10]), false);
});
