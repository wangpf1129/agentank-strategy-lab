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

test("shield-main v62 immediately goes out of a current bullet lane when already aligned", () => {
  const context = loadCandidateContext();
  const me = createMe([8, 4], "left", 0);
  const enemy = createEnemy([14, 10], "up", "teleport");
  enemy.bullet = { position: [8, 5], direction: "up" };

  context.onIdle(me, enemy, {
    frames: 32,
    map: createOpenMap(),
    star: [14, 4],
  });

  assert.equal(firstCommand(me.actions)?.type, "go");
});

test("shield-main v64 exits a reply-capable same-row gunline before value movement", () => {
  const context = loadCandidateContext();
  const me = createMe([5, 5], "up", 0);
  const enemy = createEnemy([9, 5], "up", "boost");

  context.onIdle(me, enemy, {
    frames: 36,
    map: createOpenMap(),
    star: [5, 10],
  });

  assert.equal(firstCommand(me.actions)?.type, "go");
});

test("shield-main v64 refuses to step into a long bullet lane while chasing a star", () => {
  const context = loadCandidateContext();
  const me = createMe([9, 2], "right", 0);
  const enemy = createEnemy([15, 12], "left", "poison");
  enemy.bullet = { position: [10, 12], direction: "up" };

  context.onIdle(me, enemy, {
    frames: 38,
    map: createOpenMap(),
    star: [12, 2],
  });

  assert.notDeepEqual(firstCommand(me.actions), { type: "go" });
});

test("shield-main v64 does not boost-step into a reply-capable edge gunline for star value", () => {
  const context = loadCandidateContext();
  const me = createMe([8, 12], "down", 20);
  me.status.boosted = true;
  me.skill.activeRemainingFrames = 3;
  const enemy = createEnemy([17, 13], "left", "shield");

  context.onIdle(me, enemy, {
    frames: 43,
    map: createOpenMap(),
    star: [10, 13],
  });

  assert.notDeepEqual(firstCommand(me.actions), { type: "go" });
});

test("shield-main v64 treats a recently seen hidden enemy line as reply-capable", () => {
  const context = loadCandidateContext();
  const me = createMe([16, 11], "right", 0);
  const visibleEnemy = createEnemy([15, 13], "right", "shield");

  context.onIdle(me, visibleEnemy, {
    frames: 110,
    map: createOpenMap(),
    star: [17, 11],
  });

  me.actions.length = 0;
  const hiddenEnemy = {
    stars: 0,
    skill: { type: "shield", remainingCooldownFrames: 12 },
    status: {},
    bullet: null,
  };

  context.onIdle(me, hiddenEnemy, {
    frames: 118,
    map: createOpenMap(),
    star: [6, 10],
  });

  assert.notDeepEqual(firstCommand(me.actions), { type: "go" });
});

test("shield-main v69 refuses a star on a remembered grass shooter line", () => {
  const context = loadCandidateContext();
  const map = createOpenMap();

  context.onIdle(createMe([15, 8], "up", 0), {
    tank: null,
    skill: { type: "boost", remainingCooldownFrames: 12 },
    status: {},
    bullet: { position: [13, 7], direction: "right" },
  }, {
    frames: 51,
    map,
    star: null,
  });

  const me = createMe([13, 8], "up", 0);
  context.onIdle(me, {
    tank: null,
    skill: { type: "boost", remainingCooldownFrames: 12 },
    status: {},
    bullet: null,
  }, {
    frames: 52,
    map,
    star: [13, 7],
  });

  assert.notDeepEqual(firstCommand(me.actions), { type: "go" });
});

test("shield-main v69 exits a remembered shooter row before value actions", () => {
  const context = loadCandidateContext();
  const map = createOpenMap();

  context.onIdle(createMe([15, 8], "up", 0), {
    tank: null,
    skill: { type: "boost", remainingCooldownFrames: 12 },
    status: {},
    bullet: { position: [13, 7], direction: "right" },
  }, {
    frames: 51,
    map,
    star: null,
  });

  const me = createMe([13, 7], "up", 0);
  context.onIdle(me, {
    tank: null,
    skill: { type: "boost", remainingCooldownFrames: 12 },
    status: {},
    bullet: null,
  }, {
    frames: 52,
    map,
    star: [16, 7],
  });

  assert.equal(firstCommand(me.actions)?.type, "go");
});

test("shield-main v70 takes an urgent bullet-lane exit over future reply-line caution", () => {
  const context = loadCandidateContext();
  const me = createMe([7, 7], "up", 0);
  const enemy = createEnemy([15, 6], "up", "stun");
  enemy.bullet = {
    position: [9, 7],
    direction: "left",
    tank: { id: 99, position: [15, 6], direction: "up" },
  };

  context.onIdle(me, enemy, {
    frames: 52,
    map: createOpenMap(),
    star: null,
  });

  assert.equal(firstCommand(me.actions)?.type, "go");
});

test("shield-main v70 treats visible overload bullets as urgent lane danger", () => {
  const context = loadCandidateContext();
  const me = createMe([11, 6], "right", 0);
  const enemy = createEnemy([10, 9], "up", "overload");

  context.onIdle(me, enemy, {
    frames: 13,
    map: createOpenMap(),
    star: null,
    visibleBullets: [
      { position: [11, 8], direction: "up", tank: { id: 99, position: [10, 9], direction: "up" } },
      { position: [10, 8], direction: "up", tank: { id: 99, position: [10, 9], direction: "up" } },
    ],
  });

  assert.equal(firstCommand(me.actions)?.type, "go");
});

