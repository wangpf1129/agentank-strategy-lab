var _prevX = -1, _prevY = -1, _stuck = 0;
var _lastEX = -1, _lastEY = -1, _eMoveDir = null;
var _eHistory = []; // track enemy positions for prediction
var _vis = new Array(2000);
var _visGen = 0;
var _lastDodgeDir = null;
var _lastFireFrame = -99;
var _lastTauntFrame = -99, _tauntCount = 0;
var _lastTeleportFrame = -99, _teleportSeenX = -1, _teleportSeenY = -1;

function onIdle(me, enemy, game) {
  var pos = me.tank.position;
  var dir = me.tank.direction;
  var px = pos[0], py = pos[1];
  var frame = game.frames || 0;

  if (px === _prevX && py === _prevY) _stuck++;
  else _stuck = 0;
  _prevX = px; _prevY = py;

  var dv = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var allD = ["up", "right", "down", "left"];
  var ddx = [0, 1, 0, -1], ddy = [-1, 0, 1, 0];

  function taunt(text) {
    if (_tauntCount >= 10 || frame - _lastTauntFrame < 18) return;
    _tauntCount++;
    _lastTauntFrame = frame;
    if (me.speak) me.speak(text);
    else if (typeof speak === "function") speak(text);
  }

  function tile(x, y) {
    var c = game.map[x];
    return c ? (c[y] || "x") : "x";
  }
  function ok(x, y) { return tile(x, y) !== "x"; }

  function turnTo(want) {
    if (dir === want) return false;
    var ci = allD.indexOf(dir), wi = allD.indexOf(want);
    var diff = (wi - ci + 4) % 4;
    if (diff <= 2) me.turn("right"); else me.turn("left");
    return true;
  }

  function dist(x1, y1, x2, y2) { return Math.abs(x1 - x2) + Math.abs(y1 - y2); }
  function turnCost(from, to) {
    var fi = allD.indexOf(from), ti = allD.indexOf(to);
    if (fi < 0 || ti < 0) return 99;
    return Math.min((ti - fi + 4) % 4, (fi - ti + 4) % 4);
  }

  function los(d, ex, ey) {
    var dd = dv[d];
    var dx = ex - px, dy = ey - py;
    if (dd[0] !== 0) {
      if (dy !== 0) return false;
      if ((dd[0] > 0 && dx <= 0) || (dd[0] < 0 && dx >= 0)) return false;
      for (var i = 1; i < Math.abs(dx); i++)
        if (tile(px + dd[0] * i, py) === "x") return false;
      return true;
    }
    if (dx !== 0) return false;
    if ((dd[1] > 0 && dy <= 0) || (dd[1] < 0 && dy >= 0)) return false;
    for (var i = 1; i < Math.abs(dy); i++)
      if (tile(px, py + dd[1] * i) === "x") return false;
    return true;
  }

  function losFrom(sx, sy, d, ex, ey) {
    if (!d || !dv[d]) return false;
    var dd = dv[d];
    var dx = ex - sx, dy = ey - sy;
    if (dd[0] !== 0) {
      if (dy !== 0) return false;
      if ((dd[0] > 0 && dx <= 0) || (dd[0] < 0 && dx >= 0)) return false;
      for (var i = 1; i < Math.abs(dx); i++)
        if (tile(sx + dd[0] * i, sy) === "x") return false;
      return true;
    }
    if (dx !== 0) return false;
    if ((dd[1] > 0 && dy <= 0) || (dd[1] < 0 && dy >= 0)) return false;
    for (var i = 1; i < Math.abs(dy); i++)
      if (tile(sx, sy + dd[1] * i) === "x") return false;
    return true;
  }

  function forwardOpen(d) {
    var dd = dv[d];
    return dd && tile(px + dd[0], py + dd[1]) !== "x";
  }

  // --- Enemy tracking ---
  var ex = -1, ey = -1, eDir = null;
  if (enemy && enemy.tank) {
    var ep = enemy.tank.position;
    ex = ep[0]; ey = ep[1];
    eDir = enemy.tank.direction;
    if (_lastEX >= 0) {
      var mx = ex - _lastEX, my = ey - _lastEY;
      if (enemy.skill && enemy.skill.type === "teleport" && dist(ex, ey, _lastEX, _lastEY) > 4) {
        _lastTeleportFrame = frame;
        _teleportSeenX = ex; _teleportSeenY = ey;
        _eMoveDir = null;
      } else {
        _eMoveDir = mx > 0 ? "right" : mx < 0 ? "left" : my > 0 ? "down" : my < 0 ? "up" : null;
      }
    }
    _lastEX = ex; _lastEY = ey;
    _eHistory.push([ex, ey]);
    if (_eHistory.length > 10) _eHistory.shift();
  } else if (_lastEX >= 0) {
    ex = _lastEX; ey = _lastEY;
    eDir = _eMoveDir;
  }

  // Predict enemy's next N positions based on movement pattern
  function predictEnemy(steps) {
    if (!enemy || !enemy.tank) return [];
    var predictions = [];
    var cx = ex, cy = ey;
    var moveDir = _eMoveDir || eDir;
    if (!moveDir) return [];
    var md = dv[moveDir];
    for (var s = 1; s <= steps; s++) {
      var nx = cx + md[0], ny = cy + md[1];
      if (ok(nx, ny)) { cx = nx; cy = ny; }
      else break;
      predictions.push([cx, cy]);
    }
    return predictions;
  }

  // Guess enemy's target (star or us)
  function enemyTarget() {
    if (!enemy || !enemy.tank) return null;
    if (game.star) {
      var eToStar = dist(ex, ey, game.star[0], game.star[1]);
      var eToUs = dist(ex, ey, px, py);
      if (eToStar < eToUs) return game.star;
    }
    return [px, py];
  }

  function enemyAimedAtUs() {
    if (!enemy || !enemy.tank) return false;
    return losFrom(ex, ey, eDir, px, py);
  }

  function bulletThreatAt(tx, ty, horizon) {
    if (!enemy || !enemy.bullet) return false;
    var bp = enemy.bullet.position;
    var bd = enemy.bullet.direction;
    if (!bd || !dv[bd]) return false;
    var bdd = dv[bd];
    var span = horizon;
    if (overloadTension()) span = Math.max(span, 6);

    function scanLane(sx, sy) {
      var bx = sx, by = sy;
      for (var step = 0; step <= span; step++) {
        if (bx === tx && by === ty) return true;
        bx += bdd[0]; by += bdd[1];
        if (tile(bx, by) === "x") return false;
      }
      return false;
    }

    if (scanLane(bp[0], bp[1])) return true;

    var doubleShotLikely = enemySkillIs("overload") &&
      (overloadTension() || (enemy.skill && enemy.skill.remainingCooldownFrames > 20));
    if (doubleShotLikely) {
      if (bdd[0] !== 0) {
        if (scanLane(bp[0], bp[1] - 1) || scanLane(bp[0], bp[1] + 1)) return true;
      } else {
        if (scanLane(bp[0] - 1, bp[1]) || scanLane(bp[0] + 1, bp[1])) return true;
      }
    }

    if (overloadTension()) {
      var bx = bp[0] - bdd[0], by = bp[1] - bdd[1];
      for (var step2 = 0; step2 <= span; step2++) {
        if (bx === tx && by === ty) return true;
        bx += bdd[0]; by += bdd[1];
        if (tile(bx, by) === "x") return false;
      }
    }
    return false;
  }

  function enemyGunLineAt(tx, ty, strict) {
    if (!enemy || !enemy.tank || !eDir) return false;
    var range = strict ? 8 : 6;
    if (me.status && (me.status.poisoned || me.status.frozen || me.status.stunned)) range = 9;
    if (dist(ex, ey, tx, ty) > range) return false;
    return losFrom(ex, ey, eDir, tx, ty);
  }

  function safeCell(tx, ty, strict) {
    if (!ok(tx, ty)) return false;
    if (bulletThreatAt(tx, ty, strict ? 5 : 3)) return false;
    if (enemyGunLineAt(tx, ty, strict)) return false;
    if (strict && enemyQuickAimAt(tx, ty)) return false;
    if (strict && enemyOverloadLaneAt(tx, ty)) return false;
    return true;
  }

  function safeStepDir(want, strict) {
    var dd = dv[want];
    return dd && safeCell(px + dd[0], py + dd[1], strict);
  }

  function enemySkillIs(type) {
    return enemy && enemy.skill && enemy.skill.type === type;
  }

  function enemySkillReady(type, grace) {
    if (!enemySkillIs(type)) return false;
    var cd = enemy.skill.remainingCooldownFrames;
    return typeof cd !== "number" || cd <= grace;
  }

  function starsOf(actor) {
    if (!actor) return 0;
    if (typeof actor.stars === "number") return actor.stars;
    if (typeof actor.score === "number") return actor.score;
    return 0;
  }

  function aheadOnStars() {
    return starsOf(me) > starsOf(enemy);
  }

  function dangerousLeadSkill() {
    return enemySkillIs("poison") || enemySkillIs("cloak") ||
      enemySkillIs("stun") || enemySkillIs("overload");
  }


  function poisonReady() {
    return me.skill && me.skill.type === "poison" && me.skill.remainingCooldownFrames === 0;
  }

  function enemyDebuffed() {
    if (!enemy || !enemy.tank) return false;
    if (enemy.status && (enemy.status.poisoned || enemy.status.frozen || enemy.status.stunned)) return true;
    return enemy.effects && enemy.effects.debuff && enemy.effects.debuff.remainingFrames > 0;
  }

  function enemyTempoSkillReady(grace) {
    if (!enemy || !enemy.skill) return false;
    var t = enemy.skill.type;
    if (t !== "freeze" && t !== "overload" && t !== "teleport" && t !== "boost" && t !== "cloak" && t !== "stun") return false;
    var cd = enemy.skill.remainingCooldownFrames;
    return typeof cd !== "number" || cd <= grace;
  }

  function tryPoisonTempo() {
    if (!poisonReady() || !enemy || !enemy.tank || enemyDebuffed()) return false;
    var d2 = dist(px, py, ex, ey);
    if (game.star) {
      var openMy = dist(px, py, game.star[0], game.star[1]);
      var openEnemy = dist(ex, ey, game.star[0], game.star[1]);
      if (frame < 24 && openMy > openEnemy + 3 && d2 > 8) return false;
    }

    if (enemySkillIs("overload") && (enemyOverloadArmed() || enemySkillReady("overload", 4))) {
      var starContest = false;
      if (game.star) {
        var mySd = dist(px, py, game.star[0], game.star[1]);
        var eSd = dist(ex, ey, game.star[0], game.star[1]);
        starContest = mySd <= 12 && eSd <= mySd + 2;
      }
      if (d2 <= 11 || lineRiskFrom(ex, ey, eDir, px, py, 11) || starContest) {
        taunt("双发先慢半拍。");
        me.poison(); return true;
      }
    }

    if (enemySkillReady("freeze", 2) && (game.star || d2 <= 12 || lineRiskFrom(ex, ey, eDir, px, py, 9))) {
      taunt("冻我之前，先锈住。");
      me.poison(); return true;
    }

    if (game.star) {
      var sx = game.star[0], sy = game.star[1];
      var mySd = dist(px, py, sx, sy);
      var eSd = dist(ex, ey, sx, sy);
      var eRace = eSd;
      var boostRace = enemySkillIs("boost") && (enemySkillReady("boost", 8) ||
          (enemy.status && enemy.status.boosted) ||
          (enemy.skill && enemy.skill.activeType === "boost"));
      if (boostRace) {
        eRace = Math.ceil(eSd / 2);
      }
      var contest = eRace <= mySd + 2 && mySd <= 14;
      if (contest && (enemyTempoSkillReady(4) || boostRace || eSd < mySd || enemySkillIs("shield"))) {
        taunt("星路封毒，节奏归我。");
        me.poison(); return true;
      }
    }

    if (d2 <= 7 && enemySkillReady("stun", 3)) {
      taunt("乱我方向？先慢下来。");
      me.poison(); return true;
    }

    return false;
  }

  function badTradeRisk() {
    if (!enemy || !enemy.tank) return false;
    if (enemyDebuffed()) return false;
    if (aheadOnStars()) return false;
    if (overloadTension() && dist(px, py, ex, ey) <= 10) return true;
    if (dist(px, py, ex, ey) > 8) return false;
    if (enemyAimedAtUs()) return true;
    return lineRiskFrom(ex, ey, eDir, px, py, 8);
  }

  function tryBreakBadTrade() {
    if (!enemy || !enemy.tank || !badTradeRisk()) return false;
    if (los(dir, ex, ey) && poisonReady()) {
      taunt("别同归，先中毒。");
      me.poison(); return true;
    }
    var best = null, bestScore = -9999;
    for (var i = 0; i < 4; i++) {
      var d = allD[i], dd = dv[d];
      var nx = px + dd[0], ny = py + dd[1];
      if (!safeCell(nx, ny, true)) continue;
      if (lineRiskFrom(ex, ey, eDir, nx, ny, 9)) continue;
      var score = dist(nx, ny, ex, ey) * 3;
      if (nx !== ex && ny !== ey) score += 6;
      if (game.star) score -= dist(nx, ny, game.star[0], game.star[1]);
      if (d === dir) score += 2;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    if (best) { goDir(best); return true; }
    return false;
  }

  function enemyOverloadArmed() {
    if (!enemySkillIs("overload")) return false;
    if (enemy.status && enemy.status.overloaded) return true;
    if (enemy.effects && enemy.effects.self && enemy.effects.self.type === "overload") return true;
    return enemy.skill && (enemy.skill.activeType === "overload" || enemy.skill.activeRemainingFrames > 0);
  }

  function enemyShotBlocked() {
    return !!(enemy && enemy.status && enemy.status.shielded);
  }

  function overloadTension() {
    if (!enemySkillIs("overload")) return false;
    return enemyOverloadArmed() || enemySkillReady("overload", 3);
  }

  function mutualFireHazard() {
    if (!enemy || !enemy.tank) return false;
    if (enemyShotBlocked()) return true;
    if (overloadTension()) return true;
    if (aheadOnStars() && dist(px, py, ex, ey) <= 7) return true;
    return false;
  }

  function lineRiskFrom(sx, sy, facing, tx, ty, range) {
    if (!facing) return false;
    if (dist(sx, sy, tx, ty) > range) return false;
    var aim = null;
    if (sx === tx) aim = ty < sy ? "up" : "down";
    else if (sy === ty) aim = tx < sx ? "left" : "right";
    else return false;
    if (!losFrom(sx, sy, aim, tx, ty)) return false;
    return turnCost(facing, aim) <= 1;
  }

  function enemyQuickAimAt(tx, ty) {
    if (!enemy || !enemy.tank || !eDir || enemyDebuffed() || enemyShotBlocked()) return false;
    var d2 = dist(ex, ey, tx, ty);
    if (d2 > 5) return false;
    var aim = null;
    if (ex === tx) aim = ty < ey ? "up" : "down";
    else if (ey === ty) aim = tx < ex ? "left" : "right";
    else return false;
    if (!losFrom(ex, ey, aim, tx, ty)) return false;
    var cost = turnCost(eDir, aim);
    return cost <= 1 || (d2 <= 2 && cost <= 2);
  }

  function overloadReturnRisk(tx, ty) {
    if (!enemySkillIs("overload")) return false;
    var armed = enemyOverloadArmed();
    var ready = enemySkillReady("overload", 1);
    if (!armed && !ready) return false;
    if (dist(ex, ey, tx, ty) > 9) return false;
    if (lineRiskFrom(ex, ey, eDir, tx, ty, 9)) return true;
    if (armed && (ex === tx || ey === ty)) {
      for (var i = 0; i < 4; i++) {
        if (losFrom(ex, ey, allD[i], tx, ty)) return true;
      }
    }
    return false;
  }

  function enemyOverloadLaneAt(tx, ty) {
    if (!enemy || !enemy.tank || !eDir || !enemySkillIs("overload")) return false;
    if (!enemyOverloadArmed() && !enemySkillReady("overload", 1)) return false;
    if (dist(ex, ey, tx, ty) > 12) return false;

    if (Math.abs(ty - ey) <= 1 && tx !== ex) {
      var hAim = tx < ex ? "left" : "right";
      if (turnCost(eDir, hAim) <= 1 && ok(ex, ty) && losFrom(ex, ty, hAim, tx, ty)) return true;
    }
    if (Math.abs(tx - ex) <= 1 && ty !== ey) {
      var vAim = ty < ey ? "up" : "down";
      if (turnCost(eDir, vAim) <= 1 && ok(tx, ey) && losFrom(tx, ey, vAim, tx, ty)) return true;
    }
    return false;
  }

  function tryOverloadCounter() {
    if (!enemy || !enemy.tank || !enemySkillIs("overload")) return false;
    var armed = enemyOverloadArmed();
    var ready = enemySkillReady("overload", 1);
    if (!armed && !ready) return false;
    if (dist(px, py, ex, ey) > 9) return false;
    if (!overloadReturnRisk(px, py) && !(ready && los(dir, ex, ey))) return false;

    if (me.skill && me.skill.type === "poison" && me.skill.remainingCooldownFrames === 0 &&
        dist(px, py, ex, ey) <= 5 && !enemy.status.poisoned) {
      taunt("双发？先吸口毒雾。");
      me.poison(); return true;
    }

    var best = null, bestScore = -9999;
    for (var i = 0; i < 4; i++) {
      var d = allD[i], dd = dv[d];
      var nx = px + dd[0], ny = py + dd[1];
      if (!safeCell(nx, ny, true)) continue;
      if (overloadReturnRisk(nx, ny)) continue;
      var score = dist(nx, ny, ex, ey) * 5;
      if (nx !== ex && ny !== ey) score += 6;
      if (d === dir) score += 2;
      if (game.star) score -= dist(nx, ny, game.star[0], game.star[1]);
      if (score > bestScore) { bestScore = score; best = d; }
    }
    if (best) { goDir(best); return true; }
    return false;
  }

  function tryLeadKite() {
    if (!enemy || !enemy.tank) return false;
    if (!dangerousLeadSkill()) return false;
    if (!aheadOnStars()) return false;
    if (game.star) {
      var myStar = dist(px, py, game.star[0], game.star[1]);
      var enemyStar = dist(ex, ey, game.star[0], game.star[1]);
      if (myStar <= enemyStar) return false;
    }
    if (dist(px, py, ex, ey) > 7) return false;

    var best = null, bestScore = -9999;
    for (var i = 0; i < 4; i++) {
      var d = allD[i], dd = dv[d];
      var nx = px + dd[0], ny = py + dd[1];
      if (!safeCell(nx, ny, true)) continue;
      if (lineRiskFrom(ex, ey, eDir, nx, ny, 6)) continue;
      var score = dist(nx, ny, ex, ey) * 4;
      if (nx !== ex && ny !== ey) score += 3;
      if (d === dir) score += 2;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    if (best) { goDir(best); return true; }
    return false;
  }

  function tryBoostLeadKite() {
    if (!enemy || !enemy.tank || !enemySkillIs("boost")) return false;
    if (starsOf(me) < starsOf(enemy) + 2) return false;
    if (dist(px, py, ex, ey) > 4) return false;
    if (game.star && dist(px, py, game.star[0], game.star[1]) <= 2) return false;

    var best = null, bestScore = -9999;
    for (var i = 0; i < 4; i++) {
      var d = allD[i], dd = dv[d];
      var nx = px + dd[0], ny = py + dd[1];
      if (!safeCell(nx, ny, true)) continue;
      if (lineRiskFrom(ex, ey, eDir, nx, ny, 6)) continue;
      var score = dist(nx, ny, ex, ey) * 6;
      if (nx !== ex && ny !== ey) score += 5;
      if (d === dir) score += 2;
      if (game.star) score -= Math.floor(dist(nx, ny, game.star[0], game.star[1]) / 2);
      if (score > bestScore) { bestScore = score; best = d; }
    }
    if (best) { goDir(best); return true; }
    return false;
  }

  function tryTeleportTrap() {
    if (!enemySkillReady("teleport", 12)) return false;
    if (!game.star) return false;
    var sx = game.star[0], sy = game.star[1];
    if (dist(px, py, sx, sy) > 8) return false;
    if (los(dir, sx, sy) && forwardOpen(dir)) {
      me.fire(); _lastFireFrame = frame; return true;
    }
    for (var i = 0; i < 4; i++) {
      if (allD[i] !== dir && los(allD[i], sx, sy)) {
        if (turnCost(dir, allD[i]) === 1) {
          turnTo(allD[i]); return true;
        }
      }
    }
    return false;
  }

  function tryTeleportLaneEscape() {
    if (!enemy || !enemy.tank || !enemySkillIs("teleport")) return false;
    var recentJump = frame - _lastTeleportFrame <= 10;
    var readyJump = enemySkillReady("teleport", 8);
    if (!recentJump && !readyJump) return false;

    if (game.star && !recentJump && dist(px, py, game.star[0], game.star[1]) <= 2) return false;
    var edgeLane = py <= 1 || py >= 13 || px <= 1 || px >= 17;
    var sharedLane = ex === px || ey === py || _teleportSeenX === px || _teleportSeenY === py;
    if (!edgeLane && !sharedLane) return false;

    var order;
    if (py <= 1 || (sharedLane && ey === py)) order = ["down", "up", "left", "right"];
    else if (py >= 13) order = ["up", "down", "left", "right"];
    else if (px <= 1 || (sharedLane && ex === px)) order = ["right", "left", "up", "down"];
    else order = ["left", "right", "up", "down"];

    var best = null, bestScore = -9999;
    for (var i = 0; i < order.length; i++) {
      var d = order[i], dd = dv[d];
      var nx = px + dd[0], ny = py + dd[1];
      if (!safeCell(nx, ny, true)) continue;
      if (nx === ex || ny === ey) continue;
      var score = 0;
      if (nx > 1 && nx < 17 && ny > 1 && ny < 13) score += 12;
      if (_teleportSeenX >= 0 && nx !== _teleportSeenX && ny !== _teleportSeenY) score += 5;
      if (game.star) score -= dist(nx, ny, game.star[0], game.star[1]);
      score += dist(nx, ny, ex, ey);
      if (d === dir) score += 2;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    if (best) {
      taunt(recentJump ? "传送落地？毒雾已经封线。" : "别跳太近，落点我在看。");
      goDir(best); return true;
    }
    return false;
  }

  var _bfsQx = new Array(400), _bfsQy = new Array(400), _bfsQd = new Array(400);
  function bfsDir(gx, gy) {
    if (px === gx && py === gy) return null;
    if (!ok(gx, gy)) return null;
    _visGen++;
    var ci = allD.indexOf(dir);
    var order = [ci, (ci+1)%4, (ci+3)%4, (ci+2)%4];
    _bfsQx[0] = px; _bfsQy[0] = py; _bfsQd[0] = 4;
    _vis[px * 20 + py] = _visGen;
    var head = 0, tail = 1;
    while (head < tail && tail < 390) {
      var cx = _bfsQx[head], cy = _bfsQy[head], cd = _bfsQd[head];
      head++;
      for (var oi = 0; oi < 4; oi++) {
        var i = (head === 1) ? order[oi] : oi;
        var x = cx + ddx[i], y = cy + ddy[i];
        var vk = x * 20 + y;
        if (_vis[vk] === _visGen) continue;
        if (!ok(x, y)) continue;
        _vis[vk] = _visGen;
        var firstD = cd === 4 ? i : cd;
        if (x === gx && y === gy) return allD[firstD];
        _bfsQx[tail] = x; _bfsQy[tail] = y; _bfsQd[tail] = firstD;
        tail++;
      }
    }
    return null;
  }

  function bfsDist(sx, sy, gx, gy) {
    if (sx === gx && sy === gy) return 0;
    if (!ok(gx, gy)) return 999;
    _visGen++;
    _bfsQx[0] = sx; _bfsQy[0] = sy; _bfsQd[0] = 0;
    _vis[sx * 20 + sy] = _visGen;
    var head = 0, tail = 1;
    while (head < tail && tail < 390) {
      var cx = _bfsQx[head], cy = _bfsQy[head], cd = _bfsQd[head];
      head++;
      for (var i = 0; i < 4; i++) {
        var x = cx + ddx[i], y = cy + ddy[i];
        var vk = x * 20 + y;
        if (_vis[vk] === _visGen) continue;
        if (!ok(x, y)) continue;
        _vis[vk] = _visGen;
        if (x === gx && y === gy) return cd + 1;
        _bfsQx[tail] = x; _bfsQy[tail] = y; _bfsQd[tail] = cd + 1;
        tail++;
      }
    }
    return 999;
  }

  function goDir(d) { if (dir === d) me.go(); else turnTo(d); }

  // --- SKILL (poison) ---
  function useSkill() {
    if (!me.skill || me.skill.remainingCooldownFrames > 0) return false;
    var type = me.skill.type;

    if (type === "shield") {
      if (enemyAimedAtUs()) { me.shield(); return true; }
      if (enemy && enemy.bullet) {
        var bp = enemy.bullet.position;
        if ((bp[0] === px && Math.abs(bp[1] - py) <= 3) ||
            (bp[1] === py && Math.abs(bp[0] - px) <= 3)) {
          me.shield(); return true;
        }
      }
    }

    if (type === "overload") {
      if (enemy && enemy.tank && dist(px, py, ex, ey) <= 6) {
        for (var i = 0; i < 4; i++) {
          if (los(allD[i], ex, ey)) { me.overload(); return true; }
        }
      }
    }

    if (type === "freeze") {
      if (enemy && enemy.tank && dist(px, py, ex, ey) <= 4) {
        me.freeze(); return true;
      }
    }

    if (type === "stun") {
      if (enemy && enemy.tank && dist(px, py, ex, ey) <= 5 && los(dir, ex, ey)) {
        me.stun(); return true;
      }
    }

    if (type === "cloak") {
      if (enemy && enemy.tank && enemyAimedAtUs()) { me.cloak(); return true; }
    }

    if (type === "poison") {
      if (enemy && enemy.tank) {
        var d2 = dist(px, py, ex, ey);
        // Use when enemy is close and we're about to engage (not when we already have LOS)
        if (d2 <= 5 && !los(dir, ex, ey)) { taunt("别急，毒已经进履带了。"); me.poison(); return true; }
        // Also use right before firing to prevent dodge
        if (d2 <= 4 && los(dir, ex, ey) && frame - _lastFireFrame > 3) { taunt("站稳，这发带腐蚀。"); me.poison(); return true; }
      }
    }

    if (type === "teleport") {
      if (enemy && enemy.bullet) {
        var bp = enemy.bullet.position;
        if ((bp[0] === px && Math.abs(bp[1] - py) <= 2) ||
            (bp[1] === py && Math.abs(bp[0] - px) <= 2)) {
          var tx = game.star ? game.star[0] : 7;
          var ty = game.star ? game.star[1] : 7;
          if (ok(tx, ty) && dist(tx, ty, px, py) > 3) { me.teleport(tx, ty); return true; }
        }
      }
    }

    if (type === "boost") {
      if (enemy && enemy.tank && dist(px, py, ex, ey) <= 3 && enemyAimedAtUs()) {
        me.boost(); return true;
      }
      if (game.star) {
        var sd = bfsDist(px, py, game.star[0], game.star[1]);
        if (enemy && enemy.tank) {
          var eDist = dist(ex, ey, game.star[0], game.star[1]);
          if (sd > 2 && sd <= eDist + 1) { me.boost(); return true; }
        }
      }
    }

    return false;
  }

  // --- DODGE (with counter-attack awareness) ---
  function tryDodge() {
    var dominated = false, threatAxis = null, urgent = false;
    var threatDir = null;
    var bulletDist = 99;

    if (enemy && enemy.bullet) {
      var bp = enemy.bullet.position;
      var bd = enemy.bullet.direction;
      if (bd && dv[bd]) {
        var bdd = dv[bd];
        if (bdd[0] !== 0 && bp[1] === py) {
          var dx = px - bp[0];
          if ((bdd[0] > 0 && dx > 0) || (bdd[0] < 0 && dx < 0)) {
            dominated = true; threatAxis = "h";
            threatDir = bd;
            bulletDist = Math.abs(dx);
            if (bulletDist <= 3) urgent = true;
          }
        } else if (bdd[1] !== 0 && bp[0] === px) {
          var dy = py - bp[1];
          if ((bdd[1] > 0 && dy > 0) || (bdd[1] < 0 && dy < 0)) {
            dominated = true; threatAxis = "v";
            threatDir = bd;
            bulletDist = Math.abs(dy);
            if (bulletDist <= 3) urgent = true;
          }
        }
      }
      if (!dominated) {
        if (bp[0] === px && Math.abs(bp[1] - py) <= 5) {
          dominated = true; threatAxis = "v";
          threatDir = bd;
          bulletDist = Math.abs(bp[1] - py);
          if (bulletDist <= 2) urgent = true;
        } else if (bp[1] === py && Math.abs(bp[0] - px) <= 5) {
          dominated = true; threatAxis = "h";
          threatDir = bd;
          bulletDist = Math.abs(bp[0] - px);
          if (bulletDist <= 2) urgent = true;
        }
      }
    }

    // If enemy aims at us but hasn't fired yet - preemptive: FIRE FIRST if we also have LOS
    if (!dominated && enemy && enemy.tank && (ex === px || ey === py) &&
        lineRiskFrom(ex, ey, eDir, px, py, 8)) {
      dominated = true;
      threatAxis = (ex === px) ? "v" : "h";
      if (dist(px, py, ex, ey) <= 4) urgent = true;
    }

    if (!dominated && enemyAimedAtUs()) {
      if (enemy && enemy.tank && los(dir, ex, ey) && forwardOpen(dir) && !mutualFireHazard()) {
        me.fire(); _lastFireFrame = frame; return true;
      }
      dominated = true;
      threatAxis = (ex === px) ? "v" : "h";
      var ed = dist(px, py, ex, ey);
      if (ed <= 4) urgent = true;
    }

    if (!dominated) { _lastDodgeDir = null; return false; }

    function sprintWithTrailingBullet() {
      if (!threatDir || threatDir !== dir) return false;
      var dd = dv[dir];
      if (!dd) return false;
      var nx1 = px + dd[0], ny1 = py + dd[1];
      var nx2 = px + dd[0] * 2, ny2 = py + dd[1] * 2;
      if (safeCell(nx2, ny2, true)) { me.go(2); return true; }
      if (safeCell(nx1, ny1, true)) { me.go(); return true; }
      return false;
    }

    // Choose dodge direction that also gives attack angle
    if (threatAxis === "v") {
      var opts = [];
      if (safeStepDir("right", true)) opts.push("right");
      if (safeStepDir("left", true)) opts.push("left");
      if (!opts.length && sprintWithTrailingBullet()) return true;
      if (!opts.length && ok(px + 1, py)) opts.push("right");
      if (!opts.length && ok(px - 1, py)) opts.push("left");
      opts.sort(function(a, b) {
        var ca = turnCost(dir, a), cb = turnCost(dir, b);
        if (ca !== cb) return ca - cb;
        if (a === _lastDodgeDir) return -1;
        if (b === _lastDodgeDir) return 1;
        return 0;
      });
      // Prefer direction that gives LOS to enemy after dodge
      var pick = null;
      if (enemy && enemy.tank) {
        for (var oi = 0; oi < opts.length; oi++) {
          var nd = dv[opts[oi]];
          var nx = px + nd[0], ny = py + nd[1];
          // After dodging, can we shoot from new position?
          for (var di = 0; di < 4; di++) {
            if (losFrom(nx, ny, allD[di], ex, ey)) { pick = opts[oi]; break; }
          }
          if (pick) break;
        }
      }
      if (!pick) pick = opts[0];
      if (!pick && _lastDodgeDir && opts.indexOf(_lastDodgeDir) >= 0) pick = _lastDodgeDir;
      if (pick) {
        _lastDodgeDir = pick;
        if (dir === pick) { urgent && safeCell(px + dv[pick][0] * 2, py, true) ? me.go(2) : me.go(); }
        else turnTo(pick);
        return true;
      }
    } else {
      var opts = [];
      if (safeStepDir("up", true)) opts.push("up");
      if (safeStepDir("down", true)) opts.push("down");
      if (!opts.length && sprintWithTrailingBullet()) return true;
      if (!opts.length && ok(px, py - 1)) opts.push("up");
      if (!opts.length && ok(px, py + 1)) opts.push("down");
      opts.sort(function(a, b) {
        var ca = turnCost(dir, a), cb = turnCost(dir, b);
        if (ca !== cb) return ca - cb;
        if (a === _lastDodgeDir) return -1;
        if (b === _lastDodgeDir) return 1;
        return 0;
      });
      var pick = null;
      if (enemy && enemy.tank) {
        for (var oi = 0; oi < opts.length; oi++) {
          var nd = dv[opts[oi]];
          var nx = px + nd[0], ny = py + nd[1];
          for (var di = 0; di < 4; di++) {
            if (losFrom(nx, ny, allD[di], ex, ey)) { pick = opts[oi]; break; }
          }
          if (pick) break;
        }
      }
      if (!pick) pick = opts[0];
      if (!pick && _lastDodgeDir && opts.indexOf(_lastDodgeDir) >= 0) pick = _lastDodgeDir;
      if (pick) {
        _lastDodgeDir = pick;
        if (dir === pick) { urgent && safeCell(px, py + dv[pick][1] * 2, true) ? me.go(2) : me.go(); }
        else turnTo(pick);
        return true;
      }
    }
    return false;
  }

  // --- ATTACK (with prediction and preemption) ---
  function tryAttack() {
    if (!enemy || !enemy.tank) return false;
    if (enemyShotBlocked()) return false;

    // Direct LOS - fire immediately
    if (los(dir, ex, ey) && forwardOpen(dir)) {
      if (enemyDebuffed()) {
        me.fire(); _lastFireFrame = frame; return true;
      }
      if (overloadReturnRisk(px, py) || mutualFireHazard()) return false;
      me.fire(); _lastFireFrame = frame; return true;
    }

    // One turn away from LOS - turn toward enemy
    var bestTurn = null, bestTurnCost = 99;
    for (var i = 0; i < 4; i++) {
      if (allD[i] === dir) continue;
      if (los(allD[i], ex, ey)) {
        var ci = allD.indexOf(dir), wi = i;
        var cost = Math.min((wi - ci + 4) % 4, (ci - wi + 4) % 4);
        if (cost < bestTurnCost) { bestTurnCost = cost; bestTurn = allD[i]; }
      }
    }
    if (bestTurn) { turnTo(bestTurn); return true; }

    // Predictive fire: shoot where enemy WILL be
    var preds = predictEnemy(3);
    for (var p = 0; p < preds.length; p++) {
      if (los(dir, preds[p][0], preds[p][1]) && forwardOpen(dir)) {
        if (!mutualFireHazard() && !overloadReturnRisk(px, py)) {
          me.fire(); _lastFireFrame = frame; return true;
        }
      }
    }

    // Predictive turn: turn to where enemy will be
    for (var p = 0; p < preds.length; p++) {
      for (var i = 0; i < 4; i++) {
        if (allD[i] !== dir && los(allD[i], preds[p][0], preds[p][1])) {
          // Only if it's a 1-turn cost (don't waste 2 turns on prediction)
          var ci2 = allD.indexOf(dir), wi2 = i;
          if (Math.min((wi2 - ci2 + 4) % 4, (ci2 - wi2 + 4) % 4) === 1) {
            turnTo(allD[i]); return true;
          }
        }
      }
    }

    return false;
  }

  // --- AMBUSH: pre-aim at enemy's predicted path ---
  function tryAmbush() {
    if (!enemy || !enemy.tank) return false;

    // Check if we can aim at where enemy will be
    var preds = predictEnemy(4);
    for (var p = 0; p < preds.length; p++) {
      var fp = preds[p];
      for (var i = 0; i < 4; i++) {
        if (los(allD[i], fp[0], fp[1])) {
          if (dir === allD[i]) return false; // already aimed, let attack handle
          turnTo(allD[i]); return true;
        }
      }
    }

    // Move perpendicular to enemy's movement axis (cheap: no BFS)
    if (_eMoveDir && dv[_eMoveDir]) {
      var md = dv[_eMoveDir];
      if (md[0] !== 0) {
        // enemy horizontal: move to same row
        if (py !== ey) {
          var wantD = ey < py ? "up" : "down";
          var wd = dv[wantD];
          if (safeCell(px + wd[0], py + wd[1], true)) { goDir(wantD); return true; }
        }
      } else {
        // enemy vertical: move to same column
        if (px !== ex) {
          var wantD = ex < px ? "left" : "right";
          var wd = dv[wantD];
          if (safeCell(px + wd[0], py + wd[1], true)) { goDir(wantD); return true; }
        }
      }
    }

    return false;
  }

  // --- FLANKING ---
  function tryFlank() {
    if (!enemy || !enemy.tank) return false;

    // Find adjacent cells with LOS to enemy - prefer ones enemy isn't facing
    var bestDir = null, bestScore = -1;
    for (var i = 0; i < 4; i++) {
      var nx = px + ddx[i], ny = py + ddy[i];
      if (!safeCell(nx, ny, true)) continue;
      for (var j = 0; j < 4; j++) {
        if (losFrom(nx, ny, allD[j], ex, ey)) {
          var score = 1;
          // bonus if enemy isn't facing this direction (flanking from blind side)
          if (!losFrom(ex, ey, eDir, nx, ny)) score += 2;
          // bonus if already facing this direction (no turn needed to get there)
          if (dir === allD[i]) score += 1;
          if (score > bestScore) { bestScore = score; bestDir = allD[i]; }
          break;
        }
      }
    }
    if (bestDir) { goDir(bestDir); return true; }
    return false;
  }

  // --- POISON COMBO: poison then fire for guaranteed hit ---
  function tryPoisonCombo() {
    if (!me.skill || me.skill.type !== "poison" || me.skill.remainingCooldownFrames > 0) return false;
    if (!enemy || !enemy.tank) return false;
    var d2 = dist(px, py, ex, ey);

    // Case 1: We have LOS and enemy is close enough to be dangerous
    // Poison first so next-frame fire is undodgeable
    if (d2 <= 4 && los(dir, ex, ey) && frame - _lastFireFrame >= 2 &&
        !bulletThreatAt(px, py, 4) && !enemyGunLineAt(px, py, true)) {
      taunt("你先慢下来，我再开炮。");
      me.poison(); return true;
    }

    // Case 2: Enemy approaching on same axis, about to enter our LOS
    if (d2 <= 5) {
      var preds = predictEnemy(2);
      for (var p = 0; p < preds.length; p++) {
        if (los(dir, preds[p][0], preds[p][1])) {
          taunt("我瞄的是你下一步。");
          me.poison(); return true;
        }
      }
    }

    // Case 3: Racing for star - use manhattan dist (cheap) instead of bfsDist
    if (game.star && d2 <= 6 && !enemySkillIs("teleport")) {
      var mySd = dist(px, py, game.star[0], game.star[1]);
      var eSd = dist(ex, ey, game.star[0], game.star[1]);
      if (eSd <= mySd && eSd <= 5) {
        taunt("星星归我，毒归你。");
        me.poison(); return true;
      }
    }

    return false;
  }

  function tryPickupStar() {
    if (!game.star) return false;
    var sx = game.star[0], sy = game.star[1];
    var mySd = bfsDist(px, py, sx, sy);
    if (mySd > 7) return false;
    var enemySd = enemy && enemy.tank ? dist(ex, ey, sx, sy) : 99;
    var urgent = mySd <= 2 || starsOf(me) <= starsOf(enemy) ||
      frame > 70 || enemySkillIs("boost") || enemySkillIs("overload");
    if (!urgent) return false;
    if (mySd > 3 && mySd > enemySd + (enemySkillIs("boost") ? 3 : 1)) return false;
    var d = bfsDir(sx, sy);
    if (d) {
      var dd = dv[d];
      if (dd && safeCell(px + dd[0], py + dd[1], true)) { goDir(d); return true; }
    }
    return false;
  }

  // --- MAIN ---

  // 0. Dodge first (survival), but includes fire-first when mutual LOS
  if (frame === 0) taunt("Dark Edge 上线，开始投毒。");
  if (tryDodge()) return;
  if (tryPickupStar()) return;

  // 1. Against teleport, leave predictable edge lanes before the jump-shot arrives.
  if (tryTeleportLaneEscape()) return;

  // 2. If a teleport tank can jump to a nearby star, pre-aim the landing cell.
  if (tryTeleportTrap()) return;

  // 3. If we already lead on stars, avoid volunteering for dangerous close fights.
  if (tryLeadKite()) return;

  // 3b. With a big lead against boost, preserve the score instead of dueling.
  if (tryBoostLeadKite()) return;

  // 4. Do not trade into overload's double-shot tiebreak.
  if (tryOverloadCounter()) return;

  // 5. Use poison as a tempo weapon against global skills and star races.
  if (tryPoisonTempo()) return;

  // 6. Avoid equal-timing duels where both tanks crash but we lose the settlement.
  if (tryBreakBadTrade()) return;

  // 7. Poison combo (strategic use before engaging)
  if (tryPoisonCombo()) return;

  // 7b. Finish slowed targets before they recover.
  if (enemy && enemy.tank && enemyDebuffed() && tryAttack()) return;

  // 8. Direct attack
  if (tryAttack()) return;

  // 7. Fallback skill use (other skill types)
  if (me.skill && me.skill.type !== "poison" && useSkill()) return;

  // 7. Ambush (if enemy is mid-range, set up on predicted path)
  if (enemy && enemy.tank) {
    var ed = dist(px, py, ex, ey);
    if (ed > 3 && ed <= 7 && tryAmbush()) return;
  }

  // 8. Flank (if enemy nearby but no LOS)
  if (enemy && enemy.tank) {
    var ed = dist(px, py, ex, ey);
    if (ed <= 5 && tryFlank()) return;
  }

  // 9. Navigate toward star or enemy
  var target = null;
  if (game.star) {
    var sd = dist(px, py, game.star[0], game.star[1]);
    var eDist = 999;
    if (enemy && enemy.tank)
      eDist = dist(ex, ey, game.star[0], game.star[1]);
    // More aggressive: go for star unless enemy is much closer.
    // Against ready teleport, only chase stars we can collect immediately.
    if (enemySkillReady("teleport", 12)) {
      if (sd <= 2) target = game.star;
    } else if (sd <= eDist + (starsOf(me) < starsOf(enemy) ? 2 : 4) || !enemy || !enemy.tank) target = game.star;
  }
  if (!target && enemy && enemy.tank) target = [ex, ey];
  if (!target && game.star) {
    var skipTeleportStar = enemySkillReady("teleport", 12) &&
      dist(px, py, game.star[0], game.star[1]) > 2;
    if (!skipTeleportStar) target = game.star;
  }

  if (target) {
    var d = bfsDir(target[0], target[1]);
    if (d) {
      // Avoid stepping into a near enemy gun line, especially while poison slows actions.
      if (enemy && enemy.tank && eDir) {
        var eDist2 = dist(px, py, ex, ey);
        var strictAvoid = eDist2 <= 7 || (me.status && me.status.poisoned);
        var nd = dv[d];
        var nx = px + nd[0], ny = py + nd[1];
        if (!safeCell(nx, ny, strictAvoid)) {
          var bestAlt = null, bestScore = -9999;
          for (var i = 0; i < 4; i++) {
            var ad = dv[allD[i]];
            var ax = px + ad[0], ay = py + ad[1];
            if (!safeCell(ax, ay, true)) continue;
            var score = -dist(ax, ay, target[0], target[1]);
            if (allD[i] === dir) score += 2;
            if (!losFrom(ex, ey, eDir, ax, ay)) score += 3;
            if (score > bestScore) {
              bestScore = score;
              bestAlt = allD[i];
            }
          }
          if (bestAlt) { goDir(bestAlt); return; }
          var sidesteps = (eDir === "up" || eDir === "down") ? ["left", "right"] : ["up", "down"];
          for (var si = 0; si < sidesteps.length; si++) {
            var sdv = dv[sidesteps[si]];
            if (ok(px + sdv[0], py + sdv[1])) { goDir(sidesteps[si]); return; }
          }
        }
      }
      goDir(d); return;
    }
    var dx = target[0] - px, dy = target[1] - py;
    var prio = Math.abs(dx) >= Math.abs(dy)
      ? [dx > 0 ? "right" : "left", dy > 0 ? "down" : "up"]
      : [dy > 0 ? "down" : "up", dx > 0 ? "right" : "left"];
    for (var i = 0; i < prio.length; i++) {
      var dd = dv[prio[i]];
      if (safeCell(px + dd[0], py + dd[1], true)) { goDir(prio[i]); return; }
    }
  }

  // 10. Anti-stuck
  if (_stuck >= 2) {
    for (var i = 1; i <= 4; i++) {
      var d = allD[(allD.indexOf(dir) + i) % 4];
      var dd = dv[d];
      if (safeCell(px + dd[0], py + dd[1], true)) { goDir(d); return; }
    }
  }

  var fwd = dv[dir];
  if (safeCell(px + fwd[0], py + fwd[1], true)) me.go();
  else me.turn("right");
}
