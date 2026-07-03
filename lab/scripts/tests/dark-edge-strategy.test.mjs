import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const candidatePath = path.resolve("active/dark-edge.js");

function loadContext() {
  if (!existsSync(candidatePath)) {
    assert.fail("active/dark-edge.js should exist");
  }
  const source = readFileSync(candidatePath, "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: candidatePath });
  assert.equal(typeof context.onIdle, "function");
  return context;
}

function loadCandidate() {
  return loadContext().onIdle;
}

function createOpenMap(width = 19, height = 15) {
  return Array.from({ length: width }, (_, x) => (
    Array.from({ length: height }, (_, y) => (x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "x" : "."))
  ));
}

function setTile(map, x, y, value) {
  map[x][y] = value;
  return map;
}

function createMe(position, direction = "right", cooldown = 0) {
  const actions = [];
  return {
    stars: 0,
    actions,
    tank: { id: 20, position, direction },
    skill: { type: "overload", remainingCooldownFrames: cooldown },
    status: {
      overloaded: false,
      fireLocked: false,
      bombActive: false,
      bombCooldownFrames: 0,
    },
    bullet: null,
    turn(side) {
      actions.push({ type: "turn", side });
    },
    go() {
      actions.push({ type: "go" });
    },
    fire() {
      actions.push({ type: "fire" });
    },
    overload() {
      actions.push({ type: "overload" });
    },
    throwBomb() {
      actions.push({ type: "bomb" });
    },
  };
}

function createEnemy(position, direction = "left", skill = "teleport", cooldown = 12) {
  return {
    stars: 0,
    tank: { id: 99, position, direction },
    skill: { type: skill, remainingCooldownFrames: cooldown },
    status: {},
    bullet: null,
  };
}

test("dark-edge keeps the shield-main safe adjacent-star priority", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 0);
  const enemy = createEnemy([8, 8], "up", "shield", 12);

  onIdle(me, enemy, {
    frames: 18,
    map: createOpenMap(),
    star: [5, 6],
  });

  assert.deepEqual(me.actions[0], { type: "turn", side: "right" });
});

test("dark-edge off-line gunline exit sidesteps a reply-capable direct lane instead of shield-style overloading", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "up", 0);
  const enemy = createEnemy([9, 5], "up", "boost", 12);

  onIdle(me, enemy, {
    frames: 24,
    map: createOpenMap(),
    star: [14, 12],
  });

  assert.notEqual(me.actions[0]?.type, "overload");
  assert.notEqual(me.actions[0]?.type, "fire");
  assert.deepEqual(me.actions[0], { type: "go" });
});

test("dark-edge same-line aimed duel fires instead of turning or casting overload", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 0);
  const enemy = createEnemy([9, 5], "left", "boost", 12);

  onIdle(me, enemy, {
    frames: 24,
    map: createOpenMap(),
    star: [14, 12],
  });

  assert.deepEqual(me.actions[0], { type: "fire" });
});

test("dark-edge does not step into a long enemy bullet lane while chasing star line", () => {
  const onIdle = loadCandidate();
  const me = createMe([9, 2], "right", 0);
  me.stars = 1;
  const enemy = createEnemy([10, 12], "left", "boost", 12);
  enemy.bullet = { position: [10, 12], direction: "up" };

  onIdle(me, enemy, {
    frames: 12,
    map: createOpenMap(),
    star: [12, 2],
  });

  assert.notDeepEqual(me.actions[0], { type: "go" });
  assert.notEqual(me.actions[0]?.type, "overload");
});

test("dark-edge preserves covered overload offset attacks", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  setTile(map, 7, 5, "x");
  const me = createMe([5, 5], "right", 0);
  const enemy = createEnemy([9, 6], "right", "boost", 12);

  onIdle(me, enemy, {
    frames: 26,
    map,
    star: [14, 12],
  });

  assert.equal(me.actions[0]?.type, "overload");
});

