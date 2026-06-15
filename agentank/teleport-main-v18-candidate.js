var _lastX = -1, _lastY = -1, _stuck = 0;
var _lastEX = -1, _lastEY = -1, _lastEDir = null, _eMoveDir = null, _lastSeen = -99;
var _homeEX = -1, _homeEY = -1;
var _lastESkill = null;
var _myStars = 0, _enemyStars = 0, _lastStarX = -1, _lastStarY = -1;

function onIdle(me, enemy, game) {
  var myPos = me.tank.position;
  var px = myPos[0], py = myPos[1];
  var dir = me.tank.direction;
  var frame = game.frames || 0;
  var dirs = ["up", "right", "down", "left"];
  var dv = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  var w = game.map.length;
  var h = game.map[0] ? game.map[0].length : 0;

  if (px === _lastX && py === _lastY) _stuck++;
  else _stuck = 0;
  _lastX = px; _lastY = py;

  var enemyTank = enemy && enemy.tank;
  var ex = enemyTank ? enemyTank.position[0] : -1;
  var ey = enemyTank ? enemyTank.position[1] : -1;
  var eDir = enemyTank ? enemyTank.direction : null;
  if (enemy && enemy.skill && enemy.skill.type) _lastESkill = enemy.skill.type;
  if (enemyTank) {
    if (_homeEX < 0) { _homeEX = ex; _homeEY = ey; }
    if (_lastEX >= 0) {
      var emx = ex - _lastEX, emy = ey - _lastEY;
      _eMoveDir = emx > 0 ? "right" : emx < 0 ? "left" : emy > 0 ? "down" : emy < 0 ? "up" : _eMoveDir;
    }
    _lastEX = ex; _lastEY = ey; _lastEDir = eDir; _lastSeen = frame;
  } else if (_lastEX >= 0) {
    ex = _lastEX; ey = _lastEY; eDir = _lastEDir || _eMoveDir;
  }

  if (_lastStarX >= 0 && (!game.star || game.star[0] !== _lastStarX || game.star[1] !== _lastStarY)) {
    if (px === _lastStarX && py === _lastStarY) _myStars++;
    else if (enemyTank && ex === _lastStarX && ey === _lastStarY) _enemyStars++;
    _lastStarX = -1; _lastStarY = -1;
  }
  if (game.star) {
    _lastStarX = game.star[0];
    _lastStarY = game.star[1];
  }

  function tile(x, y) {
    var col = game.map[x];
    return col ? (col[y] || "x") : "x";
  }

  function blocked(x, y) {
    var t = tile(x, y);
    return t === "x" || t === "m";
  }

  function open(x, y) {
    return !blocked(x, y);
  }

  function dist(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  function delta(d) {
    return dv[d] || [0, -1];
  }

  function add(p, d) {
    return [p[0] + d[0], p[1] + d[1]];
  }

  function same(a, b) {
    return a && b && a[0] === b[0] && a[1] === b[1];
  }

  function dirTo(a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1];
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return dx > 0 ? "right" : "left";
    if (dy !== 0) return dy > 0 ? "down" : "up";
    return dir;
  }

  function turnCost(from, to) {
    var a = dirs.indexOf(from), b = dirs.indexOf(to);
    if (a < 0 || b < 0) return 9;
    return Math.min((b - a + 4) % 4, (a - b + 4) % 4);
  }

  function turnTo(want) {
    if (dir === want) return false;
    var a = dirs.indexOf(dir), b = dirs.indexOf(want);
    var diff = (b - a + 4) % 4;
    me.turn(diff <= 2 ? "right" : "left");
    return true;
  }

  function moveDir(want) {
    if (!want) return false;
    if (bulletActionTrap(want)) return false;
    if (dir === want) me.go();
    else turnTo(want);
    return true;
  }

  function teleportReady() {
    return me.skill && me.skill.type === "teleport" && me.skill.remainingCooldownFrames === 0;
  }

  function enemySkillIs(type) {
    return enemy && enemy.skill && enemy.skill.type === type;
  }

  function enemySkillReady(type, grace) {
    if (!enemySkillIs(type)) return false;
    var cd = enemy.skill.remainingCooldownFrames;
    return typeof cd !== "number" || cd <= grace;
  }

  function enemyDebuffed() {
    return !!(enemyTank && enemy.status && (enemy.status.frozen || enemy.status.stunned || enemy.status.poisoned));
  }

  function enemyOverloadArmed() {
    if (!enemySkillIs("overload")) return false;
    if (enemy.status && enemy.status.overloaded) return true;
    var cd = enemy.skill && enemy.skill.remainingCooldownFrames;
    return typeof cd === "number" && cd > 0;
  }

  function starsOf(actor) {
    if (!actor) return 0;
    if (typeof actor.stars === "number") return actor.stars;
    if (typeof actor.score === "number") return actor.score;
    if (actor === me) return _myStars;
    if (actor === enemy) return _enemyStars;
    return 0;
  }

  function losFrom(sx, sy, facing, tx, ty) {
    if (!facing || !dv[facing]) return false;
    var step = dv[facing];
    var dx = tx - sx, dy = ty - sy;
    if (step[0] !== 0) {
      if (dy !== 0) return false;
      if ((step[0] > 0 && dx <= 0) || (step[0] < 0 && dx >= 0)) return false;
      for (var x = sx + step[0]; x !== tx; x += step[0]) if (blocked(x, sy)) return false;
      return true;
    }
    if (dx !== 0) return false;
    if ((step[1] > 0 && dy <= 0) || (step[1] < 0 && dy >= 0)) return false;
    for (var y = sy + step[1]; y !== ty; y += step[1]) if (blocked(sx, y)) return false;
    return true;
  }

  function canShoot(a, b) {
    var want = dirTo(a, b);
    return (a[0] === b[0] || a[1] === b[1]) && losFrom(a[0], a[1], want, b[0], b[1]);
  }

  function bulletThreatAt(x, y, horizon) {
    if (!enemy || !enemy.bullet) return false;
    var bp = enemy.bullet.position;
    var bd = enemy.bullet.direction;
    if (!bd || !dv[bd]) return false;
    var step = dv[bd];
    var bx = bp[0], by = bp[1];
    for (var i = 0; i <= horizon; i++) {
      if (bx === x && by === y) return true;
      bx += step[0]; by += step[1];
      if (blocked(bx, by)) return false;
    }
    return false;
  }

  function bulletCrossesTile(x, y, horizon) {
    if (!enemy || !enemy.bullet) return false;
    var bp = enemy.bullet.position;
    var bd = enemy.bullet.direction;
    if (!bd || !dv[bd]) return false;
    var step = dv[bd];
    var bx = bp[0], by = bp[1];
    for (var i = 0; i <= horizon; i++) {
      if (bx === x && by === y) return true;
      bx += step[0]; by += step[1];
      if (blocked(bx, by)) return false;
    }
    return false;
  }

  function bulletActionTrap(want) {
    if (!enemy || !enemy.bullet || !want || !dv[want]) return false;
    if (want !== dir) return bulletCrossesTile(px, py, 4);
    var step = dv[want];
    var nx = px + step[0], ny = py + step[1];
    if (!open(nx, ny)) return true;
    return bulletCrossesTile(nx, ny, 4);
  }

  function laneThreatFrom(sx, sy, facing, tx, ty, maxCells) {
    if (!facing || !dv[facing]) return false;
    var step = dv[facing];
    var dx = tx - sx, dy = ty - sy;
    if (step[0] !== 0) {
      if (dy !== 0) return false;
      if ((step[0] > 0 && dx <= 0) || (step[0] < 0 && dx >= 0)) return false;
      if (Math.abs(dx) > maxCells) return false;
      for (var x = sx + step[0]; x !== tx; x += step[0]) if (blocked(x, sy)) return false;
      return true;
    }
    if (dx !== 0) return false;
    if ((step[1] > 0 && dy <= 0) || (step[1] < 0 && dy >= 0)) return false;
    if (Math.abs(dy) > maxCells) return false;
    for (var y = sy + step[1]; y !== ty; y += step[1]) if (blocked(sx, y)) return false;
    return true;
  }

  function overloadThreatAt(x, y) {
    if (!enemyTank || !enemySkillIs("overload") || enemyDebuffed()) return false;
    var armed = enemyOverloadArmed();
    var readySoon = enemySkillReady("overload", 2);
    if (!armed && !readySoon) return false;
    var maxCells = armed ? 12 : 8;
    var maxTurnCost = armed ? 2 : 1;
    for (var i = 0; i < 4; i++) {
      var fireDir = dirs[i];
      var cost = turnCost(eDir, fireDir);
      if (cost > maxTurnCost) continue;
      if (laneThreatFrom(ex, ey, fireDir, x, y, maxCells)) return true;
      var sideOffsets = (fireDir === "left" || fireDir === "right") ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
      for (var j = 0; j < sideOffsets.length; j++) {
        var ox = sideOffsets[j][0], oy = sideOffsets[j][1];
        var sx = ex + ox, sy = ey + oy;
        if (!open(sx, sy)) continue;
        if (laneThreatFrom(sx, sy, fireDir, x, y, maxCells)) return true;
      }
    }
    return false;
  }

  function grassMaze() {
    return w === 16 && h === 11;
  }

  function hiddenLaneAt(x, y) {
    if (enemyTank) return false;
    var memory = grassMaze() ? 34 : 18;
    if (_lastEX < 0 || frame - _lastSeen > memory) return false;
    var gap = dist(_lastEX, _lastEY, x, y);
    if (gap > (grassMaze() ? 13 : 9)) return false;
    if (_eMoveDir === "down" && x === _lastEX && y > _lastEY) return true;
    if (_eMoveDir === "up" && x === _lastEX && y < _lastEY) return true;
    if (_eMoveDir === "right" && y === _lastEY && x > _lastEX) return true;
    if (_eMoveDir === "left" && y === _lastEY && x < _lastEX) return true;
    if (enemySkillIs("cloak") && frame - _lastSeen <= 10 && gap <= 4) return true;
    return gap <= 4 && (x === _lastEX || y === _lastEY);
  }

  function cloakedAmbushAt(x, y) {
    if (enemyTank) return false;
    var cloakRecent = enemySkillIs("cloak") || _lastESkill === "cloak" ||
      !!(enemy && enemy.status && enemy.status.cloaked);
    if (!cloakRecent || _lastEX < 0 || frame - _lastSeen > 9) return false;
    var maxSteps = Math.max(1, Math.min(8, frame - _lastSeen + 1));
    var queue = [{ x: _lastEX, y: _lastEY, d: 0 }];
    var seen = {};
    seen[_lastEX + "," + _lastEY] = true;
    for (var head = 0; head < queue.length && queue.length < 120; head++) {
      var item = queue[head];
      if ((item.x === x || item.y === y) && dist(item.x, item.y, x, y) <= 12) {
        var need = item.x === x ? (y < item.y ? "up" : "down") : (x < item.x ? "left" : "right");
        if (losFrom(item.x, item.y, need, x, y)) return true;
      }
      if (item.d >= maxSteps) continue;
      for (var i = 0; i < 4; i++) {
        var step = delta(dirs[i]);
        var nx = item.x + step[0], ny = item.y + step[1];
        var key = nx + "," + ny;
        if (seen[key] || !open(nx, ny)) continue;
        seen[key] = true;
        queue.push({ x: nx, y: ny, d: item.d + 1 });
      }
    }
    return false;
  }

  function quickAimAt(x, y) {
    if (!enemyTank || dist(ex, ey, x, y) > 6) return false;
    if (ex !== x && ey !== y) return false;
    var need = ex === x ? (y < ey ? "up" : "down") : (x < ex ? "left" : "right");
    return turnCost(eDir, need) <= 1 && losFrom(ex, ey, need, x, y);
  }

  function longLaneAimAt(x, y) {
    if (!enemyTank || (enemy && enemy.bullet) || dist(ex, ey, x, y) > 14) return false;
    if (ex !== x && ey !== y) return false;
    var need = ex === x ? (y < ey ? "up" : "down") : (x < ex ? "left" : "right");
    return turnCost(eDir, need) <= 1 && losFrom(ex, ey, need, x, y);
  }

  function oneStepAimAt(x, y) {
    if (!enemyTank || (enemy && enemy.bullet) || enemyDebuffed()) return false;
    var starts = [[ex, ey]];
    var step = delta(eDir);
    var mx = ex + step[0], my = ey + step[1];
    if (open(mx, my)) starts.push([mx, my]);
    for (var i = 0; i < starts.length; i++) {
      var sx = starts[i][0], sy = starts[i][1];
      if (sx !== x && sy !== y) continue;
      if (dist(sx, sy, x, y) > 8) continue;
      var need = sx === x ? (y < sy ? "up" : "down") : (x < sx ? "left" : "right");
      if (turnCost(eDir, need) <= 1 && losFrom(sx, sy, need, x, y)) return true;
    }
    return false;
  }

  function movingEnemyFireSetupAt(x, y) {
    if (!enemyTank || !_eMoveDir || !dv[_eMoveDir]) return false;
    if (enemy.status && (enemy.status.frozen || enemy.status.stunned)) return false;
    var sx = ex, sy = ey;
    for (var stepCount = 0; stepCount <= 1; stepCount++) {
      if (sx === x && sy === y) return true;
      if ((sx === x || sy === y) && dist(sx, sy, x, y) <= 5) {
        var need = sx === x ? (y < sy ? "up" : "down") : (x < sx ? "left" : "right");
        if (turnCost(eDir, need) <= 1 && losFrom(sx, sy, need, x, y)) return true;
      }
      var move = dv[_eMoveDir];
      var nx = sx + move[0], ny = sy + move[1];
      if (!open(nx, ny)) break;
      sx = nx; sy = ny;
    }
    return false;
  }

  function freezeTrapAt(x, y) {
    if (!enemyTank || enemyDebuffed()) return false;
    var freezeThreat = enemySkillIs("freeze") || _lastESkill === "freeze";
    if (!freezeThreat || !enemySkillReady("freeze", 3)) return false;
    if (ex !== x && ey !== y) return false;
    if (dist(ex, ey, x, y) > 9) return false;
    var need = ex === x ? (y < ey ? "up" : "down") : (x < ex ? "left" : "right");
    return turnCost(eDir, need) <= 1 && losFrom(ex, ey, need, x, y);
  }

  function adjacentPursuitTrapAt(x, y) {
    if (!enemyTank || enemyDebuffed()) return false;
    if (starsOf(me) - starsOf(enemy) < 1) return false;
    if (dist(px, py, ex, ey) > 4 && dist(x, y, ex, ey) > 4) return false;
    var starts = [[ex, ey]];
    var forward = delta(eDir);
    var fx = ex + forward[0], fy = ey + forward[1];
    if (open(fx, fy)) starts.push([fx, fy]);
    if (_eMoveDir && dv[_eMoveDir]) {
      var chase = delta(_eMoveDir);
      var cx = ex + chase[0], cy = ey + chase[1];
      if (open(cx, cy)) starts.push([cx, cy]);
    }
    for (var i = 0; i < starts.length; i++) {
      var sx = starts[i][0], sy = starts[i][1];
      if (sx !== x && sy !== y) continue;
      var gap = dist(sx, sy, x, y);
      if (gap < 1 || gap > 4) continue;
      var need = sx === x ? (y < sy ? "up" : "down") : (x < sx ? "left" : "right");
      if (turnCost(eDir, need) <= 2 && losFrom(sx, sy, need, x, y)) return true;
    }
    return false;
  }

  function boostLeadLaneTrapAt(x, y) {
    if (starsOf(me) - starsOf(enemy) < 1) return false;
    var boostTempo = enemySkillIs("boost") || _lastESkill === "boost" ||
      !!(enemy && enemy.status && enemy.status.boosted);
    if (!boostTempo) return false;
    var sx = enemyTank ? ex : _lastEX;
    var sy = enemyTank ? ey : _lastEY;
    var facing = enemyTank ? eDir : (_lastEDir || _eMoveDir);
    if (sx < 0 || sy < 0 || frame - _lastSeen > 10) return false;
    if (sx !== x && sy !== y) return false;
    if (dist(sx, sy, x, y) > 14) return false;
    var need = sx === x ? (y < sy ? "up" : "down") : (x < sx ? "left" : "right");
    if (turnCost(facing, need) > 2) return false;
    return losFrom(sx, sy, need, x, y);
  }

  function rememberedSpawnThreatAt(x, y) {
    if (enemyTank || _homeEX < 0) return false;
    var gap = dist(_homeEX, _homeEY, x, y);
    if (gap <= 1) return true;
    if (_homeEX !== x && _homeEY !== y) return false;
    if (gap > 14) return false;
    if (gap < 11) return false;
    var need = _homeEX === x ? (y < _homeEY ? "up" : "down") : (x < _homeEX ? "left" : "right");
    return losFrom(_homeEX, _homeEY, need, x, y);
  }

  function laneDangerAt(x, y) {
    if (quickAimAt(x, y)) return true;
    if (longLaneAimAt(x, y)) return true;
    if (oneStepAimAt(x, y)) return true;
    if (movingEnemyFireSetupAt(x, y)) return true;
    if (freezeTrapAt(x, y)) return true;
    if (adjacentPursuitTrapAt(x, y)) return true;
    if (boostLeadLaneTrapAt(x, y)) return true;
    if (cloakedAmbushAt(x, y)) return true;
    if (hiddenLaneAt(x, y)) return true;
    if (rememberedSpawnThreatAt(x, y)) return true;
    return false;
  }

  function safeCell(x, y, strict) {
    if (!open(x, y)) return false;
    if (enemyTank && x === ex && y === ey) return false;
    if (bulletThreatAt(x, y, strict ? 10 : 6)) return false;
    if (overloadThreatAt(x, y)) return false;
    if (strict && laneDangerAt(x, y)) return false;
    return true;
  }

  function farStarPickupAt(x, y) {
    return game.star && x === game.star[0] && y === game.star[1] &&
      enemyTank && dist(ex, ey, x, y) > 8;
  }

  function fatalStepAt(x, y) {
    var farStarPickup = farStarPickupAt(x, y);
    if (!open(x, y)) return true;
    if (enemyTank && x === ex && y === ey) return true;
    if (bulletThreatAt(x, y, 6)) return true;
    if (!farStarPickup && laneDangerAt(x, y)) return true;
    if (overloadThreatAt(x, y)) return true;
    return false;
  }

  function tryAdjacentStarPickup(star) {
    if (!star || dist(px, py, star[0], star[1]) !== 1) return false;
    if (starsOf(me) + 1 - starsOf(enemy) >= 2 &&
      (bulletThreatAt(star[0], star[1], 8) || quickAimAt(star[0], star[1]) ||
        oneStepAimAt(star[0], star[1]) || movingEnemyFireSetupAt(star[0], star[1]) ||
        freezeTrapAt(star[0], star[1]) || cloakedAmbushAt(star[0], star[1]) ||
        hiddenLaneAt(star[0], star[1]))) return false;
    if (fatalStepAt(star[0], star[1]) && !farStarPickupAt(star[0], star[1])) return false;
    return moveDir(dirTo(myPos, star));
  }

  function validTeleport(x, y) {
    if (!safeCell(x, y, true)) return false;
    if (enemy && enemy.bullet && enemy.bullet.position[0] === x && enemy.bullet.position[1] === y) return false;
    if (enemyTank) {
      var ed = dist(x, y, ex, ey);
      if (ed <= 5) return false;
      if ((x === ex || y === ey) && ed <= 10) return false;
    }
    return true;
  }

  function pathInfo(start, goal, avoid) {
    if (!goal || !open(goal[0], goal[1])) return null;
    if (same(start, goal)) return { first: null, dist: 0 };
    var queue = [{ pos: start, first: null, dist: 0 }];
    var seen = {};
    seen[start[0] + "," + start[1]] = true;
    for (var head = 0; head < queue.length && queue.length < 420; head++) {
      var item = queue[head];
      for (var i = 0; i < 4; i++) {
        var d = dirs[i];
        var next = add(item.pos, delta(d));
        var k = next[0] + "," + next[1];
        if (seen[k] || !open(next[0], next[1])) continue;
        if (avoid && item.dist < 4 && !safeCell(next[0], next[1], true)) continue;
        var first = item.first || d;
        if (same(next, goal)) return { first: first, dist: item.dist + 1 };
        seen[k] = true;
        queue.push({ pos: next, first: first, dist: item.dist + 1 });
      }
    }
    return null;
  }

  function pathDist(a, b) {
    var p = pathInfo(a, b, false);
    return p ? p.dist : 999;
  }

  function bestStarTeleport(star) {
    if (!teleportReady() || !star) return null;
    var best = null, bestScore = -9999;
    for (var x = star[0] - 2; x <= star[0] + 2; x++) {
      for (var y = star[1] - 2; y <= star[1] + 2; y++) {
        if (dist(x, y, star[0], star[1]) > 2) continue;
        if (!validTeleport(x, y)) continue;
        var score = 140 - dist(x, y, star[0], star[1]) * 35;
        if (x === star[0] && y === star[1]) score += 70;
        if (enemyTank) {
          var ed = dist(x, y, ex, ey);
          if (ed <= 5) continue;
          if ((x === ex || y === ey) && ed <= 10) continue;
          if (x === ex || y === ey) score -= 30;
          score += Math.min(ed, 8) * 3;
        }
        if (quickAimAt(x, y)) score -= 80;
        if (score > bestScore) { bestScore = score; best = [x, y]; }
      }
    }
    return best;
  }

  function tryDodge() {
    if (!bulletThreatAt(px, py, 10) && !overloadThreatAt(px, py) && !laneDangerAt(px, py)) return false;
    var best = null, bestScore = -9999;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var n = add(myPos, delta(d));
      if (!safeCell(n[0], n[1], true)) continue;
      if (bulletActionTrap(d)) continue;
      var score = 20 - turnCost(dir, d) * 4;
      if (game.star) score -= dist(n[0], n[1], game.star[0], game.star[1]);
      if (score > bestScore) { bestScore = score; best = d; }
    }
    if (best && moveDir(best)) return true;
    if (teleportReady()) {
      var safe = bestStarTeleport(game.star) || anchor();
      if (safe && validTeleport(safe[0], safe[1])) {
        me.teleport(safe[0], safe[1]);
        return true;
      }
    }
    return false;
  }

  function tryClearMound(target) {
    if (!target || me.bullet || me.status.fireLocked) return false;
    var f = delta(dir);
    if (tile(px + f[0], py + f[1]) === "m") {
      me.fire();
      return true;
    }
    if (px !== target[0] && py !== target[1]) return false;
    var want = dirTo(myPos, target);
    var step = delta(want);
    var x = px + step[0], y = py + step[1];
    while (x !== target[0] || y !== target[1]) {
      var t = tile(x, y);
      if (t === "x") return false;
      if (t === "m") {
        if (dir === want) me.fire();
        else turnTo(want);
        return true;
      }
      x += step[0]; y += step[1];
    }
    return false;
  }

  function moveToward(target, avoid) {
    var p = pathInfo(myPos, target, avoid);
    if (p && p.first) {
      var n = add(myPos, delta(p.first));
      if (!avoid && fatalStepAt(n[0], n[1])) return false;
      return moveDir(p.first);
    }
    if (tryClearMound(target)) return true;
    return false;
  }

  function aimDangerHere() {
    if (!enemyTank || dist(px, py, ex, ey) > 14) return false;
    if (enemy && enemy.bullet) return false;
    if (ex !== px && ey !== py) return false;
    var need = ex === px ? (py < ey ? "up" : "down") : (px < ex ? "left" : "right");
    if (!losFrom(ex, ey, need, px, py)) return false;
    return turnCost(eDir, need) <= 1;
  }

  function escapeAimDir() {
    var best = null, bestScore = -9999;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var n = add(myPos, delta(d));
      if (!safeCell(n[0], n[1], true)) continue;
      if (enemyTank && (n[0] === ex || n[1] === ey)) continue;
      var score = 50 + dist(n[0], n[1], ex, ey) * 2 - turnCost(dir, d) * 8;
      if (game.star) score -= dist(n[0], n[1], game.star[0], game.star[1]);
      if (d === dir) score += 12;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return best;
  }

  function urgentAimEscapeDir() {
    if (!aimDangerHere() && !oneStepAimAt(px, py) && !laneDangerAt(px, py)) return null;
    var n = add(myPos, delta(dir));
    if (!open(n[0], n[1])) return null;
    if (enemyTank && n[0] === ex && n[1] === ey) return null;
    if (enemyTank && (n[0] === ex || n[1] === ey)) return null;
    if (bulletThreatAt(n[0], n[1], 4)) return null;
    if (overloadThreatAt(n[0], n[1])) return null;
    if (hiddenLaneAt(n[0], n[1])) return null;
    if (rememberedSpawnThreatAt(n[0], n[1])) return null;
    return dir;
  }

  function laneExitDir() {
    if (enemy && enemy.bullet) return null;
    if (_lastESkill !== "freeze") return null;
    if (_lastEX < 0 || frame - _lastSeen > 4) return null;
    if (ex !== px && ey !== py) return null;
    if (dist(px, py, ex, ey) > 8) return null;
    var need = ex === px ? (py < ey ? "up" : "down") : (px < ex ? "left" : "right");
    if (turnCost(eDir, need) > 1) return null;
    if (!losFrom(ex, ey, need, px, py)) return null;

    var candidates = ey === py ? ["up", "down"] : ["left", "right"];
    for (var i = 0; i < candidates.length; i++) {
      var d = candidates[i];
      var n = add(myPos, delta(d));
      if (!open(n[0], n[1])) continue;
      if (enemyTank && n[0] === ex && n[1] === ey) continue;
      if (bulletThreatAt(n[0], n[1], 4)) continue;
      if (overloadThreatAt(n[0], n[1])) continue;
      if (hiddenLaneAt(n[0], n[1])) continue;
      if (rememberedSpawnThreatAt(n[0], n[1])) continue;
      return d;
    }
    return null;
  }

  function tryPreemptAimDodge() {
    var aimDanger = aimDangerHere() || oneStepAimAt(px, py) || laneDangerAt(px, py);
    var laneExit = laneExitDir();
    if (!aimDanger && !laneExit) return false;
    if (aimDanger && teleportReady()) {
      var target = bestStarTeleport(game.star) || anchor();
      if (target && validTeleport(target[0], target[1])) {
        me.teleport(target[0], target[1]);
        return true;
      }
    }
    if (laneExit && moveDir(laneExit)) return true;
    var urgentEscape = urgentAimEscapeDir();
    if (urgentEscape && moveDir(urgentEscape)) return true;
    var escape = escapeAimDir();
    if (escape) return moveDir(escape);
    return false;
  }

  function tryKeepLeadSafe() {
    var lead = starsOf(me) - starsOf(enemy);
    var boostTempo = enemySkillIs("boost") || _lastESkill === "boost" ||
      !!(enemy && enemy.status && enemy.status.boosted);
    var requiredLead = boostTempo ? 1 : 2;
    if (lead < requiredLead) return false;
    if (frame < 18 && lead < 2) return false;
    if (!bulletThreatAt(px, py, 10) && !overloadThreatAt(px, py) && !laneDangerAt(px, py)) return false;
    var escape = escapeAimDir();
    if (escape && moveDir(escape)) return true;
    return false;
  }

  function anchor() {
    var cx = Math.floor(w / 2), cy = Math.floor(h / 2);
    var best = null, bestScore = -9999;
    for (var x = 1; x < w - 1; x++) {
      for (var y = 1; y < h - 1; y++) {
        if (!safeCell(x, y, false)) continue;
        var score = -dist(x, y, cx, cy) * 4;
        if (tile(x, y) === "o") score += 2;
        if (enemyTank && (x === ex || y === ey)) score -= 4;
        if (score > bestScore) { bestScore = score; best = [x, y]; }
      }
    }
    return best || myPos;
  }

  function pressureAnchor(target) {
    var cx = target ? Math.floor((target[0] + px) / 2) : Math.floor(w / 2);
    var cy = target ? Math.floor((target[1] + py) / 2) : Math.floor(h / 2);
    var best = null, bestScore = -9999;
    for (var x = 1; x < w - 1; x++) {
      for (var y = 1; y < h - 1; y++) {
        if (!safeCell(x, y, true)) continue;
        var score = -dist(x, y, cx, cy) * 5;
        if (target) score -= dist(x, y, target[0], target[1]);
        if (tile(x, y) === "o") score += 2;
        if (enemyTank && canShoot([x, y], [ex, ey])) score += 24;
        if (enemyTank && (x === ex || y === ey)) score += 6;
        if (boostLeadLaneTrapAt(x, y)) score -= 80;
        if (score > bestScore) { bestScore = score; best = [x, y]; }
      }
    }
    return best || anchor();
  }

  function riskyLeadStarRoute(star, myPath) {
    if (!star || starsOf(me) - starsOf(enemy) < 1) return false;
    var boostTempo = enemySkillIs("boost") || _lastESkill === "boost" ||
      !!(enemy && enemy.status && enemy.status.boosted);
    if (!boostTempo) return false;
    if (boostLeadLaneTrapAt(star[0], star[1]) && dist(px, py, star[0], star[1]) > 2) return true;
    if (myPath && myPath.first) {
      var next = add(myPos, delta(myPath.first));
      if (boostLeadLaneTrapAt(next[0], next[1])) return true;
      if (fatalStepAt(next[0], next[1]) && dist(px, py, star[0], star[1]) > 2) return true;
    }
    return false;
  }

  function tryAttack(urgentStar) {
    if (!enemyTank || me.bullet || me.status.fireLocked) return false;
    if (!urgentStar && laneDangerAt(px, py) && !enemyDebuffed()) return false;
    if (!urgentStar && canShoot(myPos, [ex, ey])) {
      var want = dirTo(myPos, [ex, ey]);
      if (dir === want) me.fire();
      else turnTo(want);
      return true;
    }
    return false;
  }

  function tryStarRacePressure(myDist, enemyDist) {
    if (!game.star || !enemyTank || me.bullet || me.status.fireLocked) return false;
    if (myDist <= 3 || myDist >= 999 || enemyDist >= 999) return false;
    if (enemyDist > myDist + 4 && myDist < 14) return false;
    if (!canShoot(myPos, [ex, ey])) return false;
    if (bulletThreatAt(px, py, 4) || overloadThreatAt(px, py) || laneDangerAt(px, py)) return false;

    var want = dirTo(myPos, [ex, ey]);
    var cost = turnCost(dir, want);
    var gap = dist(px, py, ex, ey);
    if (cost > 1 && enemyDist > myDist + 1) return false;
    if (gap > 8 && cost > 0) return false;

    if (dir === want) me.fire();
    else turnTo(want);
    return true;
  }

  if (tryPreemptAimDodge()) return;
  if (tryDodge()) return;
  if (tryKeepLeadSafe()) return;

  if (game.star) {
    var star = game.star;
    if (tryAdjacentStarPickup(star)) return;
    var myPath = pathInfo(myPos, star, true) || pathInfo(myPos, star, false);
    var myDist = myPath ? myPath.dist : 999;
    var enemyDist = enemyTank ? pathDist([ex, ey], star) : 999;
    var stuckOrLate = _stuck >= 2 || frame > 10;
    var shouldTeleport = teleportReady() && myDist > 2 && (stuckOrLate || myDist > enemyDist + 1 || frame < 20);
    if (shouldTeleport) {
      var landing = bestStarTeleport(star);
      if (landing) {
        me.teleport(landing[0], landing[1]);
        return;
      }
    }

    if (riskyLeadStarRoute(star, myPath)) {
      if (tryAttack(false)) return;
      var hold = pressureAnchor(star);
      if (hold && !same(myPos, hold) && moveToward(hold, true)) return;
      if (enemyTank && turnTo(dirTo(myPos, [ex, ey]))) return;
    }

    var urgent = myDist <= enemyDist + 4 || myDist <= 3 || frame > 30 || _stuck >= 2;
    if (urgent && tryStarRacePressure(myDist, enemyDist)) return;
    if (urgent && moveToward(star, true)) return;
    if (tryAttack(false)) return;
    if (moveToward(star, false)) return;
    if (tryClearMound(star)) return;
  }

  if (tryAttack(false)) return;
  var home = anchor();
  if (dist(px, py, home[0], home[1]) > 1 && moveToward(home, true)) return;

  if (_stuck >= 2 && teleportReady()) {
    var a = anchor();
    if (validTeleport(a[0], a[1])) {
      me.teleport(a[0], a[1]);
      return;
    }
  }

  var fwd = add(myPos, delta(dir));
  if (safeCell(fwd[0], fwd[1], true) && !bulletActionTrap(dir)) me.go();
  else if (!bulletActionTrap(dirs[(dirs.indexOf(dir) + 1) % 4])) me.turn("right");
  else me.turn("left");
}
