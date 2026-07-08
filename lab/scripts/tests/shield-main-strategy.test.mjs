import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const candidatePath = path.resolve("active/shield-main.js");

function readCandidateSource() {
  if (!existsSync(candidatePath)) {
    assert.fail("active/shield-main.js should exist");
  }
  return readFileSync(candidatePath, "utf8");
}

function readStrategyPipelineEntries() {
  const source = readCandidateSource();
  const baseMatch = source.match(/function buildBaseStrategyModules\(\) \{[\s\S]*?return \{([\s\S]*?)\};\n  \}/);
  const shieldMatch = source.match(/function buildShieldSkillModules\(\) \{[\s\S]*?return \{([\s\S]*?)\};\n  \}/);
  assert.ok(baseMatch, "buildBaseStrategyModules should return a static module map");
  assert.ok(shieldMatch, "buildShieldSkillModules should return a static module map");
  const factoryEntries = new Map();
  for (const [owner, block] of [["base", baseMatch[1]], ["shield", shieldMatch[1]]]) {
    for (const [, key, layer, id, run] of block.matchAll(/([A-Za-z0-9_]+): strategyModule\("([^"]+)", "([^"]+)", ([A-Za-z0-9_]+)\)/g)) {
      factoryEntries.set(`${owner}.${key}`, { layer, id, run });
    }
  }

  const match = source.match(/function buildStrategyPipeline\(\) \{[\s\S]*?return \[([\s\S]*?)\];\n  \}/);
  assert.ok(match, "buildStrategyPipeline should return a static module list");
  const block = match[1];
  const entries = [...block.matchAll(/\b(base|shield)\.([A-Za-z0-9_]+)/g)]
    .map(([, owner, key]) => {
      const entry = factoryEntries.get(`${owner}.${key}`);
      assert.ok(entry, `pipeline entry ${owner}.${key} should exist in module factories`);
      return entry;
    });
  return { source, block, entries, baseBlock: baseMatch[1], shieldBlock: shieldMatch[1] };
}

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

function createBoostMe(position, direction = "right", cooldown = 0) {
  const me = createMe(position, direction, cooldown);
  me.skill = { type: "boost", remainingCooldownFrames: cooldown };
  me.status.boosted = false;
  me.boost = function () {
    me.actions.push({ type: "boost" });
  };
  return me;
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

test("shield-main boost confirmed shot fires before far-star value drift", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([2, 2], "right", 20);
  const enemy = createEnemy([7, 2], "up", "freeze");

  onIdle(me, enemy, {
    frames: 54,
    map: createOpenMap(13, 11),
    star: [2, 8],
  });

  assert.equal(me.actions[0]?.type, "fire");
});

test("shield-main still takes an adjacent safe star before boost confirmed fire", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([5, 5], "down", 20);
  const enemy = createEnemy([9, 5], "up", "freeze");

  onIdle(me, enemy, {
    frames: 54,
    map: createOpenMap(13, 11),
    star: [5, 6],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main takes a safe near-star route through star-tempo arbitration", () => {
  const onIdle = loadCandidate();
  const me = createMe([2, 2], "right", 0);
  const enemy = createEnemy([10, 8], "left");

  onIdle(me, enemy, {
    frames: 12,
    map: createOpenMap(13, 11),
    star: [2, 4],
  });

  assert.deepEqual(me.actions[0], { type: "turn", side: "right" });
});

test("shield-main shields before committing through a covered near-star route", () => {
  const onIdle = loadCandidate();
  const me = createMe([2, 2], "down", 0);
  const enemy = createEnemy([5, 3], "left");

  onIdle(me, enemy, {
    frames: 16,
    map: createOpenMap(13, 11),
    star: [2, 4],
  });

  assert.equal(me.actions[0]?.type, "shield");
});

test("shield-main casts boost before a valuable medium star race", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([2, 2], "right", 0);
  const enemy = createEnemy([10, 8], "left");

  onIdle(me, enemy, {
    frames: 12,
    map: createOpenMap(13, 11),
    star: [2, 6],
  });

  assert.equal(me.actions[0]?.type, "boost");
});

test("shield-main casts boost for an opening diagonal star route against a mobile opponent", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([2, 2], "up", 0);
  const enemy = createEnemy([16, 12], "down", "boost");

  onIdle(me, enemy, {
    frames: 1,
    map: createOpenMap(19, 15),
    star: [9, 7],
  });

  assert.equal(me.actions[0]?.type, "boost");
});

test("shield-main does not hard-veto a valuable folded boost star route by shape alone", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap(15, 13);
  map[4][2] = "x";
  const me = createBoostMe([2, 2], "right", 0);
  const enemy = createEnemy([13, 10], "left", "boost");

  onIdle(me, enemy, {
    frames: 6,
    map,
    star: [8, 5],
  });

  assert.equal(me.actions[0]?.type, "boost");
});

test("shield-main does not boost into a wall-capped opening star route", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap(19, 15);
  map[12][2] = "x";
  map[12][3] = "o";
  const me = createBoostMe([3, 2], "right", 0);
  const enemy = createEnemy([14, 10], "right", "boost");
  enemy.status.boosted = true;

  onIdle(me, enemy, {
    frames: 3,
    map,
    star: [13, 3],
  });

  assert.notEqual(me.actions[0]?.type, "boost");
});

test("shield-main does not boost an opening folded route against a direct non-mobile star race", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([2, 2], "up", 0);
  const enemy = createEnemy([16, 12], "down", "freeze");

  onIdle(me, enemy, {
    frames: 1,
    map: createOpenMap(19, 15),
    star: [11, 5],
  });

  assert.notEqual(me.actions[0]?.type, "boost");
});