test("dark-edge active bullet danger and hard current danger vetoes value actions before overload", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 0);
  const enemy = createEnemy([12, 12], "left", "freeze", 12);
  enemy.bullet = { position: [5, 3], direction: "down" };

  onIdle(me, enemy, {
    frames: 30,
    map: createOpenMap(),
    star: [14, 12],
  });

  assert.notEqual(me.actions[0]?.type, "overload");
  assert.ok(["turn", "go"].includes(me.actions[0]?.type));
});

test("dark-edge does not run down a recently cloaked straight firing lane", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  const first = createMe([4, 3], "down", 0);
  onIdle(first, createEnemy([3, 1], "right", "cloak", 0), {
    frames: 36,
    map,
    star: null,
  });

  const seen = createMe([4, 4], "down", 0);
  onIdle(seen, createEnemy([4, 1], "right", "cloak", 0), {
    frames: 37,
    map,
    star: null,
  });

  const me = createMe([4, 5], "down", 0);
  onIdle(me, null, {
    frames: 38,
    map,
    star: [12, 12],
  });

  assert.notDeepEqual(me.actions[0], { type: "go" });
  assert.ok(["turn", "overload", "fire"].includes(me.actions[0]?.type));
});

test("dark-edge does not cast overload while sitting in an aimed firing lane", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "up", 0);
  const enemy = createEnemy([9, 5], "left", "boost", 12);

  onIdle(me, enemy, {
    frames: 24,
    map: createOpenMap(),
    star: [14, 12],
  });

  assert.notEqual(me.actions[0]?.type, "overload");
  assert.notEqual(me.actions[0]?.type, "fire");
  assert.deepEqual(me.actions[0], { type: "go" });
});

test("dark-edge leaves the gunline after overload instead of firing or holding", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 10);
  me.status.overloaded = true;
  me.skill.activeRemainingFrames = 1;
  const enemy = createEnemy([9, 5], "left", "boost", 12);

  onIdle(me, enemy, {
    frames: 30,
    map: createOpenMap(),
    star: [14, 12],
  });

  assert.notEqual(me.actions[0]?.type, "fire");
  assert.notEqual(me.actions[0]?.type, "overload");
  assert.ok(["turn", "go"].includes(me.actions[0]?.type));
});

test("dark-edge post-overload reset does not counterfire when no clean exit exists", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  setTile(map, 4, 5, "x");
  setTile(map, 5, 4, "x");
  setTile(map, 5, 6, "x");
  const me = createMe([5, 5], "right", 10);
  me.status.overloaded = true;
  me.skill.activeRemainingFrames = 1;
  const enemy = createEnemy([9, 5], "left", "boost", 12);

  onIdle(me, enemy, {
    frames: 30,
    map,
    star: [14, 12],
  });

  assert.deepEqual(me.actions, []);
});

test("dark-edge takes the immediate close-contact exit instead of turning inside a one-turn kill lane", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  setTile(map, 11, 12, "x");
  const me = createMe([13, 12], "left", 6);
  const enemy = createEnemy([13, 13], "right", "poison", 0);
  enemy.stars = 2;

  onIdle(me, enemy, {
    frames: 49,
    map,
    star: null,
  });

  assert.deepEqual(me.actions[0], { type: "go" });
});

test("dark-edge turns toward a point-blank enemy when ahead and no close-contact exit is available", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  setTile(map, 12, 5, "x");
  const me = createMe([12, 4], "down", 10);
  me.stars = 1;
  me.status.overloaded = true;
  me.skill.activeRemainingFrames = 4;
  const enemy = createEnemy([13, 4], "down", "shield", 12);

  onIdle(me, enemy, {
    frames: 26,
    map,
    star: [15, 1],
  });

  assert.deepEqual(me.actions[0], { type: "turn", side: "left" });
});

test("dark-edge takes the point-blank trade when already aimed and ahead", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  setTile(map, 12, 5, "x");
  const me = createMe([12, 4], "right", 10);
  me.stars = 1;
  me.status.overloaded = true;
  me.skill.activeRemainingFrames = 3;
  const enemy = createEnemy([13, 4], "left", "shield", 12);

  onIdle(me, enemy, {
    frames: 27,
    map,
    star: [15, 1],
  });

  assert.deepEqual(me.actions[0], { type: "fire" });
});

