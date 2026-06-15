var _lastX = -1, _lastY = -1, _stuck = 0;
var _lastEX = -1, _lastEY = -1, _lastEDir = null, _eMoveDir = null, _lastSeen = -99;
var _homeEX = -1, _homeEY = -1;
var _lastESkill = null;
var _myStars = 0, _enemyStars = 0, _lastStarX = -1, _lastStarY = -1;
var _pursuitStarX = -1, _pursuitStarY = -1, _pursuitDist = 999, _pursuitStall = 0;
var _raidUntil = -1, _raidStarX = -1, _raidStarY = -1, _raidDir = null;
var _lastTeleportX = -1, _lastTeleportY = -1, _lastTeleportStarX = -1, _lastTeleportStarY = -1, _lastTeleportAt = -99;
var _mirrorRecoverUntil = -1, _mirrorRecoverStarX = -1, _mirrorRecoverStarY = -1;

function onIdle(me, enemy, game) {
  var myPos = me.tank.position;
  var px = myPos[0], py = myPos[1];
  var dir = me.tank.direction;
  var frame = game.frames || 0;
  var dirs = ["up", "right", "down", "left"];
  var dv = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  var w = game.map.length;
  var h = game.map[0] ? game.map[0].length : 0;
  var _laneDangerCache = {};
  var _safeCellCache = {};
  var _pathCache = {};

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
    if (px === _lastStarX && py === _lastStarY) {
      _myStars++;
      if (enemySkillIs("teleport") &&
        me.skill && me.skill.type === "teleport" && me.skill.remainingCooldownFrames >= 18 &&
        enemy.skill && enemy.skill.remainingCooldownFrames >= 18) {
        _mirrorRecoverUntil = frame + 18;
        _mirrorRecoverStarX = _lastStarX;
        _mirrorRecoverStarY = _lastStarY;
      }
    } else if (enemyTank && ex === _lastStarX && ey === _lastStarY) {
      _enemyStars++;
      if (enemySkillIs("teleport") &&
        me.skill && me.skill.type === "teleport" && me.skill.remainingCooldownFrames >= 18 &&
        enemy.skill && enemy.skill.remainingCooldownFrames >= 18) {
        _mirrorRecoverUntil = frame + 18;
        _mirrorRecoverStarX = _lastStarX;
        _mirrorRecoverStarY = _lastStarY;
      }
    }
    _lastStarX = -1; _lastStarY = -1;
  }
  if (game.star) {
    _lastStarX = game.star[0];
    _lastStarY = game.star[1];
    var visibleStarDist = pathDist(myPos, game.star);
    if (_pursuitStarX !== game.star[0] || _pursuitStarY !== game.star[1]) {
      _pursuitStarX = game.star[0];
      _pursuitStarY = game.star[1];
      _pursuitDist = visibleStarDist;
      _pursuitStall = 0;
    } else if (visibleStarDist + 1 < _pursuitDist) {
      _pursuitDist = visibleStarDist;
      _pursuitStall = 0;
    } else if (visibleStarDist > _pursuitDist + 1) {
      _pursuitDist = visibleStarDist;
      _pursuitStall++;
    } else if (visibleStarDist === _pursuitDist && !(px === game.star[0] && py === game.star[1])) {
      _pursuitStall++;
    } else {
      _pursuitDist = visibleStarDist;
      if (_pursuitStall > 0) _pursuitStall--;
    }
  } else {
    _pursuitStarX = -1;
    _pursuitStarY = -1;
    _pursuitDist = 999;
    _pursuitStall = 0;
  }
  if (frame > _raidUntil) {
    _raidUntil = -1;
    _raidStarX = -1;
    _raidStarY = -1;
    _raidDir = null;
  }
  if (frame > _mirrorRecoverUntil) {
    _mirrorRecoverUntil = -1;
    _mirrorRecoverStarX = -1;
    _mirrorRecoverStarY = -1;
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
    if (bulletActionTrap(want) || immediateEnemyShotAt(px, py)) return false;
    var a = dirs.indexOf(dir), b = dirs.indexOf(want);
    var diff = (b - a + 4) % 4;
    me.turn(diff <= 2 ? "right" : "left");
    return true;
  }

  function moveDir(want) {
    if (!want) return false;
    if (bulletActionTrap(want)) return false;
    if (dir === want) {
      me.go();
      return true;
    }
    return turnTo(want);
  }

  function holdActionTrap() {
    return bulletCrossesTile(px, py, 4);
  }

  function fireSafe() {
    if (me.bullet || me.status.fireLocked) return false;
    if (holdActionTrap()) return false;
    me.fire();
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

  function immediateEnemyShotAt(x, y) {
    if (!enemyTank || enemyDebuffed() || (enemy && enemy.bullet)) return false;
    if (x !== ex && y !== ey) return false;
    var want = dirTo([ex, ey], [x, y]);
    if (turnCost(eDir, want) !== 0) return false;
    return losFrom(ex, ey, want, x, y);
  }

  function tryImmediateLaneEscape() {
    if (!immediateEnemyShotAt(px, py)) return false;
    if (canShoot(myPos, [ex, ey]) && dist(px, py, ex, ey) <= 4) {
      var counterDir = dirTo(myPos, [ex, ey]);
      if (dir === counterDir && fireSafe()) return true;
    }
    var best = null, bestScore = -9999;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var side = delta(d);
      var sx = px + side[0], sy = py + side[1];
      if (!open(sx, sy)) continue;
      if (enemyTank && sx === ex && sy === ey) continue;
      if (bulletActionTrap(d)) continue;
      if (!safeCell(sx, sy, true)) continue;
      if (immediateEnemyShotAt(sx, sy)) continue;
      var score = 90 + dist(sx, sy, ex, ey) * 3 - turnCost(dir, d) * 14;
      if (d === dir) score += 10;
      if (game.star) score -= dist(sx, sy, game.star[0], game.star[1]);
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    if (best) return moveDir(best);
    var step = delta(dir);
    var nx = px + step[0], ny = py + step[1];
    if (!open(nx, ny)) return false;
    if (enemyTank && nx === ex && ny === ey) return false;
    if (bulletThreatAt(nx, ny, 4) || overloadThreatAt(nx, ny) || laneDangerAt(nx, ny)) return false;
    me.go();
    return true;
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
    var key = x + "," + y;
    if (Object.prototype.hasOwnProperty.call(_laneDangerCache, key)) return _laneDangerCache[key];
    var danger = false;
    if (quickAimAt(x, y)) danger = true;
    else if (longLaneAimAt(x, y)) danger = true;
    else if (oneStepAimAt(x, y)) danger = true;
    else if (movingEnemyFireSetupAt(x, y)) danger = true;
    else if (freezeTrapAt(x, y)) danger = true;
    else if (adjacentPursuitTrapAt(x, y)) danger = true;
    else if (boostLeadLaneTrapAt(x, y)) danger = true;
    else if (cloakedAmbushAt(x, y)) danger = true;
    else if (hiddenLaneAt(x, y)) danger = true;
    else if (rememberedSpawnThreatAt(x, y)) danger = true;
    _laneDangerCache[key] = danger;
    return danger;
  }

  function safeCell(x, y, strict) {
    var key = x + "," + y + "|" + (strict ? 1 : 0);
    if (Object.prototype.hasOwnProperty.call(_safeCellCache, key)) return _safeCellCache[key];
    var safe = true;
    if (!open(x, y)) safe = false;
    else if (enemyTank && x === ex && y === ey) safe = false;
    else if (bulletThreatAt(x, y, strict ? 10 : 6)) safe = false;
    else if (overloadThreatAt(x, y)) safe = false;
    else if (strict && laneDangerAt(x, y)) safe = false;
    _safeCellCache[key] = safe;
    return safe;
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
      if (ed <= 4) return false;
      if ((x === ex || y === ey) && ed <= (frame < 20 ? 7 : 9)) return false;
    }
    return true;
  }

  function repeatedStarTeleport(x, y, star) {
    return !!(star &&
      x === _lastTeleportX && y === _lastTeleportY &&
      star[0] === _lastTeleportStarX && star[1] === _lastTeleportStarY &&
      frame - _lastTeleportAt <= 45);
  }

  function castTeleport(target, star) {
    _lastTeleportX = target[0];
    _lastTeleportY = target[1];
    _lastTeleportStarX = star ? star[0] : -1;
    _lastTeleportStarY = star ? star[1] : -1;
    _lastTeleportAt = frame;
    me.teleport(target[0], target[1]);
  }

  function pathInfo(start, goal, avoid) {
    if (!goal || !open(goal[0], goal[1])) return null;
    if (same(start, goal)) return { first: null, dist: 0 };
    var cacheKey = start[0] + "," + start[1] + ">" + goal[0] + "," + goal[1] + "|" + (avoid ? 1 : 0);
    if (Object.prototype.hasOwnProperty.call(_pathCache, cacheKey)) {
      return _pathCache[cacheKey] || null;
    }
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
        if (same(next, goal)) {
          var found = { first: first, dist: item.dist + 1 };
          _pathCache[cacheKey] = found;
          return found;
        }
        seen[k] = true;
        queue.push({ pos: next, first: first, dist: item.dist + 1 });
      }
    }
    _pathCache[cacheKey] = false;
    return null;
  }

  function pathDist(a, b) {
    var p = pathInfo(a, b, false);
    return p ? p.dist : 999;
  }

  function approachFramesFrom(start, facing, target) {
    var p = pathInfo(start, target, false);
    if (!p) return 999;
    if (!p.first) return 0;
    return p.dist + turnCost(facing || dir, p.first);
  }

  function enemyMirrorArrival(star) {
    if (!enemyTank || !enemySkillIs("teleport") || !star) return null;
    var facing = eDir || _lastEDir || "up";
    var best = null, bestScore = -9999;
    for (var x = star[0] - 2; x <= star[0] + 2; x++) {
      for (var y = star[1] - 2; y <= star[1] + 2; y++) {
        if (dist(x, y, star[0], star[1]) > 2) continue;
        if (!open(x, y)) continue;
        var framesToStar = approachFramesFrom([x, y], facing, star);
        if (framesToStar >= 999) continue;
        var score = 170 - framesToStar * 42 - dist(x, y, star[0], star[1]) * 12;
        if (x === star[0] && y === star[1]) score += 40;
        if (x === ex && y === ey) score -= 8;
        if (score > bestScore) {
          bestScore = score;
          best = { landing: [x, y], frames: framesToStar };
        }
      }
    }
    return best;
  }

  function mirrorPickupTrap(landing, star, mirrorEnemy) {
    if (!landing || !star || !mirrorEnemy || !mirrorEnemy.landing) return false;
    var mx = mirrorEnemy.landing[0], my = mirrorEnemy.landing[1];
    if (mx !== star[0] && my !== star[1]) return false;
    var laneDir = mx === star[0] ? (star[1] < my ? "up" : "down") : (star[0] < mx ? "left" : "right");
    if (!losFrom(mx, my, laneDir, star[0], star[1])) return false;
    var laneGap = dist(mx, my, star[0], star[1]);
    if (laneGap > 4) return false;

    var postDir = dir;
    var approach = pathInfo(landing, star, false);
    if (approach && approach.first) postDir = approach.first;

    var escapeDirs = mx === star[0] ? ["left", "right"] : ["up", "down"];
    for (var i = 0; i < escapeDirs.length; i++) {
      var escapeDir = escapeDirs[i];
      var step = delta(escapeDir);
      var nx = star[0] + step[0], ny = star[1] + step[1];
      if (!open(nx, ny)) continue;
      if (turnCost(postDir, escapeDir) === 0) return false;
    }

    if (laneGap <= 1) return true;
    var facing = eDir || _lastEDir || "up";
    return laneGap <= 2 && turnCost(facing, laneDir) <= 1;
  }

  function laneMoundsBetween(sx, sy, tx, ty) {
    if (sx !== tx && sy !== ty) return 99;
    var step = sx === tx ? [0, ty > sy ? 1 : -1] : [tx > sx ? 1 : -1, 0];
    var x = sx + step[0], y = sy + step[1];
    var mounds = 0;
    while (x !== tx || y !== ty) {
      var t = tile(x, y);
      if (t === "x") return 99;
      if (t === "m") mounds++;
      x += step[0];
      y += step[1];
    }
    return mounds;
  }

  function leadStarShotTrap(star) {
    if (!star || !enemyTank) return false;
    if (starsOf(me) - starsOf(enemy) < 2) return false;
    var starts = [[ex, ey]].concat(predictRoute([ex, ey], star, 4));
    for (var d = 0; d < 4; d++) {
      var n = add([ex, ey], delta(dirs[d]));
      if (open(n[0], n[1])) starts.push(n);
    }
    for (var i = 0; i < starts.length; i++) {
      var p = starts[i];
      var gap = dist(p[0], p[1], star[0], star[1]);
      if (gap < 2 || gap > 12) continue;
      if (p[0] !== star[0] && p[1] !== star[1]) continue;
      if (laneMoundsBetween(p[0], p[1], star[0], star[1]) <= 1) return true;
    }
    return false;
  }

  function mirrorContestActive(star) {
    if (!star || !enemyTank || !enemySkillIs("teleport")) return false;
    if (dist(px, py, star[0], star[1]) > 2) return false;
    if (dist(ex, ey, star[0], star[1]) > 2) return false;
    return true;
  }

  function tryMirrorContest(star) {
    if (!mirrorContestActive(star)) return false;
    if (dist(px, py, star[0], star[1]) <= 1) return moveTowardForce(star);
    var p = pathInfo(myPos, star, false);
    if (p && p.first) return moveDir(p.first);
    return false;
  }

  function mirrorRecoveryActive() {
    return _mirrorRecoverUntil >= frame &&
      enemySkillIs("teleport") &&
      me.skill && me.skill.type === "teleport" && me.skill.remainingCooldownFrames > 0 &&
      enemy.skill && enemy.skill.remainingCooldownFrames > 0;
  }

  function openNeighborCount(x, y) {
    var count = 0;
    for (var i = 0; i < 4; i++) {
      var n = add([x, y], delta(dirs[i]));
      if (open(n[0], n[1])) count++;
    }
    return count;
  }

  function grassAmbushMap(star) {
    if (!star) return false;
    var grass = 0, nearStar = 0;
    for (var x = 1; x < w - 1; x++) {
      for (var y = 1; y < h - 1; y++) {
        if (tile(x, y) !== "o") continue;
        grass++;
        if (dist(x, y, star[0], star[1]) <= 4) nearStar++;
      }
    }
    return nearStar > 0 && (grass >= 8 || nearStar >= 3);
  }

  function bestGrassAmbush(star, myDist, enemyDist) {
    if (!grassAmbushMap(star) || !enemyTank) return null;
    if (_myStars < _enemyStars && enemyDist <= myDist + 1) return null;
    if (myDist <= 2) return null;
    var enemyRoute = predictRoute([ex, ey], star, 6);
    var best = null, bestScore = -9999;
    for (var x = 1; x < w - 1; x++) {
      for (var y = 1; y < h - 1; y++) {
        if (tile(x, y) !== "o") continue;
        var starGap = dist(x, y, star[0], star[1]);
        if (starGap < 1 || starGap > 4) continue;
        if (!validTeleport(x, y)) continue;
        var score = 260 - starGap * 30 - dist(px, py, x, y) * 3;
        score += openNeighborCount(x, y) * 9;
        if (canShoot([x, y], star)) score += 44;
        if (pathDist([x, y], star) <= 3) score += 20;
        if (x !== star[0] && y !== star[1]) score += 12;
        if (enemyTank) {
          var ed = dist(x, y, ex, ey);
          if (ed <= 4) continue;
          score += Math.min(ed, 8) * 4;
          if ((x === ex || y === ey) && ed <= 10) score -= 70;
          if (enemyDist <= starGap + 1) score += 18;
        }
        for (var i = 0; i < enemyRoute.length; i++) {
          if (canShoot([x, y], enemyRoute[i])) score += 34 - i * 4;
          if (dist(x, y, enemyRoute[i][0], enemyRoute[i][1]) <= 2) score += 10;
        }
        if (score > bestScore) {
          bestScore = score;
          best = [x, y];
        }
      }
    }
    return bestScore >= 160 ? best : null;
  }

  function tryGrassAmbushFire(star, enemyDist) {
    if (!star || !enemyTank || tile(px, py) !== "o") return false;
    if (dist(px, py, star[0], star[1]) > 4) return false;
    if (me.bullet || me.status.fireLocked) return false;
    if (bulletThreatAt(px, py, 4) || overloadThreatAt(px, py)) return false;
    var targets = [[ex, ey]].concat(predictRoute([ex, ey], star, 5));
    for (var i = 0; i < targets.length; i++) {
      var target = targets[i];
      if (!canShoot(myPos, target)) continue;
      var gap = dist(px, py, target[0], target[1]);
      if (gap < 2 || gap > 10) continue;
      var want = dirTo(myPos, target);
      if (dir === want) {
        if (fireSafe()) return true;
        continue;
      }
      return turnTo(want);
    }
    if (enemyDist <= 6 && canShoot(myPos, star)) {
      var guard = dirTo(myPos, star);
      if (dir !== guard) {
        turnTo(guard);
        return true;
      }
    }
    return false;
  }

  function grassAssassinationTargets(star, steps) {
    if (!enemyTank || !star) return [];
    var route = predictRoute([ex, ey], star, steps);
    var targets = [[ex, ey]];
    for (var i = 0; i < route.length; i++) {
      if (!same(route[i], targets[targets.length - 1])) targets.push(route[i]);
    }
    return targets;
  }

  function bestGrassAssassination(star) {
    if (!star || !enemyTank || !teleportReady()) return null;
    var openingTrap = frame < 12;
    var overloadOpeningRisk = openingTrap && (enemySkillIs("overload") || _lastESkill === "overload");
    var enemyStarPath = overloadOpeningRisk ? pathDist([ex, ey], star) : 999;
    var targets = grassAssassinationTargets(star, 7);
    var best = null, bestScore = -9999;
    for (var x = 1; x < w - 1; x++) {
      for (var y = 1; y < h - 1; y++) {
        if (tile(x, y) !== "o") continue;
        if (!validTeleport(x, y)) continue;
        if (repeatedStarTeleport(x, y, star)) continue;
        var ed = dist(x, y, ex, ey);
        if (ed <= 5) continue;
        var starPath = pathDist([x, y], star);
        if (overloadOpeningRisk && enemyStarPath <= starPath) continue;
        if (!openingTrap && starPath > 8 && dist(x, y, star[0], star[1]) > 8) continue;
        var controls = false;
        var score = (openingTrap ? 230 : 180) - dist(px, py, x, y) * 2;
        score -= openingTrap ? Math.min(starPath, 18) * 3 : Math.min(starPath, 12) * 10;
        score += openNeighborCount(x, y) * 9;
        score += Math.min(ed, 9) * 4;
        for (var i = 0; i < targets.length; i++) {
          var target = targets[i];
          if (!canShoot([x, y], target)) continue;
          var gap = dist(x, y, target[0], target[1]);
          if (gap < 2 || gap > 10) continue;
          controls = true;
          score += (openingTrap ? 130 : 95) - i * (openingTrap ? 8 : 12) - gap * 3;
          if (target[0] === ex && target[1] === ey) score += 28;
        }
        if (!controls) continue;
        if ((x === ex || y === ey) && ed <= 9) score -= 90;
        if (score > bestScore) {
          bestScore = score;
          best = [x, y];
        }
      }
    }
    return bestScore >= 190 ? best : null;
  }

  function tryGrassAssassinationFire(star) {
    if (!star || !enemyTank || tile(px, py) !== "o") return false;
    if (me.bullet || me.status.fireLocked) return false;
    if (bulletThreatAt(px, py, 4) || overloadThreatAt(px, py) || laneDangerAt(px, py)) return false;
    var targets = grassAssassinationTargets(star, 7);
    for (var i = 0; i < targets.length; i++) {
      var target = targets[i];
      if (!canShoot(myPos, target)) continue;
      var gap = dist(px, py, target[0], target[1]);
      if (gap < 2 || gap > 10) continue;
      var want = dirTo(myPos, target);
      if (dir === want) return fireSafe();
      return turnTo(want);
    }
    return false;
  }

  function tryGrassAssassinationSetup(star) {
    if (!star || !enemyTank) return false;
    if (tryGrassAssassinationFire(star)) return true;
    if (!teleportReady()) return false;
    var target = bestGrassAssassination(star);
    if (!target) return false;
    if (same(myPos, target)) return false;
    castTeleport(target, star);
    return true;
  }

  function tryGrassAmbushSetup(star, myDist, enemyDist) {
    if (!star || !enemyTank) return false;
    if (!teleportReady()) return tryGrassAmbushFire(star, enemyDist);
    var target = bestGrassAmbush(star, myDist, enemyDist);
    if (!target) return tryGrassAmbushFire(star, enemyDist);
    if (same(myPos, target)) return tryGrassAmbushFire(star, enemyDist);
    if (repeatedStarTeleport(target[0], target[1], star)) return false;
    if (dist(px, py, target[0], target[1]) > 2) {
      castTeleport(target, star);
      return true;
    }
    var route = pathInfo(myPos, target, true);
    if (route && route.first) return moveDir(route.first);
    return false;
  }

  function mirrorRecoveryAnchor() {
    var cx = Math.floor(w / 2), cy = Math.floor(h / 2);
    var currentCenterGap = dist(px, py, cx, cy);
    var best = null, bestScore = -9999;
    for (var x = 1; x < w - 1; x++) {
      for (var y = 1; y < h - 1; y++) {
        if (!safeCell(x, y, true)) continue;
        var centerGap = dist(x, y, cx, cy);
        var score = 260 - centerGap * 20;
        score += openNeighborCount(x, y) * 7;
        if (tile(x, y) === "o") score += 3;
        if (centerGap > currentCenterGap) score -= (centerGap - currentCenterGap) * 12;
        if (_mirrorRecoverStarX >= 0) {
          var oldStarGap = dist(x, y, _mirrorRecoverStarX, _mirrorRecoverStarY);
          score += Math.min(oldStarGap, 6) * 5;
          if (oldStarGap <= 2) score -= 28;
        }
        if (enemyTank) {
          var ed = dist(x, y, ex, ey);
          if (ed < 4) continue;
          score -= Math.abs(ed - 6) * 5;
          if (x === ex || y === ey) score -= 18;
        }
        if (score > bestScore) {
          bestScore = score;
          best = [x, y];
        }
      }
    }
    return best || anchor();
  }

  function tryMirrorRecoveryMove() {
    if (game.star || !mirrorRecoveryActive()) return false;
    var target = mirrorRecoveryAnchor();
    if (!target || same(target, myPos)) return false;
    var safe = pathInfo(myPos, target, true);
    var raw = pathInfo(myPos, target, false);
    var pick = safe || raw;
    if (!pick || !pick.first) return false;
    if (safe && raw && safe.first !== raw.first) {
      var cx = Math.floor(w / 2), cy = Math.floor(h / 2);
      var safeNext = add(myPos, delta(safe.first));
      var rawNext = add(myPos, delta(raw.first));
      if (!fatalStepAt(rawNext[0], rawNext[1]) &&
        dist(rawNext[0], rawNext[1], cx, cy) < dist(safeNext[0], safeNext[1], cx, cy) &&
        (!enemyTank || dist(rawNext[0], rawNext[1], ex, ey) >= 4)) {
        pick = raw;
      }
    }
    return moveDir(pick.first);
  }

  function predictRoute(start, goal, steps) {
    if (!start || !goal || steps < 1) return [];
    var pos = [start[0], start[1]];
    var route = [];
    for (var i = 0; i < steps; i++) {
      var next = pathInfo(pos, goal, false);
      if (!next || !next.first) break;
      pos = add(pos, delta(next.first));
      route.push([pos[0], pos[1]]);
      if (same(pos, goal)) break;
    }
    return route;
  }

  function raidTarget() {
    if (_raidStarX >= 0 && _raidStarY >= 0) return [_raidStarX, _raidStarY];
    return game.star || myPos;
  }

  function openingRaidPlanFrom(startPos, target) {
    if (!enemyTank || !startPos || !target) return null;
    var candidates = [[ex, ey]].concat(predictRoute([ex, ey], target, 8));
    var best = null, bestScore = -9999;
    for (var i = 0; i < candidates.length; i++) {
      var aimAt = candidates[i];
      if (!canShoot(startPos, aimAt)) continue;
      var want = dirTo(startPos, aimAt);
      var gap = dist(startPos[0], startPos[1], aimAt[0], aimAt[1]);
      if (gap < 3 || gap > 10) continue;
      var score = 170 - i * 24 - gap * 4 - turnCost(dir, want) * 16;
      if (want === dir) score += 18;
      if (target && dist(startPos[0], startPos[1], target[0], target[1]) <= 1) score += 12;
      if (aimAt[0] === ex && aimAt[1] === ey) score += 20;
      if (score > bestScore) {
        bestScore = score;
        best = { dir: want, step: i, score: score, aimAt: aimAt };
      }
    }
    return best;
  }

  function enemyRouteLaneTrapAt(x, y, star) {
    if (!enemyTank || !star) return false;
    var facing = eDir || _lastEDir || "up";
    var route = [[ex, ey]].concat(predictRoute([ex, ey], star, 6));
    for (var i = 0; i < route.length; i++) {
      var p = route[i];
      if (p[0] !== x && p[1] !== y) continue;
      var gap = dist(p[0], p[1], x, y);
      if (gap < 2 || gap > 9) continue;
      var need = p[0] === x ? (y < p[1] ? "up" : "down") : (x < p[0] ? "left" : "right");
      if (!losFrom(p[0], p[1], need, x, y)) continue;
      if (i + turnCost(facing, need) <= 4) return true;
    }
    return false;
  }

  function bestStarTeleport(star) {
    if (!teleportReady() || !star) return null;
    if (leadStarShotTrap(star)) return null;
    var mirrorEnemy = enemyMirrorArrival(star);
    var best = null, bestScore = -9999;
    for (var x = star[0] - 2; x <= star[0] + 2; x++) {
      for (var y = star[1] - 2; y <= star[1] + 2; y++) {
        if (dist(x, y, star[0], star[1]) > 2) continue;
        if (!validTeleport(x, y)) continue;
        var score = 140 - dist(x, y, star[0], star[1]) * 35;
        var myFramesToStar = approachFramesFrom([x, y], dir, star);
        if (x === star[0] && y === star[1]) score += 70;
        if (enemyTank) {
          var ed = dist(x, y, ex, ey);
          if (ed <= 5) continue;
          if ((x === ex || y === ey) && ed <= 10) continue;
          if (enemyRouteLaneTrapAt(x, y, star)) continue;
          if (x === ex || y === ey) score -= 30;
          score += Math.min(ed, 8) * 3;
        }
        if (enemySkillIs("teleport") && myFramesToStar < 999) {
          score -= myFramesToStar * 42;
          if (myFramesToStar <= 1) score += 28;
          else if (myFramesToStar === 2) score += 12;
          if (mirrorEnemy) {
            if (myFramesToStar < mirrorEnemy.frames) score += 64;
            else if (myFramesToStar === mirrorEnemy.frames) score += 10;
            else score -= 84 + (myFramesToStar - mirrorEnemy.frames) * 18;
            if (mirrorPickupTrap([x, y], star, mirrorEnemy)) score -= 140;
          }
        }
        if (quickAimAt(x, y)) score -= 80;
        if (score > bestScore) { bestScore = score; best = [x, y]; }
      }
    }
    return best;
  }

  // Hold the first teleport lane for a few frames when it creates a real ambush line.
  function tryOpeningRaid() {
    if (game.star && mirrorContestActive(game.star)) return false;
    if (_raidUntil < frame || !enemyTank) return false;
    if (bulletThreatAt(px, py, 4) || overloadThreatAt(px, py) || laneDangerAt(px, py)) return false;
    var plan = openingRaidPlanFrom(myPos, raidTarget());
    if (!plan || plan.step > 6 || plan.score < 110) return false;
    _raidDir = plan.dir;
    if (canShoot(myPos, [ex, ey]) && dist(px, py, ex, ey) <= 7 && !me.bullet && !me.status.fireLocked) {
      if (dir === plan.dir) return fireSafe();
      return turnTo(plan.dir);
    }
    if (dir !== plan.dir) {
      turnTo(plan.dir);
      return true;
    }
    if (plan.step <= 3) return true;
    return false;
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
        castTeleport(safe, game.star);
        return true;
      }
    }
    return false;
  }

  function tryClearMound(target) {
    if (!target || me.bullet || me.status.fireLocked) return false;
    var f = delta(dir);
    if (tile(px + f[0], py + f[1]) === "m") {
      return fireSafe();
    }
    if (px !== target[0] && py !== target[1]) return false;
    var want = dirTo(myPos, target);
    var step = delta(want);
    var x = px + step[0], y = py + step[1];
    while (x !== target[0] || y !== target[1]) {
      var t = tile(x, y);
      if (t === "x") return false;
      if (t === "m") {
        if (dir === want) return fireSafe();
        return turnTo(want);
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

  function moveTowardForce(target) {
    var p = pathInfo(myPos, target, false);
    if (p && p.first) return moveDir(p.first);
    if (tryClearMound(target)) return true;
    return false;
  }

  function tryStarBreakout(star, myDist, enemyDist) {
    if (!star) return false;
    var allowLoose = _pursuitStall >= 2 || _stuck >= 2;
    var best = null, bestScore = -9999;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var next = add(myPos, delta(d));
      if (!open(next[0], next[1])) continue;
      if (enemyTank && next[0] === ex && next[1] === ey) continue;
      if (bulletActionTrap(d)) continue;
      if (!safeCell(next[0], next[1], !allowLoose)) continue;
      var nextDist = pathDist(next, star);
      if (nextDist >= 999) continue;
      var score = 180 - nextDist * 32 - turnCost(dir, d) * 8;
      if (nextDist < myDist) score += 36;
      else if (nextDist === myDist) score -= 6;
      else score -= 34;
      if (d === dir) score += 10;
      if (next[0] === star[0] && next[1] === star[1]) score += 70;
      if (enemyTank) {
        var enemyGap = dist(next[0], next[1], ex, ey);
        if (next[0] === ex || next[1] === ey) score -= 16;
        if (enemyGap <= 2) score -= 28;
        else score += Math.min(enemyGap, 6) * 3;
        if (enemyDist < nextDist) score -= 12;
      }
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best ? moveDir(best) : false;
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
        castTeleport(target, game.star);
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
    var route = enemyTank && target ? predictRoute([ex, ey], target, 4) : [];
    var best = null, bestScore = -9999;
    for (var x = 1; x < w - 1; x++) {
      for (var y = 1; y < h - 1; y++) {
        if (!safeCell(x, y, true)) continue;
        if (target && enemyRouteLaneTrapAt(x, y, target)) continue;
        var score = -dist(x, y, cx, cy) * 5;
        if (target) score -= dist(x, y, target[0], target[1]);
        if (tile(x, y) === "o") score += 2;
        if (enemyTank && canShoot([x, y], [ex, ey])) score += 24;
        if (enemyTank && (x === ex || y === ey)) score += 6;
        if (route.length) {
          for (var k = 0; k < route.length; k++) {
            if (canShoot([x, y], route[k])) score += 20 - k * 4;
          }
        }
        if (boostLeadLaneTrapAt(x, y)) score -= 80;
        if (score > bestScore) { bestScore = score; best = [x, y]; }
      }
    }
    return best || anchor();
  }

  function enemyDormant() {
    if (!enemyTank || frame < 10) return false;
    if (_homeEX < 0 || _homeEY < 0) return false;
    if (starsOf(enemy) > 0) return false;
    if (enemy && enemy.bullet) return false;
    return ex === _homeEX && ey === _homeEY;
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

  function pressureTargets() {
    if (!enemyTank) return [];
    var chase = game.star || anchor();
    var route = predictRoute([ex, ey], chase, 3);
    var targets = [[ex, ey]];
    for (var i = 0; i < route.length; i++) {
      if (!same(route[i], targets[targets.length - 1])) targets.push(route[i]);
    }
    return targets;
  }

  function tryAttack(urgentStar) {
    if (!enemyTank || me.bullet || me.status.fireLocked) return false;
    if (game.star && mirrorContestActive(game.star)) return false;
    if (!urgentStar && laneDangerAt(px, py) && !enemyDebuffed()) return false;
    var targets = pressureTargets();
    if (canShoot(myPos, [ex, ey])) {
      var directWant = dirTo(myPos, [ex, ey]);
      if (!urgentStar || dist(px, py, ex, ey) <= 4 || enemyDebuffed()) {
        if (dir === directWant) {
          if (fireSafe()) return true;
        } else if (turnTo(directWant)) {
          return true;
        }
      }
    }
    if (urgentStar) return false;

    var bestTurn = null, bestTurnTarget = null, bestTurnScore = -9999;
    for (var i = 0; i < targets.length; i++) {
      var aimAt = targets[i];
      if (px !== aimAt[0] && py !== aimAt[1]) continue;
      var want = dirTo(myPos, aimAt);
      if (!losFrom(px, py, want, aimAt[0], aimAt[1])) continue;
      var gap = dist(px, py, aimAt[0], aimAt[1]);
      if (gap < 2 || gap > 10) continue;
      var turnScore = 150 - i * 24 - gap * 5 - turnCost(dir, want) * 20;
      if (aimAt[0] === ex && aimAt[1] === ey) turnScore += 28;
      if (want === dir) turnScore += 20;
      if (turnScore > bestTurnScore) {
        bestTurnScore = turnScore;
        bestTurn = want;
        bestTurnTarget = aimAt;
      }
    }
    if (bestTurn) {
      if (bestTurn === dir && bestTurnTarget && canShoot(myPos, bestTurnTarget)) return fireSafe();
      return turnTo(bestTurn);
    }

    var bestMove = null, bestMoveScore = -9999;
    for (var dIndex = 0; dIndex < 4; dIndex++) {
      var d = dirs[dIndex];
      var next = add(myPos, delta(d));
      if (!safeCell(next[0], next[1], true)) continue;
      if (enemyTank && next[0] === ex && next[1] === ey) continue;
      if (bulletActionTrap(d)) continue;
      for (var tIndex = 0; tIndex < targets.length; tIndex++) {
        var target = targets[tIndex];
        if (!canShoot(next, target)) continue;
        var gapToTarget = dist(next[0], next[1], target[0], target[1]);
        if (gapToTarget < 2 || gapToTarget > 9) continue;
        var moveScore = 132 - tIndex * 18 - gapToTarget * 5 - turnCost(dir, d) * 10;
        if (d === dir) moveScore += 12;
        if (target[0] === ex && target[1] === ey) moveScore += 22;
        if (next[0] === ex || next[1] === ey) moveScore += 4;
        if (moveScore > bestMoveScore) {
          bestMoveScore = moveScore;
          bestMove = d;
        }
      }
    }
    return bestMove ? moveDir(bestMove) : false;
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

    if (dir === want) return fireSafe();
    return turnTo(want);
  }

  function tryMirrorRecoveryRace(star, myPath, enemyDist) {
    if (!star || !mirrorRecoveryActive()) return false;
    var raw = pathInfo(myPos, star, false);
    if (!raw || !raw.first || raw.dist >= 999) return false;
    if (enemyDist < raw.dist - 2) return false;
    if (myPath && myPath.first === raw.first && myPath.dist <= raw.dist + 1) return false;
    var next = add(myPos, delta(raw.first));
    if (fatalStepAt(next[0], next[1]) && dist(next[0], next[1], star[0], star[1]) > 1) return false;
    return moveDir(raw.first);
  }

  function quietStarLanding(star) {
    if (!star || !teleportReady()) return null;
    if (leadStarShotTrap(star)) return null;
    var candidates = [
      [star[0], star[1]],
      [star[0] + 1, star[1]],
      [star[0] - 1, star[1]],
      [star[0], star[1] + 1],
      [star[0], star[1] - 1],
      [star[0] + 2, star[1]],
      [star[0] - 2, star[1]],
      [star[0], star[1] + 2],
      [star[0], star[1] - 2],
    ];
    var best = null, bestScore = -9999;
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (!open(c[0], c[1])) continue;
      if (repeatedStarTeleport(c[0], c[1], star)) continue;
      if (enemyTank) {
        var ed = dist(c[0], c[1], ex, ey);
        if (ed <= 4) continue;
        if ((c[0] === ex || c[1] === ey) && ed <= 10) continue;
      }
      var score = 100 - dist(c[0], c[1], star[0], star[1]) * 24;
      if (same(c, star)) score += 40;
      if (tile(c[0], c[1]) === "o") score += 4;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  }

  function tryQuietStarRush(star) {
    if (!star || enemy && enemy.bullet) return false;
    if (w * h < 240) return false;
    var quietEnemy = !enemyTank || enemyDormant();
    if (!quietEnemy) return false;
    var raw = pathInfo(myPos, star, false);
    var rawDist = raw ? raw.dist : 999;
    if (teleportReady() && rawDist > 5) {
      var landing = quietStarLanding(star);
      if (landing) {
        castTeleport(landing, star);
        return true;
      }
    }
    if (raw && raw.first) return moveDir(raw.first);
    if (tryClearMound(star)) return true;
    return false;
  }

  if (game.star && tryGrassAssassinationSetup(game.star)) return;
  if (game.star && tryQuietStarRush(game.star)) return;
  if (tryImmediateLaneEscape()) return;
  if (tryPreemptAimDodge()) return;
  if (tryDodge()) return;
  if (tryKeepLeadSafe()) return;
  if (tryOpeningRaid()) return;

  if (game.star) {
    var star = game.star;
    if (tryMirrorContest(star)) return;
    if (tryAdjacentStarPickup(star)) return;
    var myPath = pathInfo(myPos, star, true) || pathInfo(myPos, star, false);
    var myDist = myPath ? myPath.dist : 999;
    var enemyDist = enemyTank ? pathDist([ex, ey], star) : 999;
    if (tryGrassAmbushSetup(star, myDist, enemyDist)) return;
    var stuckOrLate = _stuck >= 2 || _pursuitStall >= 2 || frame > 10;
    var shouldTeleport = teleportReady() && myDist > 2 && (stuckOrLate || myDist > enemyDist + 1 || frame < 20);
    if (shouldTeleport) {
      var landing = bestStarTeleport(star);
      var enemyFavoredOpen = enemyTank && frame < 20 && enemyDist + 2 < myDist;
      if (!landing && enemyFavoredOpen) {
        var pressure = pressureAnchor(star);
        if (pressure && validTeleport(pressure[0], pressure[1])) landing = pressure;
      }
      if (landing && repeatedStarTeleport(landing[0], landing[1], star)) landing = null;
      if (landing) {
        var raidPlan = frame < 12 ? openingRaidPlanFrom(landing, star) : null;
        if (raidPlan && raidPlan.step <= 6 && raidPlan.score >= 110) {
          _raidUntil = frame + raidPlan.step + 3;
          _raidStarX = star[0];
          _raidStarY = star[1];
          _raidDir = raidPlan.dir;
        } else {
          _raidUntil = -1;
          _raidStarX = -1;
          _raidStarY = -1;
          _raidDir = null;
        }
        castTeleport(landing, star);
        return;
      }
    }

    if (enemyDormant()) {
      if (moveTowardForce(star)) return;
      if (turnTo(dirTo(myPos, star))) return;
    }

    if (tryMirrorRecoveryRace(star, myPath, enemyDist)) return;

    if (riskyLeadStarRoute(star, myPath)) {
      if (tryAttack(false)) return;
      var hold = pressureAnchor(star);
      if (hold && !same(myPos, hold) && moveToward(hold, true)) return;
      if (enemyTank && turnTo(dirTo(myPos, [ex, ey]))) return;
    }

    var stalled = _stuck >= 2 || _pursuitStall >= 2;
    var urgent = myDist <= enemyDist + 4 || myDist <= 3 || frame > 30 || stalled;
    if (urgent && tryStarRacePressure(myDist, enemyDist)) return;
    if (urgent && moveToward(star, true)) return;
    if (urgent && tryStarBreakout(star, myDist, enemyDist)) return;
    if (stalled && moveTowardForce(star)) return;
    if (tryAttack(false)) return;
    if (moveToward(star, false)) return;
    if (tryClearMound(star)) return;
  }

  if (tryAttack(false)) return;
  if (tryMirrorRecoveryMove()) return;
  var home = anchor();
  if (dist(px, py, home[0], home[1]) > 1 && moveToward(home, true)) return;
  if (enemyTank && dist(px, py, home[0], home[1]) <= 2 && turnTo(dirTo(myPos, [ex, ey]))) return;

  if (_stuck >= 2 && teleportReady()) {
    var a = anchor();
    if (validTeleport(a[0], a[1])) {
      castTeleport(a, game.star);
      return;
    }
  }

  var fwd = add(myPos, delta(dir));
  if (safeCell(fwd[0], fwd[1], true) && !bulletActionTrap(dir)) me.go();
  else {
    var rightDir = dirs[(dirs.indexOf(dir) + 1) % 4];
    var leftDir = dirs[(dirs.indexOf(dir) + 3) % 4];
    if (!immediateEnemyShotAt(px, py) && !bulletActionTrap(rightDir)) me.turn("right");
    else if (!immediateEnemyShotAt(px, py) && !bulletActionTrap(leftDir)) me.turn("left");
  }
}
