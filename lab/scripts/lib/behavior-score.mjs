const ROLE_BY_INDEX = ["challenger", "defender"];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roleForIndex(index) {
  return ROLE_BY_INDEX[index] ?? `player${index}`;
}

function opponentRole(role) {
  return role === "challenger" ? "defender" : "challenger";
}

function blankStats() {
  return {
    moves: 0,
    turns: 0,
    shotsFired: 0,
    shotsHit: 0,
    bulletCrashes: 0,
    stars: 0,
    skillCasts: 0,
    tankCrashes: 0,
    lastCrashFrame: null,
    latePositions: [],
  };
}

function statsByRole() {
  return {
    challenger: blankStats(),
    defender: blankStats(),
  };
}

function objectRoleMap(match) {
  const roles = new Map();
  for (const player of match.players ?? []) {
    if (player.objectId) roles.set(player.objectId, player.role);
  }
  return roles;
}

function sourceRole(event, rolesByObjectId) {
  const tankId = event?.tank?.id;
  return tankId ? rolesByObjectId.get(tankId) ?? null : null;
}

function positionKey(position) {
  return Array.isArray(position) && position.length >= 2 ? `${position[0]},${position[1]}` : null;
}

function collectStats(analysis) {
  const match = analysis.match;
  const rolesByObjectId = objectRoleMap(match);
  const out = statsByRole();
  const frameCount = match.frameCount ?? match.records?.length ?? 0;
  const lateStart = Math.max(0, frameCount - 32);

  match.records.forEach((frame, frameIndex) => {
    for (const event of asArray(frame)) {
      if (event?.type === "tank") {
        const role = rolesByObjectId.get(event.objectId);
        if (!role || !out[role]) continue;
        if (event.action === "go") {
          out[role].moves += 1;
          const key = positionKey(event.position);
          if (frameIndex >= lateStart && key) {
            out[role].latePositions.push({ frame: frameIndex, key });
          }
        } else if (event.action === "turn") {
          out[role].turns += 1;
        } else if (event.action === "crashed") {
          out[role].tankCrashes += 1;
          out[role].lastCrashFrame = frameIndex;
        }
      }

      if (event?.type === "bullet") {
        const role = sourceRole(event, rolesByObjectId);
        if (!role || !out[role]) continue;
        if (event.action === "created") out[role].shotsFired += 1;
        if (event.action === "shot_hit" || event.action === "hit") out[role].shotsHit += 1;
        if (event.action === "crashed") out[role].bulletCrashes += 1;
      }

      if (event?.type === "star" && event.action === "collected") {
        const role = roleForIndex(event.by);
        if (out[role]) out[role].stars += 1;
      }

      if (event?.type === "skill" && event.action === "cast") {
        const role = roleForIndex(event.by);
        if (out[role]) out[role].skillCasts += 1;
      }
    }
  });

  return out;
}

function pushUnique(items, item) {
  if (items.some((existing) => existing.id === item.id)) return;
  items.push(item);
}

function lateLoopSignal(stats) {
  const positions = stats.latePositions;
  if (positions.length < 6) return null;

  const unique = new Set(positions.map((item) => item.key));
  let alternations = 0;
  for (let index = 2; index < positions.length; index += 1) {
    if (
      positions[index].key === positions[index - 2].key
      && positions[index].key !== positions[index - 1].key
    ) {
      alternations += 1;
    }
  }

  if (unique.size <= 3 && alternations >= 2) {
    return `last ${positions.length} moves reused ${unique.size} tiles with ${alternations} alternations`;
  }

  if (stats.turns >= 10 && stats.turns > stats.moves * 1.4) {
    return `${stats.turns} turns vs ${stats.moves} moves`;
  }

  return null;
}

function crashedTogether(analysis, perspectiveRole) {
  const frame = analysis.outcome.decidingFrame;
  const roles = new Set(
    asArray(analysis.timeline?.tankCrashes)
      .filter((crash) => Math.abs(crash.frame - frame) <= 1)
      .map((crash) => crash.role)
      .filter(Boolean),
  );

  return roles.has(perspectiveRole) && roles.has(opponentRole(perspectiveRole));
}

function breakableCoverBeforeDecision(analysis) {
  const frame = analysis.outcome.decidingFrame;
  const destroyed = [];
  analysis.match.records.forEach((events, frameIndex) => {
    if (frameIndex < frame - 5 || frameIndex > frame) return;
    for (const event of asArray(events)) {
      if (event?.type === "map" && event.action === "destroyed") {
        destroyed.push({ frame: frameIndex, position: event.position, tile: event.tile });
      }
    }
  });
  return destroyed;
}