test("dark-edge uses active overload to fire the clear lane", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 10);
  me.status.overloaded = true;
  me.skill.activeRemainingFrames = 4;
  const enemy = createEnemy([9, 5], "right", "boost", 12);

  onIdle(me, enemy, {
    frames: 26,
    map: createOpenMap(),
    star: [14, 12],
  });

  assert.equal(me.actions[0]?.type, "fire");
});

test("dark-edge ordinary fire blocked by hard-wall offset star lane", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  setTile(map, 7, 3, "x");
  const me = createMe([5, 3], "right", 10);
  const enemy = createEnemy([13, 4], "left", "shield", 12);

  onIdle(me, enemy, {
    frames: 26,
    map,
    star: [13, 3],
  });

  assert.notEqual(me.actions[0]?.type, "fire");
});

test("dark-edge active overload may fire the offset lane even when the main lane is covered", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  setTile(map, 7, 3, "x");
  const me = createMe([5, 3], "right", 10);
  me.status.overloaded = true;
  me.skill.activeRemainingFrames = 4;
  const enemy = createEnemy([13, 4], "left", "shield", 12);

  onIdle(me, enemy, {
    frames: 26,
    map,
    star: [13, 3],
  });

  assert.equal(me.actions[0]?.type, "fire");
});

test("dark-edge does not fire into an active enemy shield", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 0);
  const enemy = createEnemy([9, 5], "up", "shield", 12);
  enemy.status.shielded = true;

  onIdle(me, enemy, {
    frames: 40,
    map: createOpenMap(),
    star: [14, 12],
  });

  assert.notEqual(me.actions[0]?.type, "fire");
  assert.notEqual(me.actions[0]?.type, "overload");
});

test("dark-edge does not spend patrol shots on dirt without star or pressure value", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  setTile(map, 6, 5, "m");
  const me = createMe([5, 5], "right", 6);
  const enemy = createEnemy([12, 12], "left", "boost", 12);

  onIdle(me, enemy, {
    frames: 70,
    map,
    star: null,
  });

  assert.notEqual(me.actions[0]?.type, "fire");
});

test("dark-edge lost star race avoids blind chase with contested offset pressure", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 6], "right", 0);
  const enemy = createEnemy([9, 7], "up", "teleport", 12);

  onIdle(me, enemy, {
    frames: 32,
    map: createOpenMap(),
    star: [10, 7],
  });

  assert.equal(me.actions[0]?.type, "overload");
});

test("dark-edge does not face a hard-wall-blocked star line while intercepting", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  setTile(map, 5, 12, "x");
  setTile(map, 6, 11, "x");
  const me = createMe([6, 12], "up", 6);
  const enemy = createEnemy([13, 7], "left", "teleport", 12);
  enemy.stars = 2;

  onIdle(me, enemy, {
    frames: 66,
    map,
    star: [3, 12],
  });

  assert.notDeepEqual(me.actions[0], { type: "turn", side: "left" });
  assert.deepEqual(me.actions[0], { type: "turn", side: "right" });
});

test("dark-edge breaks a destructible star-line blocker instead of holding", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  setTile(map, 15, 4, "m");
  const me = createMe([14, 4], "right", 6);
  const enemy = createEnemy([16, 7], "right", "teleport", 12);

  onIdle(me, enemy, {
    frames: 22,
    map,
    star: [16, 4],
  });

  assert.deepEqual(me.actions[0], { type: "fire" });
});

test("dark-edge uses overload to create an offset firing window when behind", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 0);
  me.stars = 0;
  const enemy = createEnemy([9, 6], "up", "boost", 12);
  enemy.stars = 1;

  onIdle(me, enemy, {
    frames: 44,
    map: createOpenMap(),
    star: [15, 12],
  });

  assert.equal(me.actions[0]?.type, "overload");
});

test("dark-edge does not cast overload for the wrong-side offset lane", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 0);
  me.stars = 0;
  const enemy = createEnemy([9, 4], "up", "boost", 12);
  enemy.stars = 1;

  onIdle(me, enemy, {
    frames: 44,
    map: createOpenMap(),
    star: [15, 12],
  });

  assert.notEqual(me.actions[0]?.type, "overload");
});

