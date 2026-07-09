import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const candidatePath = path.resolve("active/shield-main.js");

function readCandidateSource() {
  assert.ok(existsSync(candidatePath), "active/shield-main.js should exist");
  return readFileSync(candidatePath, "utf8");
}

function loadCandidateContext() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(readCandidateSource(), context, { filename: candidatePath });
  assert.equal(typeof context.onIdle, "function");
  return context;
}

function createOpenMap(width = 19, height = 15) {
  return Array.from({ length: width }, (_, x) => (
    Array.from({ length: height }, (_, y) => (x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "x" : "."))
  ));
}

function createMe(position, direction = "right", cooldown = 0) {
  const actions = [];
  return {
    stars: 0,
    actions,
    tank: { id: 4839, position, direction },
    skill: { type: "boost", remainingCooldownFrames: cooldown },
    status: { boosted: false, fireLocked: false },
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
    boost() {
      actions.push({ type: "boost" });
    },
    speak(text) {
      actions.push({ type: "speak", text });
    },
  };
}

function createEnemy(position, direction = "left", skill = "shield") {
  return {
    stars: 0,
    tank: { id: 99, position, direction },
    skill: { type: skill, remainingCooldownFrames: 12 },
    status: {},
    bullet: null,
  };
}

function firstCommand(actions) {
  return actions.find((action) => action.type !== "speak");
}

function commands(actions) {
  return actions.filter((action) => action.type !== "speak");
}

test("shield-main v61 handles future bullet danger before taking a clear shot", () => {
  const context = loadCandidateContext();
  const me = createMe([5, 5], "right", 0);
  const enemy = createEnemy([9, 8], "left");
  enemy.bullet = { position: [5, 3], direction: "down" };

  context.onIdle(me, enemy, {
    frames: 20,
    map: createOpenMap(),
    star: [12, 5],
  });

  assert.notEqual(firstCommand(me.actions)?.type, "fire");
  assert.notEqual(firstCommand(me.actions)?.type, "boost");
});

test("shield-main v61 takes adjacent safe star before boost or fire", () => {
  const context = loadCandidateContext();
  const me = createMe([2, 2], "right", 0);
  const enemy = createEnemy([16, 12], "left");

  context.onIdle(me, enemy, {
    frames: 8,
    map: createOpenMap(),
    star: [3, 2],
  });

  assert.equal(firstCommand(me.actions)?.type, "go");
});

test("shield-main v61 does not cast boost when not facing a useful route", () => {
  const context = loadCandidateContext();
  const me = createMe([2, 2], "right", 0);
  const enemy = createEnemy([16, 12], "left");

  context.onIdle(me, enemy, {
    frames: 4,
    map: createOpenMap(),
    star: [2, 8],
  });

  assert.equal(firstCommand(me.actions)?.type, "turn");
  assert.notEqual(firstCommand(me.actions)?.type, "boost");
});

test("shield-main v61 casts boost only for an aligned valuable star route", () => {
  const context = loadCandidateContext();
  const me = createMe([2, 2], "down", 0);
  const enemy = createEnemy([16, 12], "left", "boost");

  context.onIdle(me, enemy, {
    frames: 4,
    map: createOpenMap(),
    star: [2, 8],
  });

  assert.equal(firstCommand(me.actions)?.type, "boost");
  assert.equal(context._lastSpeakTag, "boost-star");
});

test("shield-main v61 does not cast boost for a close star it can walk to", () => {
  const context = loadCandidateContext();
  const me = createMe([2, 2], "right", 0);
  const enemy = createEnemy([16, 12], "left", "boost");

  context.onIdle(me, enemy, {
    frames: 12,
    map: createOpenMap(),
    star: [4, 2],
  });

  assert.notEqual(firstCommand(me.actions)?.type, "boost");
});

test("shield-main v61 uses active boost same-frame turn fire on a clear lane", () => {
  const context = loadCandidateContext();
  const me = createMe([4, 4], "up", 20);
  me.status.boosted = true;
  me.skill.activeRemainingFrames = 4;
  const enemy = createEnemy([9, 4], "left", "poison");

  context.onIdle(me, enemy, {
    frames: 44,
    map: createOpenMap(),
    star: [4, 10],
  });

  assert.deepEqual(commands(me.actions).slice(0, 2), [
    { type: "turn", side: "right" },
    { type: "fire" },
  ]);
  assert.equal(context._lastSpeakTag, "boost-snap");
});

test("shield-main v61 uses active boost move plus free turn to create a gunline", () => {
  const context = loadCandidateContext();
  const me = createMe([4, 4], "right", 20);
  me.status.boosted = true;
  me.skill.activeRemainingFrames = 4;
  const enemy = createEnemy([6, 7], "left", "boost");

  context.onIdle(me, enemy, {
    frames: 48,
    map: createOpenMap(),
    star: [2, 12],
  });

  assert.deepEqual(commands(me.actions).slice(0, 2), [
    { type: "go" },
    { type: "turn", side: "right" },
  ]);
  assert.equal(context._lastSpeakTag, "boost-cut");
});

test("shield-main v61 close gunline counterfires before wandering", () => {
  const context = loadCandidateContext();
  const me = createMe([9, 7], "right", 0);
  const enemy = createEnemy([10, 7], "left", "cloak");

  context.onIdle(me, enemy, {
    frames: 18,
    map: createOpenMap(),
    star: [3, 2],
  });

  assert.equal(firstCommand(me.actions)?.type, "fire");
});

test("shield-main v61 boosted near-star control turns instead of overshooting sideways", () => {
  const context = loadCandidateContext();
  const me = createMe([5, 5], "right", 20);
  me.status.boosted = true;
  me.skill.activeRemainingFrames = 4;
  const enemy = createEnemy([15, 12], "left", "boost");

  context.onIdle(me, enemy, {
    frames: 30,
    map: createOpenMap(),
    star: [5, 6],
  });

  assert.equal(firstCommand(me.actions)?.type, "turn");
  assert.notEqual(firstCommand(me.actions)?.type, "go");
});

test("shield-main v61 behavior tree is boost-only and excludes shield-pressure branch", () => {
  const source = readCandidateSource();
  assert.match(source, /boost-root/);
  assert.match(source, /boost-snap-shot/);
  assert.match(source, /active-boost-gunline-landing/);
  assert.doesNotMatch(source, /shield-pressure/);
  assert.doesNotMatch(source, /function castShield/);
});
