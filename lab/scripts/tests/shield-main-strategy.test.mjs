import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const candidatePath = path.resolve("active/shield-main.js");

function loadCandidate() {
  if (!existsSync(candidatePath)) {
    assert.fail("active/shield-main.js should exist");
  }
  const source = readFileSync(candidatePath, "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: candidatePath });
  assert.equal(typeof context.onIdle, "function");
  return context.onIdle;
}

function loadCandidateContext() {
  if (!existsSync(candidatePath)) {
    assert.fail("active/shield-main.js should exist");
  }
  const source = readFileSync(candidatePath, "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: candidatePath });
  assert.equal(typeof context.onIdle, "function");
  return context;
}

function createOpenMap(width = 13, height = 11) {
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
    skill: { type: "shield", remainingCooldownFrames: cooldown },
    status: {
      shielded: false,
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
    shield() {
      actions.push({ type: "shield" });
    },
    throwBomb() {
      actions.push({ type: "bomb" });
    },
  };
}

function createEnemy(position, direction = "left", skill = "freeze") {
  return {
    stars: 0,
    tank: { id: 99, position, direction },
    skill: { type: skill, remainingCooldownFrames: 12 },
    status: {},
    bullet: null,
  };
}

function cloneMap(map) {
  return map.map((column) => [...column]);
}

test("shield-main uses shield before a visible bullet crosses the current tile", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 0);
  const enemy = createEnemy([9, 8], "left");
  enemy.bullet = { position: [5, 3], direction: "down" };

  onIdle(me, enemy, {
    frames: 20,
    map: createOpenMap(),
    star: [9, 5],
  });

  assert.equal(me.actions[0]?.type, "shield");
});

test("shield-main still takes an adjacent safe star instead of over-defending", () => {
  const onIdle = loadCandidate();
  const me = createMe([2, 2], "right", 0);
  const enemy = createEnemy([10, 8], "left");

  onIdle(me, enemy, {
    frames: 8,
    map: createOpenMap(),
    star: [3, 2],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main fires when it has a clear unshielded shot", () => {
  const onIdle = loadCandidate();
  const me = createMe([2, 2], "right", 0);
  const enemy = createEnemy([6, 2], "up");

  onIdle(me, enemy, {
    frames: 12,
    map: createOpenMap(),
    star: [8, 8],
  });

  assert.equal(me.actions[0]?.type, "fire");
});

test("shield-main emits danmaku speech without consuming the action", () => {
  const onIdle = loadCandidate();
  const me = createMe([2, 2], "right", 0);
  me.speeches = [];
  me.speak = (text) => me.speeches.push(text);
  const enemy = createEnemy([6, 2], "up");

  onIdle(me, enemy, {
    frames: 12,
    map: createOpenMap(),
    star: [8, 8],
  });

  assert.equal(me.actions[0]?.type, "fire");
  assert.equal(me.speeches.length, 1);
  assert.ok(me.speeches[0].length <= 40);
});

test("shield-main handles future bullet danger before taking a clear shot", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 8], "right", 0);
  const enemy = createEnemy([10, 8], "left");
  enemy.bullet = { position: [5, 1], direction: "down" };

  onIdle(me, enemy, {
    frames: 18,
    map: createOpenMap(13, 13),
    star: [11, 8],
  });

  assert.notEqual(me.actions[0]?.type, "fire");
  assert.ok(["shield", "turn", "go"].includes(me.actions[0]?.type));
});

test("shield-main counterfires while a fresh shield covers a close lane", () => {
  const context = loadCandidateContext();
  context._lastShieldAt = 16;
  const me = createMe([7, 7], "down", 20);
  me.status.shielded = true;
  const enemy = createEnemy([7, 10], "up", "poison");
  enemy.bullet = { position: [7, 9], direction: "up" };

  context.onIdle(me, enemy, {
    frames: 17,
    map: createOpenMap(19, 15),
    star: [7, 9],
  });

  assert.equal(me.actions[0]?.type, "fire");
});

test("shield-main turns into a shielded counter lane instead of drifting away", () => {
  const context = loadCandidateContext();
  context._lastShieldAt = 35;
  const me = createMe([13, 6], "right", 20);
  me.status.shielded = true;
  const enemy = createEnemy([13, 10], "up", "cloak");
  enemy.bullet = { position: [13, 8], direction: "up" };

  context.onIdle(me, enemy, {
    frames: 36,
    map: createOpenMap(19, 15),
    star: [8, 13],
  });

  assert.equal(me.actions[0]?.type, "turn");
});

