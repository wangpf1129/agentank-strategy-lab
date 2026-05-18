const DELTA = {
  up: [0, -1],
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
};

const DIRS = ["up", "right", "down", "left"];

function tile(map, x, y) {
  const col = map[x];
  return col ? (col[y] ?? "x") : "x";
}

function blocked(map, x, y) {
  const value = tile(map, x, y);
  return value === "x" || value === "m";
}

function dirTo(from, to) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return dx > 0 ? "right" : "left";
  if (dy !== 0) return dy > 0 ? "down" : "up";
  return "up";
}

function turnCost(from, to) {
  const a = DIRS.indexOf(from);
  const b = DIRS.indexOf(to);
  if (a < 0 || b < 0) return 9;
  return Math.min((b - a + 4) % 4, (a - b + 4) % 4);
}

function losFrom(map, source, facing, target) {
  const step = DELTA[facing];
  if (!step) return false;
  const dx = target[0] - source[0];
  const dy = target[1] - source[1];
  if (step[0] !== 0) {
    if (dy !== 0) return false;
    if ((step[0] > 0 && dx <= 0) || (step[0] < 0 && dx >= 0)) return false;
    for (let x = source[0] + step[0]; x !== target[0]; x += step[0]) {
      if (blocked(map, x, source[1])) return false;
    }
    return true;
  }
  if (dx !== 0) return false;
  if ((step[1] > 0 && dy <= 0) || (step[1] < 0 && dy >= 0)) return false;
  for (let y = source[1] + step[1]; y !== target[1]; y += step[1]) {
    if (blocked(map, source[0], y)) return false;
  }
  return true;
}

