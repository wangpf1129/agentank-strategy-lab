var _lastX = -1, _lastY = -1, _stuck = 0;
var _lastEX = -1, _lastEY = -1, _lastEDir = null, _eMoveDir = null, _lastSeen = -99;
var _homeEX = -1, _homeEY = -1;
var _lastESkill = null;
var _myStars = 0, _enemyStars = 0, _lastStarX = -1, _lastStarY = -1;
var _lastBombAt = -99, _lastShieldAt = -99;
var _lastBoostAt = -99;
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
  var GRASS_SCAN_RADIUS = 4;
  var GRASS_CANDIDATE_LIMIT = 8;

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
  if (enemy && enemy.skill && enemy.skill.type) _lastESkill = enemy.skill.type;
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

  function oppositeDir(d) {
    var index = dirs.indexOf(d);
    return index < 0 ? d : dirs[(index + 2) % 4];
  }

  function oppositeTurn(side) {
    return side === "left" ? "right" : "left";
  }

  function reversedControl() {
    return !!(me.status && me.status.reversed);
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

  function actualGoDir() {
    return reversedControl() ? oppositeDir(dir) : dir;
  }

  function actualGoCell() {
    return add(myPos, delta(actualGoDir()));
  }

  function commandTurnToward(want) {
    var side = turnSide(dir, want);
    me.turn(reversedControl() ? oppositeTurn(side) : side);
    return true;
  }

  function controlledMoveDir(want) {
    if (!want || !dv[want]) return false;
    _lastMoveIntent = want;
    _lastIntentFrame = frame;
    if (actualGoDir() === want) {
      me.go();
      return true;
    }
    return commandTurnToward(want);
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

  function boostReady() {
    return !!(me.skill && me.skill.type === "boost" &&
      me.skill.remainingCooldownFrames === 0 && typeof me.boost === "function");
  }

  function boosted() {
    if (me.status && me.status.boosted) return true;
    if (me.skill && me.skill.type === "boost" &&
      (me.skill.activeType === "boost" || me.skill.activeRemainingFrames > 0)) return true;
    return !!(me.effects && me.effects.self && me.effects.self.type === "boost" &&
      me.effects.self.remainingFrames > 0);
  }

  function castBoost() {
    if (!boostReady()) return false;
    _lastBoostAt = frame;
    say("boost", ["加速抢星", "这一颗提速拿", "星路开加速"], 4);
    me.boost();
    return true;
  }

  function shielded() {
    return !!(me.status && me.status.shielded);
  }

  function explicitShieldRemaining() {
    if (me.skill && typeof me.skill.activeRemainingFrames === "number") return me.skill.activeRemainingFrames;
    if (me.effects && me.effects.self && me.effects.self.type === "shield" &&
      typeof me.effects.self.remainingFrames === "number") {
      return me.effects.self.remainingFrames;
    }
    return null;
  }

  function shieldRemaining() {
    var explicitRemaining = explicitShieldRemaining();
    if (explicitRemaining !== null) return explicitRemaining;
    return shielded() ? Math.max(0, 4 - (frame - _lastShieldAt)) : 0;
  }

  if (shielded()) _lastShieldedAt = frame;

  function shieldCoversNextExchange() {
    if (!shielded() || shieldRemaining() <= 2) return false;
    if (explicitShieldRemaining() === null && currentLaneThreatDirection(5)) return false;
    return true;
  }

  function shieldCoversGunlineAction() {
    return shielded() && shieldRemaining() > 1;
  }

  function shieldCoversImmediateAction() {
    return shielded() && shieldRemaining() > 0;
  }

  function shieldCanSpendTurnForPressure(targetDist) {
    if (!shielded() || shieldRemaining() <= 1) return false;
    if (explicitShieldRemaining() === null && targetDist <= 4 && currentLaneThreatDirection(5)) return false;
    return true;
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
    if (bulletDangerAt(px, py, 4) && !shieldCoversImmediateAction()) return false;
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

  function enemyReplyLaneAt(x, y, maxCells) {
    maxCells = typeof maxCells === "number" ? maxCells : 8;
    if (enemyTank && !enemyDebuffed()) {
      if (enemyLaneThreatDirectionAt(x, y, 1, maxCells)) return true;
      if ((x === ex || y === ey) && dist(x, y, ex, ey) <= Math.min(maxCells, 6)) {
        var replyDir = dirTo([ex, ey], [x, y]);
        if (losFrom(ex, ey, replyDir, x, y) && turnCost(eDir, replyDir) <= 2) return true;
      }
    }
    return hiddenShooterAt(x, y) || hiddenLaneAt(x, y);
  }

  function enemyOverloadReady() {
    if (!enemy || !enemy.skill || enemy.skill.type !== "overload") return false;
    if (enemy.status && enemy.status.overloaded) return true;
    var cd = enemy.skill.remainingCooldownFrames;
    return typeof cd !== "number" || cd <= 2;
  }

  function overloadOffsetSource(pos, facing) {
    if (!pos || !facing || !dv[facing]) return null;
    return (facing === "left" || facing === "right") ? [pos[0], pos[1] + 1] : [pos[0] + 1, pos[1]];
  }

  function overloadDangerAt(x, y) {
    if (!enemyTank || !enemyOverloadReady() || enemyDebuffed()) return false;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      if (turnCost(eDir, d) > 1) continue;
      if (losFrom(ex, ey, d, x, y) && dist(ex, ey, x, y) <= 10) return true;
      var shifted = overloadOffsetSource([ex, ey], d);
      if (!shifted || !open(shifted[0], shifted[1])) continue;
      if (losFrom(shifted[0], shifted[1], d, x, y) && dist(shifted[0], shifted[1], x, y) <= 10) return true;
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
    var hiddenAge = frame - _lastSeen;
    var predictCloakShooter = _lastESkill === "cloak" && hiddenAge <= 10;
    var maxSteps = Math.max(1, Math.min(predictCloakShooter ? 6 : 4, hiddenAge + 1));
    var queue = [{ x: _lastEX, y: _lastEY, d: 0 }];
    var seen = {};
    seen[_lastEX + "," + _lastEY] = true;
    for (var head = 0; head < queue.length && queue.length < 90; head++) {
      var item = queue[head];
      if ((predictCloakShooter || tile(item.x, item.y) === "o") &&
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

  function bombBlastFrom(bx, by, x, y) {
    if (bx < 0) return false;
    if (x !== bx && y !== by) return false;
    if (dist(x, y, bx, by) > 2) return false;
    var sx = x === bx ? 0 : (x > bx ? 1 : -1);
    var sy = y === by ? 0 : (y > by ? 1 : -1);
    var cx = bx + sx, cy = by + sy;
    while (cx !== x || cy !== y) {
      if (tile(cx, cy) === "x") return false;
      cx += sx;
      cy += sy;
    }
    return true;
  }

  function ownBombBlastAt(x, y) {
    return bombBlastFrom(_ownBombX, _ownBombY, x, y);
  }

  function ownBombDangerAt(x, y, horizon) {
    if (_ownBombX < 0 || !ownBombBlastAt(x, y)) return false;
    return frame + (horizon || 0) >= _ownBombExplodeAt - 1;
  }

  function bombEscapeInfoFrom(start, bx, by, maxSteps, avoidProjectiles) {
    if (!bombBlastFrom(bx, by, start[0], start[1])) return { ok: true, dist: 0 };
    var limit = Math.max(1, maxSteps || 1);
    var queue = [{ pos: start, dist: 0 }];
    var seen = {};
    seen[start[0] + "," + start[1]] = true;
    for (var head = 0; head < queue.length && queue.length < 60; head++) {
      var item = queue[head];
      if (item.dist >= limit) continue;
      for (var i = 0; i < 4; i++) {
        var d = dirs[i];
        var n = add(item.pos, delta(d));
        var key = n[0] + "," + n[1];
        if (seen[key] || hardBlockedAt(n[0], n[1])) continue;
        if (avoidProjectiles && !shielded() && projectileDangerAt(n[0], n[1])) continue;
        if (!bombBlastFrom(bx, by, n[0], n[1])) return { ok: true, dist: item.dist + 1 };
        seen[key] = true;
        queue.push({ pos: n, dist: item.dist + 1 });
      }
    }
    return { ok: false, dist: 99 };
  }

  function cleanOwnBombEscapeFrom(pos, avoidProjectiles) {
    if (_ownBombX < 0) return { ok: true, dist: 0 };
    var framesLeft = _ownBombExplodeAt - frame;
    return bombEscapeInfoFrom(pos, _ownBombX, _ownBombY, Math.max(1, Math.min(6, framesLeft - 1)), avoidProjectiles);
  }

  function postBombEscapeAvailable(bx, by) {
    return bombEscapeInfoFrom(myPos, bx, by, 6, true).ok;
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

  function edgeDepth(x, y) {
    return Math.min(x, y, w - 1 - x, h - 1 - y);
  }

  function centerDistance(x, y) {
    return Math.abs(x - (w - 1) / 2) + Math.abs(y - (h - 1) / 2);
  }

  function positionalValue(pos) {
    if (!pos) return -999;
    var x = pos[0], y = pos[1];
    var depth = edgeDepth(x, y);
    var score = 0;
    if (depth <= 1) score -= 36;
    else if (depth <= 2) score -= 14;
    score -= Math.max(0, centerDistance(x, y) - 5) * 2;
    if (game.star) {
      if (x === game.star[0] || y === game.star[1]) score += 8;
      if (grassControlsPoint(x, y, game.star)) score += 22;
      score -= Math.min(12, dist(x, y, game.star[0], game.star[1]));
    }
    if (enemyTank && canShootFrom([x, y], [ex, ey])) score += 12;
    if (tile(x, y) === "o") {
      if ((game.star && grassControlsPoint(x, y, game.star)) ||
        (enemyTank && canShootFrom([x, y], [ex, ey]))) score += 20;
      else score += 4;
    }
    return score;
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

  function etaToStarFrom(pos, facing, avoidDanger) {
    var info = pathInfo(pos, game.star, !!avoidDanger);
    if (!info) return { eta: 999, info: null };
    var eta = info.dist;
    if (info.first && facing && facing !== info.first) eta += turnCost(facing, info.first);
    return { eta: eta, info: info };
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

  function starPickupSafe(star) {
    if (!star || !safeCell(star[0], star[1], false)) return false;
    if (starUnderPressure(star) && !postStarExitAvailable(star)) return false;
    return true;
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

  function starRaceClearlyLost(star) {
    if (!star || !enemyTank) return false;
    var myDist = pathDist(myPos, star);
    var enemyDist = pathDist([ex, ey], star);
    return myDist > 2 && enemyDist + 1 < myDist;
  }

  function shieldStarWorthwhile(star) {
    if (!star || !starValueHigh(star)) return false;
    if (starRaceClearlyLost(star)) return false;
    var margin = scoreMargin();
    if (margin >= 2) return false;
    if (margin >= 1 && starUnderPressure(star) && pathDist(myPos, star) > 1) return false;
    if (margin + 1 >= 2 && !postStarExitAvailable(star)) return false;
    return true;
  }

  function lowValueFarStar() {
    if (!game.star || scoreMargin() < 2) return false;
    if (pathDist(myPos, game.star) <= 2) return false;
    if (frame > 116 && scoreMargin() <= 2) return false;
    return !starValueHigh(game.star);
  }

  function currentHardDanger() {
    return bulletDangerAt(px, py, 2) ||
      ownBombDangerAt(px, py, 4) ||
      breakableShotSetupAt(px, py, 0, 5) ||
      overloadDangerAt(px, py) ||
      hiddenShooterAt(px, py) ||
      hiddenLaneAt(px, py);
  }

  function tryFrameCandidates(candidates) {
    candidates.sort(function (a, b) {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.value - a.value;
    });
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i].run()) return true;
    }
    return false;
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
    if (enemyShielded() || !fireReady() || !shieldCoversImmediateAction()) return false;
    var target = knownEnemyTarget(8);
    if (!target) return false;
    var targetDist = dist(px, py, target[0], target[1]);
    if (targetDist > 10) return false;
    if (bulletLaneDirectionAt(px, py, 8) && targetDist > 5 && !shieldCoversGunlineAction()) return false;
    var want = dirTo(myPos, target);
    if (!losFrom(px, py, want, target[0], target[1])) return false;
    if (dir === want) return fireWhileShieldPressures();
    var turnFrames = turnCost(dir, want);
    var coveredTurn = turnFrames <= 1 ||
      (turnFrames === 2 && targetDist <= 3 && shieldRemaining() >= 3);
    if (coveredTurn && shieldCanSpendTurnForPressure(targetDist) && !ownBombDangerAt(px, py, 4)) {
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

  function buildShieldStarTempoFrame() {
    var safeRoute = etaToStarFrom(myPos, dir, true);
    var route = safeRoute.info ? safeRoute : etaToStarFrom(myPos, dir, false);
    var enemyRoute = enemyTank ? etaToStarFrom([ex, ey], eDir, false) : { eta: 999, info: null };
    return {
      safeStar: starPickupSafe(game.star),
      safeRoute: safeRoute,
      route: route,
      enemyRoute: enemyRoute,
      margin: scoreMargin(),
      raceLost: starRaceClearlyLost(game.star),
      enemyRush: enemyStarRushThreat(route.eta, enemyRoute.eta),
    };
  }

  function runShieldStarRacePressure() {
    return tryStarInterception() || tryEarlyLanePressure() || tryStarLanePressure();
  }

  function runShieldLeadTempoControl() {
    return tryGrassCamperHold() || tryLeadGrassControl() || tryStrategicGrassControl();
  }

  function contestedStarLineActive() {
    if (!game.star || !enemyTank) return false;
    if (!(px === game.star[0] || py === game.star[1])) return false;
    if (dist(px, py, game.star[0], game.star[1]) > 4) return false;
    return dist(ex, ey, game.star[0], game.star[1]) <= 3;
  }

  function shieldStarAdvanceBlocked() {
    if (!game.star) return true;
    if (contestedStarLineActive()) return true;
    if (dirtDirectionTo(game.star)) return true;
    if (lowValueFarStar() && scoreMargin() >= 2) return true;
    return false;
  }

  function nearStarRouteValue(tempo) {
    if (!tempo || !tempo.safeRoute || !tempo.safeRoute.info || !tempo.safeRoute.info.first) return 0;
    if (shieldStarAdvanceBlocked()) return 0;
    if (tempo.raceLost) return 0;
    if (tempo.safeRoute.eta > 7 && tempo.margin >= 0 && !tempo.enemyRush) return 0;
    return Math.max(1, 90 - tempo.safeRoute.eta * 8 + Math.max(0, -tempo.margin) * 18);
  }

  function tryShieldSafeStarAdvance() {
    if (!game.star || currentHardDanger()) return false;
    if (shieldStarAdvanceBlocked()) return false;
    var safeRoute = etaToStarFrom(myPos, dir, true);
    if (!safeRoute.info || !safeRoute.info.first) return false;
    if (starRaceClearlyLost(game.star)) return false;
    var n = add(myPos, delta(safeRoute.info.first));
    if (!safeCell(n[0], n[1], true)) return false;
    say("star", ["先吃星,别空枪", "星星节奏先拿", "这帧先收经济"], 5);
    return moveDir(safeRoute.info.first);
  }

  function tryShieldStarRouteCommit() {
    if (!game.star || shielded() || !shieldReady() || currentHardDanger()) return false;
    if (shieldStarAdvanceBlocked()) return false;
    if (!shieldStarWorthwhile(game.star)) return false;
    var route = etaToStarFrom(myPos, dir, false);
    if (!route.info || !route.info.first || route.eta > 4) return false;
    var n = add(myPos, delta(route.info.first));
    if (!riskyButShieldable(n[0], n[1]) && !starUnderPressure(game.star)) return false;
    say("shield-star", ["开盾抢关键星", "这一颗顶盾拿", "盾换星,值"], 4);
    return castShield();
  }

  function boostEtaForRoute(route, facing) {
    if (!route || !route.info) return 999;
    var eta = Math.ceil(route.info.dist / 2);
    if (route.info.first && facing && facing !== route.info.first) eta += turnCost(facing, route.info.first);
    return eta;
  }

  function boostStarWorthwhile(route, safeRoute, enemyRoute) {
    if (!game.star || !route.info || !route.info.first) return false;
    if (shieldStarAdvanceBlocked()) return false;
    if (route.eta <= 1) return false;
    if (route.eta > 8) return false;
    if (lowValueFarStar() && scoreMargin() >= 2 && route.eta > 4) return false;
    if (safeRoute.info && safeRoute.eta <= 2 && !starUnderPressure(game.star)) return false;
    var boostedEta = boostEtaForRoute(route, dir);
    var enemyEta = enemyRoute ? enemyRoute.eta : 999;
    if (scoreMargin() <= 0) return boostedEta <= enemyEta + 3 || route.eta <= 6;
    if (enemyTank && enemyEta <= route.eta + 2) return true;
    return route.eta >= 4 && route.eta <= 7 && !starUnderPressure(game.star);
  }

  function tryBoostStarTempo() {
    if (!game.star || !(me.skill && me.skill.type === "boost")) return false;
    if (currentHardDanger()) return false;
    var safeRoute = etaToStarFrom(myPos, dir, true);
    var route = safeRoute.info ? safeRoute : etaToStarFrom(myPos, dir, false);
    if (!route.info || !route.info.first) return false;
    var enemyRoute = enemyTank ? etaToStarFrom([ex, ey], eDir, false) : { eta: 999, info: null };
    var boostedEta = boostEtaForRoute(route, dir);
    if (enemyTank && enemyRoute.eta + 1 < boostedEta && !boosted()) {
      return runShieldStarRacePressure();
    }
    if (boostReady() && boostStarWorthwhile(route, safeRoute, enemyRoute)) {
      return castBoost();
    }
    if (boosted() || frame - _lastBoostAt <= 8) {
      if (shieldStarAdvanceBlocked()) return false;
      var n = add(myPos, delta(route.info.first));
      if (safeCell(n[0], n[1], true)) {
        say("star", ["加速中,直取星", "提速吃星", "别绕,拿经济"], 4);
        return moveDir(route.info.first);
      }
    }
    return false;
  }

  function collectShieldStarTempoCandidates(tempo) {
    var candidates = [];

    if (dist(px, py, game.star[0], game.star[1]) === 1 && tempo.safeStar) {
      candidates.push({
        priority: 700,
        value: 120 - tempo.route.eta,
        run: tryAdjacentStar,
      });
    }

    var nearRouteValue = nearStarRouteValue(tempo);
    if (nearRouteValue > 0) {
      candidates.push({
        priority: tempo.safeRoute.eta <= 4 || tempo.margin <= 0 ? 640 : 510,
        value: nearRouteValue,
        run: tryShieldSafeStarAdvance,
      });
    }

    if (!tempo.raceLost && shieldReady() && !shielded() && shieldStarWorthwhile(game.star) &&
      tempo.route.info && tempo.route.info.first && tempo.route.eta <= 4) {
      candidates.push({
        priority: tempo.enemyRush || tempo.margin <= 0 ? 620 : 545,
        value: 88 - tempo.route.eta * 7 + Math.max(0, -tempo.margin) * 16,
        run: tryShieldStarRouteCommit,
      });
    }

    if (enemyTank && (tempo.raceLost || tempo.enemyRush)) {
      candidates.push({
        priority: tempo.raceLost ? 560 : 470,
        value: 90 - Math.min(40, tempo.route.eta * 6),
        run: runShieldStarRacePressure,
      });
    }

    if (lowValueFarStar()) {
      candidates.push({
        priority: 520,
        value: 80 + tempo.margin * 12,
        run: runShieldLeadTempoControl,
      });
    }

    return candidates;
  }

  function tryShieldStarTempoArbiter() {
    if (!game.star || currentHardDanger()) return false;
    if (!shielded() && shieldReady()) {
      if (scoreMargin() < 0 && enemyAimsAtUs(14) && enemyTank && canShootFrom(myPos, [ex, ey])) return false;
      if (enemyTank && shieldStarWorthwhile(game.star) &&
        pathDist(myPos, game.star) <= 4 &&
        dist(ex, ey, game.star[0], game.star[1]) <= 1) {
        return false;
      }
    }
    var tempo = buildShieldStarTempoFrame();
    var candidates = collectShieldStarTempoCandidates(tempo);
    return tryFrameCandidates(candidates);
  }

  function tryStarInterception() {
    if (!game.star || !enemyTank) return false;
    var myDist = pathDist(myPos, game.star);
    var enemyDist = pathDist([ex, ey], game.star);
    var enemySkill = enemy.skill && enemy.skill.type;
    var teleportPressure = enemySkill === "teleport" && enemyDist <= myDist + 6;
    var teleportTrap = teleportStarTrapActive(myDist, enemyDist);
    var raceLost = starRaceClearlyLost(game.star);
    if (myDist <= 2 && !teleportPressure) return false;
    if (!enemyStarRushThreat(myDist, enemyDist)) return false;

    if ((teleportTrap || raceLost) && fireReady() && dist(px, py, game.star[0], game.star[1]) <= 5 &&
      canShootFrom(myPos, game.star)) {
      var currentGuardDir = dirTo(myPos, game.star);
      if (dir === currentGuardDir) return fireIfSafe();
      if (!projectileDangerAt(px, py) && !ownBombDangerAt(px, py, 3)) {
        say("intercept", ["别追屁股,先卡点", "下一颗我先蹲", "星线提前占住"], 5);
        me.turn(turnSide(dir, currentGuardDir));
        return true;
      }
    }

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
      if (same(target, game.star)) score += raceLost ? -42 : 20;
      if (targetStarDist === 1) score += raceLost ? 46 : 18;
      if (raceLost && controlsStarLane) score += 28;
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
      if ((teleportTrap || raceLost) && fireReady() && canShootFrom(myPos, game.star)) {
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

  function skillTrapOpponentActive() {
    var type = enemy && enemy.skill && enemy.skill.type;
    if (!type) type = _lastESkill;
    return type === "cloak" || type === "stun";
  }

  function skillTrapThreatDirectionAt(x, y) {
    if (!enemyTank || enemyDebuffed()) return null;
    var threat = enemyLaneThreatDirectionAt(x, y, 2, 6);
    if (threat) return threat;
    if (x !== ex && y !== ey) return null;
    if (dist(x, y, ex, ey) > 4) return null;
    var want = dirTo([ex, ey], [x, y]);
    if (!losFrom(ex, ey, want, x, y)) return null;
    return turnCost(eDir, want) <= 2 ? want : null;
  }

  function skillTrapExitSafe(moveDirName, threatDir) {
    if (!moveDirName || !threatDir || !leavesBulletLane(moveDirName, threatDir)) return false;
    var n = add(myPos, delta(moveDirName));
    if (!safeCell(n[0], n[1], true)) return false;
    if (enemyReplyLaneAt(n[0], n[1], 6)) return false;
    if (game.star && same(n, game.star) && !starPickupSafe(game.star)) return false;
    return true;
  }

  function trySkillTrapOneFrameExit(threatDir) {
    var goDir = actualGoDir();
    if (!skillTrapExitSafe(goDir, threatDir)) return false;
    _lastMoveIntent = goDir;
    _lastIntentFrame = frame;
    say("skill-reset", ["技能压线先脱身", "别在控制线里转", "先离开技能枪线"], 3);
    me.go();
    return true;
  }

  function trySkillTrapLaneReset() {
    if (!skillTrapOpponentActive() || !enemyTank || enemyDebuffed()) return false;
    if (dist(px, py, ex, ey) > 5 && !selfStunned()) return false;
    var threatDir = skillTrapThreatDirectionAt(px, py);
    if (!threatDir) return false;

    if (shielded() && shieldCoversImmediateAction()) {
      if (tryShieldedGunlinePressure()) return true;
      if (tryShieldCounterPressure()) return true;
    }
    if (trySkillTrapOneFrameExit(threatDir)) return true;

    var enemyCanShootBeforeTurn = turnCost(eDir, threatDir) <= 1 && dist(px, py, ex, ey) <= 4;
    if (!shielded() && shieldReady() && enemyCanShootBeforeTurn) return castShield();

    var best = null, bestScore = -99999;
    var options = laneEscapeDirs(threatDir);
    for (var i = 0; i < options.length; i++) {
      var d = options[i];
      if (!skillTrapExitSafe(d, threatDir)) continue;
      var n = add(myPos, delta(d));
      var score = 220 - turnCost(dir, d) * 36;
      if (d === _lastMoveIntent && frame - _lastIntentFrame <= 3) score += 48;
      if (d === actualGoDir()) score += 42;
      if (edgeDepth(n[0], n[1]) <= 1) score -= 42;
      else if (edgeDepth(n[0], n[1]) <= 2) score -= 14;
      if (enemyTank) score += Math.min(28, dist(n[0], n[1], ex, ey) * 7);
      if (game.star) score -= Math.max(0, roughDistToStar(n) - roughDistToStar(myPos)) * 4;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    if (best) {
      say("skill-reset", ["技能压线先脱身", "别在控制线里转", "先离开技能枪线"], 3);
      return controlledMoveDir(best);
    }
    if (!shielded() && shieldReady()) return castShield();
    return false;
  }

  function tryPostShieldResetGuard() {
    var justShielded = frame - _lastShieldAt <= 7 || frame - _lastShieldedAt <= 2 ||
      (shielded() && shieldRemaining() <= 1);
    if (!justShielded) return false;
    if (shieldCoversNextExchange()) return false;
    var currentThreat = bulletLaneDirectionAt(px, py, 8) || bulletDangerAt(px, py, 4) ||
      shotSetupAt(px, py, 1, 7) || breakableShotSetupAt(px, py, 1, 5) ||
      overloadDangerAt(px, py) || enemyReplyLaneAt(px, py, 10);
    if (!currentThreat) {
      var forward = actualGoCell();
      var nearEnemy = enemyTank && dist(px, py, ex, ey) <= 6;
      if (!nearEnemy || !enemyReplyLaneAt(forward[0], forward[1], 10)) return false;
    }
    if (tryCommittedLaneEscape(10)) return true;
    var best = null, bestScore = -99999;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var n = add(myPos, delta(d));
      if (!safeCell(n[0], n[1], true)) continue;
      if (enemyReplyLaneAt(n[0], n[1], 10)) continue;
      var score = 180 - turnCost(dir, d) * 18;
      if (currentThreat && leavesBulletLane(d, currentLaneThreatDirection(10))) score += 24;
      if (enemyTank) score += Math.min(24, dist(n[0], n[1], ex, ey) * 4);
      if (game.star) score -= roughDistToStar(n) * 2;
      score += Math.round(positionalValue(n) * 0.4);
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    if (best) {
      say("reset", ["盾后先离线", "别刚吃完星就吃炮", "先把枪线拆开"], 4);
      return controlledMoveDir(best);
    }
    if (tryShieldedGunlinePressure()) return true;
    if (tryShieldCounterPressure()) return true;
    if (castShield()) return true;
    return tryDodge(true);
  }

  function tryGunlineFrameEconomyGuard() {
    if (!enemyTank || enemyDebuffed()) return false;
    var threatDir = enemyLaneThreatDirectionAt(px, py, 1, 12);
    if (!threatDir) return false;
    var shootDir = dirTo(myPos, [ex, ey]);
    var enemyAimCost = turnCost(eDir, threatDir);
    var myShootCost = turnCost(dir, shootDir);
    var gap = dist(px, py, ex, ey);
    var cleanBrawlLine = !enemyShielded() && canShootFrom(myPos, [ex, ey]) &&
      !ownBombDangerAt(px, py, 4);

    if (!shielded() && shieldReady() && enemyAimCost === 0 && gap <= 8 && cleanBrawlLine) {
      return castShield();
    }

    if (!enemyShielded() && fireReady() && dir === shootDir &&
      cleanBrawlLine && !bulletDangerAt(px, py, 2)) {
      return fireIfSafe();
    }

    if (enemyAimCost > 0 && enemyAimCost >= myShootCost && dist(px, py, ex, ey) > 2) {
      return false;
    }

    if (tryShieldedGunlinePressure()) return true;
    if (tryShieldCounterPressure()) return true;

    if (!shielded() && shieldReady() && gap <= 8 && cleanBrawlLine) {
      return castShield();
    }

    if (tryCommittedLaneEscape(12)) return true;

    if (gap <= 6 && castShield()) return true;
    return false;
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
    var framesLeft = _ownBombExplodeAt - frame;
    var best = null, bestScore = -99999;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var n = add(myPos, delta(d));
      if (hardBlockedAt(n[0], n[1])) continue;
      var nextBombBlast = ownBombBlastAt(n[0], n[1]);
      var nextProjectileDanger = projectileDangerAt(n[0], n[1]);
      if (nextProjectileDanger && !shielded() && !imminentSelfBomb) continue;
      var escapeInfo = cleanOwnBombEscapeFrom(n, true);
      if (nextBombBlast && (imminentSelfBomb || !escapeInfo.ok)) continue;
      if (!escapeInfo.ok && framesLeft <= 6) continue;
      var score = 0;
      if (!nextBombBlast) score += 260;
      else score -= 120 + escapeInfo.dist * 26;
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
      var threatDir = currentLaneThreatDirection();
      if (selfStunned() && tryOneFrameLaneExit(threatDir)) return true;
      if (bulletDangerAt(px, py, 2) && castShield()) return true;
      if (tryOneFrameLaneExit(threatDir)) return true;
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
      if (shieldCoversImmediateAction() && tryShieldedGunlinePressure()) return true;
      if (closeAimed) {
        if (castShield()) return true;
        if (tryCommittedLaneEscape(2)) return true;
        if (!shielded() || shieldRemaining() <= 1) return tryDodge(true);
      }
      if (closeOneTurnAimed) {
        if (skillTrapOpponentActive() && !shielded() && shieldReady() && dist(px, py, ex, ey) <= 4) {
          return castShield();
        }
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

    var forward = actualGoCell();
    var goDir = actualGoDir();
    if (leavesBulletLane(goDir, threatDir) && safeCell(forward[0], forward[1], true)) {
      return goDir;
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
      score += Math.round(positionalValue(n) * 0.25);
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  }

  function tryOneFrameLaneExit(threatDir) {
    if (!threatDir) return false;
    if (_lastMoveIntent && frame - _lastIntentFrame <= 3 &&
      leavesBulletLane(_lastMoveIntent, threatDir)) {
      var committed = add(myPos, delta(_lastMoveIntent));
      if (safeCell(committed[0], committed[1], true) && _lastMoveIntent !== actualGoDir()) {
        return false;
      }
    }
    var goDir = actualGoDir();
    if (!leavesBulletLane(goDir, threatDir)) return false;
    var next = actualGoCell();
    if (!safeCell(next[0], next[1], true)) return false;
    _lastMoveIntent = goDir;
    _lastIntentFrame = frame;
    say("dodge", ["走位走位!", "别换方向了先出去", "先离开弹道"], 3);
    me.go();
    return true;
  }

  function tryCommittedLaneEscape(maxEnemyCells) {
    var threatDir = currentLaneThreatDirection(maxEnemyCells);
    if (tryOneFrameLaneExit(threatDir)) return true;
    var escapeDir = committedLaneEscapeDir(threatDir);
    if (!escapeDir) return false;
    say("dodge", ["走位走位!", "别换方向了先出去", "先离开弹道"], 3);
    return controlledMoveDir(escapeDir);
  }

  function tryPanicDodgeSetup() {
    if (selfStunned()) {
      var stunnedForward = actualGoCell();
      if (safeCell(stunnedForward[0], stunnedForward[1], true)) {
        _lastMoveIntent = actualGoDir();
        _lastIntentFrame = frame;
        say("dodge", ["被控了也要走!", "反向操作先离线", "控我?先挪一格"], 3);
        me.go();
        return true;
      }
    }
    if (_lastMoveIntent && frame - _lastIntentFrame <= 2) {
      var committed = add(myPos, delta(_lastMoveIntent));
      if (_lastMoveIntent === actualGoDir() && safeCell(committed[0], committed[1], true)) {
        say("dodge", ["走位走位!", "别换方向了先出去", "先离开弹道"], 3);
        me.go();
        return true;
      }
    }
    var bulletLane = bulletLaneDirectionAt(px, py, 4);
    var forward = actualGoCell();
    var goDir = actualGoDir();
    if (leavesBulletLane(goDir, bulletLane) && safeCell(forward[0], forward[1], true)) {
      _lastMoveIntent = goDir;
      _lastIntentFrame = frame;
      say("dodge", ["走位走位!", "别换方向了先出去", "先离开弹道"], 3);
      me.go();
      return true;
    }
    return false;
  }

  function scoreDodgeDirection(d, panic) {
    var n = add(myPos, delta(d));
    if (!safeCell(n[0], n[1], true)) return -99999;
    var score = 100 - turnCost(dir, d) * 12;
    if (d === dir) score += 6;
    if (game.star) score -= roughDistToStar(n) * (panic ? 2 : 5);
    if (enemyTank) score += Math.min(6, dist(n[0], n[1], ex, ey));
    if (!panic) score += Math.round(positionalValue(n) * 0.45);
    return score;
  }

  function chooseDodgeDirection(panic) {
    var best = null, bestScore = -99999;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var score = scoreDodgeDirection(d, panic);
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  }

  function tryDodge(panic) {
    if (panic && tryPanicDodgeSetup()) return true;
    var best = chooseDodgeDirection(panic);
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

  function grassPressureAt(x, y) {
    if (game.star && grassControlsPoint(x, y, game.star)) return true;
    if (!enemyTank || enemyShielded()) return false;
    return canShootFrom([x, y], [ex, ey]);
  }

  function cheapGrassCandidateScore(x, y, baseStarGap) {
    if (tile(x, y) !== "o") return -99999;
    if (enemyTank && x === ex && y === ey) return -99999;

    var reachGap = dist(px, py, x, y);
    if (reachGap > GRASS_SCAN_RADIUS) return -99999;

    var controlsStar = game.star && grassControlsPoint(x, y, game.star);
    var directPressure = enemyTank && !enemyShielded() && canShootFrom([x, y], [ex, ey]);
    if (!controlsStar && !directPressure) return -99999;

    var score = 100 - reachGap * 16;
    if (controlsStar) score += 58;
    if (directPressure) score += 26;
    if (tile(px, py) === "o" && x === px && y === py) score += 12;
    if (game.star) {
      var starGap = dist(x, y, game.star[0], game.star[1]);
      if (starGap <= baseStarGap + 1) score += 20;
      else score -= (starGap - baseStarGap) * 10;
    }
    return score;
  }

  function collectBoundedGrassCandidates(baseStarGap, limit) {
    var candidates = [];
    var maxCandidates = limit || GRASS_CANDIDATE_LIMIT;
    var minX = Math.max(1, px - GRASS_SCAN_RADIUS);
    var maxX = Math.min(w - 2, px + GRASS_SCAN_RADIUS);
    var minY = Math.max(1, py - GRASS_SCAN_RADIUS);
    var maxY = Math.min(h - 2, py + GRASS_SCAN_RADIUS);

    for (var x = minX; x <= maxX; x++) {
      for (var y = minY; y <= maxY; y++) {
        var score = cheapGrassCandidateScore(x, y, baseStarGap);
        if (score <= -99990) continue;
        candidates.push({ x: x, y: y, score: score });
      }
    }

    candidates.sort(function(a, b) { return b.score - a.score; });
    if (candidates.length > maxCandidates) candidates.length = maxCandidates;
    return candidates;
  }

  function strategicGrassValueAt(x, y, info, baseStarGap) {
    if (tile(x, y) !== "o" || !safeCell(x, y, true)) return -99999;
    if (enemyTank && x === ex && y === ey) return -99999;

    var controlsStar = game.star && grassControlsPoint(x, y, game.star);
    var directPressure = enemyTank && !enemyShielded() && canShootFrom([x, y], [ex, ey]);
    var nearStarLine = game.star && (x === game.star[0] || y === game.star[1]) &&
      dist(x, y, game.star[0], game.star[1]) <= 5;
    if (!controlsStar && !directPressure) return -99999;

    var score = 120;
    if (info) {
      score -= info.dist * 24;
      if (info.first) score -= turnCost(dir, info.first) * 8;
    } else {
      score += 10;
    }
    if (controlsStar) score += 58;
    if (directPressure) score += 26;
    if (nearStarLine) score += 18;
    if (tile(px, py) === "o" && x === px && y === py) score += 12;
    if (game.star) {
      var starGap = dist(x, y, game.star[0], game.star[1]);
      if (starGap <= baseStarGap + 1) score += 20;
      else score -= (starGap - baseStarGap) * 10;
      if (scoreMargin() <= 0 && !controlsStar && starGap > baseStarGap + 1) score -= 30;
    }
    return score;
  }

  function tryStrategicGrassControl() {
    if (currentHardDanger() || projectileDangerAt(px, py) || ownBombDangerAt(px, py, 4)) return false;
    if (!game.star && (!enemyTank || enemyShielded())) return false;

    var baseStarGap = game.star ? roughDistToStar(myPos) : 99;
    var best = null, bestScore = -99999;
    var candidates = collectBoundedGrassCandidates(baseStarGap, GRASS_CANDIDATE_LIMIT);
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      var x = candidate.x, y = candidate.y;
      var info = same([x, y], myPos) ? null :
        (pathInfo(myPos, [x, y], true) || pathInfo(myPos, [x, y], false));
      if (info && info.dist > 4) continue;
      if (!info && (x !== px || y !== py)) continue;
      var score = strategicGrassValueAt(x, y, info, baseStarGap);
      if (score > bestScore) {
        bestScore = score;
        best = { x: x, y: y, info: info };
      }
    }

    if (!best || bestScore < 118) return false;
    if (!best.info) {
      say("grass-control", ["先占草线", "草位控住再说", "这个草能卡线"], 7);
      return true;
    }
    var n = add(myPos, delta(best.info.first));
    if (!safeCell(n[0], n[1], true)) return false;
    say("grass-control", ["先占草线", "草位控住再说", "这个草能卡线"], 7);
    return moveDir(best.info.first);
  }

  function tryLeadGrassControl() {
    if (!leadControlNeeded()) return false;
    if (safeCell(px, py, true) && tile(px, py) === "o") {
      say("lead-grass", ["领先进草控线", "别急,草里等他", "优势位先拿住"], 7);
      return true;
    }

    var best = null, bestScore = -99999;
    var baseStarGap = game.star ? roughDistToStar(myPos) : 99;
    var candidates = collectBoundedGrassCandidates(baseStarGap, GRASS_CANDIDATE_LIMIT);
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      var x = candidate.x, y = candidate.y;
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
      if (!grassPressureAt(x, y)) score -= 70;
      if (enemyTank && canShootFrom([x, y], [ex, ey])) score += 24;
      if (score > bestScore) {
        bestScore = score;
        best = { first: info.first, dist: info.dist };
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
    if (!postBombEscapeAvailable(px, py)) return false;
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

  function tryLowValueReposition() {
    if (bulletDangerAt(px, py, 2) || ownBombDangerAt(px, py, 3) || hiddenShooterAt(px, py)) return false;
    if (game.star && pathDist(myPos, game.star) <= 3 && !starUnderPressure(game.star)) return false;
    var current = positionalValue(myPos);
    var best = null, bestScore = current + 8;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var n = add(myPos, delta(d));
      if (!safeCell(n[0], n[1], true)) continue;
      var score = positionalValue(n) - turnCost(dir, d) * 8;
      if (d === dir) score += 2;
      if (game.star) score -= roughDistToStar(n) * 2;
      if (!game.star && edgeDepth(px, py) <= 2 && edgeDepth(n[0], n[1]) > edgeDepth(px, py)) score += 16;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    if (!best) return false;
    say("position", ["别往角落扎,回控区", "先占中路等星", "换个有价值的位置"], 7);
    return moveDir(best);
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
    if (game.star && tile(fwd[0], fwd[1]) === "m" && dirtDirectionTo(game.star) === dir && fireDirt(dir)) return true;
    if (tryDodge(false)) return true;
    me.turn("right");
    return true;
  }

  function strategyLayerRank(layer) {
    if (typeof layer !== "string" || layer.length !== 2 || layer.charAt(0) !== "L") return 99;
    var rank = layer.charCodeAt(1) - 48;
    return rank >= 0 && rank <= 8 ? rank : 99;
  }

  function strategyModule(layer, id, run) {
    return { layer: layer, id: id, run: run };
  }

  function strategyPipelineValid(modules) {
    if (!modules || !modules.length) return false;
    var seen = {};
    var lastRank = -1;
    for (var i = 0; i < modules.length; i++) {
      var module = modules[i];
      if (!module || typeof module.id !== "string" || typeof module.run !== "function") return false;
      var rank = strategyLayerRank(module.layer);
      if (rank === 99 || rank < lastRank) return false;
      if (seen[module.id]) return false;
      seen[module.id] = true;
      lastRank = rank;
    }
    return modules[0].layer === "L0" && modules[modules.length - 1].layer === "L8";
  }

  function buildBaseStrategyModules() {
    return {
      hazardEvasion: strategyModule("L0", "hazard-evasion", tryHazardEvasion),
      emergencyDefense: strategyModule("L0", "emergency-defense", tryEmergencyDefense),
      immediateShot: strategyModule("L3", "immediate-shot", tryImmediateShot),
      adjacentStar: strategyModule("L3", "adjacent-star", tryAdjacentStar),
      grassCamperHold: strategyModule("L4", "grass-camper-hold", tryGrassCamperHold),
      leadGrassControl: strategyModule("L4", "lead-grass-control", tryLeadGrassControl),
      starInterception: strategyModule("L4", "star-interception", tryStarInterception),
      earlyLanePressure: strategyModule("L5", "early-lane-pressure", tryEarlyLanePressure),
      starLanePressure: strategyModule("L5", "star-lane-pressure", tryStarLanePressure),
      directStarAdvance: strategyModule("L6", "direct-star-advance", tryDirectStarAdvance),
      contestedStarLineHold: strategyModule("L6", "contested-star-line-hold", tryContestedStarLineHold),
      lateValuePressure: strategyModule("L6", "late-value-pressure", tryLateValuePressure),
      breakDirtTowardStar: strategyModule("L7", "break-dirt-toward-star", tryBreakDirtTowardStar),
      starPath: strategyModule("L7", "star-path", tryStarPath),
      bombTrap: strategyModule("L7", "bomb-trap", tryBombTrap),
      pressureEnemy: strategyModule("L7", "pressure-enemy", tryPressureEnemy),
      unstick: strategyModule("L8", "unstick", tryUnstick),
      lowValueReposition: strategyModule("L8", "low-value-reposition", tryLowValueReposition),
      patrol: strategyModule("L8", "patrol", patrol),
    };
  }

  function buildShieldSkillModules() {
    return {
      skillTrapLaneReset: strategyModule("L1", "skill-trap-lane-reset", trySkillTrapLaneReset),
      postShieldReset: strategyModule("L1", "post-shield-reset", tryPostShieldResetGuard),
      gunlineFrameEconomy: strategyModule("L1", "gunline-frame-economy", tryGunlineFrameEconomyGuard),
      boostStarTempo: strategyModule("L2", "boost-star-tempo", tryBoostStarTempo),
      starTempoArbiter: strategyModule("L2", "star-tempo-arbiter", tryShieldStarTempoArbiter),
      shieldedGunlinePressure: strategyModule("L3", "shielded-gunline-pressure", tryShieldedGunlinePressure),
      shieldCounterPressure: strategyModule("L3", "shield-counter-pressure", tryShieldCounterPressure),
      guardedStarBreak: strategyModule("L3", "guarded-star-break", tryGuardedStarBreak),
      grassStarShieldPickup: strategyModule("L3", "grass-star-shield-pickup", tryGrassStarShieldPickup),
    };
  }

  function buildStrategyPipeline() {
    var base = buildBaseStrategyModules();
    var shield = buildShieldSkillModules();
    return [
      base.hazardEvasion,
      base.emergencyDefense,
      shield.skillTrapLaneReset,
      shield.postShieldReset,
      shield.gunlineFrameEconomy,
      shield.boostStarTempo,
      shield.starTempoArbiter,
      base.immediateShot,
      shield.shieldedGunlinePressure,
      shield.shieldCounterPressure,
      shield.guardedStarBreak,
      shield.grassStarShieldPickup,
      base.adjacentStar,
      base.grassCamperHold,
      base.leadGrassControl,
      base.starInterception,
      base.earlyLanePressure,
      base.starLanePressure,
      base.directStarAdvance,
      base.contestedStarLineHold,
      base.lateValuePressure,
      base.breakDirtTowardStar,
      base.starPath,
      base.bombTrap,
      base.pressureEnemy,
      base.unstick,
      base.lowValueReposition,
      base.patrol,
    ];
  }

  function runStrategyPipeline(modules) {
    if (!strategyPipelineValid(modules)) {
      if (tryHazardEvasion()) return true;
      if (tryEmergencyDefense()) return true;
      if (tryDodge(true)) return true;
      return patrol();
    }
    for (var i = 0; i < modules.length; i++) {
      if (modules[i].run()) return true;
    }
    return false;
  }

  runStrategyPipeline(buildStrategyPipeline());
}
