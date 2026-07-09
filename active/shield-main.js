var _lastX = -1, _lastY = -1, _stuck = 0;
var _lastEX = -1, _lastEY = -1, _lastEDir = null, _lastSeen = -99;
var _lastStarX = -1, _lastStarY = -1, _myStars = 0, _enemyStars = 0;
var _lastBoostAt = -99, _lastSpeakAt = -99, _lastSpeakTag = "", _speakCount = 0;
var _lastMoveIntent = null, _lastIntentFrame = -99;
var _hazardExitDir = null, _hazardExitFrame = -99;
var _justAteStarAt = -99;
var _shotLineX = -1, _shotLineY = -1, _shotLineDir = null, _shotLineAt = -99;

function onIdle(me, enemy, game) {
  var myPos = me.tank.position;
  var px = myPos[0], py = myPos[1];
  var dir = me.tank.direction;
  var frame = game.frames || 0;
  var map = game.map || [];
  var w = map.length;
  var h = map[0] ? map[0].length : 0;
  var dirs = ["up", "right", "down", "left"];
  var dv = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  var enemyTank = enemy && enemy.tank;
  var ex = enemyTank ? enemyTank.position[0] : _lastEX;
  var ey = enemyTank ? enemyTank.position[1] : _lastEY;
  var eDir = enemyTank ? enemyTank.direction : _lastEDir;
  var pathCache = {};

  if (px === _lastX && py === _lastY) _stuck++;
  else _stuck = 0;
  _lastX = px;
  _lastY = py;

  if (enemyTank) {
    _lastEX = ex;
    _lastEY = ey;
    _lastEDir = eDir;
    _lastSeen = frame;
  }

  if (_lastStarX >= 0 && (!game.star || game.star[0] !== _lastStarX || game.star[1] !== _lastStarY)) {
    if (px === _lastStarX && py === _lastStarY) { _myStars++; _justAteStarAt = frame; }
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

  function dist(a, b, c, d) {
    return Math.abs(a - c) + Math.abs(b - d);
  }

  function add(pos, d) {
    return [pos[0] + d[0], pos[1] + d[1]];
  }

  function delta(d) {
    return dv[d] || [0, -1];
  }

  function same(a, b) {
    return !!(a && b && a[0] === b[0] && a[1] === b[1]);
  }

  function dirTo(a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1];
    if (dx !== 0 && Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
    if (dy !== 0) return dy > 0 ? "down" : "up";
    return dir;
  }

  function oppositeDir(d) {
    var index = dirs.indexOf(d);
    return index < 0 ? d : dirs[(index + 2) % 4];
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

  function reversedControl() {
    return !!(me.status && me.status.reversed);
  }

  function actualGoDir() {
    return reversedControl() ? oppositeDir(dir) : dir;
  }

  function commandTurnToward(want) {
    var side = turnSide(dir, want);
    if (reversedControl()) side = side === "left" ? "right" : "left";
    me.turn(side);
    return true;
  }

  function say(tag, lines, gap) {
    if (_speakCount >= 20) return false;
    if (frame - _lastSpeakAt < (gap || 4)) return false;
    if (_lastSpeakTag === tag && frame - _lastSpeakAt < 10) return false;
    if (me && typeof me.speak === "function") {
      me.speak(lines[(frame + px * 3 + py * 5 + tag.length) % lines.length]);
      _speakCount++;
      _lastSpeakAt = frame;
      _lastSpeakTag = tag;
      return true;
    }
    return false;
  }

  function moveDir(want, tag) {
    if (!want || !dv[want]) return false;
    _lastMoveIntent = want;
    _lastIntentFrame = frame;
    if (actualGoDir() === want) {
      if (tag) say(tag, ["go"], 4);
      me.go();
      return true;
    }
    if (tag) say(tag, ["turn"], 4);
    return commandTurnToward(want);
  }

  function fireReady() {
    return !!(enemyTank && !me.bullet && !(me.status && me.status.fireLocked) && typeof me.fire === "function");
  }

  function boostReady() {
    return !!(me.skill && me.skill.type === "boost" &&
      me.skill.remainingCooldownFrames === 0 && typeof me.boost === "function");
  }

  function boosted() {
    return !!((me.status && me.status.boosted) ||
      (me.skill && me.skill.type === "boost" &&
        (me.skill.activeType === "boost" || me.skill.activeRemainingFrames > 0)));
  }

  function castBoost(tag) {
    if (!boostReady()) return false;
    _lastBoostAt = frame;
    say(tag || "boost", ["boost"], 4);
    me.boost();
    return true;
  }

  function boostLandingFor(dirName) {
    var step = delta(dirName);
    var one = [px + step[0], py + step[1]];
    var two = [px + step[0] * 2, py + step[1] * 2];
    if (!open(one[0], one[1]) || !open(two[0], two[1])) return null;
    return two;
  }

  function clearLaneFrom(sx, sy, facing, tx, ty) {
    if (!facing || !dv[facing]) return false;
    var step = dv[facing];
    var dx = tx - sx, dy = ty - sy;
    if (step[0] !== 0) {
      if (dy !== 0) return false;
      if ((step[0] > 0 && dx <= 0) || (step[0] < 0 && dx >= 0)) return false;
    } else {
      if (dx !== 0) return false;
      if ((step[1] > 0 && dy <= 0) || (step[1] < 0 && dy >= 0)) return false;
    }
    var x = sx + step[0], y = sy + step[1];
    while (x !== tx || y !== ty) {
      if (blocked(x, y)) return false;
      x += step[0];
      y += step[1];
    }
    return true;
  }

  function laneDirFromTo(sx, sy, tx, ty) {
    if (sx === tx) {
      var v = ty > sy ? "down" : "up";
      return clearLaneFrom(sx, sy, v, tx, ty) ? v : null;
    }
    if (sy === ty) {
      var hdir = tx > sx ? "right" : "left";
      return clearLaneFrom(sx, sy, hdir, tx, ty) ? hdir : null;
    }
    return null;
  }

  function enemyLaneTo(x, y) {
    if (!enemyTank) return null;
    var want = laneDirFromTo(ex, ey, x, y);
    if (!want) return null;
    return { dir: want, aimed: eDir === want, gap: dist(ex, ey, x, y) };
  }

  function enemyDebuffed() {
    var s = enemy && enemy.status;
    return !!(s && (s.frozen || s.stunned || s.fireLocked));
  }

  function enemyGunlineDirectionAt(x, y, maxCells) {
    if (!enemyTank || enemyDebuffed() || activeEnemyBullets().length) return null;
    if (x !== ex && y !== ey) return null;
    var want = ex === x ? (y < ey ? "up" : "down") : (x < ex ? "left" : "right");
    var gap = dist(ex, ey, x, y);
    if (gap <= 0 || gap > (maxCells || 11)) return null;
    if (!clearLaneFrom(ex, ey, want, x, y)) return null;
    var grace = gap <= 3 ? 2 : 1;
    return turnCost(eDir, want) <= grace ? want : null;
  }

  function rememberedGunlineDirectionAt(x, y, maxCells) {
    if (enemyTank || _lastEX < 0 || frame - _lastSeen > 12 || activeEnemyBullets().length) return null;
    if (x !== _lastEX && y !== _lastEY) return null;
    var want = _lastEX === x ? (y < _lastEY ? "up" : "down") : (x < _lastEX ? "left" : "right");
    var gap = dist(_lastEX, _lastEY, x, y);
    if (gap <= 0 || gap > (maxCells || 11)) return null;
    if (!clearLaneFrom(_lastEX, _lastEY, want, x, y)) return null;
    var grace = gap <= 3 ? 2 : 1;
    return turnCost(_lastEDir || want, want) <= grace ? want : null;
  }

  function replyGunlineDirectionAt(x, y, maxCells) {
    return enemyGunlineDirectionAt(x, y, maxCells) || rememberedGunlineDirectionAt(x, y, maxCells);
  }

  function isOwnBullet(bullet) {
    if (!bullet || !me.tank) return false;
    return !!((bullet.ownerTankId && bullet.ownerTankId === me.tank.id) ||
      (bullet.tank && bullet.tank.id && bullet.tank.id === me.tank.id));
  }

  function activeEnemyBullets() {
    var bullets = [];
    if (enemy && enemy.bullet && !isOwnBullet(enemy.bullet)) bullets.push(enemy.bullet);
    var visible = game.visibleBullets || [];
    for (var i = 0; i < visible.length; i++) {
      if (!isOwnBullet(visible[i])) bullets.push(visible[i]);
    }
    return bullets;
  }

  function rememberShotFromBullet(bullet) {
    if (!bullet || !bullet.position || !bullet.direction || !dv[bullet.direction]) return false;
    if (isOwnBullet(bullet)) return false;
    var step = delta(bullet.direction);
    var sx = -1, sy = -1;
    if (bullet.tank && bullet.tank.position) {
      sx = bullet.tank.position[0];
      sy = bullet.tank.position[1];
    } else if (enemyTank && clearLaneFrom(ex, ey, bullet.direction, bullet.position[0], bullet.position[1])) {
      sx = ex;
      sy = ey;
    } else {
      sx = bullet.position[0] - step[0];
      sy = bullet.position[1] - step[1];
    }
    if (!open(sx, sy)) {
      sx = bullet.position[0];
      sy = bullet.position[1];
    }
    if (!open(sx, sy)) return false;
    _shotLineX = sx;
    _shotLineY = sy;
    _shotLineDir = bullet.direction;
    _shotLineAt = frame;
    return true;
  }

  function refreshShotLineMemory() {
    var bullets = activeEnemyBullets();
    for (var i = 0; i < bullets.length; i++) {
      rememberShotFromBullet(bullets[i]);
    }
  }

  function rememberedShotDirectionAt(x, y) {
    if (_shotLineX < 0 || !_shotLineDir || frame - _shotLineAt > 18) return null;
    if (x !== _shotLineX && y !== _shotLineY) return null;
    var gap = dist(_shotLineX, _shotLineY, x, y);
    if (gap <= 0 || gap > 12) return null;
    return clearLaneFrom(_shotLineX, _shotLineY, _shotLineDir, x, y) ? _shotLineDir : null;
  }

  function enemyBulletStepsTo(x, y, framesAhead) {
    var bullets = activeEnemyBullets();
    var best = 999;
    for (var i = 0; i < bullets.length; i++) {
      var bullet = bullets[i];
      if (!bullet || !bullet.position || !bullet.direction) continue;
      var step = delta(bullet.direction);
      var bx = bullet.position[0], by = bullet.position[1];
      if (bx === x && by === y) best = Math.min(best, 0);
      var maxSteps = (framesAhead + 1) * 2;
      for (var s = 1; s <= maxSteps; s++) {
        bx += step[0];
        by += step[1];
        if (!open(bx, by)) break;
        if (bx === x && by === y) {
          best = Math.min(best, s);
          break;
        }
      }
    }
    return best;
  }

  function visibleBulletDangerAt(x, y, framesAhead) {
    return enemyBulletStepsTo(x, y, framesAhead) < 999;
  }

  function sameFrameShotThreatAt(x, y) {
    if (activeEnemyBullets().length) return null;
    if (enemyTank && !enemyDebuffed() && (x === ex || y === ey)) {
      var want = ex === x ? (y < ey ? "up" : "down") : (x < ex ? "left" : "right");
      var gap = dist(ex, ey, x, y);
      if (gap > 0 && gap <= 2 && eDir === want && clearLaneFrom(ex, ey, want, x, y)) {
        return { dir: want, gap: gap };
      }
    }
    if (!enemyTank && _lastEX >= 0 && frame - _lastSeen <= 8 && (x === _lastEX || y === _lastEY)) {
      var remembered = _lastEX === x ? (y < _lastEY ? "up" : "down") : (x < _lastEX ? "left" : "right");
      var rememberedGap = dist(_lastEX, _lastEY, x, y);
      if (rememberedGap > 0 && rememberedGap <= 2 &&
        turnCost(_lastEDir || remembered, remembered) <= 1 &&
        clearLaneFrom(_lastEX, _lastEY, remembered, x, y)) {
        return { dir: remembered, gap: rememberedGap };
      }
    }
    return null;
  }

  function longBulletLaneDirectionAt(x, y, maxCells) {
    var bullets = activeEnemyBullets();
    for (var i = 0; i < bullets.length; i++) {
      var bullet = bullets[i];
      if (!bullet || !bullet.position || !bullet.direction || !dv[bullet.direction]) continue;
      var step = delta(bullet.direction);
      var bx = bullet.position[0], by = bullet.position[1];
      for (var s = 0; s <= (maxCells || 10); s++) {
        if (bx === x && by === y) return bullet.direction;
        bx += step[0];
        by += step[1];
        if (!open(bx, by)) break;
      }
    }
    return null;
  }

  function leavesLane(moveDirName, laneDir) {
    if (!moveDirName || !laneDir) return false;
    if (laneDir === "left" || laneDir === "right") return moveDirName === "up" || moveDirName === "down";
    return moveDirName === "left" || moveDirName === "right";
  }

  function poorGunlineAt(x, y) {
    return !!(longBulletLaneDirectionAt(x, y, 12) || rememberedShotDirectionAt(x, y) || replyGunlineDirectionAt(x, y, 11));
  }

  function cellSafe(x, y, strict) {
    if (!open(x, y)) return false;
    if (visibleBulletDangerAt(x, y, 2)) return false;
    if (sameFrameShotThreatAt(x, y)) return false;
    if (longBulletLaneDirectionAt(x, y, 12)) return false;
    if (rememberedShotDirectionAt(x, y)) return false;
    if (strict && poorGunlineAt(x, y)) return false;
    var threat = enemyLaneTo(x, y);
    if (threat && threat.aimed && threat.gap <= (strict ? 7 : 4)) return false;
    if (enemyTank && dist(x, y, ex, ey) <= 1 && !clearShotReadyAt(x, y)) return false;
    return true;
  }

  function valueStepSafe(x, y, strict) {
    return cellSafe(x, y, strict || !!replyGunlineDirectionAt(x, y, 11));
  }

  function clearShotReadyAt(x, y) {
    if (!enemyTank || !fireReady()) return false;
    var want = laneDirFromTo(x, y, ex, ey);
    return !!want;
  }

  function shotDirToEnemy() {
    if (!enemyTank) return null;
    return laneDirFromTo(px, py, ex, ey);
  }

  function fireOrFace(want, tag) {
    if (!want || !fireReady()) return false;
    if (dir === want) {
      say(tag || "fire", ["fire"], 4);
      me.fire();
      return true;
    }
    if (boosted() && turnCost(dir, want) <= 1) {
      commandTurnToward(want);
      say(tag || "boost-shot", ["boost-shot"], 4);
      me.fire();
      return true;
    }
    say(tag || "face", ["face"], 4);
    return commandTurnToward(want);
  }

  function boostTurnGo(want, tag, target) {
    if (!boosted() || reversedControl() || turnCost(dir, want) !== 1) return false;
    var landing = boostLandingFor(want);
    if (!landing || !cellSafe(landing[0], landing[1], true)) return false;
    if (target && dist(landing[0], landing[1], target[0], target[1]) >= dist(px, py, target[0], target[1])) return false;
    _lastMoveIntent = want;
    _lastIntentFrame = frame;
    commandTurnToward(want);
    me.go();
    say(tag || "boost-turn-go", ["turn-go"], 3);
    return true;
  }

  function boostGoTurn(face, tag) {
    if (!boosted() || reversedControl() || turnCost(dir, face) > 1) return false;
    _lastMoveIntent = actualGoDir();
    _lastIntentFrame = frame;
    me.go();
    if (dir !== face) commandTurnToward(face);
    say(tag || "boost-go-turn", ["go-turn"], 3);
    return true;
  }

  function boostGoTurnFire(face, tag) {
    if (!boosted() || reversedControl() || !fireReady() || turnCost(dir, face) > 1) return false;
    var landing = boostLandingFor(actualGoDir());
    if (!landing || !cellSafe(landing[0], landing[1], false)) return false;
    if (laneDirFromTo(landing[0], landing[1], ex, ey) !== face) return false;
    _lastMoveIntent = actualGoDir();
    _lastIntentFrame = frame;
    me.go();
    if (dir !== face) commandTurnToward(face);
    say(tag || "boost-go-turn-fire", ["go-turn-fire"], 3);
    me.fire();
    return true;
  }

  function safeExitFromLane(threatDir) {
    var preferred = threatDir === "left" || threatDir === "right" ? ["up", "down", oppositeDir(threatDir)] : ["left", "right", oppositeDir(threatDir)];
    var goNow = actualGoDir();
    if (preferred.indexOf(goNow) >= 0) {
      var ahead = add(myPos, delta(goNow));
      if (cellSafe(ahead[0], ahead[1], true)) return goNow;
    }
    for (var i = 0; i < preferred.length; i++) {
      var d = preferred[i];
      var p = add(myPos, delta(d));
      if (cellSafe(p[0], p[1], true)) return d;
    }
    return null;
  }

  function lineExitSafe(moveDirName, laneDir, urgent) {
    if (!leavesLane(moveDirName, laneDir)) return false;
    var p = add(myPos, delta(moveDirName));
    return urgent ? urgentStepSafe(p[0], p[1]) : cellSafe(p[0], p[1], true);
  }

  function chooseLineExit(laneDir, urgent) {
    var goNow = actualGoDir();
    if (lineExitSafe(goNow, laneDir, urgent)) return goNow;
    var best = null, bestScore = -999;
    for (var i = 0; i < dirs.length; i++) {
      var d = dirs[i];
      if (!lineExitSafe(d, laneDir, urgent)) continue;
      var p = add(myPos, delta(d));
      var score = 50 - turnCost(actualGoDir(), d) * 8;
      if (game.star) score -= dist(p[0], p[1], game.star[0], game.star[1]);
      if (enemyTank) score += Math.min(6, dist(p[0], p[1], ex, ey));
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  }

  function committedLineExit(laneDir, urgent) {
    if (!_hazardExitDir || frame - _hazardExitFrame > 2) return null;
    return lineExitSafe(_hazardExitDir, laneDir, urgent) ? _hazardExitDir : null;
  }

  function rememberLineExit(dirName) {
    _hazardExitDir = dirName;
    _hazardExitFrame = frame;
    return dirName;
  }

  function urgentStepSafe(x, y) {
    if (!open(x, y)) return false;
    if (visibleBulletDangerAt(x, y, 1)) return false;
    if (sameFrameShotThreatAt(x, y)) return false;
    if (enemyTank && dist(x, y, ex, ey) <= 1 && !clearShotReadyAt(x, y)) return false;
    return true;
  }

  function tryImmediateShotEscape() {
    var shot = sameFrameShotThreatAt(px, py);
    if (!shot) return false;
    var goNow = actualGoDir();
    var ahead = add(myPos, delta(goNow));
    if (urgentStepSafe(ahead[0], ahead[1])) return moveDir(goNow, "shot-go-exit");

    var want = shotDirToEnemy();
    if (want && fireReady() && dir === want) return fireOrFace(want, "shot-trade");

    for (var i = 0; i < dirs.length; i++) {
      var d = dirs[i];
      if (!boosted() || reversedControl() || turnCost(dir, d) !== 1) continue;
      var p = add(myPos, delta(d));
      if (!urgentStepSafe(p[0], p[1])) continue;
      commandTurnToward(d);
      me.go();
      say("boost-shot-exit", ["turn-go"], 3);
      return true;
    }

    return commandTurnToward(oppositeDir(shot.dir));
  }

  function tryBulletEscape() {
    if (!visibleBulletDangerAt(px, py, 1)) return false;
    var bulletLane = longBulletLaneDirectionAt(px, py, 12);
    if (bulletLane) {
      var laneExit = committedLineExit(bulletLane, true) || chooseLineExit(bulletLane, true);
      if (laneExit) return moveDir(rememberLineExit(laneExit), "bullet-line-exit");
    }
    var goNow = actualGoDir();
    var ahead = add(myPos, delta(goNow));
    if (cellSafe(ahead[0], ahead[1], true)) return moveDir(goNow, "bullet-go-exit");
    for (var i = 0; i < dirs.length; i++) {
      var d = dirs[i];
      var p = add(myPos, delta(d));
      if (cellSafe(p[0], p[1], true)) return moveDir(d, "bullet-exit");
    }
    var want = shotDirToEnemy();
    if (want && fireReady()) return fireOrFace(want, "last-shot");
    return commandTurnToward(oppositeDir(dir));
  }

  function tryGunlineEscape() {
    var bulletLane = longBulletLaneDirectionAt(px, py, 12);
    var threatDir = bulletLane || rememberedShotDirectionAt(px, py) || replyGunlineDirectionAt(px, py, 11);
    if (!threatDir) return false;

    var want = shotDirToEnemy();
    if (!bulletLane && want && fireReady() && boosted()) return false;
    if (!bulletLane && want && fireReady() && dir === want &&
      dist(px, py, ex, ey) <= 5 && !visibleBulletDangerAt(px, py, 1)) {
      return fireOrFace(want, "gunline-counter");
    }

    var exit = committedLineExit(threatDir, !!bulletLane) || chooseLineExit(threatDir, !!bulletLane);
    if (exit) return moveDir(rememberLineExit(exit), bulletLane ? "bullet-line-exit" : "gunline-exit");

    if (want && fireReady()) return fireOrFace(want, bulletLane ? "bullet-line-trade" : "gunline-trade");
    return false;
  }

  function tryCloseGunline() {
    if (!enemyTank) return false;
    var threat = enemyLaneTo(px, py);
    var close = dist(px, py, ex, ey) <= 3;
    if (!threat && !close) return false;
    var want = shotDirToEnemy();
    if (boosted() && want && fireReady()) return false;
    if (want && fireReady() && (dir === want || boosted())) {
      return fireOrFace(want, "duel-shot");
    }
    if (threat && (threat.aimed || threat.gap <= 5)) {
      var exit = safeExitFromLane(threat.dir);
      if (exit) return moveDir(exit, "lane-exit");
    }
    if (want && fireReady() && (close || threat.aimed)) {
      return fireOrFace(want, "duel-shot");
    }
    if (want && fireReady()) return fireOrFace(want, "duel-face");
    return false;
  }

  function tryBoostSnapShot() {
    if (!boosted() || !enemyTank || !fireReady()) return false;
    var want = shotDirToEnemy();
    if (!want) return false;
    var gap = dist(px, py, ex, ey);
    if (gap < 1 || gap > 8) return false;
    if (visibleBulletDangerAt(px, py, 1)) return false;
    return fireOrFace(want, "boost-snap");
  }

  function tryAggressiveFire() {
    if (!boosted() || !enemyTank || !fireReady()) return false;
    if (visibleBulletDangerAt(px, py, 1)) return false;
    if (sameFrameShotThreatAt(px, py)) return false;
    var want = shotDirToEnemy();
    if (!want) return false;
    var gap = dist(px, py, ex, ey);
    if (gap < 1 || gap > 8) return false;
    if (longBulletLaneDirectionAt(px, py, 10)) return false;
    if (replyGunlineDirectionAt(px, py, 5)) return false;
    return fireOrFace(want, "aggressive-fire");
  }

  function boostLanding() {
    return boostLandingFor(actualGoDir());
  }

  function tryActiveBoostGunlineLanding() {
    if (!boosted() || !enemyTank || !fireReady()) return false;
    if (game.star && dist(px, py, game.star[0], game.star[1]) <= 1 && cellSafe(game.star[0], game.star[1], false)) {
      return false;
    }
    var landing = boostLanding();
    if (!landing || !cellSafe(landing[0], landing[1], false)) return false;
    var face = laneDirFromTo(landing[0], landing[1], ex, ey);
    if (!face || turnCost(dir, face) > 1) return false;
    return boostGoTurn(face, "boost-cut");
  }

  function tryActiveBoostBackshot() {
    if (!boosted() || !enemyTank || !fireReady()) return false;
    if (visibleBulletDangerAt(px, py, 1) || sameFrameShotThreatAt(px, py)) return false;
    if (game.star && dist(px, py, game.star[0], game.star[1]) <= 1 && cellSafe(game.star[0], game.star[1], false)) {
      return false;
    }
    var landing = boostLanding();
    if (!landing || !cellSafe(landing[0], landing[1], false)) return false;
    var face = laneDirFromTo(landing[0], landing[1], ex, ey);
    if (!face || turnCost(dir, face) > 1) return false;
    var gap = dist(landing[0], landing[1], ex, ey);
    if (gap < 1 || gap > 8) return false;
    if (eDir && face !== eDir) return false;
    return boostGoTurnFire(face, "boost-backshot");
  }

  function takeAdjacentStar() {
    if (!game.star) return false;
    if (dist(px, py, game.star[0], game.star[1]) !== 1) return false;
    if (!cellSafe(game.star[0], game.star[1], false)) return false;
    return moveDir(dirTo(myPos, game.star), "star-close");
  }

  function pathKey(from, to) {
    return from[0] + "," + from[1] + ">" + to[0] + "," + to[1];
  }

  function pathInfo(from, to) {
    var key = pathKey(from, to);
    if (pathCache[key]) return pathCache[key];
    if (!to || !open(to[0], to[1])) return null;
    var q = [{ x: from[0], y: from[1], first: null, dist: 0 }];
    var seen = {};
    seen[from[0] + "," + from[1]] = true;
    for (var qi = 0; qi < q.length; qi++) {
      var item = q[qi];
      if (item.x === to[0] && item.y === to[1]) {
        pathCache[key] = { first: item.first, dist: item.dist };
        return pathCache[key];
      }
      if (item.dist > 30) continue;
      for (var i = 0; i < dirs.length; i++) {
        var d = dirs[i];
        var step = delta(d);
        var nx = item.x + step[0], ny = item.y + step[1];
        var k = nx + "," + ny;
        if (seen[k] || !open(nx, ny)) continue;
        seen[k] = true;
        q.push({ x: nx, y: ny, first: item.first || d, dist: item.dist + 1 });
      }
    }
    pathCache[key] = null;
    return null;
  }

  function canBoostAlong(dirName, target) {
    if (!dirName || actualGoDir() !== dirName) return false;
    var step = delta(dirName);
    var one = [px + step[0], py + step[1]];
    var two = [px + step[0] * 2, py + step[1] * 2];
    if (!valueStepSafe(one[0], one[1], false) || !valueStepSafe(two[0], two[1], true)) return false;
    if (!target) return true;
    return dist(two[0], two[1], target[0], target[1]) < dist(px, py, target[0], target[1]);
  }

  function tryBoostForStar() {
    if (!game.star || boosted()) return false;
    var info = pathInfo(myPos, game.star);
    if (!info || !info.first) return false;
    if (info.dist <= 3) return false;
    if (!boostReady()) return false;
    if (frame < 4) return false;
    if (actualGoDir() !== info.first) return moveDir(info.first, "star-face");
    if (!canBoostAlong(info.first, game.star)) return false;
    return castBoost("boost-star");
  }

  function tryActiveBoostStarStep() {
    if (!game.star || !boosted()) return false;
    var info = pathInfo(myPos, game.star);
    if (!info || !info.first) return false;
    var next = add(myPos, delta(info.first));
    if (!valueStepSafe(next[0], next[1], info.dist > 2)) return false;
    if (info.dist <= 2) return moveDir(info.first, "boost-star-step");
    if (boostTurnGo(info.first, "boost-turn-go", game.star)) return true;
    if (canBoostAlong(info.first, game.star)) return moveDir(info.first, "boost-star-go");
    return moveDir(info.first, "boost-star-face");
  }

  function tryDirectStarStep() {
    if (!game.star) return false;
    var info = pathInfo(myPos, game.star);
    if (!info || !info.first) return false;
    var next = add(myPos, delta(info.first));
    if (!valueStepSafe(next[0], next[1], info.dist > 3)) return false;
    return moveDir(info.first, "star-path");
  }

  function tryBoostForGunline() {
    if (boosted() || !boostReady() || !enemyTank || !fireReady()) return false;
    var landing = boostLanding();
    if (!landing || !cellSafe(landing[0], landing[1], true)) return false;
    var face = laneDirFromTo(landing[0], landing[1], ex, ey);
    if (!face || turnCost(dir, face) > 1) return false;
    if (game.star && dist(px, py, game.star[0], game.star[1]) <= 4) return false;
    return castBoost("boost-gunline");
  }

  function tryPressureGunline() {
    if (!enemyTank) return false;
    var want = shotDirToEnemy();
    if (want && fireReady()) return fireOrFace(want, "pressure-fire");
    var best = null, bestScore = -999;
    for (var i = 0; i < dirs.length; i++) {
      var d = dirs[i];
      var p = add(myPos, delta(d));
      if (!cellSafe(p[0], p[1], false)) continue;
      if (!valueStepSafe(p[0], p[1], true)) continue;
      var face = laneDirFromTo(p[0], p[1], ex, ey);
      var score = (face ? 20 : 0) - dist(p[0], p[1], ex, ey);
      if (game.star) score -= Math.max(0, dist(p[0], p[1], game.star[0], game.star[1]) - 6);
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    if (best && bestScore >= -3) return moveDir(best, "pressure-move");
    return false;
  }

  function tryUnstickOrCenter() {
    var target = game.star || [Math.floor(w / 2), Math.floor(h / 2)];
    if (_stuck >= 3) {
      for (var i = 0; i < dirs.length; i++) {
        var d = dirs[(i + frame) % dirs.length];
        var p = add(myPos, delta(d));
        if (cellSafe(p[0], p[1], true)) return moveDir(d, "unstick");
      }
    }
    var info = pathInfo(myPos, target);
    if (info && info.first) {
      var next = add(myPos, delta(info.first));
      if (cellSafe(next[0], next[1], true)) return moveDir(info.first, "center");
    }
    var best = null, bestScore = 999;
    for (var j = 0; j < dirs.length; j++) {
      var dirName = dirs[(j + frame) % dirs.length];
      var cell = add(myPos, delta(dirName));
      if (!cellSafe(cell[0], cell[1], true)) continue;
      var score = dist(cell[0], cell[1], target[0], target[1]) + turnCost(actualGoDir(), dirName);
      if (score < bestScore) {
        bestScore = score;
        best = dirName;
      }
    }
    if (best) return moveDir(best, "safe-center");
    return moveDir(dirs[frame % 4], "patrol");
  }

  function behavior(id, run) {
    return { id: id, run: run };
  }

  function selector(id, children) {
    return { id: id, children: children };
  }

  function buildStrategyTree() {
    return selector("boost-root", [
      selector("survive", [
        behavior("same-frame-shot-escape", tryImmediateShotEscape),
        behavior("bullet-escape", tryBulletEscape),
        behavior("gunline-escape", tryGunlineEscape),
        behavior("close-gunline", tryCloseGunline),
      ]),
      selector("assault", [
        behavior("boost-snap-shot", tryBoostSnapShot),
        behavior("aggressive-fire", tryAggressiveFire),
        behavior("immediate-fire", function () {
          var want = shotDirToEnemy();
          return want && fireReady() ? fireOrFace(want, "clear-fire") : false;
        }),
        behavior("active-boost-backshot", tryActiveBoostBackshot),
        behavior("active-boost-gunline-landing", tryActiveBoostGunlineLanding),
      ]),
      selector("star", [
        behavior("adjacent-star", takeAdjacentStar),
        behavior("active-boost-star-step", tryActiveBoostStarStep),
        behavior("boost-for-star", tryBoostForStar),
        behavior("direct-star-step", tryDirectStarStep),
      ]),
      selector("pressure", [
        behavior("boost-for-gunline", tryBoostForGunline),
        behavior("pressure-gunline", tryPressureGunline),
        behavior("unstick-or-center", tryUnstickOrCenter),
      ]),
    ]);
  }

  function runNode(node) {
    if (!node) return false;
    if (node.run) return node.run();
    var children = node.children || [];
    for (var i = 0; i < children.length; i++) {
      if (runNode(children[i])) return true;
    }
    return false;
  }

  refreshShotLineMemory();
  runNode(buildStrategyTree());
}
