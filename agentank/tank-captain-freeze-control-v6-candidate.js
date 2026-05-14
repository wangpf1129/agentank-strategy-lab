var _lastX = -1, _lastY = -1, _stuck = 0;
var _lastEX = -1, _lastEY = -1, _lastEDir = null, _eMoveDir = null, _lastSeen = -99;
var _anchorKey = "", _anchor = null;
var _panicUntil = 0;

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
  var ex = -1, ey = -1, eDir = null;
  if (enemyTank) {
    ex = enemyTank.position[0];
    ey = enemyTank.position[1];
    eDir = enemyTank.direction;
    if (_lastEX >= 0) {
      var mx = ex - _lastEX, my = ey - _lastEY;
      _eMoveDir = mx > 0 ? "right" : mx < 0 ? "left" : my > 0 ? "down" : my < 0 ? "up" : null;
    }
    _lastEX = ex; _lastEY = ey; _lastEDir = eDir; _lastSeen = frame;
  } else if (_lastEX >= 0) {
    ex = _lastEX; ey = _lastEY; eDir = _lastEDir || _eMoveDir;
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

  function starsOf(actor) {
    if (!actor) return 0;
    if (typeof actor.stars === "number") return actor.stars;
    if (typeof actor.score === "number") return actor.score;
    return 0;
  }

  function freezeReady() {
    return me.skill && me.skill.type === "freeze" && me.skill.remainingCooldownFrames === 0;
  }

  function enemyDebuffed() {
    return !!(enemyTank && enemy.status && (enemy.status.frozen || enemy.status.stunned || enemy.status.poisoned));
  }

  function enemySkillIs(type) {
    return enemy && enemy.skill && enemy.skill.type === type;
  }

  function enemySkillReady(type, grace) {
    if (!enemySkillIs(type)) return false;
    var cd = enemy.skill.remainingCooldownFrames;
    return typeof cd !== "number" || cd <= grace;
  }

  function enemyOverloadArmed() {
    return enemySkillIs("overload") && !!(enemy.status && enemy.status.overloaded);
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

  function faceOrFire(targetDir) {
    if (dir === targetDir) me.fire();
    else turnTo(targetDir);
  }

  function moveDir(want) {
    if (!want) return false;
    if (dir === want) me.go();
    else turnTo(want);
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

  function canShoot(a, b) {
    var want = dirTo(a, b);
    return (a[0] === b[0] || a[1] === b[1]) && losFrom(a[0], a[1], want, b[0], b[1]);
  }

  function gunLineAt(x, y) {
    if (!enemyTank || !eDir || enemyDebuffed()) return false;
    if (dist(ex, ey, x, y) > 8) return false;
    return losFrom(ex, ey, eDir, x, y);
  }

  function quickAimAt(x, y) {
    if (!enemyTank || enemyDebuffed()) return false;
    if (dist(ex, ey, x, y) > 5) return false;
    if (ex !== x && ey !== y) return false;
    var need = ex === x ? (y < ey ? "up" : "down") : (x < ex ? "left" : "right");
    return turnCost(eDir, need) <= 1 && losFrom(ex, ey, need, x, y);
  }

  function grassMaze() {
    return w === 16 && h === 11;
  }

  function hiddenLaneAt(x, y) {
    if (enemyTank) return false;
    var memory = grassMaze() ? 34 : 16;
    if (_lastEX < 0 || frame - _lastSeen > memory) return false;
    var gap = dist(_lastEX, _lastEY, x, y);
    if (gap > (grassMaze() ? 13 : 9)) return false;
    if (_eMoveDir === "down" && x === _lastEX && y > _lastEY) return true;
    if (_eMoveDir === "up" && x === _lastEX && y < _lastEY) return true;
    if (_eMoveDir === "right" && y === _lastEY && x > _lastEX) return true;
    if (_eMoveDir === "left" && y === _lastEY && x < _lastEX) return true;
    return gap <= (grassMaze() ? 7 : 4) && (x === _lastEX || y === _lastEY);
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
    var maxCells = 12;
    var armed = enemyOverloadArmed();
    var readySoon = enemySkillReady("overload", 2);
    if (!armed && !readySoon) return false;

    for (var i = 0; i < 4; i++) {
      var fireDir = dirs[i];
      var cost = turnCost(eDir, fireDir);
      if (cost > (armed ? 1 : 0)) continue;
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

  function safeCell(x, y, strict) {
    if (!open(x, y)) return false;
    if (enemyTank && x === ex && y === ey) return false;
    if (bulletThreatAt(x, y, strict ? 10 : 6)) return false;
    if (overloadThreatAt(x, y)) return false;
    if (gunLineAt(x, y)) return false;
    if (strict && quickAimAt(x, y)) return false;
    if (strict && hiddenLaneAt(x, y)) return false;
    return true;
  }

  function pathInfo(start, goal, avoid) {
    if (!goal || !open(goal[0], goal[1])) return null;
    if (same(start, goal)) return { first: null, dist: 0 };
    var queue = [{ pos: start, first: null, dist: 0 }];
    var seen = {};
    seen[start[0] + "," + start[1]] = true;
    var dangerDepth = grassMaze() ? 7 : 3;
    for (var head = 0; head < queue.length && queue.length < 420; head++) {
      var item = queue[head];
      for (var i = 0; i < 4; i++) {
        var d = dirs[i];
        var next = add(item.pos, delta(d));
        var k = next[0] + "," + next[1];
        if (seen[k] || !open(next[0], next[1])) continue;
        if (enemyTank && next[0] === ex && next[1] === ey) continue;
        if (avoid && item.dist < dangerDepth && !safeCell(next[0], next[1], true)) continue;
        var first = item.first || d;
        if (same(next, goal)) return { first: first, dist: item.dist + 1 };
        seen[k] = true;
        queue.push({ pos: next, first: first, dist: item.dist + 1 });
      }
    }
    return null;
  }

  function pathDist(start, goal) {
    var p = pathInfo(start, goal, false);
    return p ? p.dist : 999;
  }

  function mapKey() {
    return w + "x" + h;
  }

  function anchor() {
    var key = mapKey();
    if (_anchor && _anchorKey === key && open(_anchor[0], _anchor[1])) return _anchor;
    _anchorKey = key;
    if (grassMaze() && open(7, 5)) {
      _anchor = [7, 5];
      return _anchor;
    }
    var cx = Math.floor(w / 2), cy = Math.floor(h / 2);
    var best = null, bestScore = -9999;
    for (var x = 1; x < w - 1; x++) {
      for (var y = 1; y < h - 1; y++) {
        if (!open(x, y)) continue;
        var score = -dist(x, y, cx, cy) * 4;
        for (var i = 0; i < 4; i++) {
          var n = add([x, y], delta(dirs[i]));
          if (open(n[0], n[1])) score += 3;
        }
        if (tile(x, y) === "o") score += 1;
        if (score > bestScore) {
          bestScore = score;
          best = [x, y];
        }
      }
    }
    _anchor = best || [px, py];
    return _anchor;
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
    if (p && p.first) return moveDir(p.first);
    if (tryClearMound(target)) return true;
    return false;
  }

  function aimDangerHere() {
    if (!enemyTank || enemyDebuffed()) return false;
    if (dist(px, py, ex, ey) > 6) return false;
    if (ex !== px && ey !== py) return false;
    var need = ex === px ? (py < ey ? "up" : "down") : (px < ex ? "left" : "right");
    if (!losFrom(ex, ey, need, px, py)) return false;
    if (turnCost(eDir, need) === 0) return true;
    if (turnCost(eDir, need) === 1 && (enemySkillIs("boost") || enemySkillIs("overload") || dist(px, py, ex, ey) <= 4)) return true;
    return false;
  }

  function escapeAimDir() {
    var best = null, bestScore = -9999;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var n = add(myPos, delta(d));
      if (!safeCell(n[0], n[1], true)) continue;
      if (enemyTank && (n[0] === ex || n[1] === ey)) continue;
      var score = 40 + dist(n[0], n[1], ex, ey) * 2 - turnCost(dir, d) * 8;
      if (game.star) score -= dist(n[0], n[1], game.star[0], game.star[1]);
      if (d === dir) score += 10;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return best;
  }

  function tryPreemptAimDodge() {
    var danger = aimDangerHere();
    var forced = frame <= _panicUntil;
    if (!danger && !forced) return false;
    var escape = escapeAimDir();
    if (escape) {
      if (danger && freezeReady() && !enemyDebuffed() && dir !== escape) {
        _panicUntil = frame + 4;
        me.freeze();
        return true;
      }
      return moveDir(escape);
    }
    if (danger && freezeReady() && !enemyDebuffed()) {
      _panicUntil = frame + 3;
      me.freeze();
      return true;
    }
    return false;
  }

  function tryDodge() {
    if (!bulletThreatAt(px, py, 10) && !overloadThreatAt(px, py) && !hiddenLaneAt(px, py)) return false;
    var best = null, bestScore = -9999;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i];
      var n = add(myPos, delta(d));
      if (!safeCell(n[0], n[1], true)) continue;
      var score = 20 - turnCost(dir, d) * 3;
      if (game.star) score -= dist(n[0], n[1], game.star[0], game.star[1]);
      if (score > bestScore) { bestScore = score; best = d; }
    }
    if (best) return moveDir(best);
    if (overloadThreatAt(px, py) && freezeReady() && enemyTank && !enemyDebuffed() && !enemy.bullet) {
      me.freeze();
      return true;
    }
    if (freezeReady() && enemyTank && !enemyDebuffed()) {
      me.freeze();
      return true;
    }
    return false;
  }

  function tryFreezeTempo(starInfo) {
    if (!freezeReady() || !enemyTank || enemyDebuffed()) return false;
    var d = dist(px, py, ex, ey);
    if (starInfo) {
      var enemyRace = starInfo.enemyRace;
      var canSwingRace = starInfo.myDist <= enemyRace + 2;
      if (starInfo.myDist <= 10 && canSwingRace && enemyRace <= starInfo.myDist + 1 &&
          (starsOf(me) <= starsOf(enemy) + 1 || enemyRace <= 3 || enemySkillIs("boost") || enemySkillIs("teleport"))) {
        me.freeze();
        return true;
      }
    }
    if (d <= 3 && !me.bullet && canShoot(myPos, [ex, ey]) && !(enemy.status && enemy.status.shielded)) {
      me.freeze();
      me.fire();
      return true;
    }
    if (d <= 7 && (gunLineAt(px, py) || enemySkillIs("overload") && enemySkillReady("overload", 2))) {
      _panicUntil = frame + 4;
      me.freeze();
      return true;
    }
    return false;
  }

  function tryAttack(urgentStar) {
    if (!enemyTank || (enemy.status && enemy.status.shielded) || me.bullet || me.status.fireLocked) return false;
    if (canShoot(myPos, [ex, ey])) {
      var want = dirTo(myPos, [ex, ey]);
      if (dir === want) {
        if (!urgentStar || enemyDebuffed() || !gunLineAt(px, py)) me.fire();
        else return false;
      } else if (!urgentStar) turnTo(want);
      else return false;
      return true;
    }
    if (urgentStar) return false;
    for (var i = 0; i < 4; i++) {
      if (dirs[i] !== dir && losFrom(px, py, dirs[i], ex, ey)) {
        turnTo(dirs[i]);
        return true;
      }
    }
    return false;
  }

  if (tryPreemptAimDodge()) return;
  if (tryDodge()) return;

  if (game.star) {
    var star = game.star;
    var myPath = pathInfo(myPos, star, true) || pathInfo(myPos, star, false);
    var myDist = myPath ? myPath.dist : 999;
    var enemyDist = enemyTank ? pathDist([ex, ey], star) : 999;
    var enemyRace = enemyDist;
    if (enemyTank && enemySkillIs("boost") && (enemySkillReady("boost", 8) || (enemy.status && enemy.status.boosted))) {
      enemyRace = Math.ceil(enemyDist / 2);
    }
    var starInfo = { myDist: myDist, enemyDist: enemyDist, enemyRace: enemyRace };
    if (tryFreezeTempo(starInfo)) return;
    var lead = starsOf(me) - starsOf(enemy);
    var margin = lead < 0 ? 4 : lead === 0 ? 3 : 1;
    var urgent = myDist <= enemyRace + margin || myDist <= 2 || (lead < 0 && myDist <= enemyRace + 5);
    if (grassMaze() && myDist < 30 && (frame > 24 || lead <= 0) && (enemyDist > 1 || frame > 40)) urgent = true;
    if (urgent && myPath && myPath.first) {
      var step = add(myPos, delta(myPath.first));
      if (safeCell(step[0], step[1], true)) return moveDir(myPath.first);
      if (tryFreezeTempo(starInfo)) return;
    }
    if (urgent && moveToward(star, true)) return;
    if (!urgent && tryAttack(false)) return;
    if (moveToward(anchor(), true)) return;
    if (tryClearMound(star)) return;
  }

  if (tryFreezeTempo(null)) return;
  if (tryAttack(false)) return;

  var home = anchor();
  if (dist(px, py, home[0], home[1]) > 1) {
    if (moveToward(home, true)) return;
  } else {
    var faceTarget = enemyTank ? [ex, ey] : [Math.floor(w / 2), Math.floor(h / 2)];
    var face = dirTo(myPos, faceTarget);
    if (face !== dir) {
      turnTo(face);
      return;
    }
    if (tryClearMound(faceTarget)) return;
  }

  if (_stuck >= 2) {
    for (var i = 0; i < 4; i++) {
      var d = dirs[(dirs.indexOf(dir) + i + 1) % 4];
      var n = add(myPos, delta(d));
      if (safeCell(n[0], n[1], true)) {
        moveDir(d);
        return;
      }
    }
  }

  var fwd = add(myPos, delta(dir));
  if (safeCell(fwd[0], fwd[1], true)) me.go();
  else me.turn("right");
}