test("dark-edge uses vertical overload only on the real positive offset lane", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "down", 0);
  me.stars = 0;
  const enemy = createEnemy([6, 9], "left", "boost", 12);
  enemy.stars = 1;

  onIdle(me, enemy, {
    frames: 44,
    map: createOpenMap(),
    star: [15, 12],
  });

  assert.equal(me.actions[0]?.type, "overload");
});

test("dark-edge active overload does not fire at wrong-side offset targets", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 10);
  me.status.overloaded = true;
  me.skill.activeRemainingFrames = 4;
  const enemy = createEnemy([9, 4], "right", "boost", 12);

  onIdle(me, enemy, {
    frames: 46,
    map: createOpenMap(),
    star: [14, 12],
  });

  assert.notEqual(me.actions[0]?.type, "fire");
});

test("dark-edge routes combat fire through named action primitives", () => {
  const source = readFileSync(candidatePath, "utf8");
  assert.match(source, /function fireIfSafe\(\)/);
  assert.match(source, /function fireForTrade\(tag\)/);
  assert.match(source, /function commitFire\(tag, lines, urgency\)/);
  assert.equal((source.match(/me\.fire\(\);/g) || []).length, 2);
});

test("dark-edge keeps overloadable risk bounded to clearable star-line pressure", () => {
  const source = readFileSync(candidatePath, "utf8");
  assert.doesNotMatch(source, /function riskyButOverloadable\(x, y\) \{\s*return false;\s*\}/);
  assert.match(source, /starHasUnclearablePressure/);
  assert.match(source, /clearablePressure/);
  assert.match(source, /canCastOverloadSafely\(\)/);
});

test("dark-edge keeps panic dodge and positioning scoring separated", () => {
  const source = readFileSync(candidatePath, "utf8");
  assert.match(source, /function tryPanicDodgeSetup\(\)/);
  assert.match(source, /function scoreDodgeDirection\(d, panic\)/);
  assert.match(source, /function chooseDodgeDirection\(panic\)/);
  assert.match(source, /if \(panic && tryPanicDodgeSetup\(\)\) return true;/);
});

test("dark-edge keeps star tempo arbitration split from candidate execution", () => {
  const source = readFileSync(candidatePath, "utf8");
  assert.match(source, /function buildStarTempoFrame\(\)/);
  assert.match(source, /function collectStarTempoCandidates\(tempo\)/);
  assert.match(source, /function runStarRacePressure\(\)/);
  assert.match(source, /var tempo = buildStarTempoFrame\(\);/);
  assert.match(source, /var candidates = collectStarTempoCandidates\(tempo\);/);
});

test("dark-edge keeps action priority in an explicit strategy pipeline", () => {
  const source = readFileSync(candidatePath, "utf8");
  assert.match(source, /function buildStrategyPipeline\(\)/);
  assert.match(source, /function runStrategyPipeline\(modules\)/);
  assert.match(source, /runStrategyPipeline\(buildStrategyPipeline\(\)\);/);

  const order = [
    ...source.matchAll(/\{ layer: "([^"]+)", id: "([^"]+)", run: ([A-Za-z0-9_]+) \}/g),
  ].map(([, layer, id, run]) => `${layer}:${id}:${run}`);

  assert.deepEqual(order, [
    "L0:hazard-evasion:tryHazardEvasion",
    "L0:emergency-defense:tryEmergencyDefense",
    "L1:post-overload-reset:tryPostOverloadResetGuard",
    "L1:gunline-reposition:tryGunlineReposition",
    "L2:star-tempo-arbiter:tryStarTempoArbiter",
    "L3:immediate-shot:tryImmediateShot",
    "L3:overload-counter-pressure:tryOverloadCounterPressure",
    "L3:overload-line-window:tryOverloadLineWindow",
    "L3:overload-guarded-star-break:tryOverloadGuardedStarBreak",
    "L3:grass-star-overload-pressure:tryGrassStarOverloadPressure",
    "L3:overload-star-clearance:tryOverloadStarClearance",
    "L3:adjacent-star:tryAdjacentStar",
    "L4:strategic-grass-control:tryStrategicGrassControl",
    "L4:grass-camper-hold:tryGrassCamperHold",
    "L4:lead-star-line-control:tryLeadStarLineControl",
    "L4:lead-grass-control:tryLeadGrassControl",
    "L4:star-interception:tryStarInterception",
    "L5:early-lane-pressure:tryEarlyLanePressure",
    "L5:star-lane-pressure:tryStarLanePressure",
    "L6:direct-star-advance:tryDirectStarAdvance",
    "L6:contested-star-line-hold:tryContestedStarLineHold",
    "L6:late-value-pressure:tryLateValuePressure",
    "L7:break-dirt-toward-star:tryBreakDirtTowardStar",
    "L7:star-path:tryStarPath",
    "L7:bomb-trap:tryBombTrap",
    "L7:pressure-enemy:tryPressureEnemy",
    "L8:unstick:tryUnstick",
    "L8:patrol:patrol",
  ]);
});