function manhattan(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function travelTurns(distance, cellsPerTurn = 2) {
  return Math.ceil(distance / cellsPerTurn);
}

export function createsImmediateFireThreat(map, enemy, target, options = {}) {
  if (!enemy || options.hasActiveBullet) return false;
  if (enemy.position[0] !== target[0] && enemy.position[1] !== target[1]) return false;
  if (manhattan(enemy.position, target) > (options.maxDistance ?? 7)) return false;

  const neededDirection = dirTo(enemy.position, target);
  if (turnCost(enemy.direction, neededDirection) > (options.maxTurnCost ?? 1)) return false;
  return losFrom(map, enemy.position, neededDirection, target);
}

export function overloadShotThreat(map, enemy, target, maxFrames = 4) {
  if (!enemy || !DELTA[enemy.direction]) return false;
  const [dx, dy] = DELTA[enemy.direction];
  const maxDistance = maxFrames * 2;
  const source = enemy.position;
  const sameLane = losFrom(map, source, enemy.direction, target);
  if (sameLane && manhattan(source, target) <= maxDistance) return true;

  const sideOffsets = dx !== 0 ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
  for (const [ox, oy] of sideOffsets) {
    const shiftedSource = [source[0] + ox, source[1] + oy];
    const shiftedTarget = [target[0] - ox, target[1] - oy];
    if (blocked(map, shiftedSource[0], shiftedSource[1])) continue;
    if (losFrom(map, shiftedSource, enemy.direction, target) && manhattan(shiftedSource, target) <= maxDistance) {
      return true;
    }
    if (losFrom(map, source, enemy.direction, shiftedTarget) && manhattan(source, shiftedTarget) <= maxDistance) {
      return true;
    }
  }
  return false;
}

function laneThreatFrom(map, source, facing, target, maxCells) {
  if (!facing || !DELTA[facing]) return false;
  if (!losFrom(map, source, facing, target)) return false;
  return manhattan(source, target) <= maxCells;
}

export function overloadThreatField(map, enemy, target, options = {}) {
  if (!enemy) return false;
  if (!options.active) return overloadShotThreat(map, enemy, target, options.maxFrames ?? 4);

  const maxCells = (options.maxFrames ?? 5) * 2;
  for (const direction of DIRS) {
    const [dx, dy] = DELTA[direction];
    if (laneThreatFrom(map, enemy.position, direction, target, maxCells)) return true;

    const sideOffsets = dx !== 0 ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
    for (const [ox, oy] of sideOffsets) {
      const shiftedSource = [enemy.position[0] + ox, enemy.position[1] + oy];
      if (blocked(map, shiftedSource[0], shiftedSource[1])) continue;
      if (laneThreatFrom(map, shiftedSource, direction, target, maxCells)) return true;
    }
  }
  return false;
}

export function hiddenCorridorThreat({
  currentFrame,
  lastSeenFrame,
  lastPosition,
  moveDir,
  target,
  mapWidth,
  mapHeight,
}) {
  if (!lastPosition || currentFrame - lastSeenFrame > (mapWidth === 16 && mapHeight === 11 ? 34 : 18)) {
    return false;
  }
  const distance = manhattan(lastPosition, target);
  if (distance > (mapWidth === 16 && mapHeight === 11 ? 13 : 9)) return false;
  if (moveDir === "up") return target[0] === lastPosition[0] && target[1] < lastPosition[1];
  if (moveDir === "down") return target[0] === lastPosition[0] && target[1] > lastPosition[1];
  if (moveDir === "left") return target[1] === lastPosition[1] && target[0] < lastPosition[0];
  if (moveDir === "right") return target[1] === lastPosition[1] && target[0] > lastPosition[0];
  return distance <= 4 && (target[0] === lastPosition[0] || target[1] === lastPosition[1]);
}

export function reciprocalFireLosesRace(map, me, enemy, enemyBullet, options = {}) {
  if (!me || !enemy || !enemyBullet) return false;
  if (!losFrom(map, enemyBullet.position, enemyBullet.direction, me.position)) return false;
  if (!losFrom(map, me.position, me.direction, enemy.position)) return false;

  const enemyBulletTurns = travelTurns(manhattan(enemyBullet.position, me.position), options.bulletCellsPerTurn ?? 2);
  const ourBulletTurns = travelTurns(manhattan(me.position, enemy.position), options.bulletCellsPerTurn ?? 2);
  return enemyBulletTurns <= ourBulletTurns;
}

export function postTeleportLaneTrap(map, enemy, target, options = {}) {
  if (!enemy) return false;
  if (enemy.position[0] !== target[0] && enemy.position[1] !== target[1]) return false;
  if (manhattan(enemy.position, target) > (options.maxDistance ?? 12)) return false;

  const neededDirection = dirTo(enemy.position, target);
  if (turnCost(enemy.direction, neededDirection) > (options.maxTurnCost ?? 1)) return false;
  return losFrom(map, enemy.position, neededDirection, target);
}

function starsOf(actor) {
  if (!actor) return 0;
  if (typeof actor.stars === "number") return actor.stars;
  if (typeof actor.score === "number") return actor.score;
  return 0;
}

export function leadProtectionActive({ frame = 0, me, enemy, minLead = 2, minFrame = 35 } = {}) {
  const enemySkill = enemy?.skillType ?? enemy?.skill?.type;
  const requiredLead = enemySkill === "boost" ? Math.min(minLead, 1) : minLead;
  return frame >= minFrame && starsOf(me) - starsOf(enemy) >= requiredLead;
}

export function starRaceNeedsFastRoute({
  lead = 0,
  strictDistance = 999,
  fastDistance = 999,
  enemyDistance = 999,
  enemySkill,
} = {}) {
  if (lead >= 2) return false;
  if (fastDistance >= strictDistance || fastDistance >= 999 || enemyDistance >= 999) return false;
  if (strictDistance <= enemyDistance + 1) return false;
  if (fastDistance > enemyDistance + 1) return false;
  return ["shield", "boost", "teleport", "cloak"].includes(enemySkill) || enemyDistance <= strictDistance;
}
