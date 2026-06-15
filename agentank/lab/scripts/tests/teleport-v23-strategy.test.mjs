import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const candidatePath = path.resolve("teleport-main-v23-candidate.js");

function toColumns(rows) {
  return Array.from({ length: rows[0].length }, (_, x) => rows.map((row) => row[x]));
}

function loadCandidate() {
  if (!existsSync(candidatePath)) {
    assert.fail("teleport-main-v23-candidate.js should exist");
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
    skill: { type: "teleport", remainingCooldownFrames: 0 },
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

test("teleport-main v23 keeps v21 large-random quiet star rush", () => {
  const onIdle = loadCandidate();
  const rows = [
    "xxxxxxxxxxxxxxxxxxx",
    "x..........x......x",
    "x.a..........x....x",
    "x...........m....ox",
    "x.....o.......x.xxx",
    "x.mx..x...........x",
    "x..x..x.......x.m.x",
    "x.oox.........xoo.x",
    "x.m.x.......x..x..x",
    "x...........x..xm.x",
    "xxx.x.......o.....x",
    "xo....m...........x",
    "x....x..........C.x",
    "x......x..........x",
    "xxxxxxxxxxxxxxxxxxx",
  ];
  const me = createMe([2, 2], "right");
  const game = {
    frames: 32,
    map: toColumns(rows),
    star: [16, 13],
  };

  onIdle(me, null, game);

  assert.equal(me.actions[0]?.type, "teleport");
  assert.ok(Math.abs(me.actions[0].position[0] - 16) + Math.abs(me.actions[0].position[1] - 13) <= 2);
});

test("teleport-main v23 treats dense star-side grass as an ambush anchor", () => {
  const onIdle = loadCandidate();
  const rows = [
    "xxxxxxxxxxxx",
    "x..........x",
    "x.a........x",
    "x....ooo...x",
    "x....o.o...x",
    "x....ooo...x",
    "x..........x",
    "x..........x",
    "x.......C..x",
    "x..........x",
    "x..........x",
    "xxxxxxxxxxxx",
  ];
  const star = [6, 4];
  const me = createMe([2, 2]);
  const enemy = {
    tank: { position: [8, 8], direction: "left" },
    skill: { type: "boost", remainingCooldownFrames: 18 },
    status: {},
    bullet: null,
  };
  const game = {
    frames: 24,
    map: toColumns(rows),
    star,
  };

  onIdle(me, enemy, game);

  assert.equal(me.actions[0]?.type, "teleport");
  const [x, y] = me.actions[0].position;
  assert.equal(game.map[x][y], "o");
  assert.ok(Math.abs(x - star[0]) + Math.abs(y - star[1]) <= 2);
  assert.notDeepEqual(me.actions[0].position, star);
});