test("shield-main does not cast late boost for an unreachable final star", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([12, 1], "left", 0);
  me.stars = 2;
  const enemy = createEnemy([6, 3], "up", "boost");
  enemy.stars = 2;

  onIdle(me, enemy, {
    frames: 124,
    map: createOpenMap(19, 15),
    star: [1, 2],
  });

  assert.notEqual(me.actions[0]?.type, "boost");
});

test("shield-main can still cast late boost when the final star is reachable", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([10, 8], "right", 0);
  me.stars = 2;
  const enemy = createEnemy([2, 2], "up", "boost");
  enemy.stars = 2;

  onIdle(me, enemy, {
    frames: 122,
    map: createOpenMap(19, 15),
    star: [15, 8],
  });

  assert.equal(me.actions[0]?.type, "boost");
});

test("shield-main advances along the star route while boost is active", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([2, 2], "right", 20);
  me.status.boosted = true;
  const enemy = createEnemy([10, 8], "left");

  onIdle(me, enemy, {
    frames: 14,
    map: createOpenMap(13, 11),
    star: [2, 4],
  });

  assert.deepEqual(me.actions[0], { type: "turn", side: "right" });
});

test("shield-main collects an adjacent star after recent boost instead of replanning away", () => {
  const context = loadCandidateContext();
  context._lastBoostAt = 3;
  const me = createBoostMe([9, 6], "down", 20);
  me.speak = () => {};
  const enemy = createEnemy([15, 7], "left", "poison");
  enemy.stars = 1;

  context.onIdle(me, enemy, {
    frames: 11,
    map: createOpenMap(19, 15),
    star: [9, 7],
  });

  assert.equal(me.actions[0]?.type, "go");
  assert.equal(context._lastSpeakTag, "boost-land");
});

test("shield-main does not force a recent-boost adjacent star through an active bullet", () => {
  const context = loadCandidateContext();
  context._lastBoostAt = 3;
  const me = createBoostMe([9, 6], "down", 20);
  me.speak = () => {};
  const enemy = createEnemy([15, 7], "left", "poison");
  enemy.bullet = { position: [9, 10], direction: "up" };

  context.onIdle(me, enemy, {
    frames: 11,
    map: createOpenMap(19, 15),
    star: [9, 7],
  });

  assert.notEqual(me.actions[0]?.type, "go");
  assert.notEqual(context._lastSpeakTag, "boost-land");
});

test("shield-main does not cast boost while a current bullet lane is urgent", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([2, 2], "right", 0);
  const enemy = createEnemy([10, 8], "left");
  enemy.bullet = { position: [2, 4], direction: "up" };

  onIdle(me, enemy, {
    frames: 16,
    map: createOpenMap(13, 11),
    star: [2, 6],
  });

  assert.notEqual(me.actions[0]?.type, "boost");
});

test("shield-main treats a close enemy firing lane while boosted as hard danger", () => {
  const context = loadCandidateContext();
  const me = createBoostMe([12, 8], "right", 20);
  me.speak = () => {};
  const enemy = createEnemy([10, 8], "right", "freeze");

  context.onIdle(me, enemy, {
    frames: 17,
    map: createOpenMap(19, 15),
    star: [4, 13],
  });

  assert.notEqual(me.actions[0]?.type, "boost");
  assert.equal(context._lastSpeakTag, "dodge");
  assert.ok(["up", "down"].includes(context._lastMoveIntent));
});

test("shield-main dodges a close overload offset firing lane before value movement", () => {
  const context = loadCandidateContext();
  const me = createBoostMe([10, 10], "left", 20);
  me.speak = () => {};
  const enemy = createEnemy([13, 9], "left", "overload");
  enemy.skill.remainingCooldownFrames = 0;

  context.onIdle(me, enemy, {
    frames: 55,
    map: createOpenMap(19, 15),
    star: [12, 10],
  });

  assert.notEqual(me.actions[0]?.type, "boost");
  assert.equal(context._lastSpeakTag, "dodge");
  assert.ok(["up", "down"].includes(context._lastMoveIntent));
});

test("shield-main treats active overload remaining frames as hard offset danger", () => {
  const context = loadCandidateContext();
  const me = createBoostMe([9, 4], "right", 20);
  me.speak = () => {};
  const enemy = createEnemy([11, 3], "left", "overload");
  enemy.skill.remainingCooldownFrames = 18;
  enemy.skill.activeRemainingFrames = 3;

  context.onIdle(me, enemy, {
    frames: 52,
    map: createOpenMap(19, 15),
    star: [9, 6],
  });

  assert.equal(context._lastSpeakTag, "dodge");
  assert.ok(["up", "down"].includes(context._lastMoveIntent));
});

test("shield-main does not cast boost while stun control reverses movement", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([2, 2], "right", 0);
  me.status.stunned = true;
  me.status.reversed = true;
  const enemy = createEnemy([12, 2], "left", "stun");

  onIdle(me, enemy, {
    frames: 2,
    map: createOpenMap(19, 15),
    star: [14, 2],
  });

  assert.notEqual(me.actions[0]?.type, "boost");
});

