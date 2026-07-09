var _lastX = -1, _lastY = -1, _stuck = 0;
var _lastEX = -1, _lastEY = -1, _lastEDir = null, _lastSeen = -99;
var _lastStarX = -1, _lastStarY = -1, _myStars = 0, _enemyStars = 0;
var _lastBoostAt = -99, _lastSpeakAt = -99, _lastSpeakTag = "", _speakCount = 0;
var _lastMoveIntent = null, _lastIntentFrame = -99;

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

  function visibleBulletDangerAt(x, y, framesAhead) {
    var bullet = enemy && enemy.bullet;
    if (!bullet || !bullet.position || !bullet.direction) return false;
    var step = delta(bullet.direction);
    var bx = bullet.position[0], by = bullet.position[1];
    for (var f = 0; f <= framesAhead; f++) {
      for (var s = 0; s < 2; s++) {
        bx += step[0];
        by += step[1];
        if (!open(bx, by)) break;
        if (bx === x && by === y) return true;
      }
    }
    return false;
  }

  function cellSafe(x, y, strict) {
    if (!open(x, y)) return false;
    if (visibleBulletDangerAt(x, y, 2)) return false;
    var threat = enemyLaneTo(x, y);
    if (threat && threat.aimed && threat.gap <= (strict ? 7 : 4)) return false;
    if (enemyTank && dist(x, y, ex, ey) <= 1 && !clearShotReadyAt(x, y)) return false;
    return true;
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

  function safeExitFromLane(threatDir) {
    var preferred = threatDir === "left" || threatDir === "right" ? ["up", "down", oppositeDir(threatDir)] : ["left", "right", oppositeDir(threatDir)];
    for (var i = 0; i < preferred.length; i++) {
      var d = preferred[i];
      var p = add(myPos, delta(d));
      if (cellSafe(p[0], p[1], true)) return d;
    }
    return null;
  }

  function tryBulletEscape() {
    if (!visibleBulletDangerAt(px, py, 1)) return false;
    for (var i = 0; i < dirs.length; i++) {
      var d = dirs[i];
      var p = add(myPos, delta(d));
      if (cellSafe(p[0], p[1], true)) return moveDir(d, "bullet-exit");
    }
    var want = shotDirToEnemy();
    if (want && fireReady()) return fireOrFace(want, "last-shot");
    return commandTurnToward(oppositeDir(dir));
  }

  function tryCloseGunline() {
    if (!enemyTank) return false;
    var threat = enemyLaneTo(px, py);
    var close = dist(px, py, ex, ey) <= 2;
    if (!threat && !close) return false;
    var want = shotDirToEnemy();
    if (boosted() && want && fireReady()) return false;
    if (want && fireReady() && (dir === want || boosted() || close || threat.aimed)) {
      return fireOrFace(want, "duel-shot");
    }
    if (threat && (threat.aimed || threat.gap <= 5)) {
      var exit = safeExitFromLane(threat.dir);
      if (exit) return moveDir(exit, "lane-exit");
    }
    if (want && fireReady()) return fireOrFace(want, "duel-face");
    return false;
  }

  function tryBoostSnapShot() {
    if (!boosted() || !enemyTank || !fireReady()) return false;
    if (visibleBulletDangerAt(px, py, 1)) return false;
    var want = shotDirToEnemy();
    if (!want) return false;
    var gap = dist(px, py, ex, ey);
    if (gap < 2 || gap > 9) return false;
    return fireOrFace(want, "boost-snap");
  }

  function boostLanding() {
    var step = delta(actualGoDir());
    var one = [px + step[0], py + step[1]];
    var two = [px + step[0] * 2, py + step[1] * 2];
    if (!open(one[0], one[1]) || !open(two[0], two[1])) return null;
    return two;
  }

  function tryActiveBoostGunlineLanding() {
    if (!boosted() || !enemyTank || !fireReady()) return false;
    if (game.star && dist(px, py, game.star[0], game.star[1]) <= 1 && cellSafe(game.star[0], game.star[1], false)) {
      return false;
    }
    var landing = boostLanding();
    if (!landing || !cellSafe(landing[0], landing[1], true)) return false;
    var face = laneDirFromTo(landing[0], landing[1], ex, ey);
    if (!face || turnCost(dir, face) > 1) return false;
    _lastMoveIntent = actualGoDir();
    _lastIntentFrame = frame;
    me.go();
    commandTurnToward(face);
    say("boost-cut", ["boost-cut"], 3);
    return true;
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
    if (!cellSafe(one[0], one[1], false) || !cellSafe(two[0], two[1], true)) return false;
    if (!target) return true;
    return dist(two[0], two[1], target[0], target[1]) < dist(px, py, target[0], target[1]);
  }

  function tryBoostForStar() {
    if (!game.star || boosted()) return false;
    var info = pathInfo(myPos, game.star);
    if (!info || !info.first) return false;
    if (info.dist <= 3) return false;
    if (!boostReady()) return false;
    if (actualGoDir() !== info.first) return moveDir(info.first, "star-face");
    if (!canBoostAlong(info.first, game.star)) return false;
    return castBoost("boost-star");
  }

  function tryActiveBoostStarStep() {
    if (!game.star || !boosted()) return false;
    var info = pathInfo(myPos, game.star);
    if (!info || !info.first) return false;
    if (info.dist <= 2) return moveDir(info.first, "boost-star-step");
    if (canBoostAlong(info.first, game.star)) return moveDir(info.first, "boost-star-go");
    return moveDir(info.first, "boost-star-face");
  }

  function tryDirectStarStep() {
    if (!game.star) return false;
    var info = pathInfo(myPos, game.star);
    if (!info || !info.first) return false;
    var next = add(myPos, delta(info.first));
    if (!cellSafe(next[0], next[1], info.dist > 3)) return false;
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
        if (cellSafe(p[0], p[1], false)) return moveDir(d, "unstick");
      }
    }
    var info = pathInfo(myPos, target);
    if (info && info.first) return moveDir(info.first, "center");
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
        behavior("bullet-escape", tryBulletEscape),
        behavior("close-gunline", tryCloseGunline),
      ]),
      selector("assault", [
        behavior("boost-snap-shot", tryBoostSnapShot),
        behavior("immediate-fire", function () {
          var want = shotDirToEnemy();
          return want && fireReady() ? fireOrFace(want, "clear-fire") : false;
        }),
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

  runNode(buildStrategyTree());
}