function createModule(id, title) {
  return {
    id,
    title,
    score: 0,
    preserve: [],
    fix: [],
  };
}

function applyPreserve(behavior, moduleId, item) {
  pushUnique(behavior.preserve, item);
  behavior.modules[moduleId].score += item.weight;
  pushUnique(behavior.modules[moduleId].preserve, item);
}

function applyFix(behavior, moduleId, item) {
  pushUnique(behavior.fix, item);
  behavior.modules[moduleId].score -= item.weight;
  pushUnique(behavior.modules[moduleId].fix, item);
}

function applyHardConstraint(behavior, item) {
  pushUnique(behavior.hardConstraints, item);
}

function applyBraveBaseline(behavior, item) {
  pushUnique(behavior.braveBaseline, item);
}

export function scoreBehavior(analysis, perspectiveRole = "challenger") {
  const stats = collectStats(analysis);
  const mine = stats[perspectiveRole] ?? blankStats();
  const enemyRole = opponentRole(perspectiveRole);
  const enemy = stats[enemyRole] ?? blankStats();
  const won = analysis.outcome.winnerRole === perspectiveRole;
  const lost = analysis.outcome.winnerRole && !won;
  const starDelta = mine.stars - enemy.stars;
  const lateLoop = lateLoopSignal(mine);
  const breakableCover = breakableCoverBeforeDecision(analysis);
  const behavior = {
    perspectiveRole,
    won,
    score: 50,
    stats: {
      [perspectiveRole]: mine,
      [enemyRole]: enemy,
    },
    modules: {
      hazardAvoidance: createModule("hazard-first", "Hazard-first safety"),
      starTempo: createModule("star-tempo", "Star tempo"),
      firePressure: createModule("fire-pressure", "Fire pressure"),
      shieldTempo: createModule("shield-tempo", "Skill tempo"),
      movementCleanliness: createModule("movement-cleanliness", "Movement cleanliness"),
      targetPool: createModule("target-pool", "Live target-pool discipline"),
    },
    preserve: [],
    fix: [],
    hardConstraints: [],
    braveBaseline: [],
    publishDecisionInputs: [],
  };

  if (won && starDelta > 0) {
    applyPreserve(behavior, "starTempo", {
      id: "preserve-star-tempo-win",
      title: "Preserve direct star tempo from this win.",
      evidence: `star score ${mine.stars}-${enemy.stars}`,
      weight: 8,
    });
    applyBraveBaseline(behavior, {
      id: "brave-safe-star",
      status: "preserve",
      title: "Safe star pickup remains a brave baseline.",
      evidence: `won with ${mine.stars} collected stars`,
    });
  }

  if (mine.shotsHit > 0 || analysis.outcome.killerRole === perspectiveRole) {
    applyPreserve(behavior, "firePressure", {
      id: "preserve-clear-kill-pressure",
      title: "Preserve clear pressure fire and kill-window execution.",
      evidence: `${mine.shotsFired} shots fired, ${mine.shotsHit} registered hits`,
      weight: 9,
    });
    applyBraveBaseline(behavior, {
      id: "brave-clear-fire",
      status: "preserve",
      title: "Clear safe fire should stay allowed.",
      evidence: "replay shows pressure or kill value from firing",
    });
  }

  if (won && mine.skillCasts > 0) {
    applyPreserve(behavior, "shieldTempo", {
      id: "preserve-skill-tempo",
      title: "Preserve skill use when it converts into a win.",
      evidence: `${mine.skillCasts} skill casts in a winning replay`,
      weight: 5,
    });
  }

  if (starDelta < 0) {
    applyFix(behavior, "starTempo", {
      id: "fix-star-tempo-loss",
      title: "Improve star tempo without relaxing fatal-risk checks.",
      evidence: `star score ${mine.stars}-${enemy.stars}`,
      weight: 8,
    });
  }

  if (lost && mine.shotsFired === 0) {
    applyFix(behavior, "firePressure", {
      id: "fix-no-pressure-loss",
      title: "Do not lose without creating fire pressure.",
      evidence: "0 shots fired in a loss",
      weight: 8,
    });
    applyBraveBaseline(behavior, {
      id: "risk-passive-fire",
      status: "risk",
      title: "Potential passivity drift: no fire pressure.",
      evidence: "loss contained no outgoing bullets",
    });
  }

  if (mine.shotsFired === 0 && lateLoop) {
    applyFix(behavior, "firePressure", {
      id: "fix-facing-without-shot",
      title: "Check same-line turn-then-fire before wandering.",
      evidence: `no shots fired; ${lateLoop}`,
      weight: 6,
    });
  }

  if (lateLoop) {
    applyFix(behavior, "movementCleanliness", {
      id: "fix-late-loop",
      title: "Break late-frame wandering only after preserving obvious star routes.",
      evidence: lateLoop,
      weight: 9,
    });
    applyBraveBaseline(behavior, {
      id: "risk-unstick-overrides-value",
      status: "risk",
      title: "Unstick/break-loop may be overriding value actions.",
      evidence: lateLoop,
    });
  }

  if (lost && analysis.outcome.category === "bullet_crash" && analysis.outcome.victimRole === perspectiveRole) {
    applyFix(behavior, "hazardAvoidance", {
      id: "fix-bullet-death",
      title: "Promote this bullet death into hazard-first logic.",
      evidence: `died to ${analysis.outcome.killerRole ?? "unknown"} bullet at frame ${analysis.outcome.decidingFrame}`,
      weight: 12,
    });
    applyHardConstraint(behavior, {
      id: "hard-current-bullet-eta",
      status: "breach",
      title: "Current/future bullet lane must run before value actions.",
      evidence: `victim ${perspectiveRole}, deciding frame ${analysis.outcome.decidingFrame}`,
      weight: 16,
    });
  }

  if (lost && crashedTogether(analysis, perspectiveRole)) {
    applyFix(behavior, "firePressure", {
      id: "fix-unshielded-mutual-trade",
      title: "Avoid naked close mutual trades when shield or dodge is unavailable.",
      evidence: `both tanks crashed near frame ${analysis.outcome.decidingFrame}; winner ${analysis.outcome.winnerRole}`,
      weight: 11,
    });
    applyHardConstraint(behavior, {
      id: "hard-close-aimed-duel",
      status: "breach",
      title: "Close aimed duel is a hard danger unless shielded or safely dodged.",
      evidence: "mutual crash lost by score/runtime ordering",
      weight: 14,
    });
  }

  if (lost && breakableCover.length) {
    const evidence = breakableCover
      .map((event) => `frame ${event.frame} at ${positionKey(event.position) ?? "unknown"}`)
      .join("; ");
    applyFix(behavior, "hazardAvoidance", {
      id: "fix-breakable-cover-lane",
      title: "Treat one dirt tile between tanks as a near-future firing lane.",
      evidence,
      weight: 10,
    });
    applyHardConstraint(behavior, {
      id: "hard-breakable-cover-shot",
      status: "breach",
      title: "Breakable cover can become a lethal lane after one enemy shot.",
      evidence,
      weight: 12,
    });
  }

  if (lost && analysis.outcome.category === "runtime") {
    applyFix(behavior, "movementCleanliness", {
      id: "fix-runtime-budget",
      title: "Cache or simplify repeated scans before publishing.",
      evidence: "lost by runtime",
      weight: 10,
    });
  }

  if (mine.skillCasts > 0 && lost && analysis.outcome.category === "bullet_crash") {
    applyFix(behavior, "shieldTempo", {
      id: "fix-post-shield-reset",
      title: "After shield expires, reset to danger-first movement before chasing.",
      evidence: `${mine.skillCasts} skill casts but still lost by bullet crash`,
      weight: 7,
    });
  }

  if (!mine.stars && !mine.shotsFired && lost) {
    applyFix(behavior, "starTempo", {
      id: "fix-no-value-created",
      title: "A loss with no star and no shot needs a value-creation patch.",
      evidence: "0 stars and 0 shots",
      weight: 10,
    });
  }

  behavior.modules.targetPool.preserve.push({
    id: "preserve-live-target-pool",
    title: "Keep ladder evaluation on live target pools.",
    evidence: "match replay is evidence; local old data is only supporting context",
    weight: 0,
  });

  const preserveWeight = behavior.preserve.reduce((sum, item) => sum + item.weight, 0);
  const fixWeight = behavior.fix.reduce((sum, item) => sum + item.weight, 0);
  const hardWeight = behavior.hardConstraints.reduce((sum, item) => sum + item.weight, 0);
  behavior.score = clamp(50 + preserveWeight - fixWeight - hardWeight, 0, 100);

  behavior.publishDecisionInputs = [
    behavior.fix.length ? `unresolved fixes: ${behavior.fix.map((item) => item.id).join(", ")}` : "no replay-derived fix blockers",
    behavior.hardConstraints.length ? `hard constraint breaches: ${behavior.hardConstraints.map((item) => item.id).join(", ")}` : "no hard constraint breach observed",
    behavior.preserve.length ? `protected wins: ${behavior.preserve.map((item) => item.id).join(", ")}` : "no preserve signal in this replay",
  ];

  return behavior;
}