test("shield-main uses reversed controls for a safe adjacent star pickup", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "left", 20);
  me.status.reversed = true;
  const enemy = createEnemy([10, 8], "left", "stun");

  onIdle(me, enemy, {
    frames: 74,
    map: createOpenMap(13, 11),
    star: [6, 5],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main does not boost a short odd-distance star route that would skip the star", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([5, 6], "up", 0);
  const enemy = createEnemy([11, 9], "left", "boost");

  onIdle(me, enemy, {
    frames: 20,
    map: createOpenMap(15, 13),
    star: [5, 3],
  });

  assert.notEqual(me.actions[0]?.type, "boost");
  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main does not spend boost on a short diagonal star route", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([5, 5], "right", 0);
  const enemy = createEnemy([3, 10], "right", "teleport");

  onIdle(me, enemy, {
    frames: 44,
    map: createOpenMap(13, 11),
    star: [7, 7],
  });

  assert.notEqual(me.actions[0]?.type, "boost");
});

test("shield-main does not boost-control a stable closer star route", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([14, 4], "right", 0);
  me.stars = 2;
  const enemy = createEnemy([7, 7], "right", "boost");
  enemy.stars = 1;

  onIdle(me, enemy, {
    frames: 53,
    map: createOpenMap(19, 15),
    star: [13, 8],
  });

  assert.notEqual(me.actions[0]?.type, "boost");
});

test("shield-main does not boost-control a near star while already closer", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([9, 11], "right", 0);
  me.stars = 3;
  const enemy = createEnemy([15, 12], "left", "teleport");
  enemy.stars = 1;

  onIdle(me, enemy, {
    frames: 74,
    map: createOpenMap(19, 15),
    star: [8, 12],
  });

  assert.notEqual(me.actions[0]?.type, "boost");
});

test("shield-main holds while boosted when moving would pass through a one-step star", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([5, 4], "up", 20);
  me.status.boosted = true;
  me.speeches = [];
  me.speak = (text) => me.speeches.push(text);
  const enemy = createEnemy([11, 9], "left", "boost");

  onIdle(me, enemy, {
    frames: 18,
    map: createOpenMap(15, 13),
    star: [5, 3],
  });

  assert.deepEqual(me.actions, []);
  assert.ok(
    me.speeches.some((text) => ["别冲过星,贴一帧", "加速收住,下一步吃", "落星前一格"].includes(text)),
    "boost landing guard should hold instead of skipping the star",
  );
});

test("shield-main occupies a star-control lane when boost cannot win the direct race", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([3, 7], "down", 20);
  me.speeches = [];
  me.speak = (text) => me.speeches.push(text);
  const enemy = createEnemy([12, 10], "left", "boost");

  onIdle(me, enemy, {
    frames: 50,
    map: createOpenMap(15, 13),
    star: [3, 3],
  });

  assert.deepEqual(me.actions[0], { type: "turn", side: "right" });
  assert.ok(
    me.speeches.some((text) => ["先占星线", "卡住星点", "不追,控星"].includes(text)),
    "boost star-control should explain its lane occupation intent",
  );
});

test("shield-main favors a grass star-control station in a contested boost lane", () => {
  const context = loadCandidateContext();
  const map = createOpenMap(19, 15);
  map[9][8] = "o";
  const me = createBoostMe([10, 6], "left", 20);
  me.speeches = [];
  me.speak = (text) => me.speeches.push(text);
  const enemy = createEnemy([8, 10], "left", "freeze");
  enemy.stars = 1;

  context.onIdle(me, enemy, {
    frames: 50,
    map,
    star: [8, 8],
  });

  assert.equal(me.actions[0]?.type, "go");
  assert.equal(context._lastSpeakTag, "grass-control");
});

test("shield-main still takes an adjacent safe star before grass control", () => {
  const context = loadCandidateContext();
  const map = createOpenMap(13, 11);
  map[5][5] = "o";
  const me = createBoostMe([5, 5], "right", 20);
  me.speeches = [];
  me.speak = (text) => me.speeches.push(text);
  const enemy = createEnemy([10, 8], "left", "boost");

  context.onIdle(me, enemy, {
    frames: 18,
    map,
    star: [6, 5],
  });

  assert.equal(me.actions[0]?.type, "go");
  assert.notEqual(context._lastSpeakTag, "grass-control");
});

test("shield-main does not keep holding boost star-control next to a collectible star", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([7, 8], "right", 20);
  me.speeches = [];
  me.speak = (text) => me.speeches.push(text);
  const enemy = createEnemy([15, 12], "left", "boost");

  onIdle(me, enemy, {
    frames: 18,
    map: createOpenMap(19, 15),
    star: [8, 8],
  });

  assert.equal(me.actions[0]?.type, "go");
  assert.ok(
    !me.speeches.some((text) => ["守住星位", "等对面交路线", "星点我控着"].includes(text)),
    "adjacent star pickup should outrank boost star-control holding",
  );
});

test("shield-main converts an occupied boost star-control lane into pressure fire", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([8, 3], "left", 20);
  const enemy = createEnemy([4, 3], "up", "teleport");
  enemy.stars = 1;
  enemy.status.stunned = true;

  onIdle(me, enemy, {
    frames: 50,
    map: createOpenMap(13, 11),
    star: [5, 3],
  });

  assert.equal(me.actions[0]?.type, "fire");
});

test("shield-main does not let boost star-control override urgent bullet danger", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([3, 7], "down", 20);
  me.speeches = [];
  me.speak = (text) => me.speeches.push(text);
  const enemy = createEnemy([12, 10], "left", "boost");
  enemy.bullet = { position: [3, 9], direction: "up" };

  onIdle(me, enemy, {
    frames: 50,
    map: createOpenMap(15, 13),
    star: [3, 3],
  });

  assert.ok(
    !me.speeches.some((text) => ["先占星线", "卡住星点", "不追,控星"].includes(text)),
    "urgent bullet danger should stay above boost star-control",
  );
});