test("dark-edge takes a safe adjacent star before spending overload setup", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 0);
  const enemy = createEnemy([10, 6], "up", "boost", 12);
  enemy.stars = 1;

  onIdle(me, enemy, {
    frames: 40,
    map: createOpenMap(),
    star: [6, 5],
  });

  assert.deepEqual(me.actions[0], { type: "go" });
});

test("dark-edge safe near-star beats overload setup", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 0);
  const enemy = createEnemy([9, 6], "up", "boost", 12);
  enemy.stars = 1;

  onIdle(me, enemy, {
    frames: 40,
    map: createOpenMap(),
    star: [7, 5],
  });

  assert.deepEqual(me.actions[0], { type: "go" });
});

test("dark-edge does not chase a low-value far star while already leading on its line", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 0);
  me.stars = 3;
  const enemy = createEnemy([8, 10], "up", "freeze", 12);

  onIdle(me, enemy, {
    frames: 58,
    map: createOpenMap(),
    star: [16, 5],
  });

  assert.notDeepEqual(me.actions[0], { type: "go" });
});

test("dark-edge does not idle in grass unless it controls a star line or pressure lane", () => {
  const onIdle = loadCandidate();
  const map = setTile(createOpenMap(), 5, 5, "o");
  const me = createMe([5, 5], "right", 0);
  me.stars = 3;
  const enemy = createEnemy([8, 10], "up", "freeze", 12);

  onIdle(me, enemy, {
    frames: 58,
    map,
    star: [16, 12],
  });

  assert.ok(me.actions.length > 0);
});

test("dark-edge strategic grass control can outrank ordinary star pathing", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  setTile(map, 5, 6, "o");
  const me = createMe([5, 5], "down", 0);
  const enemy = createEnemy([2, 12], "up", "freeze", 12);

  onIdle(me, enemy, {
    frames: 58,
    map,
    star: [12, 6],
  });

  assert.deepEqual(me.actions[0], { type: "go" });
});

test("dark-edge does not hold grass on a wall-blocked nearby star line", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  setTile(map, 1, 1, "o");
  setTile(map, 1, 2, "o");
  setTile(map, 1, 3, "x");
  const me = createMe([1, 2], "down", 0);
  const enemy = createEnemy([16, 12], "down", "boost", 12);

  onIdle(me, enemy, {
    frames: 11,
    map,
    star: [1, 5],
  });

  assert.notEqual(me.actions.length, 0);
});

test("dark-edge safe adjacent star before grass control", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  setTile(map, 6, 6, "o");
  const me = createMe([5, 5], "right", 0);
  const enemy = createEnemy([12, 12], "up", "freeze", 12);

  onIdle(me, enemy, {
    frames: 58,
    map,
    star: [6, 5],
  });

  assert.deepEqual(me.actions[0], { type: "go" });
});

test("dark-edge config tracks the tank as overload", async () => {
  const { PRIMARY_TANKS } = await import("../lib/challenge-plan.mjs");

  assert.equal(PRIMARY_TANKS["dark-edge"].skill, "overload");
});
