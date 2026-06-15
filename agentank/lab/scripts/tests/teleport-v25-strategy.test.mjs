import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const candidatePath = path.resolve("teleport-main-v25-candidate.js");

function loadCandidate() {
  if (!existsSync(candidatePath)) {
    assert.fail("teleport-main-v25-candidate.js should exist");
  }
  const source = readFileSync(candidatePath, "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: candidatePath });
  assert.equal(typeof context.onIdle, "function");
  return context.onIdle;
}

function createMe(position, direction = "right", cooldown = 18) {
  const actions = [];
  return {
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

function createOpenMap(width = 19, height = 15) {
  return Array.from({ length: width }, (_, x) => (
    Array.from({ length: height }, (_, y) => (x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "x" : "."))
  ));
}

test("teleport-main v25 leaves an immediate enemy firing lane instead of turning to attack", () => {
  const onIdle = loadCandidate();
  const columns = [
    "xxxxxxxxxxxxxxx",
    "x..........om.x",
    "x....m.m...m..x",
    "x....o..o..m..x",
    "x..m.o.o.....ox",
    "x...xx.......ox",
    "x..oo..o.mm..ox",
    "x..o.....x....x",
    "x........o....x",
    "x.............x",
    "x....o........x",
    "x....x.....o..x",
    "xo..mm.o..oo..x",
    "xo.......xx...x",
    "xo.....o.o.m..x",
    "x..m..o..o....x",
    "x..m...m.m....x",
    "x.mo..........x",
    "xxxxxxxxxxxxxxx",
  ];
  const me = createMe([11, 6], "right");
  const enemy = {
    tank: { position: [15, 6], direction: "left" },
    skill: { type: "overload", remainingCooldownFrames: 18 },
    status: {},
    bullet: null,
  };
  const game = {
    frames: 20,
    map: columns.map((column) => column.split("")),
    star: [15, 7],
  };

  onIdle(me, enemy, game);

  assert.equal(me.actions[0]?.type, "go");
});

test("teleport-main v25 does not use fallback turns while an enemy bullet crosses the current tile", () => {
  const onIdle = loadCandidate();
  const me = createMe([11, 6], "right");
  const enemy = {
    tank: { position: [15, 6], direction: "left" },
    skill: { type: "overload", remainingCooldownFrames: 18 },
    status: {},
    bullet: { position: [13, 6], direction: "left" },
  };
  const game = {
    frames: 20,
    map: createOpenMap(),
    star: [15, 7],
  };

  onIdle(me, enemy, game);

  assert.notEqual(me.actions[0]?.type, "turn");
});

test("teleport-main v25 keeps searching after an unsafe dodge turn is rejected", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 0);
  const enemy = {
    tank: { position: [13, 5], direction: "left" },
    skill: { type: "shield", remainingCooldownFrames: 18 },
    status: {},
    bullet: { position: [6, 5], direction: "left" },
  };
  const game = {
    frames: 20,
    map: createOpenMap(19, 13),
    star: null,
  };

  onIdle(me, enemy, game);

  assert.equal(me.actions[0]?.type, "teleport");
});

test("teleport-main v25 does not fire while an enemy bullet crosses the current tile", () => {
  const onIdle = loadCandidate();
  const me = createMe([5, 5], "right", 0);
  const enemy = {
    tank: { position: [12, 5], direction: "left" },
    skill: { type: "shield", remainingCooldownFrames: 18 },
    status: {},
    bullet: { position: [6, 5], direction: "left" },
  };
  const game = {
    frames: 20,
    map: createOpenMap(19, 13),
    star: null,
  };

  onIdle(me, enemy, game);

  assert.notEqual(me.actions[0]?.type, "fire");
});
