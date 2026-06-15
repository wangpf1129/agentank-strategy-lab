import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const candidatePath = path.resolve("teleport-main-v26-candidate.js");

function loadCandidate() {
  if (!existsSync(candidatePath)) {
    assert.fail("teleport-main-v26-candidate.js should exist");
  }
  const source = readFileSync(candidatePath, "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: candidatePath });
  assert.equal(typeof context.onIdle, "function");
  return context.onIdle;
}

function mapFromRows(rows) {
  return Array.from({ length: rows[0].length }, (_, x) => rows.map((row) => row[x]));
}

function createMe(position, direction = "down", stars = 0) {
  const actions = [];
  return {
    stars,
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

test("teleport-main v26 avoids far star teleports when already leading and enemy can open the pickup lane", () => {
  const onIdle = loadCandidate();
  const map = mapFromRows([
    "xxxxxxxxxxxxxxxxxxx",
    "xx...m...........xx",
    "x.a..mm...........x",
    "x....m.....x.o....x",
    "x....x.....x.o....x",
    "x.oo.x.........x..x",
    "x.m............xxox",
    "xxoo.o.......o.ooxx",
    "xoxx............m.x",
    "x..x.........x.oo.x",
    "x....o.x.....x....x",
    "x....o.x.....m....x",
    "x...........mm..C.x",
    "xx...........m...xx",
    "xxxxxxxxxxxxxxxxxxx",
  ]);
  const me = createMe([4, 6], "down", 6);
  const enemy = {
    stars: 0,
    tank: { position: [8, 10], direction: "left" },
    skill: { type: "shield", remainingCooldownFrames: 18 },
    status: {},
    bullet: null,
  };

  onIdle(me, enemy, {
    frames: 91,
    map,
    star: [14, 11],
  });

  assert.notEqual(me.actions[0]?.type, "teleport");
});
