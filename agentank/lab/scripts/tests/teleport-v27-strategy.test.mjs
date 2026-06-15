import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const candidatePath = path.resolve("teleport-main-v27-candidate.js");

function loadCandidate() {
  if (!existsSync(candidatePath)) {
    assert.fail("teleport-main-v27-candidate.js should exist");
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

function mapFromRows(rows) {
  return Array.from({ length: rows[0].length }, (_, x) => rows.map((row) => row[x]));
}

function addGrassCluster(map) {
  for (const [x, y] of [[9, 7], [9, 8], [10, 6], [10, 7], [10, 8], [11, 7], [11, 8], [12, 8]]) {
    map[x][y] = "o";
  }
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

test("teleport-main v27 takes a grass anchor before quiet-rushing a distant star", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  addGrassCluster(map);
  const me = createMe([2, 11], "up", 0);
  const enemy = {
    stars: 0,
    tank: { position: [14, 12], direction: "up" },
    skill: { type: "freeze", remainingCooldownFrames: 18 },
    status: {},
    bullet: null,
  };

  onIdle(me, enemy, {
    frames: 30,
    map,
    star: [15, 7],
  });

  assert.equal(me.actions[0]?.type, "teleport");
  assert.equal(map[me.actions[0].position[0]][me.actions[0].position[1]], "o");
});

test("teleport-main v27 fires from a wider grass guard band", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  addGrassCluster(map);
  const me = createMe([10, 7], "right", 18);
  const enemy = {
    stars: 0,
    tank: { position: [16, 9], direction: "up" },
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

test("teleport-main v27 does not use the wider grass-control anchor before frame 30", () => {
  const onIdle = loadCandidate();
  const map = createOpenMap();
  addGrassCluster(map);
  const me = createMe([2, 11], "up", 0);
  const enemy = {
    stars: 0,
    tank: { position: [14, 12], direction: "up" },
    skill: { type: "freeze", remainingCooldownFrames: 18 },
    status: {},
    bullet: null,
  };

  onIdle(me, enemy, {
    frames: 20,
    map,
    star: [15, 7],
  });

  if (me.actions[0]?.type === "teleport") {
    assert.notEqual(map[me.actions[0].position[0]][me.actions[0].position[1]], "o");
  }
});