test("shield-main v64 commits to a selected bullet-lane exit instead of oscillating", () => {
  const context = loadCandidateContext();
  const me = createMe([5, 7], "left", 0);
  const enemy = createEnemy([12, 12], "left", "poison");
  enemy.bullet = { position: [9, 7], direction: "left" };

  context.onIdle(me, enemy, {
    frames: 61,
    map: createOpenMap(),
    star: [12, 7],
  });

  assert.equal(firstCommand(me.actions)?.type, "turn");
  me.actions.length = 0;
  me.tank.direction = "up";
  enemy.bullet = { position: [7, 7], direction: "left" };

  context.onIdle(me, enemy, {
    frames: 62,
    map: createOpenMap(),
    star: [12, 7],
  });

  assert.equal(firstCommand(me.actions)?.type, "go");
});

test("shield-main v64 still fires an aimed same-line trade when no line exit exists", () => {
  const context = loadCandidateContext();
  const me = createMe([5, 5], "right", 0);
  const enemy = createEnemy([9, 5], "left", "boost");
  const map = createOpenMap();
  map[5][4] = "x";
  map[5][6] = "x";

  context.onIdle(me, enemy, {
    frames: 40,
    map,
    star: [14, 12],
  });

  assert.equal(firstCommand(me.actions)?.type, "fire");
});

test("shield-main v65 refuses to step onto the current enemy bullet tile", () => {
  const context = loadCandidateContext();
  const me = createMe([2, 12], "up", 0);
  const enemy = createEnemy([9, 11], "left", "boost");
  enemy.bullet = { position: [2, 11], direction: "left" };

  context.onIdle(me, enemy, {
    frames: 16,
    map: createOpenMap(),
    star: [2, 11],
  });

  assert.notDeepEqual(firstCommand(me.actions), { type: "go" });
});

test("shield-main v65 drives out of a same-frame muzzle hit instead of turning", () => {
  const context = loadCandidateContext();
  const me = createMe([5, 11], "down", 0);
  const enemy = createEnemy([5, 9], "down", "poison");

  context.onIdle(me, enemy, {
    frames: 35,
    map: createOpenMap(),
    star: [12, 12],
  });

  assert.equal(firstCommand(me.actions)?.type, "go");
  assert.equal(context._lastSpeakTag, "shot-go-exit");
});

test("shield-main v65 does not step into a same-frame close muzzle lane", () => {
  const context = loadCandidateContext();
  const me = createMe([8, 8], "right", 0);
  const enemy = createEnemy([10, 8], "left", "cloak");

  context.onIdle(me, enemy, {
    frames: 26,
    map: createOpenMap(),
    star: [12, 8],
  });

  assert.notDeepEqual(firstCommand(me.actions), { type: "go" });
});

test("shield-main v68 takes an adjacent safe star instead of fleeing a distant one-turn gunline", () => {
  const context = loadCandidateContext();
  const me = createMe([3, 5], "right", 0);
  const enemy = createEnemy([4, 18], "left", "boost");

  context.onIdle(me, enemy, {
    frames: 70,
    map: createOpenMap(19, 21),
    star: [4, 5],
  });

  assert.equal(firstCommand(me.actions)?.type, "go");
  assert.equal(context._lastSpeakTag, "star-close");
});

test("shield-main v68 fires an aimed close reply lane before generic gunline exit", () => {
  const context = loadCandidateContext();
  const me = createMe([8, 12], "right", 0);
  const enemy = createEnemy([12, 12], "left", "freeze");

  context.onIdle(me, enemy, {
    frames: 62,
    map: createOpenMap(),
    star: [8, 10],
  });

  assert.equal(firstCommand(me.actions)?.type, "fire");
  assert.equal(context._lastSpeakTag, "gunline-counter");
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

test("shield-main v65 waits a few opening frames before far-star boost", () => {
  const context = loadCandidateContext();
  const me = createMe([2, 2], "down", 0);
  const enemy = createEnemy([16, 12], "left", "boost");

  context.onIdle(me, enemy, {
    frames: 3,
    map: createOpenMap(),
    star: [2, 8],
  });

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

test("shield-main v63 uses active boost free turn then go toward a valuable star route", () => {
  const context = loadCandidateContext();
  const me = createMe([5, 5], "right", 20);
  me.status.boosted = true;
  me.skill.activeRemainingFrames = 4;
  const enemy = createEnemy([16, 12], "left", "boost");

  context.onIdle(me, enemy, {
    frames: 52,
    map: createOpenMap(),
    star: [5, 10],
  });

  assert.deepEqual(commands(me.actions).slice(0, 2), [
    { type: "turn", side: "right" },
    { type: "go" },
  ]);
  assert.equal(context._lastSpeakTag, "boost-turn-go");
});

test("shield-main v69 uses active boost go-turn-fire for a back shot", () => {
  const context = loadCandidateContext();
  const me = createMe([4, 4], "down", 20);
  me.status.boosted = true;
  me.skill.activeRemainingFrames = 4;
  const enemy = createEnemy([8, 6], "right", "boost");

  context.onIdle(me, enemy, {
    frames: 56,
    map: createOpenMap(),
    star: [2, 12],
  });

  assert.deepEqual(commands(me.actions).slice(0, 3), [
    { type: "go" },
    { type: "turn", side: "left" },
    { type: "fire" },
  ]);
  assert.equal(context._lastSpeakTag, "boost-backshot");
});

test("shield-main v69 does not pressure-step into a close one-turn reply lane", () => {
  const context = loadCandidateContext();
  const me = createMe([11, 5], "right", 0);
  const enemy = createEnemy([12, 6], "left", "poison");

  context.onIdle(me, enemy, {
    frames: 17,
    map: createOpenMap(),
    star: null,
  });

  assert.notDeepEqual(firstCommand(me.actions), { type: "go" });
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
