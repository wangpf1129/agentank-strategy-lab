var _px = -1, _py = -1, _stuck = 0;
var _lastEX = -1, _lastEY = -1, _lastEDir = null, _eMoveDir = null, _lastSeen = -99;
var _lastFire = -99, _lastSpeak = -99, _speakCount = 0;
var _mapKey = "", _anchor = null;

function onIdle(me, enemy, game) {
  var pos = me.tank.position;
  var px = pos[0], py = pos[1];
  var dir = me.tank.direction;
  var frame = game.frames || 0;
  var dirs = ["up", "right", "down", "left"];
  var dv = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  var w = game.map.length;
  var h = game.map[0] ? game.map[0].length : 0;

  if (px === _px && py === _py) _stuck++;
  else _stuck = 0;
  _px = px; _py = py;

  var ex = -1, ey = -1, eDir = null;
  if (enemy && enemy.tank) {
    var ep = enemy.tank.position;
    ex = ep[0]; ey = ep[1]; eDir = enemy.tank.direction;
    if (_lastEX >= 0) {
      var mx = ex - _lastEX, my = ey - _lastEY;
      _eMoveDir = mx > 0 ? "right" : mx < 0 ? "left" : my > 0 ? "down" : my < 0 ? "up" : null;
    }
    _lastEX = ex; _lastEY = ey; _lastEDir = eDir; _lastSeen = frame;
  } else if (_lastEX >= 0) {
    ex = _lastEX; ey = _lastEY; eDir = _lastEDir || _eMoveDir;
  }

  function say(text) {
    if (_speakCount >= 8 || frame - _lastSpeak < 20) return;
    _speakCount++; _lastSpeak = frame;
    if (me.speak) me.speak(text);
    else if (typeof speak === "function") speak(text);
  }

  function tile(x, y) {
    var col = game.map[x];
    return col ? (col[y] || "x") : "x";
  }

  function block(x, y) {
    var t = tile(x, y);
    return t === "x" || t === "m";
  }

  function passable(x, y) {
    return !block(x, y);
  }

  function manhattan(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  function starsOf(actor) {
    if (!actor) return 0;
    if (typeof actor.stars === "number") return actor.stars;
    if (typeof actor.score === "number") return actor.score;
    return 0;
  }

  function enemyVisible() {
    return !!(enemy && enemy.tank);
  }

  function grassMazeMap() {
    return w === 16 && h === 11;
  }

  function enemySkillIs(type) {
    return enemy && enemy.skill && enemy.skill.type === type;
  }

  function enemySkillReady(type, grace) {
    if (!enemySkillIs(type)) return false;
    var cd = enemy.skill.remainingCooldownFrames;
    return typeof cd !== "number" || cd <= grace;
  }

  function freezeReady() {
    return me.skill && me.skill.type === "freeze" && me.skill.remainingCooldownFrames === 0;
  }

  function enemyDebuffed() {
    if (!enemy || !enemy.tank) return false;
    if (enemy.status && (enemy.status.frozen || enemy.status.stunned || enemy.status.poisoned)) return true;
    return enemy.effects && enemy.effects.debuff && enemy.effects.debuff.remainingFrames > 0;
  }

  function turnCost(from, to) {
    var a = dirs.indexOf(from), b = dirs.indexOf(to);
    if (a < 0 || b < 0) return 9;
    return Math.min((b - a + 4) % 4, (a - b + 4) % 4);
  }

  function turnTo(want) {
    if (!want || want === dir) return false;
    var a = dirs.indexOf(dir), b = dirs.indexOf(want);
    var diff = (b - a + 4) % 4;
    me.turn(diff <= 2 ? "right" : "left");
    return true;
  }

  function goDir(want) {
    if (!want) return false;
    if (dir === want) me.go();
    else turnTo(want);
    return true;
  }

  function dirTo(ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return dx > 0 ? "right" : "left";
    if (dy !== 0) return dy > 0 ? "down" : "up";
    return dir;
  }

  function losFrom(sx, sy, facing, tx, ty) {
    if (!facing || !dv[facing]) return false;
    var step = dv[facing];
    var dx = tx - sx, dy = ty - sy;
    if (step[0] !== 0) {
      if (dy !== 0) return false;
      if ((step[0] > 0 && dx <= 0) || (step[0] < 0 && dx >= 0)) return false;
      for (var x = sx + step[0]; x !== tx; x += step[0]) if (block(x, sy)) return false;
      return true;
    }
    if (dx !== 0) return false;
    if ((step[1] > 0 && dy <= 0) || (step[1] < 0 && dy >= 0)) return false;
    for (var y = sy + step[1]; y !== ty; y += step[1]) if (block(sx, y)) return false;
    return true;
  }

  function los(facing, tx, ty) {
    return losFrom(px, py, facing, tx, ty);
  }

  function enemyGunLineAt(tx, ty) {
    if (!enemyVisible() || !eDir) return false;
    if (enemy.status && enemy.status.frozen) return false;
    if (manhattan(ex, ey, tx, ty) > 8) return false;
    return losFrom(ex, ey, eDir, tx, ty);
  }

  function enemyQuickAimAt(tx, ty) {
    if (!enemyVisible()) return false;
    if (enemy.status && enemy.status.frozen) return false;
    if (manhattan(ex, ey, tx, ty) > 5) return false;
    if (ex !== tx && ey !== ty) return false;
    var need = ex === tx ? (ty < ey ? "up" : "down") : (tx < ex ? "left" : "right");
    return turnCost(eDir, need) <= 1 && losFrom(ex, ey, need, tx, ty);
  }

  function hiddenLaneAt(tx, ty) {
    if (enemyVisible()) return false;
    var maze = grassMazeMap();
    if (_lastEX < 0 || frame - _lastSeen > (maze ? 34 : 16)) return false;
    var gap = manhattan(_lastEX, _lastEY, tx, ty);
    if (gap > (maze ? 13 : 9)) return false;
    if (_eMoveDir === "down" && tx === _lastEX && ty > _lastEY) return true;
    if (_eMoveDir === "up" && tx === _lastEX && ty < _lastEY) return true;
    if (_eMoveDir === "right" && ty === _lastEY && tx > _lastEX) return true;
    if (_eMoveDir === "left" && ty === _lastEY && tx < _lastEX) return true;
    return gap <= (maze ? 7 : 4) && (tx === _lastEX || ty === _lastEY);
  }

  function bulletThreatAt(tx, ty, horizon) {
    if (!enemy || !enemy.bullet) return false;
    var bp = enemy.bullet.position;
    var bd = enemy.bullet.direction;
    if (!bd || !dv[bd]) return false;
    var step = dv[bd];

    function scan(sx, sy) {
      var x = sx, y = sy;
      for (var i = 0; i <= horizon; i++) {
        if (x === tx && y === ty) return true;
        x += step[0]; y += step[1];
        if (block(x, y)) return false;
      }
      return false;
    }

    if (scan(bp[0], bp[1])) return true;
    if (enemySkillIs("overload") &&
        ((enemy.status && enemy.status.overloaded) ||
         (enemy.skill && enemy.skill.activeType === "overload"))) {
      if (step[0] !== 0) return scan(bp[0], bp[1] - 1) || scan(bp[0], bp[1] + 1);
      return scan(bp[0] - 1, bp[1]) || scan(bp[0] + 1, bp[1]);
    }
    return false;
  }

  function safeCell(x, y, strict) {
    if (!passable(x, y)) return false;
    if (enemyVisible() && x === ex && y === ey) return false;
    if (bulletThreatAt(x, y, strict ? 5 : 3)) return false;
    if (enemyGunLineAt(x, y)) return false;
    if (strict && enemyQuickAimAt(x, y)) return false;
    if (strict && hiddenLaneAt(x, y)) return false;
    if (enemyVisible() && manhattan(x, y, ex, ey) <= 1 && !enemyDebuffed()) return false;
    return true;
  }

  function bfs(sx, sy, gx, gy, avoidDanger) {
    if (!passable(gx, gy)) return null;
    if (sx === gx && sy === gy) return { dist: 0, dir: null };
    var qx = [sx], qy = [sy], qd = [null], qn = [0], head = 0;
    var seen = {};
    seen[sx + "," + sy] = true;
    while (head < qx.length && qx.length < 500) {
      var cx = qx[head], cy = qy[head], first = qd[head], n = qn[head];
      head++;
      for (var i = 0; i < 4; i++) {
        var d = dirs[i], step = dv[d];
        var nx = cx + step[0], ny = cy + step[1], key = nx + "," + ny;
        if (seen[key] || !passable(nx, ny)) continue;
        if (enemyVisible() && nx === ex && ny === ey) continue;
        if (avoidDanger && n < (grassMazeMap() ? 8 : 3) && !safeCell(nx, ny, true)) continue;
        if (nx === gx && ny === gy) return { dist: n + 1, dir: first || d };
        seen[key] = true;
        qx.push(nx); qy.push(ny); qd.push(first || d); qn.push(n + 1);
      }
    }
    return null;
  }

  function bfsDist(sx, sy, gx, gy) {
    var r = bfs(sx, sy, gx, gy, false);
    return r ? r.dist : 999;
  }

  function mapFingerprint() {
    var rows = [];
    for (var x = 0; x < w; x++) rows.push(game.map[x].join(""));
    return rows.join("|");
  }

  function lineSpan(x, y, facing) {
    var step = dv[facing], n = 0;
    var cx = x + step[0], cy = y + step[1];
    while (!block(cx, cy) && n < 8) {
      n++; cx += step[0]; cy += step[1];
    }
    return n;
  }

  function openNeighbors(x, y) {
    var n = 0;
    for (var i = 0; i < 4; i++) {
      var step = dv[dirs[i]];
      if (passable(x + step[0], y + step[1])) n++;
    }
    return n;
  }

  function computeAnchor() {
    var key = mapFingerprint();
    if (_anchor && _mapKey === key) return _anchor;
    _mapKey = key;
    var cx = (w - 1) / 2, cy = (h - 1) / 2;
    var best = null, bestScore = -99999;
    for (var x = 0; x < w; x++) {
      for (var y = 0; y < h; y++) {
        if (!passable(x, y)) continue;
        var score = -manhattan(x, y, cx, cy) * 5;
        score += openNeighbors(x, y) * 8;
        score += Math.min(12, lineSpan(x, y, "up") + lineSpan(x, y, "down"));
        score += Math.min(12, lineSpan(x, y, "left") + lineSpan(x, y, "right"));
        if (tile(x, y) === "o") score += 3;
        if (x <= 1 || y <= 1 || x >= w - 2 || y >= h - 2) score -= 10;
        if (score > bestScore) {
          bestScore = score;
          best = [x, y];
        }
      }
    }
    _anchor = best || [px, py];
    return _anchor;
  }

  function bestCellNear(tx, ty, radius) {
    var best = null, bestScore = -99999;
    for (var x = 0; x < w; x++) {
      for (var y = 0; y < h; y++) {
        if (manhattan(x, y, tx, ty) > radius || !safeCell(x, y, true)) continue;
        var route = bfs(px, py, x, y, true);
        if (!route) continue;
        var score = -route.dist * 4 - manhattan(x, y, tx, ty) * 3 + openNeighbors(x, y) * 4;
        if (enemyVisible()) {
          if (losFrom(x, y, dirTo(x, y, ex, ey), ex, ey)) score += 8;
          score += Math.min(8, manhattan(x, y, ex, ey));
        }
        if (score > bestScore) {
          bestScore = score;
          best = [x, y];
        }
      }
    }
    return best;
  }

  function tryDodge() {
    if (!bulletThreatAt(px, py, 3)) return false;
    var best = null, bestScore = -9999;
    for (var i = 0; i < 4; i++) {
      var d = dirs[i], step = dv[d];
      var nx = px + step[0], ny = py + step[1];
      if (!safeCell(nx, ny, true)) continue;
      var score = 20 - turnCost(dir, d) * 3;
      if (game.star) score -= manhattan(nx, ny, game.star[0], game.star[1]);
      if (enemyVisible()) score += manhattan(nx, ny, ex, ey);
      if (score > bestScore) { bestScore = score; best = d; }
    }
    if (best) return goDir(best);
    if (freezeReady() && enemyVisible() && manhattan(px, py, ex, ey) <= 7 && !enemyDebuffed()) {
      me.freeze(); return true;
    }
    return false;
  }

  function tryFreezeShot() {
    if (!freezeReady() || !enemyVisible() || enemyDebuffed()) return false;
    if (enemy.status && enemy.status.shielded) return false;
    var d = manhattan(px, py, ex, ey);
    if (d <= 3 && !me.bullet && los(dir, ex, ey)) {
      say("Freeze. Fire.");
      me.freeze();
      me.fire();
      _lastFire = frame + 1;
      return true;
    }
    if (d <= 6 && enemyGunLineAt(px, py)) {
      me.freeze(); return true;
    }
    if (enemySkillIs("overload") && (enemySkillReady("overload", 2) ||
        (enemy.status && enemy.status.overloaded)) && d <= 8) {
      me.freeze(); return true;
    }
    return false;
  }

  function tryAttack(onlySafe) {
    if (!enemyVisible()) return false;
    if (enemy.status && enemy.status.shielded) return false;
    if (me.bullet || me.status.fireLocked) return false;
    if (los(dir, ex, ey)) {
      if (onlySafe && !enemyDebuffed() && (enemyGunLineAt(px, py) || enemySkillIs("overload"))) return false;
      me.fire(); _lastFire = frame; return true;
    }
    if (onlySafe) return false;
    for (var i = 0; i < 4; i++) {
      if (dirs[i] !== dir && los(dirs[i], ex, ey)) {
        turnTo(dirs[i]); return true;
      }
    }
    return false;
  }

  function tryFreezeStar(sx, sy, myD, enemyD) {
    if (!freezeReady() || !enemyVisible() || enemyDebuffed()) return false;
    var eRace = enemyD;
    if (enemySkillIs("boost") && (enemySkillReady("boost", 8) ||
        (enemy.status && enemy.status.boosted))) eRace = Math.ceil(enemyD / 2);
    var closeContest = myD <= 9 && eRace <= myD + 1;
    var mustWin = starsOf(me) <= starsOf(enemy) + 1 || myD <= 3 || eRace <= 3;
    if (closeContest && (mustWin || enemySkillIs("boost") || enemySkillIs("teleport") || enemySkillIs("shield"))) {
      say("Star lane frozen.");
      me.freeze(); return true;
    }
    return false;
  }

  function tryClearMoundToward(target) {
    if (!target || me.bullet || me.status.fireLocked) return false;
    var front = dv[dir];
    if (tile(px + front[0], py + front[1]) === "m") {
      me.fire(); _lastFire = frame; return true;
    }
    var want = null;
    if (px === target[0]) want = target[1] < py ? "up" : "down";
    else if (py === target[1]) want = target[0] < px ? "left" : "right";
    if (!want) return false;
    var step = dv[want], x = px + step[0], y = py + step[1];
    while (x !== target[0] || y !== target[1]) {
      var t = tile(x, y);
      if (t === "x") return false;
      if (t === "m") {
        if (dir === want) { me.fire(); _lastFire = frame; }
        else turnTo(want);
        return true;
      }
      x += step[0]; y += step[1];
    }
    return false;
  }

  function moveTo(target, avoidDanger) {
    if (!target) return false;
    var route = bfs(px, py, target[0], target[1], avoidDanger);
    if (route && route.dir) return goDir(route.dir);
    if (tryClearMoundToward(target)) return true;
    return false;
  }

  function chooseStarTarget(sx, sy, myD, enemyD) {
    var lead = starsOf(me) - starsOf(enemy);
    var margin = lead < 0 ? 4 : lead === 0 ? 3 : 1;
    if (!enemyVisible() || myD <= enemyD + margin || myD <= 2) return [sx, sy];
    var control = bestCellNear(sx, sy, 3);
    if (control) return control;
    return lead >= 2 ? computeAnchor() : [sx, sy];
  }

  function holdAnchor() {
    var anchor = computeAnchor();
    if (manhattan(px, py, anchor[0], anchor[1]) <= 1) {
      if (tryAttack(true)) return true;
      var face = enemyVisible() ? dirTo(px, py, ex, ey) : dirTo(px, py, Math.round((w - 1) / 2), Math.round((h - 1) / 2));
      if (face !== dir) return turnTo(face);
      if (tryClearMoundToward([Math.round((w - 1) / 2), Math.round((h - 1) / 2)])) return true;
      return false;
    }
    return moveTo(anchor, true);
  }

  if (frame === 0) say("Control online.");

  if (tryDodge()) return;
  if (tryFreezeShot()) return;

  if (game.star) {
    var sx = game.star[0], sy = game.star[1];
    var myD = bfsDist(px, py, sx, sy);
    var enemyD = enemyVisible() ? bfsDist(ex, ey, sx, sy) : 999;
    if (tryFreezeStar(sx, sy, myD, enemyD)) return;
    var target = chooseStarTarget(sx, sy, myD, enemyD);
    if (moveTo(target, true)) return;
    if (tryClearMoundToward([sx, sy])) return;
  }

  if (tryAttack(false)) return;
  if (holdAnchor()) return;

  if (_stuck >= 2) {
    for (var i = 0; i < 4; i++) {
      var d = dirs[(dirs.indexOf(dir) + i + 1) % 4], step = dv[d];
      if (safeCell(px + step[0], py + step[1], true)) { goDir(d); return; }
    }
  }

  var f = dv[dir];
  if (safeCell(px + f[0], py + f[1], true)) me.go();
  else me.turn("right");
}
