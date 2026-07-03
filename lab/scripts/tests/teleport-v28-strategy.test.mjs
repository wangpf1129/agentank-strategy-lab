import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const candidatePath = path.resolve("active/teleport-main.js");

function loadCandidate() {
  if (!existsSync(candidatePath)) {
    assert.fail("active/teleport-main.js should exist");
  }
  const source = readFileSync(candidatePath, "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: candidatePath });
  assert.equal(typeof context.onIdle, "function");
  return context.onIdle;
}

function createOpenMap(width = 19, height = 15) {
  return Array.from({ length: width }, (_, x) => (
    Array.from({ length: height }, (_, y) => (x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "x" : "."))
  ));
}

function mapFromColumns(columns) {
  return columns.map((column) => column.split(""));
}

function createMe(position, direction = "up", cooldown = 0) {
  const actions = [];
  return {
    stars: 0,
    actions,
    tank: { position, direction },
    skill: { type: "teleport", remainingCooldownFrames: cooldown },
    status: { fireLocked: false },
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
    teleport(x, y) {
      actions.push({ type: "teleport", position: [x, y] });
    },
  };
}

test("teleport-main v28 teleports to grass only when it controls the predicted enemy route", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  for (const [x, y] of [[10, 7], [10, 8], [11, 7], [11, 8], [12, 8]]) {
    map[x][y] = "o";
  }
  const me = createMe([2, 12], "up", 0);
  const enemy = {
    stars: 0,
    tank: { position: [16, 10], direction: "up" },
    skill: { type: "freeze", remainingCooldownFrames: 18 },
    status: {},
    bullet: null,
  };

  onIdle(me, enemy, {
    frames: 18,
    map,
    star: [16, 7],
  });

  assert.equal(me.actions[0]?.type, "teleport");
  assert.equal(map[me.actions[0].position[0]][me.actions[0].position[1]], "o");
});

test("teleport-main v28 opens with a grass route ambush instead of plain star rushing", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  for (const [x, y] of [[12, 10], [11, 10], [12, 9], [13, 10]]) {
    map[x][y] = "o";
  }
  const me = createMe([2, 2], "up", 0);
  const enemy = {
    stars: 0,
    tank: { position: [16, 12], direction: "down" },
    skill: { type: "overload", remainingCooldownFrames: 18 },
    status: {},
    bullet: null,
  };

  onIdle(me, enemy, {
    frames: 1,
    map,
    star: [10, 11],
  });

  assert.equal(me.actions[0]?.type, "teleport");
  assert.equal(map[me.actions[0].position[0]][me.actions[0].position[1]], "o");
});

test("teleport-main v28 can choose a distant opening grass trap on a Fei-Fei style random map", () => {
  const onIdle = loadCandidate();
  const map = mapFromColumns([
    "xxxxxxxxxxxxxxx",
    "x.............x",
    "x.....mom.....x",
    "x......o......x",
    "x........o....x",
    "x.x.oo.xx....mx",
    "x......ooox...x",
    "x....mx.o.o...x",
    "x.............x",
    "x.............x",
    "x.............x",
    "x...o.oxxm....x",
    "x...xooo......x",
    "xm....xx.oo.x.x",
    "x....o........x",
    "x......o......x",
    "x.....mom.....x",
    "x.............x",
    "xxxxxxxxxxxxxxx",
  ]);
  const me = createMe([2, 2], "up", 0);
  const enemy = {
    stars: 0,
    tank: { position: [16, 12], direction: "down" },
    skill: { type: "teleport", remainingCooldownFrames: 0 },
    status: {},
    bullet: null,
  };

  onIdle(me, enemy, {
    frames: 1,
    map,
    star: [2, 3],
  });

  assert.equal(me.actions[0]?.type, "teleport");
  assert.equal(map[me.actions[0].position[0]][me.actions[0].position[1]], "o");
  assert.notDeepEqual(me.actions[0].position, [2, 3]);
});

test("teleport-main v28 does not repeat the early random-map lane crash teleport", () => {
  const onIdle = loadCandidate();
  const map = mapFromColumns([
    "xxxxxxxxxxxxxxx",
    "x.......x.....x",
    "x....o......m.x",
    "x......o..mm..x",
    "x........o....x",
    "x..o.....ox...x",
    "x.....oo..o.xox",
    "x...x.o.x.....x",
    "x.............x",
    "x.............x",
    "x.............x",
    "x.....xoo.x...x",
    "xox.o..oo.....x",
    "x...xo.....o..x",
    "x....o........x",
    "x..mm..o......x",
    "x.m......o....x",
    "x.....x.......x",
    "xxxxxxxxxxxxxxx",
  ]);
  const me = createMe([2, 2], "up", 0);
  const enemy = {
    stars: 0,
    tank: { position: [16, 12], direction: "down" },
    skill: { type: "stun", remainingCooldownFrames: 18 },
    status: {},
    bullet: null,
  };

  onIdle(me, enemy, {
    frames: 1,
    map,
    star: [17, 13],
  });

  assert.notDeepEqual(me.actions[0], { type: "teleport", position: [17, 7] });
});

test("teleport-main v28 does not take a distant opening grass trap when overload can win the star first", () => {
  const onIdle = loadCandidate();
  const map = mapFromColumns([
    "xxxxxxxxxxxxxxx",
    "xx........o..xx",
    "x..........xx.x",
    "x.......x.....x",
    "x......oo...o.x",
    "x.......x...o.x",
    "x........x....x",
    "x.....x..xx..xx",
    "x.............x",
    "x.............x",
    "x.............x",
    "xx..xx..x.....x",
    "x....x........x",
    "x.o...x.......x",
    "x.o...oo......x",
    "x.....x.......x",
    "x.xx..........x",
    "xx..o........xx",
    "xxxxxxxxxxxxxxx",
  ]);
  const me = createMe([2, 2], "up", 0);
  const enemy = {
    stars: 0,
    tank: { position: [16, 12], direction: "down" },
    skill: { type: "overload", remainingCooldownFrames: 0 },
    status: {},
    bullet: null,
  };

  onIdle(me, enemy, {
    frames: 1,
    map,
    star: [12, 12],
  });

  assert.notDeepEqual(me.actions[0], { type: "teleport", position: [14, 7] });
});

test("teleport-main v28 fires from grass at an enemy route intercept", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  map[10][7] = "o";
  const me = createMe([10, 7], "right", 18);
  const enemy = {
    stars: 0,
    tank: { position: [16, 10], direction: "up" },
    skill: { type: "freeze", remainingCooldownFrames: 18 },
    status: {},
    bullet: null,
  };

  onIdle(me, enemy, {
    frames: 30,
    map,
    star: [16, 7],
  });

  assert.equal(me.actions[0]?.type, "fire");
});

test("teleport-main v28 does not escape by stepping deeper into an adjacent firing lane", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  const me = createMe([5, 13], "up", 18);
  const enemy = {
    stars: 2,
    tank: { position: [5, 11], direction: "down" },
    skill: { type: "stun", remainingCooldownFrames: 18 },
    status: {},
    bullet: null,
  };

  onIdle(me, enemy, {
    frames: 115,
    map,
    star: [1, 1],
  });

  assert.notEqual(me.actions[0]?.type, "go");
  assert.equal(me.actions[0]?.type, "fire");
});
