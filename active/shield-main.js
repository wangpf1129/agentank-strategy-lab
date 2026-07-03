var _lastX = -1, _lastY = -1, _stuck = 0;
var _lastEX = -1, _lastEY = -1, _lastEDir = null, _eMoveDir = null, _lastSeen = -99;
var _homeEX = -1, _homeEY = -1;
var _myStars = 0, _enemyStars = 0, _lastStarX = -1, _lastStarY = -1;
var _lastBombAt = -99, _lastShieldAt = -99;
var _lastShieldedAt = -99;
var _ownBombX = -1, _ownBombY = -1, _ownBombExplodeAt = -99;
var _grassCampX = -1, _grassCampY = -1, _grassCampAt = -99;
var _lastMoveIntent = null, _lastIntentFrame = -99;
var _speakCount = 0, _lastSpeakAt = -99, _lastSpeakTag = "";

function onIdle(me, enemy, game) {
  var myPos = me.tank.position;
  var px = myPos[0], py = myPos[1];
  var dir = me.tank.direction;
  var frame = game.frames || 0;
  var dirs = ["up", "right", "down", "left"];
  var dv = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  var map = game.map || [];
  var w = map.length;
  var h = map[0] ? map[0].length : 0;
  var pathCache = {};
  var safetyCache = {};
  var bulletCache = {};
  var hiddenShooterCache = {};
  var projectileCache = {};
  var frameBullets = null;

  if (_ownBombX >= 0 && frame > _ownBombExplodeAt) {
    _ownBombX = -1;
    _ownBombY = -1;
    _ownBombExplodeAt = -99;
  }

  if (px === _lastX && py === _lastY) _stuck++;
  else _stuck = 0;
  _lastX = px;
  _lastY = py;

  var enemyTank = enemy && enemy.tank;
  var ex = enemyTank ? enemyTank.position[0] : -1;
  var ey = enemyTank ? enemyTank.position[1] : -1;
  var eDir = enemyTank ? enemyTank.direction : null;
  if (enemyTank) {
    if (_homeEX < 0) {
      _homeEX = ex;
      _homeEY = ey;
    }
    if (_lastEX >= 0) {
      var emx = ex - _lastEX, emy = ey - _lastEY;
      if (emx > 0) _eMoveDir = "right";
      else if (emx < 0) _eMoveDir = "left";
      else if (emy > 0) _eMoveDir = "down";
      else if (emy < 0) _eMoveDir = "up";
    }
    _lastEX = ex;
    _lastEY = ey;
    _lastEDir = eDir;
    _lastSeen = frame;
  } else if (_lastEX >= 0) {
    ex = _lastEX;
    ey = _lastEY;
    eDir = _lastEDir || _eMoveDir;
  }

  if (_lastStarX >= 0 && (!game.star || game.star[0] !== _lastStarX || game.star[1] !== _lastStarY)) {
    if (px === _lastStarX && py === _lastStarY) _myStars++;
    else if (enemyTank && ex === _lastStarX && ey === _lastStarY) _enemyStars++;
    _lastStarX = -1;
    _lastStarY = -1;
  }
  if (game.star) {
    _lastStarX = game.star[0];
    _lastStarY = game.star[1];
  }

  function tile(x, y) {
    var col = map[x];
    return col ? (col[y] || "x") : "x";
  }

  function blocked(x, y) {
    var t = tile(x, y);
    return t === "x" || t === "m";
  }

  function open(x, y) {
    return x >= 0 && y >= 0 && x < w && y < h && !blocked(x, y);
  }

  function rememberGrassCamp(x, y) {
    if (!open(x, y) || tile(x, y) !== "o") return false;
    _grassCampX = x;
    _grassCampY = y;
    _grassCampAt = frame;
    return true;
  }

  if (enemyTank) {
    if (tile(ex, ey) === "o") rememberGrassCamp(ex, ey);
    else if (_grassCampX >= 0 && dist(ex, ey, _grassCampX, _grassCampY) > 2) {
      _grassCampX = -1;
      _grassCampY = -1;
      _grassCampAt = -99;
    }
  } else if (_lastEX >= 0 && frame - _lastSeen <= 80 && tile(_lastEX, _lastEY) === "o") {
    rememberGrassCamp(_lastEX, _lastEY);
  }

  function dist(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  function delta(d) {
    return dv[d] || [0, -1];
  }

  function add(pos, d) {
    return [pos[0] + d[0], pos[1] + d[1]];
  }

  function same(a, b) {
    return !!(a && b && a[0] === b[0] && a[1] === b[1]);
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

  function turnSide(from, to) {
    var a = dirs.indexOf(from), b = dirs.indexOf(to);
    if (a < 0 || b < 0) return "right";
    return ((b - a + 4) % 4) === 3 ? "left" : "right";
  }

  function say(tag, lines, gap) {
    if (_speakCount >= 24) return false;
    if (frame - _lastSpeakAt < (gap || 5)) return false;
    if (_lastSpeakTag === tag && frame - _lastSpeakAt < 10) return false;
    var text = lines[(frame + px * 3 + py * 5 + tag.length) % lines.length];
    if (me && typeof me.speak === "function") me.speak(text);
    else if (typeof speak === "function") speak(text);
    else return false;
    _speakCount++;
    _lastSpeakAt = frame;
    _lastSpeakTag = tag;
    return true;
  }

  function moveDir(want) {
    if (!want || !dv[want]) return false;
    _lastMoveIntent = want;
    _lastIntentFrame = frame;
    if (dir === want) {
      me.go();
      return true;
    }
    me.turn(turnSide(dir, want));
    return true;
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

  function canShootFrom(pos, target) {
    if (!pos || !target) return false;
    var want = dirTo(pos, target);
    return losFrom(pos[0], pos[1], want, target[0], target[1]);
  }

  function starsOf(actor) {
    if (!actor) return 0;
    if (typeof actor.stars === "number") return actor.stars;
    if (typeof actor.score === "number") return actor.score;
    if (actor === me) return _myStars;
    if (actor === enemy) return _enemyStars;
    return 0;
  }

  function enemyDebuffed() {
    return !!(enemy && enemy.status && (enemy.status.frozen || enemy.status.stunned || enemy.status.poisoned));
  }

  function selfStunned() {
    return !!(me.status && (me.status.stunned || me.status.stun || me.status.reversed));
  }

  function shieldReady() {
    return !!(me.skill && me.skill.type === "shield" &&
      me.skill.remainingCooldownFrames === 0 && typeof me.shield === "function");
  }

  function shielded() {
    return !!(me.status && me.status.shielded);
  }

  function shieldRemaining() {
    if (me.skill && typeof me.skill.activeRemainingFrames === "number") return me.skill.activeRemainingFrames;
    if (me.effects && me.effects.self && me.effects.self.type === "shield" &&
      typeof me.effects.self.remainingFrames === "number") {
      return me.effects.self.remainingFrames;
    }
    return shielded() ? Math.max(0, 4 - (frame - _lastShieldAt)) : 0;
  }

  if (shielded()) _lastShieldedAt = frame;

  function shieldCoversNextExchange() {
    return shielded() && shieldRemaining() > 2;
  }

  function shieldCoversGunlineAction() {
    return shielded() && shieldRemaining() > 1;
  }

  function castShield() {
    if (!shieldReady() || shielded()) return false;
    _lastShieldAt = frame;
    say("shield", ["前方高能!开盾接一下", "弹幕太密,先套盾", "这波盾有说法"], 4);
    me.shield();
    return true;
  }

  function enemyShielded() {
    return !!(enemy && enemy.status && enemy.status.shielded);
  }

  function fireReady() {
    return !me.bullet && !(me.status && me.status.fireLocked);
  }

  function fireIfSafe() {
    if (!fireReady()) return false;
    if (ownBombDangerAt(px, py, 4)) return false;
    if (bulletDangerAt(px, py, 4) && !shieldCoversNextExchange()) return false;
    say("fire", ["弹幕发射!", "锁定了兄弟们", "这一炮有说法"], 4);
    me.fire();
    return true;
  }

  function fireWhileShieldPressures() {
    if (!fireReady()) return false;
    if (ownBombDangerAt(px, py, 4)) return false;
    if (bulletDangerAt(px, py, 4) && !shieldCoversGunlineAction()) return false;
    say("counter", ["盾还在,反打一炮", "接住了就还手", "别白挡,开火线"], 4);
    me.fire();
    return true;
  }

  function collectBullets() {
    if (frameBullets) return frameBullets;
    var bullets = [];
    if (enemy && enemy.bullet) bullets.push(enemy.bullet);
    var visible = game.visibleBullets;
    if (visible && visible.length) {
      for (var i = 0; i < visible.length; i++) {
        var b = visible[i];
        if (!b || !b.position || !b.direction) continue;
        if (b.ownerTankId && me.tank && b.ownerTankId === me.tank.id) continue;
        bullets.push(b);
      }
    }
    frameBullets = bullets;
    return frameBullets;
  }

  function bulletDangerAt(x, y, horizon) {
    horizon = typeof horizon === "number" ? horizon : 3;
    var key = x + "," + y + "|" + horizon;
    if (Object.prototype.hasOwnProperty.call(bulletCache, key)) return bulletCache[key];
    var bullets = collectBullets();
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      if (!b || !b.position || !b.direction || !dv[b.direction]) continue;
      var step = dv[b.direction];
      var bx = b.position[0], by = b.position[1];
      for (var n = 0; n <= horizon * 2; n++) {
        if (bx === x && by === y) {
          bulletCache[key] = true;
          return true;
        }
        bx += step[0];
        by += step[1];
        if (blocked(bx, by)) break;
      }
    }
    bulletCache[key] = false;
    return false;
  }

  function bulletLaneDirectionAt(x, y, horizon) {
    horizon = typeof horizon === "number" ? horizon : 3;
    var bullets = collectBullets();
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      if (!b || !b.position || !b.direction || !dv[b.direction]) continue;
      var step = dv[b.direction];
      var bx = b.position[0], by = b.position[1];
      for (var n = 0; n <= horizon * 2; n++) {
        if (bx === x && by === y) return b.direction;
        bx += step[0];
        by += step[1];
        if (blocked(bx, by)) break;
      }
    }
    return null;
  }

  function leavesBulletLane(moveDirName, bulletDir) {
    if (!moveDirName || !bulletDir) return false;
    if (bulletDir === "up" || bulletDir === "down") {
      return moveDirName === "left" || moveDirName === "right";
    }
    return moveDirName === "up" || moveDirName === "down";
  }

  function laneEscapeDirs(threatDir) {
    return (threatDir === "up" || threatDir === "down") ? ["left", "right"] : ["up", "down"];
  }

  function shotSetupAt(x, y, turnGrace, maxCells) {
    if (!enemyTank || enemyDebuffed() || (enemy && enemy.bullet)) return false;
    if (x !== ex && y !== ey) return false;
    var want = ex === x ? (y < ey ? "up" : "down") : (x < ex ? "left" : "right");
    if (turnCost(eDir, want) > turnGrace) return false;
    if (dist(ex, ey, x, y) > maxCells) return false;
    return losFrom(ex, ey, want, x, y);
  }

  function breakableShotSetupAt(x, y, turnGrace, maxCells) {
    if (!enemyTank || enemyDebuffed() || (enemy && enemy.bullet)) return false;
    if (x !== ex && y !== ey) return false;
    var want = ex === x ? (y < ey ? "up" : "down") : (x < ex ? "left" : "right");
    if (turnCost(eDir, want) > turnGrace) return false;
    if (dist(ex, ey, x, y) > maxCells) return false;
    var step = delta(want);
    var cx = ex + step[0], cy = ey + step[1];
    var dirt = 0;
    while (cx !== x || cy !== y) {
      var t = tile(cx, cy);
      if (t === "x") return false;
      if (t === "m") {
        dirt++;
        if (dirt > 1) return false;
      }
      cx += step[0];
      cy += step[1];
    }
    return dirt === 1;
  }

  function enemyLaneThreatDirectionAt(x, y, turnGrace, maxCells) {
    if (!enemyTank || enemyDebuffed() || (enemy && enemy.bullet)) return null;
    if (x !== ex && y !== ey) return null;
    var want = ex === x ? (y < ey ? "up" : "down") : (x < ex ? "left" : "right");
    if (turnCost(eDir, want) > turnGrace) return null;
    if (dist(ex, ey, x, y) > maxCells) return null;
    if (losFrom(ex, ey, want, x, y)) return want;
    if (breakableShotSetupAt(x, y, turnGrace, Math.min(maxCells, 5))) return want;
    return null;
  }

  function currentLaneThreatDirection(maxEnemyCells) {
    maxEnemyCells = typeof maxEnemyCells === "number" ? maxEnemyCells : 2;
    return bulletLaneDirectionAt(px, py, 8) ||
      enemyLaneThreatDirectionAt(px, py, 1, maxEnemyCells);
  }

  function enemyOverloadReady() {
    if (!enemy || !enemy.skill || enemy.skill.type !== "overload") return false;
    if (enemy.status && enemy.status.overloaded) return true;
    var cd = enemy.skill.remainingCooldownFrames;
    return typeof cd !== "number" || cd <= 2;
  }

  function overloadDangerAt(x, y) {
    if (!enemyTank || !enemyOverloadReady() || enemyDebuffed()) return false;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      if (turnCost(eDir, d) > 1) continue;
      if (losFrom(ex, ey, d, x, y) && dist(ex, ey, x, y) <= 10) return true;
      var offsets = (d === "left" || d === "right") ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
      for (var j = 0; j < offsets.length; j++) {
        var sx = ex + offsets[j][0], sy = ey + offsets[j][1];
        if (!open(sx, sy)) continue;
        if (losFrom(sx, sy, d, x, y) && dist(sx, sy, x, y) <= 10) return true;
      }
    }
    return false;
  }

  function hiddenLaneAt(x, y) {
    if (enemyTank || _lastEX < 0 || frame - _lastSeen > 14) return false;
    if (dist(_lastEX, _lastEY, x, y) > 7) return false;
    if (_eMoveDir === "up") return x === _lastEX && y < _lastEY;
    if (_eMoveDir === "down") return x === _lastEX && y > _lastEY;
    if (_eMoveDir === "left") return y === _lastEY && x < _lastEX;
    if (_eMoveDir === "right") return y === _lastEY && x > _lastEX;
    return (x === _lastEX || y === _lastEY) && dist(_lastEX, _lastEY, x, y) <= 4;
  }

  function hiddenShooterAt(x, y) {
    var cacheKey = x + "," + y;
    if (Object.prototype.hasOwnProperty.call(hiddenShooterCache, cacheKey)) return hiddenShooterCache[cacheKey];
    if (_grassCampX >= 0 && frame - _grassCampAt <= 80 &&
      (x === _grassCampX || y === _grassCampY) &&
      dist(_grassCampX, _grassCampY, x, y) <= 10) {
      var campDir = _grassCampX === x ? (y < _grassCampY ? "up" : "down") :
        (x < _grassCampX ? "left" : "right");
      if (losFrom(_grassCampX, _grassCampY, campDir, x, y)) {
        hiddenShooterCache[cacheKey] = true;
        return true;
      }
    }
    if (enemyTank || _lastEX < 0 || frame - _lastSeen > 18) return false;
    var maxSteps = Math.max(1, Math.min(4, frame - _lastSeen + 1));
    var queue = [{ x: _lastEX, y: _lastEY, d: 0 }];
    var seen = {};
    seen[_lastEX + "," + _lastEY] = true;
    for (var head = 0; head < queue.length && queue.length < 90; head++) {
      var item = queue[head];
      if (tile(item.x, item.y) === "o" &&
        (item.x === x || item.y === y) && dist(item.x, item.y, x, y) <= 8) {
        var need = item.x === x ? (y < item.y ? "up" : "down") : (x < item.x ? "left" : "right");
        if (losFrom(item.x, item.y, need, x, y)) {
          rememberGrassCamp(item.x, item.y);
          hiddenShooterCache[cacheKey] = true;
          return true;
        }
      }
      if (item.d >= maxSteps) continue;
      for (var i = 0; i < 4; i++) {
        var step = delta(dirs[i]);
        var nx = item.x + step[0], ny = item.y + step[1];
        var k = nx + "," + ny;
        if (seen[k] || !open(nx, ny)) continue;
        seen[k] = true;
        queue.push({ x: nx, y: ny, d: item.d + 1 });
      }
    }
    hiddenShooterCache[cacheKey] = false;
    return false;
  }

  function hardBlockedAt(x, y) {
    if (!open(x, y)) return true;
    return !!(enemyTank && x === ex && y === ey);
  }

  function projectileDangerAt(x, y) {
    var key = x + "," + y;
    if (Object.prototype.hasOwnProperty.call(projectileCache, key)) return projectileCache[key];
    var danger = bulletDangerAt(x, y, 3) || shotSetupAt(x, y, 1, 8) ||
      breakableShotSetupAt(x, y, 1, 5) ||
      overloadDangerAt(x, y) || hiddenShooterAt(x, y);
    projectileCache[key] = danger;
    return danger;
  }

  function ownBombBlastAt(x, y) {
    if (_ownBombX < 0) return false;
    if (x !== _ownBombX && y !== _ownBombY) return false;
    if (dist(x, y, _ownBombX, _ownBombY) > 2) return false;
    var sx = x === _ownBombX ? 0 : (x > _ownBombX ? 1 : -1);
    var sy = y === _ownBombY ? 0 : (y > _ownBombY ? 1 : -1);
    var cx = _ownBombX + sx, cy = _ownBombY + sy;
    while (cx !== x || cy !== y) {
      if (tile(cx, cy) === "x") return false;
      cx += sx;
      cy += sy;
    }
    return true;
  }

  function ownBombDangerAt(x, y, horizon) {
    if (_ownBombX < 0 || !ownBombBlastAt(x, y)) return false;
    return frame + (horizon || 0) >= _ownBombExplodeAt - 1;
  }

  function safeCell(x, y, strict) {
    var key = x + "," + y + "|" + (strict ? 1 : 0) + "|" + (shielded() ? 1 : 0);
    if (Object.prototype.hasOwnProperty.call(safetyCache, key)) return safetyCache[key];
    var safe = true;
    if (hardBlockedAt(x, y)) safe = false;
    else if (x === _ownBombX && y === _ownBombY) safe = false;
    else if (ownBombDangerAt(x, y, strict ? 5 : 3)) safe = false;
    else if (!shieldCoversNextExchange() && projectileDangerAt(x, y)) safe = false;
    else if (strict && hiddenLaneAt(x, y)) safe = false;
    safetyCache[key] = safe;
    return safe;
  }

  function riskyButShieldable(x, y) {
    return !shielded() && shieldReady() && !hardBlockedAt(x, y) &&
      (bulletDangerAt(x, y, 3) || shotSetupAt(x, y, 1, 8) ||
        breakableShotSetupAt(x, y, 1, 5) ||
        overloadDangerAt(x, y) || hiddenShooterAt(x, y));
  }

  function roughDistToStar(pos) {
    return game.star ? dist(pos[0], pos[1], game.star[0], game.star[1]) : 99;
  }

  function dirsToward(pos, target) {
    return dirs.slice().sort(function (a, b) {
      var na = add(pos, delta(a));
      var nb = add(pos, delta(b));
      var da = dist(na[0], na[1], target[0], target[1]);
      var db = dist(nb[0], nb[1], target[0], target[1]);
      if (da !== db) return da - db;
      var ta = turnCost(dir, a);
      var tb = turnCost(dir, b);
      if (ta !== tb) return ta - tb;
      if (a === _lastMoveIntent && frame - _lastIntentFrame <= 2) return -1;
      if (b === _lastMoveIntent && frame - _lastIntentFrame <= 2) return 1;
      return dirs.indexOf(a) - dirs.indexOf(b);
    });
  }

  function pathInfo(start, goal, avoidDanger) {
    if (!goal || !open(goal[0], goal[1])) return null;
    if (same(start, goal)) return { first: null, dist: 0 };
    var cacheKey = start[0] + "," + start[1] + ">" + goal[0] + "," + goal[1] + "|" + (avoidDanger ? 1 : 0);
    if (Object.prototype.hasOwnProperty.call(pathCache, cacheKey)) return pathCache[cacheKey];
    if (start[0] === goal[0] || start[1] === goal[1]) {
      var lineWant = dirTo(start, goal);
      var lineStep = delta(lineWant);
      var lx = start[0] + lineStep[0], ly = start[1] + lineStep[1];
      var lineDist = 1;
      var lineOk = true;
      while (lx !== goal[0] || ly !== goal[1]) {
        if (!open(lx, ly) || (enemyTank && lx === ex && ly === ey) ||
          (avoidDanger && lineDist < 5 && !safeCell(lx, ly, true))) {
          lineOk = false;
          break;
        }
        lx += lineStep[0];
        ly += lineStep[1];
        lineDist++;
      }
      if (lineOk && open(goal[0], goal[1]) &&
        (!avoidDanger || lineDist >= 5 || safeCell(goal[0], goal[1], true))) {
        var lineFound = { first: lineWant, dist: lineDist };
        pathCache[cacheKey] = lineFound;
        return lineFound;
      }
    }
    var queue = [{ pos: start, first: null, dist: 0 }];
    var seen = {};
    seen[start[0] + "," + start[1]] = true;
    for (var head = 0; head < queue.length && queue.length < 520; head++) {
      var item = queue[head];
      var order = item.dist <= 1 ? dirsToward(item.pos, goal) : dirs;
      for (var i = 0; i < 4; i++) {
        var d = order[i];
        var next = add(item.pos, delta(d));
        var k = next[0] + "," + next[1];
        if (seen[k] || !open(next[0], next[1])) continue;
        if (enemyTank && next[0] === ex && next[1] === ey) continue;
        if (avoidDanger && item.dist < 5 && !safeCell(next[0], next[1], true)) continue;
        var first = item.first || d;
        if (same(next, goal)) {
          var found = { first: first, dist: item.dist + 1 };
          pathCache[cacheKey] = found;
          return found;
        }
        seen[k] = true;
        queue.push({ pos: next, first: first, dist: item.dist + 1 });
      }
    }
    pathCache[cacheKey] = null;
    return null;
  }

  function pathDist(pos, target) {
    var info = pathInfo(pos, target, false);
    return info ? info.dist : 999;
  }

  function scoreMargin() {
    return starsOf(me) - starsOf(enemy);
  }

  function starUnderPressure(star) {
    if (!star) return false;
    return bulletDangerAt(star[0], star[1], 3) ||
      shotSetupAt(star[0], star[1], 1, 10) ||
      breakableShotSetupAt(star[0], star[1], 1, 6) ||
      overloadDangerAt(star[0], star[1]) ||
      hiddenShooterAt(star[0], star[1]);
  }

  function postStarExitAvailable(star) {
    if (!star) return false;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var step = delta(d);
      var x = star[0] + step[0], y = star[1] + step[1];
      if (!open(x, y)) continue;
      if (enemyTank && x === ex && y === ey) continue;
      if (x === _ownBombX && y === _ownBombY) continue;
      if (ownBombDangerAt(x, y, 4)) continue;
      if (bulletDangerAt(x, y, 3)) continue;
      if (shotSetupAt(x, y, 1, 8)) continue;
      if (breakableShotSetupAt(x, y, 1, 5)) continue;
      if (overloadDangerAt(x, y) || hiddenShooterAt(x, y)) continue;
      return true;
    }
    return false;
  }

  function starValueHigh(next) {
    if (!game.star) return false;
    var myDist = pathDist(myPos, game.star);
    var enemyDist = enemyTank ? pathDist([ex, ey], game.star) : 999;
    var margin = scoreMargin();
    if (same(next, game.star)) {
      if (margin <= 0) return true;
      if (margin === 1) return frame > 116 || enemyDist <= myDist + 1 || myDist <= 1;
      return false;
    }
    return (frame > 116 && margin <= 1) || margin <= 0 ||
      (margin <= 1 && myDist <= 4) || enemyDist <= myDist + 1;
  }

  function shieldStarWorthwhile(star) {
    if (!star || !starValueHigh(star)) return false;
    var margin = scoreMargin();
    if (margin >= 2) return false;
    if (margin >= 1 && starUnderPressure(star) && pathDist(myPos, star) > 1) return false;
    if (margin + 1 >= 2 && !postStarExitAvailable(star)) return false;
    return true;
  }

  function knownEnemyTarget(maxAge) {
    if (enemyTank) return [ex, ey];
    if (_lastEX < 0 || frame - _lastSeen > maxAge) return null;
    return [_lastEX, _lastEY];
  }

  function enemyAimsAtUs(maxCells) {
    if (!enemyTank || enemyDebuffed() || (enemy && enemy.bullet)) return false;
    if (dist(px, py, ex, ey) > maxCells) return false;
    return losFrom(ex, ey, eDir, px, py);
  }

  function tryShieldedGunlinePressure() {
    if (enemyShielded() || !fireReady() || !shieldCoversGunlineAction()) return false;
    var target = knownEnemyTarget(8);
    if (!target) return false;
    if (dist(px, py, target[0], target[1]) > 8) return false;
    var want = dirTo(myPos, target);
    if (!losFrom(px, py, want, target[0], target[1])) return false;
    if (dir === want) return fireWhileShieldPressures();
    if (turnCost(dir, want) <= 1 && !ownBombDangerAt(px, py, 4)) {
      say("counter", ["盾还在,反打一炮", "接住了就还手", "别白挡,开火线"], 4);
      me.turn(turnSide(dir, want));
      return true;
    }
    return false;
  }

  function tryImmediateShot() {
    if (!enemyTank || enemyShielded() || !fireReady()) return false;
    var target = [ex, ey];
    var want = dirTo(myPos, target);
    if (!losFrom(px, py, want, ex, ey)) return false;
    if (scoreMargin() < 0 && !shielded() && shieldReady() && enemyAimsAtUs(14)) return castShield();
    if (dir === want) return fireIfSafe();
    if (turnCost(dir, want) <= 1 && !bulletDangerAt(px, py, 4) &&
      !ownBombDangerAt(px, py, 4) && !shotSetupAt(px, py, 0, 7)) {
      me.turn(turnSide(dir, want));
      return true;
    }
    if (shotSetupAt(px, py, 0, 7) && castShield()) return true;
    return false;
  }

  function tryShieldCounterPressure() {
    if (!enemyTank || enemyShielded() || !fireReady() || !shieldCoversNextExchange()) return false;
    if (dist(px, py, ex, ey) > 6) return false;
    var want = dirTo(myPos, [ex, ey]);
    if (!losFrom(px, py, want, ex, ey)) return false;
    if (dir === want) return fireIfSafe();
    if (turnCost(dir, want) <= 1 && !ownBombDangerAt(px, py, 4)) {
      say("counter", ["盾还在,反打一炮", "接住了就还手", "别白挡,开火线"], 4);
      me.turn(turnSide(dir, want));
      return true;
    }
    return false;
  }

  function tryGuardedStarBreak() {
    if (!game.star || !enemyTank || !shieldReady() || shielded()) return false;
    if (hardBlockedAt(game.star[0], game.star[1])) return false;
    if (pathDist(myPos, game.star) > 4) return false;
    if (dist(ex, ey, game.star[0], game.star[1]) > 1) return false;
    if (!shieldStarWorthwhile(game.star)) return false;
    if (projectileDangerAt(game.star[0], game.star[1]) || dist(ex, ey, game.star[0], game.star[1]) <= 1) {
      say("shield-star", ["守星是吧,开盾冲", "这星不让?我顶盾拿", "卡点也没用,冲"], 4);
      return castShield();
    }
    return false;
  }

  function tryContestedStarLineHold() {
    if (!game.star || !enemyTank) return false;
    if (!(px === game.star[0] || py === game.star[1])) return false;
    if (dist(px, py, game.star[0], game.star[1]) > 4) return false;
    if (dist(ex, ey, game.star[0], game.star[1]) > 3) return false;

    var want = dirTo(myPos, game.star);
    var next = add(myPos, delta(want));
    if (safeCell(next[0], next[1], true) || shieldCoversNextExchange()) return false;
    if (riskyButShieldable(next[0], next[1]) && shieldStarWorthwhile(game.star) && castShield()) return true;

    if (dir !== want && !projectileDangerAt(px, py) && !ownBombDangerAt(px, py, 3)) {
      say("star-line", ["星线不能白让", "这个点位我先卡住", "守住十字线"], 5);
      me.turn(turnSide(dir, want));
      return true;
    }
    if (dir === want && !bulletDangerAt(px, py, 1) && !ownBombDangerAt(px, py, 3)) {
      say("star-line", ["先卡星线", "别急,点位还在", "这条线不能让"], 5);
      return true;
    }
    return false;
  }

  function enemyStarRushThreat(myDist, enemyDist) {
    if (!enemyTank || !game.star) return false;
    var type = enemy.skill && enemy.skill.type;
    var cd = enemySkillCooldown();
    var mobile = type === "teleport" || type === "boost";
    if (type === "teleport" && (cd <= 18 || enemyDist <= myDist + 6)) return true;
    if (mobile && (cd <= 12 || enemyDist <= myDist + 4)) return true;
    if (enemyDist < myDist - 1) return true;
    if (starsOf(enemy) >= starsOf(me) && enemyDist <= myDist + 1) return true;
    return frame > 88 && enemyDist <= myDist + 1;
  }

  function enemySkillCooldown() {
    return enemy && enemy.skill && typeof enemy.skill.remainingCooldownFrames === "number"
      ? enemy.skill.remainingCooldownFrames : 0;
  }

  function teleportStarTrapActive(myDist, enemyDist) {
    if (!enemyTank || !game.star || !(enemy.skill && enemy.skill.type === "teleport")) return false;
    if (myDist <= 2) return false;
    if (scoreMargin() >= 2 && frame < 116) return false;
    var cd = enemySkillCooldown();
    if (enemyDist + 2 < myDist) return true;
    if (cd <= 10 && (starsOf(enemy) >= starsOf(me) || myDist > 5)) return true;
    return starsOf(enemy) > starsOf(me) && enemyDist <= myDist + 2;
  }

  function tryStarInterception() {
    if (!game.star || !enemyTank) return false;
    var myDist = pathDist(myPos, game.star);
    var enemyDist = pathDist([ex, ey], game.star);
    var enemySkill = enemy.skill && enemy.skill.type;
    var teleportPressure = enemySkill === "teleport" && enemyDist <= myDist + 6;
    var teleportTrap = teleportStarTrapActive(myDist, enemyDist);
    if (myDist <= 2 && !teleportPressure) return false;
    if (!enemyStarRushThreat(myDist, enemyDist)) return false;

    var candidates = [];
    if (!teleportTrap) candidates.push(game.star);
    var starLaneRadius = teleportPressure ? 5 : 3;
    for (var i = 0; i < 4; i++) {
      var step = delta(dirs[i]);
      for (var r = 1; r <= starLaneRadius; r++) {
        candidates.push([game.star[0] + step[0] * r, game.star[1] + step[1] * r]);
      }
    }

    var best = null, bestScore = -99999;
    var seen = {};
    for (var c = 0; c < candidates.length; c++) {
      var target = candidates[c];
      var key = target[0] + "," + target[1];
      if (seen[key] || !open(target[0], target[1])) continue;
      seen[key] = true;
      if (enemyTank && target[0] === ex && target[1] === ey) continue;
      if (!safeCell(target[0], target[1], true) && !riskyButShieldable(target[0], target[1])) continue;
      if (!(target[0] === game.star[0] || target[1] === game.star[1])) continue;

      var info = pathInfo(myPos, target, true) || pathInfo(myPos, target, false);
      if (!info) continue;
      if (info.dist > Math.max(5, myDist + 1)) continue;

      var targetStarDist = dist(target[0], target[1], game.star[0], game.star[1]);
      var controlsStarLane = (target[0] === game.star[0] || target[1] === game.star[1]) &&
        canShootFrom(target, game.star);
      if (targetStarDist > 1 && !controlsStarLane) continue;
      var score = 140 - info.dist * 18 - targetStarDist * 12;
      if (same(target, game.star)) score += 20;
      if (targetStarDist === 1) score += 18;
      if (teleportPressure) {
        if (same(target, game.star) && enemyDist < myDist) score -= 48;
        if (targetStarDist === 1) score += 32;
        if (targetStarDist === 2) score += 10;
        if (controlsStarLane) score += 20;
        if (teleportTrap && controlsStarLane) {
          score += 38;
          if (targetStarDist >= 3 && targetStarDist <= 5) score += 24;
          if (same(target, myPos)) score += 28;
        }
      }
      if (clearLineTo(target)) score += 8;
      if (canShootFrom(target, [ex, ey])) score += teleportPressure ? 42 : 28;
      if (target[0] === game.star[0] || target[1] === game.star[1]) score += 16;
      if (enemyDist < myDist) score += 18;
      if (frame > 96) score += 10;
      if (riskyButShieldable(target[0], target[1])) score -= 12;
      if (score > bestScore) {
        bestScore = score;
        best = { target: target, info: info };
      }
    }

    if (!best || bestScore < 30) return false;
    if (best.info.dist === 0) {
      if (teleportTrap && fireReady() && canShootFrom(myPos, game.star)) {
        var guardDir = dirTo(myPos, game.star);
        if (dir === guardDir) return fireIfSafe();
        if (!projectileDangerAt(px, py) && !ownBombDangerAt(px, py, 3)) {
          say("intercept", ["别追屁股,先卡点", "下一颗我先蹲", "星线提前占住"], 5);
          me.turn(turnSide(dir, guardDir));
          return true;
        }
      }
      if (!enemyShielded() && fireReady() && canShootFrom(myPos, [ex, ey])) {
        var shootDir = dirTo(myPos, [ex, ey]);
        if (dir === shootDir) return fireIfSafe();
        if (!projectileDangerAt(px, py)) {
          me.turn(turnSide(dir, shootDir));
          return true;
        }
      }
      var faceStar = dirTo(myPos, game.star);
      if (dir !== faceStar && !projectileDangerAt(px, py) && !ownBombDangerAt(px, py, 3)) {
        say("intercept", ["别追屁股,先卡点", "下一颗我先蹲", "星线提前占住"], 5);
        me.turn(turnSide(dir, faceStar));
        return true;
      }
      return false;
    }
    var n = add(myPos, delta(best.info.first));
    if (safeCell(n[0], n[1], true)) {
      say("intercept", ["别追屁股,先卡点", "下一颗我先蹲", "星线提前占住"], 5);
      return moveDir(best.info.first);
    }
    if (riskyButShieldable(n[0], n[1]) && castShield()) return true;
    return false;
  }

  function tryEarlyLanePressure() {
    if (!enemyTank || frame > 36 || enemyShielded() || !fireReady()) return false;
    if (dist(px, py, ex, ey) <= 2) return false;
    if (game.star && pathDist(myPos, game.star) <= 2) return false;
    if (bulletDangerAt(px, py, 2) || ownBombDangerAt(px, py, 4)) return false;

    var type = enemy.skill && enemy.skill.type;
    var urgent = type === "teleport" || type === "cloak" || type === "stun" ||
      type === "freeze" || !game.star || starsOf(enemy) > starsOf(me);
    if (!urgent) return false;

    var baseStarDist = game.star ? roughDistToStar(myPos) : 99;
    var best = null, bestScore = -99999;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var n = add(myPos, delta(d));
      if (!safeCell(n[0], n[1], true)) continue;
      if (!canShootFrom(n, [ex, ey])) continue;
      var score = 90 - turnCost(dir, d) * 10 - dist(n[0], n[1], ex, ey) * 2;
      if (type === "teleport") score += 14;
      if (game.star) score -= Math.max(0, roughDistToStar(n) - baseStarDist) * 9;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    if (best && bestScore > 30) {
      say("pressure", ["别空跑,先架枪", "传送要快?我先压线", "别白给,先出枪线"], 5);
      return moveDir(best);
    }
    return false;
  }

  function tryPostShieldResetGuard() {
    var justShielded = frame - _lastShieldAt <= 7 || frame - _lastShieldedAt <= 2 ||
      (shielded() && shieldRemaining() <= 1);
    if (!justShielded) return false;
    if (shieldCoversNextExchange()) return false;
    if (!(bulletLaneDirectionAt(px, py, 8) || bulletDangerAt(px, py, 4) ||
      shotSetupAt(px, py, 1, 7) || breakableShotSetupAt(px, py, 1, 5))) return false;
    if (tryShieldedGunlinePressure()) return true;
    if (tryShieldCounterPressure()) return true;
    if (tryCommittedLaneEscape()) return true;
    if (castShield()) return true;
    return tryDodge(true);
  }

  function tryLateValuePressure() {
    if (!enemyTank || frame < 92 || enemyShielded()) return false;
    if (game.star && dist(px, py, game.star[0], game.star[1]) <= 2 &&
      pathDist(myPos, game.star) <= 2) return false;
    if (starsOf(me) > starsOf(enemy) + 1 && game.star && frame < 116) return false;

    if (fireReady()) {
      var want = dirTo(myPos, [ex, ey]);
      if (losFrom(px, py, want, ex, ey)) {
        if (dir === want) return fireIfSafe();
        if (!projectileDangerAt(px, py) && !ownBombDangerAt(px, py, 4)) {
          say("pressure", ["拖到后期要给压力", "别只看星,压一炮", "平星要主动点"], 5);
          me.turn(turnSide(dir, want));
          return true;
        }
      }
      var baseStarDist = game.star ? roughDistToStar(myPos) : 99;
      var best = null, bestScore = -99999;
      for (var i = 0; i < 4; i++) {
        var d = dirs[i];
        var n = add(myPos, delta(d));
        if (!safeCell(n[0], n[1], true)) continue;
        if (!canShootFrom(n, [ex, ey])) continue;
        var score = 80 - turnCost(dir, d) * 8 - dist(n[0], n[1], ex, ey);
      if (game.star) score -= Math.max(0, roughDistToStar(n) - baseStarDist) * 10;
        if (score > bestScore) {
          bestScore = score;
          best = d;
        }
      }
      if (best) {
        say("pressure", ["拖到后期要给压力", "别只看星,压一炮", "平星要主动点"], 5);
        return moveDir(best);
      }
    }
    return false;
  }

  function tryBombEscape() {
    if (!ownBombBlastAt(px, py) && !ownBombDangerAt(px, py, 5)) return false;
    var imminentSelfBomb = ownBombDangerAt(px, py, 2);
    var best = null, bestScore = -99999;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var n = add(myPos, delta(d));
      if (hardBlockedAt(n[0], n[1])) continue;
      var nextBombBlast = ownBombBlastAt(n[0], n[1]);
      var nextProjectileDanger = projectileDangerAt(n[0], n[1]);
      if (nextProjectileDanger && !shielded() && !imminentSelfBomb) continue;
      var score = 0;
      if (!nextBombBlast) score += 260;
      else score -= imminentSelfBomb ? 420 : 80;
      if (nextProjectileDanger && !shielded()) score -= 90;
      score += dist(n[0], n[1], _ownBombX, _ownBombY) * 12;
      score -= turnCost(dir, d) * 6;
      if (game.star) score -= roughDistToStar(n) * 2;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    if (best) {
      say("bomb-escape", ["礼物快炸了,溜!", "别踩自己节目效果", "爆点来了先撤"], 4);
      return moveDir(best);
    }
    return false;
  }

  function tryHazardEvasion() {
    if (tryBombEscape()) return true;
    if (bulletLaneDirectionAt(px, py, 8) || bulletDangerAt(px, py, 4)) {
      if (tryShieldedGunlinePressure()) return true;
      if (tryShieldCounterPressure()) return true;
      if (!bulletDangerAt(px, py, 1) && tryCommittedLaneEscape()) return true;
      if (!bulletDangerAt(px, py, 1) && tryDodge(true)) return true;
      if (castShield()) return true;
      if (tryCommittedLaneEscape()) return true;
      return tryDodge(true);
    }
    return false;
  }

  function tryEmergencyDefense() {
    if (bulletDangerAt(px, py, 2)) {
      if (castShield()) return true;
      if (tryCommittedLaneEscape()) return true;
      return tryDodge(true);
    }
    if (breakableShotSetupAt(px, py, 0, 5)) {
      if (tryCommittedLaneEscape()) return true;
      if (tryDodge(true)) return true;
      if (castShield()) return true;
      return false;
    }
    var closeAimed = shotSetupAt(px, py, 0, 5);
    var closeOneTurnAimed = !closeAimed && shotSetupAt(px, py, 1, 2);
    if (shotSetupAt(px, py, 0, 7) || closeAimed || closeOneTurnAimed || overloadDangerAt(px, py)) {
      if (closeAimed) {
        if (castShield()) return true;
        if (tryCommittedLaneEscape(2)) return true;
        if (!shielded() || shieldRemaining() <= 1) return tryDodge(true);
      }
      if (closeOneTurnAimed) {
        if (tryCommittedLaneEscape(2)) return true;
        if (castShield()) return true;
        if (!shielded() || shieldRemaining() <= 1) return tryDodge(true);
      }
      if (enemyTank && !enemyShielded() && fireReady() && dir === dirTo(myPos, [ex, ey]) && canShootFrom(myPos, [ex, ey])) {
        return fireIfSafe();
      }
      if (castShield()) return true;
      return tryDodge(true);
    }
    if (hiddenShooterAt(px, py)) {
      if (tryShieldedGunlinePressure()) return true;
      if (castShield()) return true;
      return tryDodge(true);
    }
    return false;
  }

  function committedLaneEscapeDir(threatDir) {
    if (!threatDir) return null;
    if (_lastMoveIntent && frame - _lastIntentFrame <= 3 &&
      leavesBulletLane(_lastMoveIntent, threatDir)) {
      var committed = add(myPos, delta(_lastMoveIntent));
      if (safeCell(committed[0], committed[1], true)) return _lastMoveIntent;
    }

    var forward = add(myPos, delta(dir));
    if (leavesBulletLane(dir, threatDir) && safeCell(forward[0], forward[1], true)) {
      return dir;
    }

    var options = laneEscapeDirs(threatDir);
    var best = null, bestScore = -99999;
    for (var i = 0; i < options.length; i++) {
      var d = options[i];
      var n = add(myPos, delta(d));
      if (!safeCell(n[0], n[1], true)) continue;
      var score = 160 - turnCost(dir, d) * 24;
      if (d === dir) score += 30;
      if (d === _lastMoveIntent && frame - _lastIntentFrame <= 3) score += 24;
      if (enemyTank) score += Math.min(12, dist(n[0], n[1], ex, ey));
      if (game.star) score -= roughDistToStar(n) * 2;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  }

  function tryCommittedLaneEscape(maxEnemyCells) {
    var threatDir = currentLaneThreatDirection(maxEnemyCells);
    var escapeDir = committedLaneEscapeDir(threatDir);
    if (!escapeDir) return false;
    say("dodge", ["走位走位!", "别换方向了先出去", "先离开弹道"], 3);
    return moveDir(escapeDir);
  }

  function tryDodge(panic) {
    if (panic && selfStunned()) {
      var stunnedForward = add(myPos, delta(dir));
      if (safeCell(stunnedForward[0], stunnedForward[1], true)) {
        say("dodge", ["被控了也要走!", "反向操作先离线", "控我?先挪一格"], 3);
        me.go();
        return true;
      }
    }
    if (panic && _lastMoveIntent && frame - _lastIntentFrame <= 2) {
      var committed = add(myPos, delta(_lastMoveIntent));
      if (safeCell(committed[0], committed[1], true)) {
        say("dodge", ["走位走位!", "别换方向了先出去", "先离开弹道"], 3);
        return moveDir(_lastMoveIntent);
      }
    }
    if (panic) {
      var bulletLane = bulletLaneDirectionAt(px, py, 4);
      var forward = add(myPos, delta(dir));
      if (leavesBulletLane(dir, bulletLane) && safeCell(forward[0], forward[1], true)) {
        _lastMoveIntent = dir;
        _lastIntentFrame = frame;
        say("dodge", ["走位走位!", "别换方向了先出去", "先离开弹道"], 3);
        me.go();
        return true;
      }
    }
    var best = null, bestScore = -99999;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var n = add(myPos, delta(d));
      if (!safeCell(n[0], n[1], true)) continue;
      var score = 100 - turnCost(dir, d) * 12;
      if (d === dir) score += 6;
      if (game.star) score -= roughDistToStar(n) * (panic ? 2 : 5);
      if (enemyTank) score += Math.min(6, dist(n[0], n[1], ex, ey));
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    if (best) {
      say("dodge", panic ? ["走位走位!", "这波不能硬吃", "弹幕擦边过"] : ["小走位拉扯一下", "别急,调个身位", "这路我熟"], panic ? 3 : 7);
      return moveDir(best);
    }
    return false;
  }

  function fireDirt(want) {
    if (!want || !fireReady()) return false;
    if (bulletDangerAt(px, py, 4) || ownBombDangerAt(px, py, 4) || shotSetupAt(px, py, 0, 6)) return false;
    if (dir === want) {
      say("dirt", ["开路开路!", "土堆别挡镜头", "把墙打成省略号"], 4);
      me.fire();
      return true;
    }
    me.turn(turnSide(dir, want));
    return true;
  }

  function dirtDirectionTo(target) {
    if (!target) return null;
    if (px !== target[0] && py !== target[1]) return null;
    var want = dirTo(myPos, target);
    var step = delta(want);
    var x = px + step[0], y = py + step[1];
    while (x !== target[0] || y !== target[1]) {
      var t = tile(x, y);
      if (t === "x") return null;
      if (t === "m") return want;
      x += step[0];
      y += step[1];
    }
    return null;
  }

  function clearLineTo(target) {
    if (!target) return false;
    if (px !== target[0] && py !== target[1]) return false;
    var want = dirTo(myPos, target);
    var step = delta(want);
    var x = px + step[0], y = py + step[1];
    while (x !== target[0] || y !== target[1]) {
      if (blocked(x, y)) return false;
      x += step[0];
      y += step[1];
    }
    return true;
  }

  function tryDirectStarAdvance() {
    if (!game.star || !clearLineTo(game.star)) return false;
    var want = dirTo(myPos, game.star);
    var n = add(myPos, delta(want));
    if (safeCell(n[0], n[1], true)) {
      say("star", ["星星我先收下", "抢星节奏起飞", "这颗星有内味了"], 6);
      return moveDir(want);
    }
    if (riskyButShieldable(n[0], n[1]) && shieldStarWorthwhile(game.star) && castShield()) return true;
    return false;
  }

  function tryBreakDirtTowardStar() {
    if (!game.star || !fireReady()) return false;
    if (bulletDangerAt(px, py, 4) || ownBombDangerAt(px, py, 4) || shotSetupAt(px, py, 0, 6)) return false;
    var lineDirt = dirtDirectionTo(game.star);
    if (lineDirt) return fireDirt(lineDirt);

    var info = pathInfo(myPos, game.star, false);
    var currentDist = dist(px, py, game.star[0], game.star[1]);
    if (info && info.dist <= currentDist + 6 && _stuck < 2) return false;

    var order = dirs.slice().sort(function (a, b) {
      var na = add(myPos, delta(a));
      var nb = add(myPos, delta(b));
      return dist(na[0], na[1], game.star[0], game.star[1]) -
        dist(nb[0], nb[1], game.star[0], game.star[1]);
    });
    for (var i = 0; i < order.length; i++) {
      var d = order[i];
      var n = add(myPos, delta(d));
      if (tile(n[0], n[1]) === "m" &&
        dist(n[0], n[1], game.star[0], game.star[1]) < currentDist) {
        return fireDirt(d);
      }
    }
    return false;
  }

  function tryAdjacentStar() {
    if (!game.star || dist(px, py, game.star[0], game.star[1]) !== 1) return false;
    var want = dirTo(myPos, game.star);
    if (safeCell(game.star[0], game.star[1], false)) {
      say("star", ["星星我先收下", "抢星节奏起飞", "这颗星有内味了"], 6);
      return moveDir(want);
    }
    if (riskyButShieldable(game.star[0], game.star[1]) && shieldStarWorthwhile(game.star) && castShield()) return true;
    if (shieldCoversNextExchange() && starValueHigh(game.star) && !hardBlockedAt(game.star[0], game.star[1])) {
      say("star", ["顶盾吃星,合理", "这星带盾拿下", "护盾开路抢一下"], 5);
      return moveDir(want);
    }
    return false;
  }

  function tryGrassStarShieldPickup() {
    if (!game.star || !shieldReady() || shielded()) return false;
    var info = pathInfo(myPos, game.star, false);
    if (!info || info.dist > 3) return false;
    if (tile(game.star[0], game.star[1]) !== "o" && !hiddenShooterAt(game.star[0], game.star[1])) return false;
    if (!shieldStarWorthwhile(game.star)) return false;
    say("shield-star", ["草里有埋伏,顶盾吃星", "草丛星我带盾拿", "别钓我,开盾收星"], 4);
    return castShield();
  }

  function tryGrassCamperHold() {
    if (_grassCampX < 0 || frame - _grassCampAt > 80) return false;
    if (starsOf(me) <= starsOf(enemy)) return false;
    if (bulletDangerAt(px, py, 2) || ownBombDangerAt(px, py, 3) || hiddenShooterAt(px, py)) return false;
    if (game.star) {
      var info = pathInfo(myPos, game.star, false);
      if (info && info.first) {
        var n = add(myPos, delta(info.first));
        if (safeCell(n[0], n[1], true) && pathDist(myPos, game.star) <= 5) return false;
        if (riskyButShieldable(n[0], n[1]) && shieldStarWorthwhile(game.star)) return false;
      }
    }
    say("grass-hold", ["领先别进草线", "他蹲草,我控星", "别上钩,等下一颗"], 8);
    return true;
  }

  function leadControlNeeded() {
    var margin = scoreMargin();
    if (margin < 2 || !game.star) return false;
    if (bulletDangerAt(px, py, 2) || ownBombDangerAt(px, py, 3) || hiddenShooterAt(px, py)) return false;
    var myDist = pathDist(myPos, game.star);
    if (myDist <= 2 && !starUnderPressure(game.star)) return false;
    return myDist > 2 || starUnderPressure(game.star) || frame > 110;
  }

  function grassControlsPoint(x, y, point) {
    if (!point || (x !== point[0] && y !== point[1])) return false;
    return losFrom(x, y, dirTo([x, y], point), point[0], point[1]);
  }

  function tryLeadGrassControl() {
    if (!leadControlNeeded()) return false;
    if (safeCell(px, py, true) && tile(px, py) === "o") {
      say("lead-grass", ["领先进草控线", "别急,草里等他", "优势位先拿住"], 7);
      return true;
    }

    var best = null, bestScore = -99999;
    var baseStarGap = game.star ? roughDistToStar(myPos) : 99;
    for (var x = 1; x < w - 1; x++) {
      for (var y = 1; y < h - 1; y++) {
        if (tile(x, y) !== "o") continue;
        if (!safeCell(x, y, true)) continue;
        if (enemyTank && (x === ex || y === ey) && dist(x, y, ex, ey) <= 7) continue;
        var info = pathInfo(myPos, [x, y], true) || pathInfo(myPos, [x, y], false);
        if (!info || info.dist > 4) continue;
        var score = 150 - info.dist * 28;
        if (game.star) {
          var starGap = dist(x, y, game.star[0], game.star[1]);
          if (starGap <= baseStarGap + 2) score += 18;
          else score -= (starGap - baseStarGap) * 8;
          if (grassControlsPoint(x, y, game.star)) score += 36;
        }
        if (enemyTank && canShootFrom([x, y], [ex, ey])) score += 24;
        if (score > bestScore) {
          bestScore = score;
          best = { first: info.first, dist: info.dist };
        }
      }
    }

    if (!best || bestScore < 80) return false;
    if (best.dist === 0) {
      say("lead-grass", ["领先进草控线", "别急,草里等他", "优势位先拿住"], 7);
      return true;
    }
    var n = add(myPos, delta(best.first));
    if (!safeCell(n[0], n[1], true)) return false;
    say("lead-grass", ["领先进草控线", "别急,草里等他", "优势位先拿住"], 7);
    return moveDir(best.first);
  }

  function tryStarLanePressure() {
    if (!game.star || !enemyTank || enemyShielded() || !fireReady()) return false;
    if (dist(ex, ey, game.star[0], game.star[1]) > 4) return false;
    var target = [ex, ey];
    var want = dirTo(myPos, target);
    if (!losFrom(px, py, want, ex, ey)) return false;
    if (!(px === game.star[0] || py === game.star[1] || ex === game.star[0] || ey === game.star[1])) return false;
    if (dir === want) return fireIfSafe();
    if (!projectileDangerAt(px, py)) {
      me.turn(turnSide(dir, want));
      return true;
    }
    if (castShield()) return true;
    return false;
  }

  function canBomb() {
    if (typeof me.throwBomb !== "function") return false;
    if (frame - _lastBombAt < 12) return false;
    if (me.status && me.status.bombActive) return false;
    if (me.status && typeof me.status.bombCooldownFrames === "number" && me.status.bombCooldownFrames > 0) return false;
    return true;
  }

  function tryBombTrap() {
    if (!canBomb() || projectileDangerAt(px, py)) return false;
    if (ownBombDangerAt(px, py, 5)) return false;
    if (game.star && pathDist(myPos, game.star) <= 5) return false;
    if (game.star && dist(px, py, game.star[0], game.star[1]) === 1) return false;
    if (enemyTank) {
      var gap = dist(px, py, ex, ey);
      if (gap <= 2 && !canShootFrom(myPos, [ex, ey])) {
        _lastBombAt = frame;
        _ownBombX = px;
        _ownBombY = py;
        _ownBombExplodeAt = frame + 10;
        say("bomb", ["埋个礼物别踩", "前方整活预警", "爆点安排上了"], 5);
        me.throwBomb();
        return true;
      }
      if (game.star && gap <= 4 && dist(ex, ey, game.star[0], game.star[1]) <= 3 &&
        dist(px, py, game.star[0], game.star[1]) <= 2) {
        _lastBombAt = frame;
        _ownBombX = px;
        _ownBombY = py;
        _ownBombExplodeAt = frame + 10;
        say("bomb", ["埋个礼物别踩", "前方整活预警", "爆点安排上了"], 5);
        me.throwBomb();
        return true;
      }
    }
    return false;
  }

  function tryStarPath() {
    if (!game.star) return false;
    var info = pathInfo(myPos, game.star, true) || pathInfo(myPos, game.star, false);
    if (!info || !info.first) return false;
    var n = add(myPos, delta(info.first));
    if (safeCell(n[0], n[1], true)) {
      if (game.star && pathDist(myPos, game.star) <= 4) {
        say("star", ["星星我先收下", "抢星节奏起飞", "这颗星有内味了"], 6);
      }
      return moveDir(info.first);
    }
    if (riskyButShieldable(n[0], n[1]) && shieldStarWorthwhile(game.star) && castShield()) return true;
    if (shieldCoversNextExchange() && starValueHigh(n) && !hardBlockedAt(n[0], n[1])) {
      say("star", ["顶盾吃星,合理", "这星带盾拿下", "护盾开路抢一下"], 5);
      return moveDir(info.first);
    }
    return tryDodge(false);
  }

  function tryPressureEnemy() {
    if (!enemyTank) return false;
    var gap = dist(px, py, ex, ey);
    if (gap <= 2) {
      if (tryBombTrap()) return true;
      return tryDodge(false);
    }
    if (gap <= 8 && !enemyShielded() && fireReady()) {
      var want = dirTo(myPos, [ex, ey]);
      if (losFrom(px, py, want, ex, ey)) {
        if (dir === want) return fireIfSafe();
        if (!projectileDangerAt(px, py)) {
          me.turn(turnSide(dir, want));
          return true;
        }
      }
    }
    if (starsOf(me) < starsOf(enemy) || !game.star) {
      var info = pathInfo(myPos, [ex, ey], true);
      if (info && info.first) {
        var n = add(myPos, delta(info.first));
        if (dist(n[0], n[1], ex, ey) >= 3 && safeCell(n[0], n[1], true)) return moveDir(info.first);
      }
    }
    return false;
  }

  function tryUnstick() {
    if (_stuck < 2) return false;
    if (tryDirectStarAdvance()) return true;
    if (tryBreakDirtTowardStar()) return true;
    if (_lastMoveIntent && frame - _lastIntentFrame <= 3) {
      var n = add(myPos, delta(_lastMoveIntent));
      if (safeCell(n[0], n[1], true)) return moveDir(_lastMoveIntent);
    }
    if (tryDodge(false)) return true;
    var right = dirs[(dirs.indexOf(dir) + 1) % 4];
    say("unstick", ["别急我在找路", "导航重算中", "这波先别急"], 8);
    me.turn(turnSide(dir, right));
    return true;
  }

  function patrol() {
    var fwd = add(myPos, delta(dir));
    if (safeCell(fwd[0], fwd[1], true)) {
      me.go();
      return true;
    }
    if (tile(fwd[0], fwd[1]) === "m" && fireDirt(dir)) return true;
    if (tryDodge(false)) return true;
    me.turn("right");
    return true;
  }

  if (tryHazardEvasion()) return;
  if (tryEmergencyDefense()) return;
  if (tryPostShieldResetGuard()) return;
  if (tryImmediateShot()) return;
  if (tryShieldedGunlinePressure()) return;
  if (tryShieldCounterPressure()) return;
  if (tryGuardedStarBreak()) return;
  if (tryGrassStarShieldPickup()) return;
  if (tryAdjacentStar()) return;
  if (tryGrassCamperHold()) return;
  if (tryLeadGrassControl()) return;
  if (tryStarInterception()) return;
  if (tryEarlyLanePressure()) return;
  if (tryStarLanePressure()) return;
  if (tryDirectStarAdvance()) return;
  if (tryContestedStarLineHold()) return;
  if (tryLateValuePressure()) return;
  if (tryBreakDirtTowardStar()) return;
  if (tryStarPath()) return;
  if (tryBombTrap()) return;
  if (tryPressureEnemy()) return;
  if (tryUnstick()) return;
  patrol();
}