test("shield-main fires at a last-known cloaked enemy while shielded on the gunline", () => {
  const context = loadCandidateContext();
  context._lastEX = 5;
  context._lastEY = 9;
  context._lastEDir = "up";
  context._lastSeen = 16;
  context._lastShieldAt = 16;
  const me = createMe([5, 5], "down", 20);
  me.status.shielded = true;
  me.skill.activeRemainingFrames = 3;

  context.onIdle(me, { tank: null, skill: { type: "cloak", remainingCooldownFrames: 20 }, status: {}, bullet: null }, {
    frames: 17,
    map: createOpenMap(13, 13),
    star: [10, 10],
  });

  assert.equal(me.actions[0]?.type, "fire");
});

test("shield-main spends late shield frames on gunline pressure instead of fleeing", () => {
  const context = loadCandidateContext();
  context._lastShieldAt = 61;
  const me = createMe([3, 5], "up", 20);
  me.status.shielded = true;
  me.skill.activeRemainingFrames = 2;
  const enemy = createEnemy([7, 5], "left", "cloak");
  enemy.bullet = { position: [5, 5], direction: "left" };

  context.onIdle(me, enemy, {
    frames: 62,
    map: createOpenMap(13, 11),
    star: [10, 5],
  });

  assert.deepEqual(me.actions[0], { type: "turn", side: "right" });
});

test("shield-main breaks a guarded nearby star instead of orbiting the approach", () => {
  const onIdle = loadCandidate();
  const me = createMe([9, 6], "down", 0);
  const enemy = createEnemy([10, 8], "right", "teleport");

  onIdle(me, enemy, {
    frames: 20,
    map: createOpenMap(19, 15),
    star: [10, 7],
  });

  assert.equal(me.actions[0]?.type, "shield");
});

test("shield-main holds a contested star line instead of turning away from the star", () => {
  const onIdle = loadCandidate();
  const me = createMe([9, 6], "left", 20);
  const enemy = createEnemy([8, 7], "right", "freeze");

  onIdle(me, enemy, {
    frames: 70,
    map: createOpenMap(19, 15),
    star: [9, 8],
  });

  assert.deepEqual(me.actions[0], { type: "turn", side: "left" });
});

test("shield-main waits on a contested star line instead of stepping away when already aimed", () => {
  const onIdle = loadCandidate();
  const me = createMe([9, 6], "down", 20);
  const enemy = createEnemy([8, 7], "right", "freeze");

  onIdle(me, enemy, {
    frames: 70,
    map: createOpenMap(19, 15),
    star: [9, 8],
  });

  assert.equal(me.actions.length, 0);
});

test("shield-main steps into a late firing lane instead of idling toward runtime", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "up", 20);
  const enemy = createEnemy([8, 4], "right", "shield");

  onIdle(me, enemy, {
    frames: 110,
    map: createOpenMap(15, 13),
    star: null,
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main keeps its committed panic dodge instead of oscillating back into aim", () => {
  const context = loadCandidateContext();
  context._lastMoveIntent = "left";
  context._lastIntentFrame = 73;
  const me = createMe([12, 4], "right", 25);
  const enemy = createEnemy([12, 13], "up", "poison");
  enemy.bullet = { position: [12, 7], direction: "up" };

  context.onIdle(me, enemy, {
    frames: 74,
    map: createOpenMap(19, 15),
    star: [18, 4],
  });

  assert.equal(context._lastMoveIntent, "left");
  assert.equal(me.actions[0]?.type, "turn");
});

