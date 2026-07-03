var _lastX = -1, _lastY = -1, _stuck = 0;
var _lastEX = -1, _lastEY = -1, _lastEDir = null, _eMoveDir = null, _lastSeen = -99;
var _lastESkill = null;
var _homeEX = -1, _homeEY = -1;
var _myStars = 0, _enemyStars = 0, _lastStarX = -1, _lastStarY = -1;
var _lastBombAt = -99, _lastOverloadAt = -99;
var _lastOverloadedAt = -99;
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
    _lastESkill = enemy.skill && enemy.skill.type;
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

  function overloadDirTo(pos, target) {
    if (!pos || !target) return null;
    var dx = target[0] - pos[0], dy = target[1] - pos[1];
    if (dx !== 0 && (dy === 0 || dy === 1)) return dx > 0 ? "right" : "left";
    if (dy !== 0 && (dx === 0 || dx === 1)) return dy > 0 ? "down" : "up";
    return null;
  }

  function overloadOffsetSource(pos, facing) {
    if (!pos || !facing || !dv[facing]) return null;
    return (facing === "left" || facing === "right") ? [pos[0], pos[1] + 1] : [pos[0] + 1, pos[1]];
  }

  function overloadLineFrom(pos, target) {
    var want = overloadDirTo(pos, target);
    if (!want) return false;
    var step = delta(want);
    if (step[0] !== 0) {
      if (target[1] !== pos[1] && target[1] !== pos[1] + 1) return false;
      if ((step[0] > 0 && target[0] <= pos[0]) || (step[0] < 0 && target[0] >= pos[0])) return false;
      var sy = target[1];
      if (!open(pos[0], sy)) return false;
      return losFrom(pos[0], sy, want, target[0], target[1]);
    }
    if (target[0] !== pos[0] && target[0] !== pos[0] + 1) return false;
    if ((step[1] > 0 && target[1] <= pos[1]) || (step[1] < 0 && target[1] >= pos[1])) return false;
    var sx = target[0];
    if (!open(sx, pos[1])) return false;
    return losFrom(sx, pos[1], want, target[0], target[1]);
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

  function overloadReady() {
    return !!(me.skill && me.skill.type === "overload" &&
      me.skill.remainingCooldownFrames === 0 && typeof me.overload === "function");
  }

  function overloaded() {
    return !!(me.status && me.status.overloaded);
  }

  function overloadRemaining() {
    if (me.skill && typeof me.skill.activeRemainingFrames === "number") return me.skill.activeRemainingFrames;
    if (me.effects && me.effects.self && me.effects.self.type === "overload" &&
      typeof me.effects.self.remainingFrames === "number") {
      return me.effects.self.remainingFrames;
    }
    return overloaded() ? Math.max(0, 5 - (frame - _lastOverloadAt)) : 0;
  }

  if (overloaded()) _lastOverloadedAt = frame;

  function overloadPressureActive() {
    return overloaded() && overloadRemaining() > 1;
  }

  function canCastOverloadSafely() {
    return overloadReady() && !overloaded() &&
      !bulletDangerAt(px, py, 3) &&
      !longBulletLaneDirectionAt(px, py, 14) &&
      !ownBombDangerAt(px, py, 4) &&
      !shotSetupAt(px, py, 0, 5) &&
      !enemyGunlineDirectionAt(px, py, 13) &&
      !breakableShotSetupAt(px, py, 0, 5) &&
      !hiddenShooterAt(px, py);
  }

  function castOverload(tag) {
    if (!canCastOverloadSafely()) return false;
    _lastOverloadAt = frame;
    say(tag || "overload", ["超载开火线", "火力拉满,别给窗口", "这波开超载压过去"], 4);
    me.overload();
    return true;
  }

  function enemyShielded() {
    return !!(enemy && enemy.status && enemy.status.shielded);
  }

  function fireReady() {
    return !me.bullet && !(me.status && me.status.fireLocked);
  }

  function commitFire(tag, lines, urgency) {
    say(tag || "fire", lines || ["弹幕发射!", "锁定了兄弟们", "这一炮有说法"], urgency || 4);
    me.fire();
    return true;
  }

  function fireIfSafe() {
    if (!fireReady()) return false;
    if (ownBombDangerAt(px, py, 4)) return false;
    if (bulletDangerAt(px, py, 4)) return false;
    if (projectileDangerAt(px, py)) return false;
    return commitFire("fire");
  }

  function currentShotReaches(target) {
    if (!target) return false;
    if (losFrom(px, py, dir, target[0], target[1])) return true;
    return overloadPressureActive() &&
      overloadDirTo(myPos, target) === dir &&
      overloadAttackLaneSafe(target);
  }

  function fireAtIfSafe(target) {
    if (!currentShotReaches(target)) return false;
    return fireIfSafe();
  }

  function fireForTrade(tag) {
    if (!fireReady()) return false;
    if (ownBombDangerAt(px, py, 4)) return false;
    if (bulletDangerAt(px, py, 4)) return false;
    return commitFire(tag || "trade", ["对枪就一帧别犹豫", "没出口就把炮打出去", "这炮是换节奏"], 3);
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

  function longBulletLaneDirectionAt(x, y, maxCells) {
    maxCells = typeof maxCells === "number" ? maxCells : 14;
    var bullets = collectBullets();
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      if (!b || !b.position || !b.direction || !dv[b.direction]) continue;
      var step = dv[b.direction];
      var bx = b.position[0], by = b.position[1];
      for (var n = 0; n <= maxCells; n++) {
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

  function shotSetupAt(x, y, turnGrace, maxCells) {
    if (!enemyTank || enemyDebuffed() || (enemy && enemy.bullet)) return false;
    if (x !== ex && y !== ey) return false;
    var want = ex === x ? (y < ey ? "up" : "down") : (x < ex ? "left" : "right");
    if (turnCost(eDir, want) > turnGrace) return false;
    if (dist(ex, ey, x, y) > maxCells) return false;
    return losFrom(ex, ey, want, x, y);
  }

  function enemyGunlineDirectionAt(x, y, maxCells) {
    if (!enemyTank || enemyDebuffed() || (enemy && enemy.bullet)) return null;
    if (x !== ex && y !== ey) return null;
    var want = ex === x ? (y < ey ? "up" : "down") : (x < ex ? "left" : "right");
    var gap = dist(ex, ey, x, y);
    if (gap <= 0 || gap > (maxCells || 13)) return null;
    if (!losFrom(ex, ey, want, x, y)) return null;
    var grace = gap <= 3 ? 2 : 1;
    return turnCost(eDir, want) <= grace ? want : null;
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

  function rememberedShotSetupAt(x, y, turnGrace, maxCells) {
    var sx = enemyTank ? ex : _lastEX;
    var sy = enemyTank ? ey : _lastEY;
    var sd = enemyTank ? eDir : (_lastEDir || _eMoveDir);
    if (sx < 0 || sy < 0) return false;
    if (!enemyTank && frame - _lastSeen > 24) return false;
    if (x !== sx && y !== sy) return false;
    var want = sx === x ? (y < sy ? "up" : "down") : (x < sx ? "left" : "right");
    if (sd && turnCost(sd, want) > turnGrace) return false;
    if (dist(sx, sy, x, y) > maxCells) return false;
    return losFrom(sx, sy, want, x, y);
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
      var shifted = overloadOffsetSource([ex, ey], d);
      if (!shifted || !open(shifted[0], shifted[1])) continue;
      if (losFrom(shifted[0], shifted[1], d, x, y) && dist(shifted[0], shifted[1], x, y) <= 10) return true;
    }
    return false;
  }

  function hiddenLaneAt(x, y) {
    if (enemyTank || _lastEX < 0 || frame - _lastSeen > 14) return false;
    if (dist(_lastEX, _lastEY, x, y) > 7) return false;
    if (_lastESkill === "cloak" && (x === _lastEX || y === _lastEY)) {
      var cloakDir = x === _lastEX ? (y < _lastEY ? "up" : "down") :
        (x < _lastEX ? "left" : "right");
      return losFrom(_lastEX, _lastEY, cloakDir, x, y);
    }
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

  function poorGunlineAt(x, y) {
    return !!(longBulletLaneDirectionAt(x, y, 14) ||
      enemyGunlineDirectionAt(x, y, 13));
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
      overloadDangerAt(x, y) || hiddenShooterAt(x, y) || hiddenLaneAt(x, y);
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

  function escapeRoutesAt(x, y) {
    var routes = 0;
    for (var i = 0; i < 4; i++) {
      var step = delta(dirs[i]);
      var nx = x + step[0], ny = y + step[1];
      if (!open(nx, ny)) continue;
      if (enemyTank && nx === ex && ny === ey) continue;
      if (nx === _ownBombX && ny === _ownBombY) continue;
      if (longBulletLaneDirectionAt(nx, ny, 10)) continue;
      if (enemyGunlineDirectionAt(nx, ny, 10)) continue;
      routes++;
    }
    return routes;
  }

  function overloadAttackLaneSafeFrom(pos, target) {
    if (!overloadLineFrom(pos, target)) return false;
    var want = overloadDirTo(pos, target);
    var source = overloadOffsetSource(pos, want);
    return !poorGunlineAt(pos[0], pos[1]) &&
      (!source || !longBulletLaneDirectionAt(source[0], source[1], 14));
  }

  function overloadAttackLaneSafe(target) {
    return overloadAttackLaneSafeFrom(myPos, target);
  }

  function safeCell(x, y, strict) {
    var key = x + "," + y + "|" + (strict ? 1 : 0);
    if (Object.prototype.hasOwnProperty.call(safetyCache, key)) return safetyCache[key];
    var safe = true;
    if (hardBlockedAt(x, y)) safe = false;
    else if (x === _ownBombX && y === _ownBombY) safe = false;
    else if (ownBombDangerAt(x, y, strict ? 5 : 3)) safe = false;
    else if (projectileDangerAt(x, y)) safe = false;
    else if (strict && poorGunlineAt(x, y)) safe = false;
    else if (strict && escapeRoutesAt(x, y) <= 1 && enemyTank && dist(x, y, ex, ey) <= 5) safe = false;
    else if (strict && hiddenLaneAt(x, y)) safe = false;
    safetyCache[key] = safe;
    return safe;
  }

  function sameGunlineInfo() {
    if (!enemyTank || enemyDebuffed() || (px !== ex && py !== ey)) return null;
    var toEnemy = dirTo(myPos, [ex, ey]);
    if (!losFrom(px, py, toEnemy, ex, ey)) return null;
    var enemyThreat = enemyGunlineDirectionAt(px, py, 13);
    if (!enemyThreat) return null;
    return {
      toEnemy: toEnemy,
      horizontal: toEnemy === "left" || toEnemy === "right",
    };
  }

  function exitsSameGunline(moveDirName, info) {
    if (!moveDirName || !info) return false;
    return info.horizontal ?
      (moveDirName === "up" || moveDirName === "down") :
      (moveDirName === "left" || moveDirName === "right");
  }

  function sameGunlineExitSafe(moveDirName, info) {
    if (!exitsSameGunline(moveDirName, info)) return false;
    var n = add(myPos, delta(moveDirName));
    if (!safeCell(n[0], n[1], true)) return false;
    if (game.star && same(n, game.star) && !starPickupSafe(game.star)) return false;
    return true;
  }

  function postOverloadResetActive() {
    return frame - _lastOverloadAt <= 7 || frame - _lastOverloadedAt <= 2 ||
      (overloaded() && overloadRemaining() <= 1);
  }

  function trySameGunlineFrameEconomy() {
    var info = sameGunlineInfo();
    if (!info) return false;
    if (sameGunlineExitSafe(dir, info)) {
      _lastMoveIntent = dir;
      _lastIntentFrame = frame;
      say("dodge", ["别换方向了先出去", "一帧离线最赚", "枪线别硬吃"], 3);
      me.go();
      return true;
    }
    if (postOverloadResetActive()) return false;
    if (!enemyShielded() && fireReady() && dir === info.toEnemy) {
      return fireForTrade("gunline-trade");
    }
    return false;
  }

  function riskyButOverloadable(x, y) {
    if (!game.star || !enemyTank || enemyShielded()) return false;
    if (hardBlockedAt(x, y) || ownBombDangerAt(x, y, 4)) return false;
    if (bulletDangerAt(x, y, 3) || longBulletLaneDirectionAt(x, y, 10)) return false;
    if (breakableShotSetupAt(x, y, 1, 5) || hiddenShooterAt(x, y) || hiddenLaneAt(x, y)) return false;
    if (!(x === game.star[0] || y === game.star[1])) return false;
    if (dist(x, y, game.star[0], game.star[1]) > 2) return false;

    var starHasUnclearablePressure = bulletDangerAt(game.star[0], game.star[1], 3) ||
      longBulletLaneDirectionAt(game.star[0], game.star[1], 10) ||
      breakableShotSetupAt(game.star[0], game.star[1], 1, 5) ||
      hiddenShooterAt(game.star[0], game.star[1]) ||
      hiddenLaneAt(game.star[0], game.star[1]);
    if (starHasUnclearablePressure) return false;

    var clearablePressure = shotSetupAt(x, y, 1, 8) ||
      overloadDangerAt(x, y) ||
      starPressureNeedsClear(game.star);
    if (!clearablePressure) return false;
    if (same([x, y], game.star) && !postStarExitAvailable(game.star)) return false;
    if (projectileDangerAt(px, py) || ownBombDangerAt(px, py, 4)) return false;
    if (!overloadAttackLaneSafe([ex, ey])) return false;
    return overloadPressureActive() || canCastOverloadSafely();
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

  function starPressureNeedsClear(star) {
    if (!star || !enemyTank || enemyShielded()) return false;
    if (starUnderPressure(star)) return true;
    if (dist(ex, ey, star[0], star[1]) <= 5 &&
      (canShootFrom(myPos, [ex, ey]) || overloadLineFrom(myPos, [ex, ey]))) {
      return scoreMargin() <= 0 || dist(px, py, star[0], star[1]) <= 1;
    }
    return false;
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
    if (starPressureNeedsClear(star) && !postStarExitAvailable(star)) return false;
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

  function attackStarWorthwhile(star) {
    if (!star || !starValueHigh(star)) return false;
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

  function etaToStarFrom(pos, facing, avoidDanger) {
    var info = pathInfo(pos, game.star, !!avoidDanger);
    if (!info) return { eta: 999, info: null };
    var eta = info.dist;
    if (info.first && facing && facing !== info.first) eta += turnCost(facing, info.first);
    return { eta: eta, info: info };
  }

  function overloadSetupEta(target) {
    if (!enemyTank || enemyShielded() || !fireReady()) return 999;
    if (!overloadAttackLaneSafe(target)) return 999;
    var want = overloadDirTo(myPos, target);
    if (!want) return 999;
    var eta = 1;
    if (!overloadPressureActive()) {
      if (!canCastOverloadSafely()) return 999;
      eta += 1;
    }
    if (dir !== want) eta += turnCost(dir, want);
    return eta;
  }

  function starRaceLost(myEta, enemyEta) {
    if (!game.star || !enemyTank) return false;
    if (dist(px, py, game.star[0], game.star[1]) <= 1 && starPickupSafe(game.star)) return false;
    if (!enemyStarRushThreat(myEta, enemyEta)) return false;
    return enemyEta + 1 < myEta || (starsOf(enemy) >= starsOf(me) && enemyEta <= myEta);
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

  function buildStarTempoFrame() {
    var safeStar = starPickupSafe(game.star);
    var safeRoute = etaToStarFrom(myPos, dir, true);
    var route = safeRoute.info ? safeRoute : etaToStarFrom(myPos, dir, false);
    var enemyRoute = enemyTank ? etaToStarFrom([ex, ey], eDir, false) : { eta: 999, info: null };
    var pressureEta = enemyTank ? overloadSetupEta([ex, ey]) : 999;
    var margin = scoreMargin();
    return {
      safeStar: safeStar,
      safeRoute: safeRoute,
      route: route,
      enemyRoute: enemyRoute,
      pressureEta: pressureEta,
      margin: margin,
      raceLost: starRaceLost(route.eta, enemyRoute.eta),
    };
  }

  function runStarRacePressure() {
    return tryStarLanePressure() || tryStarInterception() || tryEarlyLanePressure();
  }

  function runLeadTempoControl() {
    return tryGrassCamperHold() || tryStrategicGrassControl() || tryLeadStarLineControl() || tryLeadGrassControl();
  }

  function collectStarTempoCandidates(tempo) {
    var candidates = [];

    if (dist(px, py, game.star[0], game.star[1]) === 1 && tempo.safeStar) {
      candidates.push({
        priority: 700,
        value: 120 - tempo.route.eta,
        run: function () {
          say("star", ["星星我先收下", "抢星节奏起飞", "这颗星有内味了"], 6);
          return moveDir(dirTo(myPos, game.star));
        },
      });
    } else if (tempo.safeStar && tempo.safeRoute.info && tempo.safeRoute.info.first &&
      tempo.safeRoute.info.dist <= 3 && !tempo.raceLost) {
      var next = add(myPos, delta(tempo.safeRoute.info.first));
      if (safeCell(next[0], next[1], true) &&
        (tempo.safeRoute.eta <= tempo.enemyRoute.eta + (tempo.margin <= 0 ? 1 : 0) ||
          tempo.safeRoute.eta <= tempo.pressureEta || frame > 112)) {
        candidates.push({
          priority: 620,
          value: 100 - tempo.safeRoute.eta * 8,
          run: function () {
            say("star", ["强星先到先拿", "别慢半拍,先收星", "能吃就别开空技能"], 5);
            return moveDir(tempo.safeRoute.info.first);
          },
        });
      }
    }

    if (enemyTank && (tempo.raceLost || enemyStarRushThreat(tempo.route.eta, tempo.enemyRoute.eta))) {
      candidates.push({
        priority: tempo.raceLost ? 560 : 470,
        value: 90 - Math.min(40, tempo.route.eta * 6),
        run: runStarRacePressure,
      });
    }

    if (lowValueFarStar()) {
      candidates.push({
        priority: 520,
        value: 80 + tempo.margin * 12,
        run: runLeadTempoControl,
      });
    }

    return candidates;
  }

  function tryStarTempoArbiter() {
    if (!game.star || currentHardDanger()) return false;
    var tempo = buildStarTempoFrame();
    var candidates = collectStarTempoCandidates(tempo);
    return tryFrameCandidates(candidates);
  }

  function tryImmediateShot() {
    if (!enemyTank || enemyShielded() || !fireReady()) return false;
    var target = [ex, ey];
    var want = dirTo(myPos, target);
    if (!losFrom(px, py, want, ex, ey)) return false;
    if (!overloadPressureActive() && dist(px, py, ex, ey) <= 7 && canCastOverloadSafely()) {
      return castOverload("overload");
    }
    if (dir === want) return fireIfSafe();
    if (turnCost(dir, want) <= 1 && !bulletDangerAt(px, py, 4) &&
      !ownBombDangerAt(px, py, 4) && !shotSetupAt(px, py, 0, 7)) {
      me.turn(turnSide(dir, want));
      return true;
    }
    return false;
  }

  function tryOverloadCounterPressure() {
    if (!enemyTank || enemyShielded() || !fireReady()) return false;
    if (dist(px, py, ex, ey) > 6) return false;
    if (projectileDangerAt(px, py) || ownBombDangerAt(px, py, 4)) return false;
    var target = [ex, ey];
    var want = overloadDirTo(myPos, target);
    if (!overloadAttackLaneSafe(target)) return false;
    if (!overloadPressureActive() && canCastOverloadSafely()) return castOverload("counter");
    if (dir === want) return fireAtIfSafe(target);
    if (turnCost(dir, want) <= 1 && !ownBombDangerAt(px, py, 4)) {
      say("counter", ["超载线压住", "火力窗口别浪费", "这波要反打"], 4);
      me.turn(turnSide(dir, want));
      return true;
    }
    return false;
  }

  function tryOverloadLineWindow() {
    if (!enemyTank || enemyShielded() || !fireReady()) return false;
    if (projectileDangerAt(px, py) || ownBombDangerAt(px, py, 4)) return false;
    var target = [ex, ey];
    if (!overloadAttackLaneSafe(target)) return false;
    var margin = scoreMargin();
    var starRelevant = game.star &&
      (px === game.star[0] || py === game.star[1] ||
        ex === game.star[0] || ey === game.star[1] ||
        dist(ex, ey, game.star[0], game.star[1]) <= 4);
    var pressureNeeded = margin <= 0 || starRelevant || tile(px, py) === "o" || dist(px, py, ex, ey) <= 6;
    if (!pressureNeeded) return false;
    if (!overloadPressureActive() && canCastOverloadSafely()) return castOverload("line-window");
    var want = overloadDirTo(myPos, target);
    if (dir === want) return fireAtIfSafe(target);
    if (turnCost(dir, want) <= 1) {
      say("pressure", ["超载偏线压住", "先把窗口打出来", "平落后要给火力"], 5);
      me.turn(turnSide(dir, want));
      return true;
    }
    return false;
  }

  function tryOverloadGuardedStarBreak() {
    if (!game.star || !enemyTank || enemyShielded() || !fireReady()) return false;
    if (hardBlockedAt(game.star[0], game.star[1])) return false;
    if (pathDist(myPos, game.star) > 4) return false;
    if (dist(ex, ey, game.star[0], game.star[1]) > 1) return false;
    if (!attackStarWorthwhile(game.star)) return false;
    if (projectileDangerAt(px, py) || ownBombDangerAt(px, py, 4)) return false;
    var target = [ex, ey];
    var want = overloadDirTo(myPos, target);
    if (!overloadAttackLaneSafe(target)) return false;
    if (!overloadPressureActive() && canCastOverloadSafely()) return castOverload("star-break");
    if (dir === want) return fireAtIfSafe(target);
    if (turnCost(dir, want) <= 1) {
      say("star-break", ["守星是吧,超载压走", "别卡星,火力清点", "这星我用枪线拿"], 4);
      me.turn(turnSide(dir, want));
      return true;
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
    if (tile(next[0], next[1]) === "m" && dirtDirectionTo(game.star) === want) {
      return fireDirt(want);
    }
    if (safeCell(next[0], next[1], true)) return false;

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
    var cd = enemy.skill && typeof enemy.skill.remainingCooldownFrames === "number"
      ? enemy.skill.remainingCooldownFrames : 0;
    var mobile = type === "teleport" || type === "boost";
    if (type === "teleport" && (cd <= 18 || enemyDist <= myDist + 6)) return true;
    if (mobile && (cd <= 12 || enemyDist <= myDist + 4)) return true;
    if (enemyDist < myDist - 1) return true;
    if (starsOf(enemy) >= starsOf(me) && enemyDist <= myDist + 1) return true;
    return frame > 88 && enemyDist <= myDist + 1;
  }

  function tryStarInterception() {
    if (!game.star || !enemyTank) return false;
    var myDist = pathDist(myPos, game.star);
    var enemyDist = pathDist([ex, ey], game.star);
    var enemySkill = enemy.skill && enemy.skill.type;
    var teleportPressure = enemySkill === "teleport" && enemyDist <= myDist + 6;
    if (myDist <= 2 && !teleportPressure) return false;
    if (!enemyStarRushThreat(myDist, enemyDist)) return false;

    var candidates = [];
    candidates.push(game.star);
    for (var i = 0; i < 4; i++) {
      var step = delta(dirs[i]);
      for (var r = 1; r <= 3; r++) {
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
      if (!safeCell(target[0], target[1], true) && !riskyButOverloadable(target[0], target[1])) continue;
      if (!(target[0] === game.star[0] || target[1] === game.star[1])) continue;

      var info = pathInfo(myPos, target, true) || pathInfo(myPos, target, false);
      if (!info) continue;
      if (info.dist > Math.max(5, myDist + 1)) continue;

      var targetStarDist = dist(target[0], target[1], game.star[0], game.star[1]);
      var score = 140 - info.dist * 18 - targetStarDist * 12;
      if (same(target, game.star)) score += 20;
      if (targetStarDist === 1) score += 18;
      if (teleportPressure) {
        if (same(target, game.star) && enemyDist < myDist) score -= 48;
        if (targetStarDist === 1) score += 32;
        if (targetStarDist === 2) score += 10;
      }
      if (clearLineTo(target)) score += 8;
      if (canShootFrom(target, [ex, ey])) score += teleportPressure ? 42 : 28;
      if (target[0] === game.star[0] || target[1] === game.star[1]) score += 16;
      if (enemyDist < myDist) score += 18;
      if (frame > 96) score += 10;
      if (riskyButOverloadable(target[0], target[1])) score -= 12;
      if (score > bestScore) {
        bestScore = score;
        best = { target: target, info: info };
      }
    }

    if (!best || bestScore < 30) return false;
    if (best.info.dist === 0) {
      if (!enemyShielded() && fireReady() && canShootFrom(myPos, [ex, ey])) {
        var shootDir = dirTo(myPos, [ex, ey]);
        if (dir === shootDir) return fireIfSafe();
        if (!projectileDangerAt(px, py)) {
          me.turn(turnSide(dir, shootDir));
          return true;
        }
      }
      var faceStar = dirTo(myPos, game.star);
      if (dir !== faceStar && !hardWallBlocksLineTo(game.star) &&
        !projectileDangerAt(px, py) && !ownBombDangerAt(px, py, 3)) {
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
      var overloadOk = overloadAttackLaneSafeFrom(n, [ex, ey]);
      if (!canShootFrom(n, [ex, ey]) && !overloadOk) continue;
      var score = 90 - turnCost(dir, d) * 10 - dist(n[0], n[1], ex, ey) * 2;
      if (overloadOk) score += 12;
      if (type === "teleport") score += 14;
      if (game.star) score -= Math.max(0, roughDistToStar(n) - baseStarDist) * 9;
      if (score > bestScore) {
        bestScore = score;
        best = { dir: d, overload: overloadOk };
      }
    }
    if (best && bestScore > 30) {
      if (best.overload && !overloadPressureActive() && canCastOverloadSafely()) return castOverload("pressure");
      say("pressure", ["别空跑,先架枪", "传送要快?我先压线", "别白给,先出枪线"], 5);
      return moveDir(best.dir);
    }
    return false;
  }

  function tryPostOverloadResetGuard() {
    if (!postOverloadResetActive()) return false;
    if (!(bulletDangerAt(px, py, 4) || shotSetupAt(px, py, 1, 8) ||
      breakableShotSetupAt(px, py, 1, 5) || overloadDangerAt(px, py) ||
      hiddenShooterAt(px, py))) return false;
    if (tryDodge(true)) return true;
    say("reset", ["超载结束先离线", "别贪炮,先复位", "枪线还热,先稳住"], 3);
    return true;
  }

  function tryGunlineReposition() {
    if (!longBulletLaneDirectionAt(px, py, 14) &&
      !enemyGunlineDirectionAt(px, py, 13)) return false;
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
        if (!overloadPressureActive() && canCastOverloadSafely()) return castOverload("late-pressure");
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
        var overloadOk = overloadAttackLaneSafeFrom(n, [ex, ey]);
        if (!canShootFrom(n, [ex, ey]) && !overloadOk) continue;
        var score = 80 - turnCost(dir, d) * 8 - dist(n[0], n[1], ex, ey);
        if (overloadOk) score += 12;
        if (game.star) score -= Math.max(0, roughDistToStar(n) - baseStarDist) * 10;
        if (score > bestScore) {
          bestScore = score;
          best = { dir: d, overload: overloadOk };
        }
      }
      if (best) {
        if (best.overload && !overloadPressureActive() && canCastOverloadSafely()) return castOverload("late-pressure");
        say("pressure", ["拖到后期要给压力", "别只看星,压一炮", "平星要主动点"], 5);
        return moveDir(best.dir);
      }
    }
    return false;
  }

  function tryBombEscape() {
    if (!ownBombBlastAt(px, py) && !ownBombDangerAt(px, py, 5)) return false;
    var best = null, bestScore = -99999;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var n = add(myPos, delta(d));
      if (hardBlockedAt(n[0], n[1])) continue;
      if (projectileDangerAt(n[0], n[1])) continue;
      var score = 0;
      if (!ownBombBlastAt(n[0], n[1])) score += 200;
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
    if (bulletDangerAt(px, py, 4)) {
      if (!bulletDangerAt(px, py, 1) && tryDodge(true)) return true;
      return tryDodge(true);
    }
    return false;
  }

  function tryEmergencyDefense() {
    if (bulletDangerAt(px, py, 2)) {
      return tryDodge(true);
    }
    if (breakableShotSetupAt(px, py, 0, 5)) {
      if (tryDodge(true)) return true;
      return false;
    }
    if (hiddenLaneAt(px, py)) {
      return tryDodge(true);
    }
    if (trySameGunlineFrameEconomy()) return true;
    if (tryCloseContactEscape()) return true;
    var closeAimed = shotSetupAt(px, py, 0, 5);
    if (shotSetupAt(px, py, 0, 7) || closeAimed || overloadDangerAt(px, py)) {
      if (closeAimed) {
        if (tryPointBlankTradeWhenAhead(false)) return true;
        return tryDodge(true);
      }
      if (enemyTank && !enemyShielded() && fireReady() && dir === dirTo(myPos, [ex, ey]) && canShootFrom(myPos, [ex, ey])) {
        if (fireForTrade("defense-trade")) return true;
      }
      return tryDodge(true);
    }
    if (hiddenShooterAt(px, py)) {
      return tryDodge(true);
    }
    return false;
  }

  function tryPointBlankTradeWhenAhead(allowTurn) {
    if (!enemyTank || enemyShielded() || !fireReady()) return false;
    if (scoreMargin() <= 0 || dist(px, py, ex, ey) > 1) return false;
    var want = dirTo(myPos, [ex, ey]);
    if (!losFrom(px, py, want, ex, ey)) return false;
    if (dir === want) return fireForTrade("pointblank-trade");
    if (!allowTurn || turnCost(dir, want) > 1) return false;
    if (ownBombDangerAt(px, py, 4) || bulletDangerAt(px, py, 2)) return false;
    say("counter", ["别白给,换掉也赚", "领先贴脸别背身", "没出口就反打"], 3);
    me.turn(turnSide(dir, want));
    return true;
  }

  function closeContactExitSafe(moveDirName) {
    var n = add(myPos, delta(moveDirName));
    if (!safeCell(n[0], n[1], false)) return false;
    if (enemyTank && dist(n[0], n[1], ex, ey) <= dist(px, py, ex, ey)) return false;
    if (enemyGunlineDirectionAt(n[0], n[1], 6)) return false;
    if (longBulletLaneDirectionAt(n[0], n[1], 10)) return false;
    return true;
  }

  function tryCloseContactEscape() {
    if (!enemyTank || dist(px, py, ex, ey) > 2) return false;
    if (!shotSetupAt(px, py, 1, 5) && !enemyGunlineDirectionAt(px, py, 6)) return false;

    if (closeContactExitSafe(dir)) {
      _lastMoveIntent = dir;
      _lastIntentFrame = frame;
      say("dodge", ["走位走位!", "别换方向了先出去", "先离开弹道"], 3);
      me.go();
      return true;
    }

    var alreadyAimed = shotSetupAt(px, py, 0, 5);
    var best = null, bestScore = -99999;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      if (turnCost(dir, d) > 1) continue;
      if (!closeContactExitSafe(d)) continue;
      var n = add(myPos, delta(d));
      var score = 120 - turnCost(dir, d) * 20 + dist(n[0], n[1], ex, ey) * 8;
      if (n[0] !== ex && n[1] !== ey) score += 18;
      if (d === dir) score += 30;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    if (!best || (alreadyAimed && best !== dir)) {
      if (!alreadyAimed && tryPointBlankTradeWhenAhead(true)) return true;
      return false;
    }
    say("dodge", ["走位走位!", "别换方向了先出去", "先离开弹道"], 3);
    return moveDir(best);
  }

  function goForwardDodge(lines, rememberIntent) {
    if (rememberIntent) {
      _lastMoveIntent = dir;
      _lastIntentFrame = frame;
    }
    say("dodge", lines, 3);
    me.go();
    return true;
  }

  function tryPanicDodgeSetup() {
    if (selfStunned()) {
      var stunnedForward = add(myPos, delta(dir));
      if (safeCell(stunnedForward[0], stunnedForward[1], true)) {
        return goForwardDodge(["被控了也要走!", "反向操作先离线", "控我?先挪一格"], false);
      }
    }
    if (_lastMoveIntent && frame - _lastIntentFrame <= 2) {
      var committed = add(myPos, delta(_lastMoveIntent));
      if (safeCell(committed[0], committed[1], true)) {
        say("dodge", ["走位走位!", "别换方向了先出去", "先离开弹道"], 3);
        return moveDir(_lastMoveIntent);
      }
    }
    var bulletLane = bulletLaneDirectionAt(px, py, 4);
    var forward = add(myPos, delta(dir));
    if (leavesBulletLane(dir, bulletLane) && safeCell(forward[0], forward[1], true)) {
      return goForwardDodge(["走位走位!", "别换方向了先出去", "先离开弹道"], true);
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

  function hardWallBlocksLineTo(target) {
    if (!target) return false;
    if (px !== target[0] && py !== target[1]) return false;
    var want = dirTo(myPos, target);
    var step = delta(want);
    var x = px + step[0], y = py + step[1];
    while (x !== target[0] || y !== target[1]) {
      if (tile(x, y) === "x") return true;
      x += step[0];
      y += step[1];
    }
    return false;
  }

  function tryDirectStarAdvance() {
    if (!game.star || !clearLineTo(game.star)) return false;
    if (lowValueFarStar()) return false;
    var want = dirTo(myPos, game.star);
    var n = add(myPos, delta(want));
    if (same(n, game.star) && !starPickupSafe(game.star)) return false;
    if (safeCell(n[0], n[1], true)) {
      say("star", ["星星我先收下", "抢星节奏起飞", "这颗星有内味了"], 6);
      return moveDir(want);
    }
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
    if (starPickupSafe(game.star)) {
      say("star", ["星星我先收下", "抢星节奏起飞", "这颗星有内味了"], 6);
      return moveDir(want);
    }
    return false;
  }

  function tryOverloadStarClearance() {
    if (!game.star || !enemyTank || enemyShielded() || !fireReady()) return false;
    if (projectileDangerAt(px, py) || ownBombDangerAt(px, py, 4)) return false;
    var starDist = pathDist(myPos, game.star);
    if (starDist > 3) return false;
    if (!starPressureNeedsClear(game.star)) return false;
    var target = [ex, ey];
    if (!overloadAttackLaneSafe(target)) return false;
    var want = overloadDirTo(myPos, target);
    if (!overloadPressureActive() && canCastOverloadSafely()) return castOverload("star-clear");
    if (dir === want) return fireAtIfSafe(target);
    if (turnCost(dir, want) <= 1) {
      say("star-clear", ["先清线再吃星", "星点有压制,先逼退", "不硬吃,先控枪线"], 4);
      me.turn(turnSide(dir, want));
      return true;
    }
    return false;
  }

  function tryGrassStarOverloadPressure() {
    if (!game.star || !enemyTank || enemyShielded() || !fireReady()) return false;
    if (tile(game.star[0], game.star[1]) !== "o" && !hiddenShooterAt(game.star[0], game.star[1])) return false;
    if (pathDist(myPos, game.star) > 4) return false;
    if (projectileDangerAt(px, py) || ownBombDangerAt(px, py, 4)) return false;
    if (!overloadAttackLaneSafe([ex, ey])) return false;
    if (!overloadPressureActive() && canCastOverloadSafely()) return castOverload("grass-star");
    var want = overloadDirTo(myPos, [ex, ey]);
    if (dir === want) return fireAtIfSafe([ex, ey]);
    if (turnCost(dir, want) <= 1) {
      say("grass-star", ["草线不硬进,先超载压枪", "草里有埋伏,先打掉窗口", "别钓我,火力开路"], 4);
      me.turn(turnSide(dir, want));
      return true;
    }
    return false;
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
        if (riskyButOverloadable(n[0], n[1]) && attackStarWorthwhile(game.star)) return false;
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
    return canShootFrom([x, y], [ex, ey]) || overloadLineFrom([x, y], [ex, ey]);
  }

  function strategicGrassValueAt(x, y, info, baseStarGap) {
    if (tile(x, y) !== "o" || !safeCell(x, y, true)) return -99999;
    if (enemyTank && x === ex && y === ey) return -99999;

    var controlsStar = game.star && grassControlsPoint(x, y, game.star);
    var directPressure = enemyTank && !enemyShielded() && canShootFrom([x, y], [ex, ey]);
    var overloadPressure = enemyTank && !enemyShielded() && overloadLineFrom([x, y], [ex, ey]);
    var nearStarLine = game.star && (x === game.star[0] || y === game.star[1]) &&
      dist(x, y, game.star[0], game.star[1]) <= 5;
    if (!controlsStar && !directPressure && !overloadPressure) return -99999;

    var score = 120;
    if (info) {
      score -= info.dist * 24;
      if (info.first) score -= turnCost(dir, info.first) * 8;
    } else {
      score += 10;
    }
    if (controlsStar) score += 58;
    if (overloadPressure) score += 34;
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
    for (var x = 1; x < w - 1; x++) {
      for (var y = 1; y < h - 1; y++) {
        if (tile(x, y) !== "o") continue;
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

  function tryLeadStarLineControl() {
    if (!leadControlNeeded() || !lowValueFarStar()) return false;
    if (bulletDangerAt(px, py, 4) || rememberedShotSetupAt(px, py, 1, 9)) return tryDodge(true);
    if (projectileDangerAt(px, py) || ownBombDangerAt(px, py, 4)) return false;
    if (enemyTank && !enemyShielded() && fireReady() && overloadAttackLaneSafe([ex, ey])) {
      if (!overloadPressureActive() && canCastOverloadSafely()) return castOverload("lead-line");
      var shootDir = overloadDirTo(myPos, [ex, ey]);
      if (dir === shootDir) return fireAtIfSafe([ex, ey]);
      if (turnCost(dir, shootDir) <= 1) {
        say("lead-line", ["领先先压线", "优势不追远星,卡住", "超载逼他动"], 6);
        me.turn(turnSide(dir, shootDir));
        return true;
      }
    }
    if (px === game.star[0] || py === game.star[1]) {
      var faceStar = dirTo(myPos, game.star);
      if (dir !== faceStar && !bulletDangerAt(px, py, 2)) {
        say("lead-line", ["领先守星线", "远星不急追", "先把星线占住"], 6);
        me.turn(turnSide(dir, faceStar));
        return true;
      }
      if (enemyTank && dir !== dirTo(myPos, [ex, ey]) && !rememberedShotSetupAt(px, py, 1, 9)) {
        say("lead-line", ["领先先压线", "优势不追远星,卡住", "超载逼他动"], 6);
        me.turn(turnSide(dir, dirTo(myPos, [ex, ey])));
        return true;
      }
      for (var s = 0; s < 4; s++) {
        var side = dirs[s];
        if (side === faceStar) continue;
        var sideNext = add(myPos, delta(side));
        if (!safeCell(sideNext[0], sideNext[1], true)) continue;
        if (dist(sideNext[0], sideNext[1], game.star[0], game.star[1]) < dist(px, py, game.star[0], game.star[1])) continue;
        say("lead-line", ["领先守星线", "远星不急追", "先把星线占住"], 6);
        return moveDir(side);
      }
      return false;
    }

    var best = null, bestScore = -99999;
    var currentGap = dist(px, py, game.star[0], game.star[1]);
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var n = add(myPos, delta(d));
      if (!safeCell(n[0], n[1], true)) continue;
      if (!(n[0] === game.star[0] || n[1] === game.star[1])) continue;
      if (dist(n[0], n[1], game.star[0], game.star[1]) < Math.max(3, currentGap - 4)) continue;
      var score = 90 - turnCost(dir, d) * 10;
      if (enemyTank && overloadAttackLaneSafeFrom(n, [ex, ey])) score += 24;
      if (enemyTank && canShootFrom(n, [ex, ey])) score += 18;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    if (best && bestScore >= 80) {
      say("lead-line", ["领先守星线", "远星不急追", "先把星线占住"], 6);
      return moveDir(best);
    }
    return false;
  }

  function tryLeadGrassControl() {
    if (!leadControlNeeded()) return false;
    if (safeCell(px, py, true) && tile(px, py) === "o" && grassPressureAt(px, py)) {
      if (enemyTank && !enemyShielded() && fireReady() && overloadAttackLaneSafe([ex, ey]) &&
        !overloadPressureActive() && canCastOverloadSafely()) {
        return castOverload("lead-grass");
      }
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
        if (!grassPressureAt(x, y)) score -= 70;
        if (enemyTank && canShootFrom([x, y], [ex, ey])) score += 24;
        if (enemyTank && overloadLineFrom([x, y], [ex, ey])) score += 22;
        if (score > bestScore) {
          bestScore = score;
          best = { first: info.first, dist: info.dist };
        }
      }
    }

    if (!best || bestScore < 80) return false;
    if (best.dist === 0) {
      if (!grassPressureAt(px, py)) return false;
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
    var want = overloadDirTo(myPos, target);
    if (!overloadAttackLaneSafe(target)) return false;
    if (!(px === game.star[0] || py === game.star[1] || ex === game.star[0] || ey === game.star[1])) return false;
    if (!overloadPressureActive() && canCastOverloadSafely()) return castOverload("star-lane");
    if (dir === want) return fireAtIfSafe(target);
    if (!projectileDangerAt(px, py)) {
      me.turn(turnSide(dir, want));
      return true;
    }
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
    if (lowValueFarStar()) return false;
    var info = pathInfo(myPos, game.star, true) || pathInfo(myPos, game.star, false);
    if (!info || !info.first) return false;
    var n = add(myPos, delta(info.first));
    if (same(n, game.star) && !starPickupSafe(game.star)) return false;
    if (safeCell(n[0], n[1], true)) {
      if (game.star && pathDist(myPos, game.star) <= 4) {
        say("star", ["星星我先收下", "抢星节奏起飞", "这颗星有内味了"], 6);
      }
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
      var want = overloadDirTo(myPos, [ex, ey]);
      if (overloadAttackLaneSafe([ex, ey])) {
        if (!overloadPressureActive() && canCastOverloadSafely()) return castOverload("pressure");
        if (dir === want) return fireAtIfSafe([ex, ey]);
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
    if (game.star && tile(fwd[0], fwd[1]) === "m" && dirtDirectionTo(game.star) === dir && fireDirt(dir)) return true;
    if (tryDodge(false)) return true;
    me.turn("right");
    return true;
  }

  function buildStrategyPipeline() {
    return [
      { layer: "L0", id: "hazard-evasion", run: tryHazardEvasion },
      { layer: "L0", id: "emergency-defense", run: tryEmergencyDefense },
      { layer: "L1", id: "post-overload-reset", run: tryPostOverloadResetGuard },
      { layer: "L1", id: "gunline-reposition", run: tryGunlineReposition },
      { layer: "L2", id: "star-tempo-arbiter", run: tryStarTempoArbiter },
      { layer: "L3", id: "immediate-shot", run: tryImmediateShot },
      { layer: "L3", id: "overload-counter-pressure", run: tryOverloadCounterPressure },
      { layer: "L3", id: "overload-line-window", run: tryOverloadLineWindow },
      { layer: "L3", id: "overload-guarded-star-break", run: tryOverloadGuardedStarBreak },
      { layer: "L3", id: "grass-star-overload-pressure", run: tryGrassStarOverloadPressure },
      { layer: "L3", id: "overload-star-clearance", run: tryOverloadStarClearance },
      { layer: "L3", id: "adjacent-star", run: tryAdjacentStar },
      { layer: "L4", id: "strategic-grass-control", run: tryStrategicGrassControl },
      { layer: "L4", id: "grass-camper-hold", run: tryGrassCamperHold },
      { layer: "L4", id: "lead-star-line-control", run: tryLeadStarLineControl },
      { layer: "L4", id: "lead-grass-control", run: tryLeadGrassControl },
      { layer: "L4", id: "star-interception", run: tryStarInterception },
      { layer: "L5", id: "early-lane-pressure", run: tryEarlyLanePressure },
      { layer: "L5", id: "star-lane-pressure", run: tryStarLanePressure },
      { layer: "L6", id: "direct-star-advance", run: tryDirectStarAdvance },
      { layer: "L6", id: "contested-star-line-hold", run: tryContestedStarLineHold },
      { layer: "L6", id: "late-value-pressure", run: tryLateValuePressure },
      { layer: "L7", id: "break-dirt-toward-star", run: tryBreakDirtTowardStar },
      { layer: "L7", id: "star-path", run: tryStarPath },
      { layer: "L7", id: "bomb-trap", run: tryBombTrap },
      { layer: "L7", id: "pressure-enemy", run: tryPressureEnemy },
      { layer: "L8", id: "unstick", run: tryUnstick },
      { layer: "L8", id: "patrol", run: patrol },
    ];
  }

  function runStrategyPipeline(modules) {
    for (var i = 0; i < modules.length; i++) {
      if (modules[i].run()) return true;
    }
    return false;
  }

  runStrategyPipeline(buildStrategyPipeline());
}