test("shield-main takes a safe adjacent star before ordinary clear fire", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "down", 20);
  const enemy = createEnemy([9, 5], "left");

  onIdle(me, enemy, {
    frames: 42,
    map: createOpenMap(13, 11),
    star: [5, 6],
  });

  assert.equal(me.actions[0]?.type, "go");
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

  assert.equal(me.actions[0]?.type, "go");
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
  me.skill.activeRemainingFrames = 3;
  const enemy = createEnemy([13, 10], "up", "cloak");
  enemy.bullet = { position: [13, 8], direction: "up" };

  context.onIdle(me, enemy, {
    frames: 36,
    map: createOpenMap(19, 15),
    star: [8, 13],
  });

  assert.equal(me.actions[0]?.type, "turn");
});

test("shield-main treats estimated post-shield close lanes as expiring before turning", () => {
  const context = loadCandidateContext();
  context._lastShieldAt = 44;
  context._lastShieldedAt = 44;
  const me = createMe([9, 3], "right", 20);
  me.status.shielded = true;
  const enemy = createEnemy([9, 4], "up", "poison");

  context.onIdle(me, enemy, {
    frames: 45,
    map: createOpenMap(19, 15),
    star: [13, 13],
  });

  assert.equal(me.actions[0]?.type, "go");
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

test("shield-main does not spend late shield frames on far gunline pressure under an incoming bullet", () => {
  const context = loadCandidateContext();
  context._lastShieldAt = 11;
  const me = createMe([10, 2], "right", 20);
  me.status.shielded = true;
  me.skill.activeRemainingFrames = 2;
  const enemy = createEnemy([10, 9], "up", "shield");
  enemy.bullet = { position: [10, 4], direction: "up" };

  context.onIdle(me, enemy, {
    frames: 14,
    map: createOpenMap(19, 15),
    star: [9, 9],
  });

  assert.notEqual(me.actions[0]?.type, "fire");
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

test("shield-main does not shield-chase a clearly lost star race", () => {
  const context = loadCandidateContext();
  const me = createMe([12, 6], "down", 0);
  me.stars = 0;
  me.speeches = [];
  me.speak = (text) => me.speeches.push(text);
  const enemy = createEnemy([13, 9], "left", "poison");
  enemy.stars = 1;

  context.onIdle(me, enemy, {
    frames: 52,
    map: createOpenMap(19, 15),
    star: [12, 9],
  });

  assert.notEqual(me.actions[0]?.type, "shield");
  assert.equal(me.actions[0]?.type, "fire");
});

test("shield-main exits a post-shield overload lane instead of turning in place", () => {
  const context = loadCandidateContext();
  context._lastShieldAt = 13;
  context._lastShieldedAt = 17;
  const me = createMe([8, 8], "up", 20);
  const enemy = createEnemy([9, 8], "left", "overload");
  enemy.status.overloaded = true;

  context.onIdle(me, enemy, {
    frames: 17,
    map: createOpenMap(19, 15),
    star: [9, 10],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main leaves adjacent one-turn lanes instead of turning after control expires", () => {
  const onIdle = loadCandidate();
  const me = createMe([4, 10], "down", 20);
  const enemy = createEnemy([3, 10], "up", "freeze");

  onIdle(me, enemy, {
    frames: 78,
    map: createOpenMap(13, 13),
    star: [10, 10],
  });

  assert.equal(me.actions[0]?.type, "go");
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

test("shield-main does not go while reversed when the actual reverse cell is unsafe", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap(13, 11);
  map[9][5] = "x";
  const me = createMe([8, 5], "left", 20);
  me.status.reversed = true;
  const enemy = createEnemy([8, 2], "down", "stun");
  enemy.bullet = { position: [8, 2], direction: "down" };

  onIdle(me, enemy, {
    frames: 70,
    map,
    star: [3, 8],
  });

  assert.notEqual(me.actions[0]?.type, "go");
});

test("shield-main uses reversed go when it is the real one-frame bullet-lane exit", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap(13, 11);
  map[7][5] = "x";
  const me = createMe([8, 5], "left", 20);
  me.status.reversed = true;
  const enemy = createEnemy([8, 2], "down", "stun");
  enemy.bullet = { position: [8, 2], direction: "down" };

  onIdle(me, enemy, {
    frames: 70,
    map,
    star: [3, 8],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main does not reverse-walk into a stun-controlled star pin", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([11, 3], "up", 20);
  me.status.stunned = true;
  me.status.reversed = true;
  const enemy = createEnemy([12, 5], "left", "stun");

  onIdle(me, enemy, {
    frames: 18,
    map: createOpenMap(19, 15),
    star: [11, 5],
  });

  assert.notEqual(me.actions[0]?.type, "go");
});

test("shield-main shields an urgent bullet lane before spending a frame turning", () => {
  const onIdle = loadCandidate();
  const me = createMe([8, 8], "up", 0);
  const enemy = createEnemy([8, 2], "down", "freeze");
  enemy.bullet = { position: [8, 5], direction: "down" };

  onIdle(me, enemy, {
    frames: 88,
    map: createOpenMap(13, 11),
    star: [3, 8],
  });

  assert.equal(me.actions[0]?.type, "shield");
});

test("shield-main shields a close skill trap before spending a turn to escape", () => {
  const onIdle = loadCandidate();
  const me = createMe([8, 3], "left", 0);
  const enemy = createEnemy([9, 3], "up", "stun");

  onIdle(me, enemy, {
    frames: 95,
    map: createOpenMap(19, 15),
    star: [2, 8],
  });

  assert.equal(me.actions[0]?.type, "shield");
});

test("shield-main executes the committed side exit before an active shield expires", () => {
  const context = loadCandidateContext();
  context._lastMoveIntent = "left";
  context._lastIntentFrame = 12;
  context._lastShieldAt = 10;
  const me = createMe([9, 12], "left", 20);
  me.status.shielded = true;
  me.skill.activeRemainingFrames = 1;
  const enemy = createEnemy([9, 3], "down", "teleport");
  enemy.bullet = { position: [9, 8], direction: "down" };

  context.onIdle(me, enemy, {
    frames: 13,
    map: createOpenMap(19, 15),
    star: [17, 13],
  });

  assert.equal(me.actions[0]?.type, "go");
  assert.equal(context._lastMoveIntent, "left");
});

test("shield-main uses the expiring shield frame to leave an edge-row bullet lane", () => {
  const context = loadCandidateContext();
  context._lastShieldAt = 24;
  context._lastShieldedAt = 26;
  const me = createMe([2, 1], "down", 20);
  me.status.shielded = true;
  me.skill.activeRemainingFrames = 1;
  const enemy = createEnemy([10, 1], "left", "freeze");
  enemy.bullet = { position: [4, 1], direction: "left" };

  context.onIdle(me, enemy, {
    frames: 27,
    map: createOpenMap(19, 15),
    star: [1, 5],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main does not reverse back into an active bullet lane after stun", () => {
  const context = loadCandidateContext();
  context._lastShieldAt = 53;
  context._lastShieldedAt = 56;
  context._lastMoveIntent = "up";
  context._lastIntentFrame = 58;
  const me = createMe([14, 12], "up", 20);
  me.status.reversed = true;
  const enemy = createEnemy([10, 13], "up", "stun");
  enemy.bullet = { position: [14, 13], direction: "right" };

  context.onIdle(me, enemy, {
    frames: 59,
    map: createOpenMap(19, 15),
    star: [13, 11],
  });

  assert.notEqual(me.actions[0]?.type, "go");
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

test("shield-main close skill-trap tempo shot before escape when already aimed", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([11, 4], "right", 12);
  const enemy = createEnemy([13, 4], "right", "stun");

  onIdle(me, enemy, {
    frames: 16,
    map: createOpenMap(19, 15),
    star: [13, 3],
  });

  assert.equal(me.actions[0]?.type, "fire");
});

test("shield-main turns for a point-blank stun trap shot before reverse drifting", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([14, 3], "right", 12);
  me.status.reversed = true;
  me.stars = 1;
  const enemy = createEnemy([14, 4], "down", "stun");

  onIdle(me, enemy, {
    frames: 14,
    map: createOpenMap(19, 15),
    star: null,
  });

  assert.equal(me.actions[0]?.type, "turn");
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

test("shield-main refuses close bombs without a clean post-bomb escape route", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap(11, 11);
  for (let x = 1; x < 10; x++) {
    for (let y = 1; y < 10; y++) {
      map[x][y] = "x";
    }
  }
  for (let x = 3; x <= 7; x++) map[x][5] = ".";
  const me = createMe([5, 5], "right", 0);
  const enemy = createEnemy([6, 6], "down");

  onIdle(me, enemy, {
    frames: 35,
    map,
    star: null,
  });

  assert.notEqual(me.actions[0]?.type, "bomb");
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

test("shield-main does not re-enter an imminent own bomb blast dead end", () => {
  const context = loadCandidateContext();
  context._ownBombX = 15;
  context._ownBombY = 13;
  context._ownBombExplodeAt = 85;
  const map = createOpenMap(19, 15);
  map[16][12] = "x";
  const me = createMe([16, 13], "right", 20);
  const enemy = createEnemy([8, 3], "left", "freeze");

  context.onIdle(me, enemy, {
    frames: 84,
    map,
    star: [2, 10],
  });

  assert.notEqual(me.actions[0]?.type, "go");
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

test("shield-main shields a reachable cloaked same-row shooter lane", () => {
  const context = loadCandidateContext();
  context._lastEX = 14;
  context._lastEY = 5;
  context._lastEDir = "up";
  context._eMoveDir = "up";
  context._lastSeen = 16;
  context._lastESkill = "cloak";
  const me = createMe([12, 1], "right", 0);
  const enemy = { tank: null, skill: { type: "cloak", remainingCooldownFrames: 20 }, status: {}, bullet: null };

  context.onIdle(me, enemy, {
    frames: 20,
    map: createOpenMap(19, 15),
    star: [5, 8],
  });

  assert.equal(me.actions[0]?.type, "shield");
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

test("shield-main takes a late reachable star before wall-only fire", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([13, 6], "down", 20);
  me.stars = 2;
  const enemy = createEnemy([11, 8], "right", "teleport");
  enemy.stars = 3;
  enemy.skill.remainingCooldownFrames = 16;

  onIdle(me, enemy, {
    frames: 116,
    map: createOpenMap(19, 15),
    star: [13, 9],
  });

  assert.equal(me.actions[0]?.type, "go");
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
    star: [13, 6],
  });

  assert.equal(me.actions[0]?.type, "go");
  assert.equal(context._lastSpeakTag, "lead-grass");
});

test("shield-main fires from a lead grass pressure lane instead of holding empty tempo", () => {
  const context = loadCandidateContext();
  const map = createOpenMap(19, 15);
  map[11][7] = "o";
  const me = createMe([11, 7], "right", 20);
  me.stars = 2;
  const enemy = createEnemy([15, 7], "right", "freeze");
  enemy.stars = 0;

  context.onIdle(me, enemy, {
    frames: 70,
    map,
    star: [2, 5],
  });

  assert.equal(me.actions[0]?.type, "fire");
});

test("shield-main releases stale lead grass instead of holding empty tempo", () => {
  const context = loadCandidateContext();
  const map = createOpenMap(19, 15);
  map[11][7] = "o";
  const me = createMe([11, 7], "right", 20);
  me.stars = 2;
  me.speeches = [];
  me.speak = (text) => me.speeches.push(text);
  const enemy = createEnemy([14, 10], "left", "freeze");
  enemy.stars = 0;

  context.onIdle(me, enemy, {
    frames: 118,
    map,
    star: [14, 6],
  });

  assert.equal(me.actions[0]?.type, "go");
  assert.notEqual(context._lastSpeakTag, "lead-grass");
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

test("shield-main steps out of a post-shield two-turn reply lane", () => {
  const context = loadCandidateContext();
  context._lastShieldAt = 26;
  context._lastShieldedAt = 29;
  const me = createMe([9, 4], "up", 20);
  const enemy = createEnemy([10, 4], "right", "cloak");

  context.onIdle(me, enemy, {
    frames: 31,
    map: createOpenMap(19, 15),
    star: [2, 6],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main resets after a shield pickup instead of bombing into the next reply lane", () => {
  const context = loadCandidateContext();
  context._lastShieldAt = 119;
  context._lastShieldedAt = 121;
  const me = createMe([16, 8], "down", 20);
  me.stars = 3;
  me.status.shielded = true;
  me.skill.activeRemainingFrames = 1;
  const enemy = createEnemy([15, 9], "right", "freeze");
  enemy.stars = 4;

  context.onIdle(me, enemy, {
    frames: 122,
    map: createOpenMap(19, 15),
    star: null,
  });

  assert.equal(me.actions[0]?.type, "turn");
  assert.notEqual(me.actions[0]?.type, "bomb");
});

test("shield-main does not bomb first while leading inside a close skill trap", () => {
  const onIdle = loadCandidate();
  const me = createMe([8, 4], "up", 20);
  me.stars = 2;
  const enemy = createEnemy([9, 5], "up", "stun");
  enemy.stars = 1;

  onIdle(me, enemy, {
    frames: 88,
    map: createOpenMap(15, 13),
    star: null,
  });

  assert.notEqual(me.actions[0]?.type, "bomb");
});

test("shield-main leaves a long aimed gunline before turning for value", () => {
  const onIdle = loadCandidate();
  const me = createMe([7, 3], "up", 20);
  const enemy = createEnemy([15, 3], "left", "freeze");

  onIdle(me, enemy, {
    frames: 39,
    map: createOpenMap(19, 15),
    star: [4, 12],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main uses shield to brawl a clean aimed gunline", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "up", 0);
  const enemy = createEnemy([13, 5], "left", "freeze");

  onIdle(me, enemy, {
    frames: 41,
    map: createOpenMap(19, 15),
    star: [4, 12],
  });

  assert.equal(me.actions[0]?.type, "shield");
});

test("shield-main uses fresh shield frames to turn into a point-blank lane", () => {
  const context = loadCandidateContext();
  context._lastShieldAt = 40;
  context._lastShieldedAt = 41;
  const me = createMe([2, 5], "left", 20);
  me.status.shielded = true;
  me.skill.activeRemainingFrames = 3;
  const enemy = createEnemy([3, 5], "left", "freeze");

  context.onIdle(me, enemy, {
    frames: 41,
    map: createOpenMap(13, 11),
    star: null,
  });

  assert.equal(me.actions[0]?.type, "turn");
});

test("shield-main fires on the last shield frame when already aimed", () => {
  const context = loadCandidateContext();
  context._lastShieldAt = 40;
  context._lastShieldedAt = 43;
  const me = createMe([2, 5], "right", 20);
  me.status.shielded = true;
  me.skill.activeRemainingFrames = 1;
  const enemy = createEnemy([5, 5], "left", "freeze");

  context.onIdle(me, enemy, {
    frames: 43,
    map: createOpenMap(13, 11),
    star: null,
  });

  assert.equal(me.actions[0]?.type, "fire");
});

test("shield-main re-centers from a low-value edge patrol when no star is visible", () => {
  const onIdle = loadCandidate();
  const me = createMe([10, 1], "right", 20);

  onIdle(me, null, {
    frames: 90,
    map: createOpenMap(13, 11),
    star: null,
  });

  assert.equal(me.actions[0]?.type, "turn");
});

test("shield-main exits a close vertical gunline instead of turning in place", () => {
  const onIdle = loadCandidate();
  const me = createMe([16, 12], "right", 20);
  const enemy = createEnemy([16, 10], "down", "poison");

  onIdle(me, enemy, {
    frames: 56,
    map: createOpenMap(19, 15),
    star: [2, 12],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main keeps shield star tempo arbitration split from candidate execution", () => {
  const source = readFileSync(candidatePath, "utf8");
  assert.match(source, /function buildShieldStarTempoFrame\(\)/);
  assert.match(source, /function collectShieldStarTempoCandidates\(tempo\)/);
  assert.match(source, /function runShieldStarRacePressure\(\)/);
  assert.match(source, /var tempo = buildShieldStarTempoFrame\(\);/);
  assert.match(source, /var candidates = collectShieldStarTempoCandidates\(tempo\);/);
});

test("shield-main uses boost route traces as soft scoring and overshoot guards", () => {
  const source = readFileSync(candidatePath, "utf8");
  assert.match(source, /function routeTrace\(start, goal, avoidDanger\)/);
  assert.match(source, /function boostRoutePlan\(route, avoidDanger\)/);
  assert.match(source, /function boostedMoveWouldLeaveStarRoute\(moveDirName\)/);
  assert.doesNotMatch(source, /!plan\.firstBoostClean \|\| plan\.shortTurnSegment/);
  assert.match(source, /var strongRaceNeed = scoreMargin\(\) <= 0 \|\| mobileEnemy/);
});

test("shield-main converts boost tempo into early pressure before far-star walking", () => {
  const onIdle = loadCandidate();
  const me = createBoostMe([5, 5], "up", 20);
  me.stars = 1;
  const enemy = createEnemy([10, 4], "right", "overload");
  enemy.stars = 0;

  onIdle(me, enemy, {
    frames: 30,
    map: createOpenMap(19, 15),
    star: [15, 12],
  });

  assert.equal(me.actions[0]?.type, "go");
});

test("shield-main converts late boost tempo into pressure before runtime drift", () => {
  const context = loadCandidateContext();
  context._lastBoostAt = 71;
  const me = createBoostMe([5, 5], "up", 20);
  me.speak = () => {};
  me.stars = 3;
  const enemy = createEnemy([10, 4], "right", "overload");
  enemy.stars = 2;

  context.onIdle(me, enemy, {
    frames: 84,
    map: createOpenMap(19, 15),
    star: [15, 12],
  });

  assert.equal(me.actions[0]?.type, "go");
  assert.equal(context._lastSpeakTag, "pressure");
});

test("shield-main releases stale boost-tempo star-line hold instead of empty hold", () => {
  const context = loadCandidateContext();
  context._lastBoostAt = 50;
  context._lastX = 4;
  context._lastY = 10;
  context._stuck = 8;
  const me = createBoostMe([4, 10], "left", 20);
  me.speak = () => {};
  me.stars = 1;
  const enemy = createEnemy([3, 13], "left", "freeze");
  enemy.stars = 1;

  context.onIdle(me, enemy, {
    frames: 73,
    map: createOpenMap(19, 15),
    star: [3, 10],
  });

  assert.ok(["go", "turn"].includes(me.actions[0]?.type));
  assert.notEqual(context._lastSpeakTag, "star-line");
});

test("shield-main does not convert boost tempo by entering an already aimed long lane", () => {
  const context = loadCandidateContext();
  context._lastBoostAt = 41;
  const me = createBoostMe([2, 12], "up", 20);
  me.speak = () => {};
  me.stars = 2;
  const enemy = createEnemy([16, 11], "left", "freeze");

  context.onIdle(me, enemy, {
    frames: 61,
    map: createOpenMap(19, 15),
    star: null,
  });

  assert.notEqual(me.actions[0]?.type, "go");
  assert.notEqual(context._lastSpeakTag, "pressure");
});

test("shield-main does not convert boost tempo by entering a two-turn long lane", () => {
  const context = loadCandidateContext();
  const me = createBoostMe([6, 5], "down", 20);
  me.speak = () => {};
  me.stars = 2;
  const enemy = createEnemy([13, 6], "up", "stun");
  enemy.stars = 0;

  context.onIdle(me, enemy, {
    frames: 45,
    map: createOpenMap(19, 15),
    star: [14, 11],
  });

  assert.notEqual(me.actions[0]?.type, "go");
  assert.notEqual(context._lastSpeakTag, "pressure");
});

test("shield-main can spend boost to reach star-control position when direct race is lost", () => {
  const context = loadCandidateContext();
  const me = createBoostMe([2, 5], "right", 0);
  me.speeches = [];
  me.speak = (text) => me.speeches.push(text);
  const enemy = createEnemy([10, 6], "left", "stun");

  context.onIdle(me, enemy, {
    frames: 40,
    map: createOpenMap(19, 15),
    star: [10, 5],
  });

  assert.equal(me.actions[0]?.type, "boost");
  assert.equal(context._lastSpeakTag, "boost-control");
});

test("shield-main keeps panic dodge and positioning scoring separated", () => {
  const source = readFileSync(candidatePath, "utf8");
  assert.match(source, /function tryPanicDodgeSetup\(\)/);
  assert.match(source, /function scoreDodgeDirection\(d, panic\)/);
  assert.match(source, /function chooseDodgeDirection\(panic\)/);
  assert.match(source, /if \(panic && tryPanicDodgeSetup\(\)\) return true;/);
  assert.doesNotMatch(source, /positionalValue\(n\) \* \(panic \?/);
});

test("shield-main keeps action priority in an explicit strategy pipeline", () => {
  const { source, entries } = readStrategyPipelineEntries();
  assert.match(source, /function buildStrategyPipeline\(\)/);
  assert.match(source, /function runStrategyPipeline\(modules\)/);
  assert.match(source, /runStrategyPipeline\(buildStrategyPipeline\(\)\);/);

  const order = entries.map(({ layer, id, run }) => `${layer}:${id}:${run}`);

  assert.deepEqual(order, [
    "L0:hazard-evasion:tryHazardEvasion",
    "L0:emergency-defense:tryEmergencyDefense",
    "L1:skill-trap-lane-reset:trySkillTrapLaneReset",
    "L1:post-shield-reset:tryPostShieldResetGuard",
    "L1:gunline-frame-economy:tryGunlineFrameEconomyGuard",
    "L2:boost-confirmed-shot:tryBoostConfirmedShot",
    "L2:boost-star-tempo:tryBoostStarTempo",
    "L2:late-reachable-star:tryLateReachableStarPickup",
    "L2:boost-tempo-pressure:tryBoostTempoPressure",
    "L2:boost-star-control:tryBoostStarControlPosition",
    "L2:star-tempo-arbiter:tryShieldStarTempoArbiter",
    "L3:immediate-shot:tryImmediateShot",
    "L3:shielded-gunline-pressure:tryShieldedGunlinePressure",
    "L3:shield-counter-pressure:tryShieldCounterPressure",
    "L3:guarded-star-break:tryGuardedStarBreak",
    "L3:grass-star-shield-pickup:tryGrassStarShieldPickup",
    "L3:adjacent-star:tryAdjacentStar",
    "L4:grass-camper-hold:tryGrassCamperHold",
    "L4:lead-grass-control:tryLeadGrassControl",
    "L4:strategic-grass-control:tryStrategicGrassControl",
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
    "L8:low-value-reposition:tryLowValueReposition",
    "L8:patrol:patrol",
  ]);

  const ranks = entries.map(({ layer }) => Number(layer.slice(1)));
  for (let i = 1; i < ranks.length; i++) {
    assert.ok(ranks[i] >= ranks[i - 1], "strategy pipeline layers should be monotonic");
  }
  assert.equal(new Set(entries.map(({ id }) => id)).size, entries.length, "strategy module ids should be unique");
});

test("shield-main separates base strategy modules from shield skill modules", () => {
  const { source, block, baseBlock, shieldBlock } = readStrategyPipelineEntries();
  assert.match(source, /function buildBaseStrategyModules\(\)/);
  assert.match(source, /function buildShieldSkillModules\(\)/);
  assert.match(block, /base\.hazardEvasion/);
  assert.match(block, /shield\.postShieldReset/);
  assert.match(baseBlock, /hazardEvasion: strategyModule\("L0", "hazard-evasion", tryHazardEvasion\)/);
  assert.match(baseBlock, /starPath: strategyModule\("L7", "star-path", tryStarPath\)/);
  assert.match(shieldBlock, /postShieldReset: strategyModule\("L1", "post-shield-reset", tryPostShieldResetGuard\)/);
  assert.match(shieldBlock, /boostConfirmedShot: strategyModule\("L2", "boost-confirmed-shot", tryBoostConfirmedShot\)/);
  assert.match(shieldBlock, /boostStarTempo: strategyModule\("L2", "boost-star-tempo", tryBoostStarTempo\)/);
  assert.match(shieldBlock, /lateReachableStar: strategyModule\("L2", "late-reachable-star", tryLateReachableStarPickup\)/);
  assert.match(shieldBlock, /boostStarControl: strategyModule\("L2", "boost-star-control", tryBoostStarControlPosition\)/);
  assert.match(shieldBlock, /starTempoArbiter: strategyModule\("L2", "star-tempo-arbiter", tryShieldStarTempoArbiter\)/);
  assert.match(shieldBlock, /shieldedGunlinePressure: strategyModule\("L3", "shielded-gunline-pressure", tryShieldedGunlinePressure\)/);
  assert.doesNotMatch(baseBlock, /tryShieldStarTempoArbiter/);
  assert.doesNotMatch(baseBlock, /tryShieldedGunlinePressure/);
  assert.doesNotMatch(shieldBlock, /tryStarPath/);
});

test("shield-main validates strategy pipeline before running modules", () => {
  const source = readCandidateSource();
  assert.match(source, /function strategyLayerRank\(layer\)/);
  assert.match(source, /function strategyModule\(layer, id, run\)/);
  assert.match(source, /function strategyPipelineValid\(modules\)/);
  assert.match(source, /if \(!strategyPipelineValid\(modules\)\) \{/);
  assert.match(
    source,
    /if \(tryHazardEvasion\(\)\) return true;[\s\S]*if \(tryEmergencyDefense\(\)\) return true;[\s\S]*if \(tryDodge\(true\)\) return true;[\s\S]*return patrol\(\);/,
  );
});

test("shield-main activates star tempo arbitration while keeping strategic grass bounded", () => {
  const { source, entries } = readStrategyPipelineEntries();
  assert.match(source, /function tryShieldStarTempoArbiter\(\)/);
  assert.match(source, /function tryBoostStarTempo\(\)/);
  assert.match(source, /function tryBoostStarControlPosition\(\)/);
  assert.match(source, /function tryStrategicGrassControl\(\)/);
  assert.match(source, /function collectBoundedGrassCandidates\(baseStarGap, limit\)/);
  assert.match(source, /var GRASS_SCAN_RADIUS = 4;/);
  assert.match(source, /var candidates = collectBoundedGrassCandidates\(baseStarGap, GRASS_CANDIDATE_LIMIT\);/);
  assert.ok(entries.some((entry) => entry.id === "boost-confirmed-shot" && entry.run === "tryBoostConfirmedShot"));
  assert.ok(entries.some((entry) => entry.id === "boost-star-tempo" && entry.run === "tryBoostStarTempo"));
  assert.ok(entries.some((entry) => entry.id === "boost-star-control" && entry.run === "tryBoostStarControlPosition"));
  assert.ok(entries.some((entry) => entry.id === "star-tempo-arbiter" && entry.run === "tryShieldStarTempoArbiter"));
  assert.ok(entries.some((entry) => entry.id === "strategic-grass-control" && entry.run === "tryStrategicGrassControl"));
  assert.match(source, /return tryGrassCamperHold\(\) \|\| tryLeadGrassControl\(\) \|\| tryStrategicGrassControl\(\);/);
});

test("shield-main patrol does not fire dirt when it is not opening a star route", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap(13, 11);
  map[3][2] = "m";
  const me = createMe([2, 2], "right", 20);

  onIdle(me, null, {
    frames: 90,
    map,
    star: null,
  });

  assert.notEqual(me.actions[0]?.type, "fire");
});