test("shield-main goes straight when already facing off a current bullet lane", () => {
  const onIdle = loadCandidate();
  const me = createMe([16, 4], "right", 20);
  const enemy = createEnemy([16, 12], "up", "shield");
  enemy.bullet = { position: [16, 7], direction: "up" };

  onIdle(me, enemy, {
    frames: 25,
    map: createOpenMap(19, 15),
    star: null,
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main leaves a far same-row bullet lane before firing", () => {
  const context = loadCandidateContext();
  const me = createMe([16, 5], "left", 20);
  const enemy = createEnemy([3, 5], "right", "shield");
  enemy.bullet = { position: [3, 5], direction: "right" };

  context.onIdle(me, enemy, {
    frames: 54,
    map: createOpenMap(19, 15),
    star: [16, 12],
  });

  assert.notEqual(me.actions[0]?.type, "fire");
  assert.ok(["up", "down"].includes(context._lastMoveIntent));
  assert.equal(me.actions[0]?.type, "turn");
});

test("shield-main goes straight when already facing off a close one-turn aim lane", () => {
  const onIdle = loadCandidate();
  const me = createMe([10, 10], "up", 20);
  const enemy = createEnemy([8, 10], "up", "shield");

  onIdle(me, enemy, {
    frames: 61,
    map: createOpenMap(19, 15),
    star: [16, 10],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main moves forward while stunned instead of turning in place under aimed fire", () => {
  const context = loadCandidateContext();
  const map = createOpenMap(19, 15);
  map[6][4] = "x";
  map[7][3] = "x";
  map[7][5] = "x";
  const me = createMe([8, 4], "left", 25);
  me.status.stunned = true;
  const enemy = createEnemy([8, 2], "down", "stun");

  context.onIdle(me, enemy, {
    frames: 60,
    map,
    star: [9, 4],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main does not waste a shot into an active enemy shield", () => {
  const onIdle = loadCandidate();
  const me = createMe([2, 2], "right", 0);
  const enemy = createEnemy([6, 2], "left");
  enemy.status.shielded = true;

  onIdle(me, enemy, {
    frames: 12,
    map: createOpenMap(),
    star: [8, 8],
  });

  assert.notEqual(me.actions[0]?.type, "fire");
});

test("shield-main turns toward a clear same-line enemy before firing", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 25);
  const enemy = createEnemy([5, 2], "left");

  onIdle(me, enemy, {
    frames: 28,
    map: createOpenMap(13, 13),
    star: [10, 10],
  });

  assert.equal(me.actions[0]?.type, "turn");
});

test("shield-main shields before firing in a point-blank reciprocal duel", () => {
  const onIdle = loadCandidate();
  const me = createMe([11, 2], "right", 0);
  const enemy = createEnemy([12, 2], "left", "poison");

  onIdle(me, enemy, {
    frames: 62,
    map: createOpenMap(19, 15),
    star: null,
  });

  assert.equal(me.actions[0]?.type, "shield");
});

test("shield-main shields before a long reciprocal gunline when behind", () => {
  const onIdle = loadCandidate();
  const me = createMe([2, 9], "right", 0);
  me.stars = 0;
  const enemy = createEnemy([15, 9], "left", "teleport");
  enemy.stars = 2;

  onIdle(me, enemy, {
    frames: 47,
    map: createOpenMap(19, 15),
    star: [10, 12],
  });

  assert.equal(me.actions[0]?.type, "shield");
});

test("shield-main avoids unshielded close reciprocal fire", () => {
  const onIdle = loadCandidate();
  const me = createMe([10, 6], "up", 12);
  const enemy = createEnemy([10, 4], "down");

  onIdle(me, enemy, {
    frames: 36,
    map: createOpenMap(19, 15),
    star: [15, 7],
  });

  assert.notEqual(me.actions[0]?.type, "fire");
});

test("shield-main refuses a close aimed duel when it cannot shield and is not ahead", () => {
  const onIdle = loadCandidate();
  const me = createMe([3, 5], "right", 12);
  me.stars = 1;
  const enemy = createEnemy([6, 5], "left", "poison");
  enemy.stars = 2;

  onIdle(me, enemy, {
    frames: 43,
    map: createOpenMap(19, 15),
    star: [12, 12],
  });

  assert.notEqual(me.actions[0]?.type, "fire");
});

test("shield-main dodges a breakable dirt firing lane before the opponent opens it", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap(19, 15);
  map[10][11] = "m";
  const me = createMe([10, 10], "left", 12);
  const enemy = createEnemy([10, 12], "up", "poison");

  onIdle(me, enemy, {
    frames: 38,
    map,
    star: [15, 13],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main treats an expiring shield as unsafe for entering a firing lane", () => {
  const context = loadCandidateContext();
  context._lastShieldAt = 25;
  const me = createMe([11, 11], "down", 20);
  me.status.shielded = true;
  const enemy = createEnemy([16, 12], "left", "poison");

  context.onIdle(me, enemy, {
    frames: 27,
    map: createOpenMap(19, 15),
    star: [11, 12],
  });

  assert.notEqual(me.actions[0]?.type, "go");
});

test("shield-main uses bombs for close non-line traps", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 0);
  const enemy = createEnemy([6, 6], "down");

  onIdle(me, enemy, {
    frames: 35,
    map: createOpenMap(),
    star: null,
  });

  assert.equal(me.actions[0]?.type, "bomb");
});

test("shield-main shoots destructible dirt that blocks a direct star lane", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  map[3][2] = "m";
  const me = createMe([2, 2], "right", 0);
  const enemy = createEnemy([10, 8], "left");

  onIdle(me, enemy, {
    frames: 30,
    map,
    star: [6, 2],
  });

  assert.equal(me.actions[0]?.type, "fire");
});

test("shield-main leaves its own pending bomb blast instead of walking the star path", () => {
  const context = loadCandidateContext();
  context._ownBombX = 5;
  context._ownBombY = 5;
  context._ownBombExplodeAt = 44;
  const me = createMe([5, 4], "down", 25);
  const enemy = createEnemy([10, 8], "left");

  context.onIdle(me, enemy, {
    frames: 40,
    map: createOpenMap(13, 13),
    star: [5, 8],
  });

  assert.notEqual(me.actions[0]?.type, "go");
});

test("shield-main leaves an imminent own bomb even when the exit has lane pressure", () => {
  const context = loadCandidateContext();
  context._ownBombX = 1;
  context._ownBombY = 8;
  context._ownBombExplodeAt = 120;
  const map = createOpenMap(13, 11);
  map[1][5] = "x";
  const me = createMe([1, 6], "right", 20);
  const enemy = createEnemy([2, 9], "up", "stun");

  context.onIdle(me, enemy, {
    frames: 118,
    map,
    star: [11, 2],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main does not step into a recent hidden grass shooter lane", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap(19, 15);
  map[14][4] = "o";

  const visibleMe = createMe([12, 4], "right", 0);
  onIdle(visibleMe, createEnemy([14, 5], "up"), {
    frames: 13,
    map: cloneMap(map),
    star: [16, 5],
  });

  const threatenedMe = createMe([12, 4], "right", 0);
  onIdle(threatenedMe, { tank: null, skill: { type: "freeze", remainingCooldownFrames: 12 }, status: {}, bullet: null }, {
    frames: 15,
    map,
    star: [16, 5],
  });

  assert.notEqual(threatenedMe.actions[0]?.type, "go");
});

test("shield-main stops chasing a grass firing lane after shield expires", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap(19, 15);
  map[12][7] = "o";
  map[12][8] = "o";

  const visibleMe = createMe([15, 7], "right", 25);
  onIdle(visibleMe, createEnemy([13, 8], "left"), {
    frames: 45,
    map: cloneMap(map),
    star: null,
  });

  const expiredMe = createMe([15, 7], "right", 25);
  expiredMe.status.shielded = false;
  onIdle(expiredMe, { tank: null, skill: { type: "freeze", remainingCooldownFrames: 12 }, status: {}, bullet: null }, {
    frames: 49,
    map,
    star: null,
  });

  assert.notEqual(expiredMe.actions[0]?.type, "go");
});

test("shield-main remembers a 41-frame teleport grass reveal instead of stepping into the bait lane", () => {
  const context = loadCandidateContext();
  context._lastEX = 4;
  context._lastEY = 7;
  context._lastEDir = "down";
  context._lastSeen = 20;
  const map = createOpenMap(19, 15);
  map[4][7] = "o";
  const me = createMe([5, 8], "left", 0);

  context.onIdle(me, { tank: null, skill: { type: "teleport", remainingCooldownFrames: 20 }, status: {}, bullet: null, stars: 0 }, {
    frames: 62,
    map,
    star: [14, 6],
  });

  assert.notEqual(me.actions[0]?.type, "go");
});

test("shield-main shields before taking a star covered by a grass camper", () => {
  const context = loadCandidateContext();
  context._lastEX = 8;
  context._lastEY = 6;
  context._lastEDir = "left";
  context._lastSeen = 20;
  const map = createOpenMap(13, 11);
  map[8][6] = "o";
  map[5][6] = "o";
  const me = createMe([5, 5], "down", 0);

  context.onIdle(me, { tank: null, skill: { type: "teleport", remainingCooldownFrames: 20 }, status: {}, bullet: null, stars: 0 }, {
    frames: 24,
    map,
    star: [5, 6],
  });

  assert.equal(me.actions[0]?.type, "shield");
});

test("shield-main holds a lead instead of chasing a far star through grass ambush pressure", () => {
  const context = loadCandidateContext();
  context._lastEX = 11;
  context._lastEY = 7;
  context._lastEDir = "right";
  context._lastSeen = 60;
  const map = createOpenMap(19, 15);
  map[11][7] = "o";
  const me = createMe([13, 6], "right", 0);
  me.stars = 2;
  const enemy = { tank: null, skill: { type: "teleport", remainingCooldownFrames: 20 }, status: {}, bullet: null, stars: 0 };

  context.onIdle(me, enemy, {
    frames: 70,
    map,
    star: [16, 10],
  });

  assert.equal(me.actions.length, 0);
});

test("shield-main prioritizes teleport star interception over distant star chasing", () => {
  const context = loadCandidateContext();
  const me = createMe([2, 5], "right", 20);
  me.speeches = [];
  me.speak = (text) => me.speeches.push(text);
  const enemy = createEnemy([9, 8], "up", "teleport");

  context.onIdle(me, enemy, {
    frames: 50,
    map: createOpenMap(13, 11),
    star: [10, 5],
  });

  assert.equal(me.actions[0]?.type, "go");
  assert.equal(context._lastSpeakTag, "intercept");
});

test("shield-main fires down a lost teleport star lane instead of walking into the pickup", () => {
  const onIdle = loadCandidate();
  const me = createMe([13, 5], "left", 20);
  me.stars = 1;
  const enemy = createEnemy([8, 7], "up", "teleport");
  enemy.stars = 3;
  enemy.skill.remainingCooldownFrames = 0;

  onIdle(me, enemy, {
    frames: 84,
    map: createOpenMap(19, 15),
    star: [8, 5],
  });

  assert.equal(me.actions[0]?.type, "fire");
});

test("shield-main does not treat a wall-blocked column as a star-line intercept", () => {
  const context = loadCandidateContext();
  const map = createOpenMap(19, 15);
  map[14][7] = "x";
  map[15][7] = "x";
  const me = createMe([14, 6], "left", 20);
  me.speeches = [];
  me.speak = (text) => me.speeches.push(text);
  const enemy = createEnemy([16, 12], "left", "freeze");

  context.onIdle(me, enemy, {
    frames: 24,
    map,
    star: [14, 9],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main keeps moving toward a close contested star instead of oscillating turns", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 1], "right", 20);
  const enemy = createEnemy([8, 4], "left", "teleport");
  enemy.skill.remainingCooldownFrames = 0;

  onIdle(me, enemy, {
    frames: 114,
    map: createOpenMap(19, 15),
    star: [8, 2],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main skips late dirt shots that do not shorten the star route", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap(19, 15);
  map[8][1] = "m";
  const me = createMe([8, 2], "up", 20);
  const enemy = createEnemy([4, 5], "left", "stun");

  onIdle(me, enemy, {
    frames: 121,
    map,
    star: [15, 4],
  });

  assert.notEqual(me.actions[0]?.type, "fire");
});

test("shield-main creates early safe lane pressure instead of empty movement", () => {
  const context = loadCandidateContext();
  const me = createMe([5, 5], "up", 20);
  me.speeches = [];
  me.speak = (text) => me.speeches.push(text);
  const enemy = createEnemy([8, 4], "right", "teleport");

  context.onIdle(me, enemy, {
    frames: 18,
    map: createOpenMap(13, 11),
    star: null,
  });

  assert.equal(me.actions[0]?.type, "go");
  assert.equal(context._lastSpeakTag, "pressure");
});

test("shield-main moves into nearby grass control instead of chasing a far star while well ahead", () => {
  const context = loadCandidateContext();
  const map = createOpenMap(19, 15);
  map[11][6] = "o";
  const me = createMe([10, 6], "right", 20);
  me.stars = 5;
  me.speeches = [];
  me.speak = (text) => me.speeches.push(text);
  const enemy = createEnemy([7, 1], "right", "freeze");
  enemy.stars = 1;

  context.onIdle(me, enemy, {
    frames: 118,
    map,
    star: [13, 11],
  });

  assert.equal(me.actions[0]?.type, "go");
  assert.equal(context._lastSpeakTag, "lead-grass");
});

test("shield-main does not spend shield on a low-value dangerous adjacent star while far ahead", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 0);
  me.stars = 5;
  const enemy = createEnemy([6, 8], "up", "freeze");
  enemy.stars = 1;

  onIdle(me, enemy, {
    frames: 96,
    map: createOpenMap(13, 11),
    star: [6, 5],
  });

  assert.notEqual(me.actions[0]?.type, "shield");
});

test("shield-main exits a post-shield same-lane threat instead of holding the lead on the gun line", () => {
  const context = loadCandidateContext();
  context._lastShieldAt = 63;
  context._lastShieldedAt = 66;
  const me = createMe([12, 4], "right", 20);
  me.stars = 2;
  const enemy = createEnemy([11, 4], "right", "freeze");
  enemy.stars = 1;

  context.onIdle(me, enemy, {
    frames: 67,
    map: createOpenMap(19, 15),
    star: null,
  });

  assert.notDeepEqual(me.actions[0], { type: "go" });
  assert.ok(["turn", "shield"].includes(me.actions[0]?.type));
});
