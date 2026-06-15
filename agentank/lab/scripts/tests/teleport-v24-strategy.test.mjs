import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const candidatePath = path.resolve("teleport-main-v24-candidate.js");

function loadCandidate() {
  if (!existsSync(candidatePath)) {
    assert.fail("teleport-main-v24-candidate.js should exist");
  }
  const source = readFileSync(candidatePath, "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: candidatePath });
  assert.equal(typeof context.onIdle, "function");
  return context.onIdle;
}

function createMe(position, direction = "right") {
  const actions = [];
  return {
    actions,
    tank: { position, direction },
    skill: { type: "teleport", remainingCooldownFrames: 18 },
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

test("teleport-main v24 leaves an immediate enemy firing lane instead of turning to attack", () => {
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

test("teleport-main v24 does not use fallback turns while an enemy bullet crosses the current tile", () => {
  const onIdle = loadCandidate();
  const openMap = Array.from({ length: 19 }, (_, x) => (
    Array.from({ length: 15 }, (_, y) => (x === 0 || y === 0 || x === 18 || y === 14 ? "x" : "."))
  ));
  const me = createMe([11, 6], "right");
  const enemy = {
    tank: { position: [15, 6], direction: "left" },
    skill: { type: "overload", remainingCooldownFrames: 18 },
    status: {},
    bullet: { position: [13, 6], direction: "left" },
  };
  const game = {
    frames: 20,
    map: openMap,
    star: [15, 7],
  };

  onIdle(me, enemy, game);

  assert.notEqual(me.actions[0]?.type, "turn");
});
