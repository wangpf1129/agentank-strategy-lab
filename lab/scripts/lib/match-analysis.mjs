import { scoreBehavior } from "./behavior-score.mjs";

const ROLE_BY_INDEX = ["challenger", "defender"];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function roleForIndex(index) {
  return ROLE_BY_INDEX[index] ?? `player${index}`;
}

function indexForRole(role) {
  return ROLE_BY_INDEX.indexOf(role);
}

function getReplay(raw) {
  return raw?.replayData?.replay ?? raw?.replay ?? {};
}

function getRecords(raw) {
  const replay = getReplay(raw);
  if (Array.isArray(replay.records)) return replay.records;
  if (Array.isArray(raw?.replayData?.records)) return raw.replayData.records;
  if (Array.isArray(raw?.records)) return raw.records;
  return [];
}

function getMeta(raw) {
  return getReplay(raw).meta ?? raw?.replayData?.meta ?? raw?.meta ?? {};
}

function playerFrom(raw, index, metaPlayer) {
  const role = roleForIndex(index);
  const participant = raw?.participants?.[role] ?? {};
  return {
    index,
    role,
    name: participant.tankName ?? participant.name ?? role,
    tankId: participant.tankId ?? null,
    objectId: metaPlayer?.tank?.id ?? null,
    runTime: typeof metaPlayer?.runTime === "number" ? metaPlayer.runTime : null,
    startPosition: metaPlayer?.tank?.position ?? null,
    startDirection: metaPlayer?.tank?.direction ?? null,
  };
}

function buildObjectOwner(players) {
  const owners = new Map();
  for (const player of players) {
    if (player.objectId) owners.set(player.objectId, player.index);
  }
  return owners;
}

function countStars(records) {
  const scores = { challenger: 0, defender: 0 };
  for (const frame of records) {
    for (const event of asArray(frame)) {
      if (event?.type === "star" && event.action === "collected" && typeof event.by === "number") {
        const role = roleForIndex(event.by);
        scores[role] = (scores[role] ?? 0) + 1;
      }
    }
  }
  return scores;
}

function resultReason(raw, meta) {
  return raw?.match?.resultReason ?? meta?.result?.reason ?? raw?.resultReason ?? "unknown";
}

function winnerIndex(raw, meta) {
  if (typeof meta?.result?.winner === "number") return meta.result.winner;
  const role = raw?.match?.winnerRole;
  const byRole = indexForRole(role);
  return byRole >= 0 ? byRole : null;
}

export function normalizeMatch(raw) {
  const meta = getMeta(raw);
  const records = getRecords(raw);
  const metaPlayers = asArray(meta.players);
  const players = [
    playerFrom(raw, 0, metaPlayers[0]),
    playerFrom(raw, 1, metaPlayers[1]),
  ];
  const reason = resultReason(raw, meta);
  const winner = winnerIndex(raw, meta);

  return {
    matchId: raw?.match?.urlId ?? raw?.match?.id ?? raw?.urlId ?? raw?.id ?? "unknown",
    mapId: raw?.match?.mapId ?? raw?.replayData?.map?.id ?? raw?.map?.id ?? "unknown",
    mapName: raw?.match?.mapName ?? raw?.replayData?.map?.name ?? null,
    generatedAt: raw?.generatedAt ?? null,
    players,
    playerByObjectId: buildObjectOwner(players),
    records,
    frameCount: records.length,
    scores: countStars(records),
    result: {
      reason,
      winnerIndex: winner,
      winnerRole: winner === null ? raw?.match?.winnerRole ?? null : roleForIndex(winner),
      winnerName: raw?.match?.winnerTankName ?? (winner === null ? null : players[winner]?.name ?? null),
    },
    raw,
  };
}

function findCrashEvidence(match) {
  for (let frameIndex = match.records.length - 1; frameIndex >= 0; frameIndex--) {
    const frame = asArray(match.records[frameIndex]);
    const tankCrash = frame.find((event) => event?.type === "tank" && event.action === "crashed");
    if (!tankCrash) continue;

    const victimIndex = match.playerByObjectId.get(tankCrash.objectId);
    let killerIndex = null;

    for (let i = frame.length - 1; i >= 0; i--) {
      const event = frame[i];
      if (event?.type !== "bullet") continue;
      const sourceId = event?.tank?.id;
      if (!sourceId) continue;
      killerIndex = match.playerByObjectId.get(sourceId) ?? null;
      if (killerIndex !== null) break;
    }

    return {
      frame: frameIndex,
      victimIndex: victimIndex ?? null,
      killerIndex,
      event: tankCrash,
    };
  }

  return null;
}

function scoreLine(scores) {
  return `${scores.challenger ?? 0}-${scores.defender ?? 0}`;
}

export function classifyOutcome(match) {
  const reason = String(match.result.reason ?? "unknown").toLowerCase();
  const winnerIndexValue = match.result.winnerIndex;
  const winnerRole = match.result.winnerRole;
  const crash = findCrashEvidence(match);

  if (reason.includes("crash") || crash) {
    const victimRole = crash?.victimIndex === null || crash?.victimIndex === undefined
      ? null
      : roleForIndex(crash.victimIndex);
    const killerRole = crash?.killerIndex === null || crash?.killerIndex === undefined
      ? null
      : roleForIndex(crash.killerIndex);
    return {
      category: crash?.killerIndex === null || crash?.killerIndex === undefined ? "crash" : "bullet_crash",
      reason: match.result.reason,
      winnerIndex: winnerIndexValue,
      winnerRole,
      victimRole,
      killerRole,
      decidingFrame: crash?.frame ?? match.frameCount - 1,
      scoreLine: scoreLine(match.scores),
    };
  }

  if (reason.includes("star") || reason.includes("score")) {
    return {
      category: "star_win",
      reason: match.result.reason,
      winnerIndex: winnerIndexValue,
      winnerRole,
      decidingFrame: match.frameCount - 1,
      scoreLine: scoreLine(match.scores),
    };
  }

  if (reason.includes("runtime") || reason.includes("timeout") || reason.includes("time")) {
    return {
      category: "runtime",
      reason: match.result.reason,
      winnerIndex: winnerIndexValue,
      winnerRole,
      decidingFrame: match.frameCount - 1,
      scoreLine: scoreLine(match.scores),
    };
  }

  return {
    category: "unknown",
    reason: match.result.reason,
    winnerIndex: winnerIndexValue,
    winnerRole,
    decidingFrame: match.frameCount - 1,
    scoreLine: scoreLine(match.scores),
  };
}

export function summarizeTimeline(match) {
  const starCollections = [];
  const skillCasts = [];
  const bulletCreates = [];
  const tankCrashes = [];

  match.records.forEach((frame, frameIndex) => {
    for (const event of asArray(frame)) {
      if (event?.type === "star" && event.action === "collected") {
        starCollections.push({
          frame: frameIndex,
          by: event.by,
          role: roleForIndex(event.by),
        });
      }
      if (event?.type === "skill" && event.action === "cast") {
        skillCasts.push({
          frame: frameIndex,
          by: event.by,
          role: roleForIndex(event.by),
          skillType: event.skillType,
        });
      }
      if (event?.type === "bullet" && event.action === "created") {
        const sourceIndex = match.playerByObjectId.get(event?.tank?.id);
        bulletCreates.push({
          frame: frameIndex,
          by: sourceIndex ?? null,
          role: sourceIndex === undefined ? null : roleForIndex(sourceIndex),
          direction: event.direction,
          position: event?.tank?.position ?? null,
        });
      }
      if (event?.type === "tank" && event.action === "crashed") {
        const victimIndex = match.playerByObjectId.get(event.objectId);
        tankCrashes.push({
          frame: frameIndex,
          victim: victimIndex ?? null,
          role: victimIndex === undefined ? null : roleForIndex(victimIndex),
          objectId: event.objectId,
        });
      }
    }
  });

  return {
    starCollections,
    skillCasts,
    bulletCreates,
    tankCrashes,
  };
}

export function analyzeMatch(raw, { perspectiveRole = "challenger" } = {}) {
  const match = normalizeMatch(raw);
  const players = Object.fromEntries(match.players.map((player) => [player.role, player]));
  const analysis = {
    match,
    players,
    outcome: classifyOutcome(match),
    timeline: summarizeTimeline(match),
  };

  return {
    ...analysis,
    behavior: scoreBehavior(analysis, perspectiveRole),
  };
}

function renderBehaviorItems(items) {
  return items.length
    ? items.map((item) => `- ${item.id}: ${item.title} (${item.evidence})`).join("\n")
    : "- None";
}

function renderBehaviorChecks(items) {
  return items.length
    ? items.map((item) => `- ${item.status ?? "check"} ${item.id}: ${item.title} (${item.evidence})`).join("\n")
    : "- None";
}

export function renderMatchReport(analysis) {
  const match = analysis.match;
  const outcome = analysis.outcome;
  const challenger = analysis.players.challenger;
  const defender = analysis.players.defender;
  const skillCasts = analysis.timeline.skillCasts
    .map((cast) => `- Frame ${cast.frame}: ${cast.role} cast ${cast.skillType}`)
    .join("\n");
  const starCollections = analysis.timeline.starCollections
    .map((star) => `- Frame ${star.frame}: ${star.role} collected a star`)
    .join("\n");
  const behavior = analysis.behavior ?? scoreBehavior(analysis, "challenger");

  return [
    `# Match Review: ${match.matchId}`,
    "",
    `- Map: ${match.mapId}`,
    `- Players: challenger ${challenger.name} vs defender ${defender.name}`,
    `- Result: ${outcome.winnerRole ?? "unknown"} won by ${outcome.category}`,
    `- Reason: ${outcome.reason}`,
    `- Score: ${outcome.scoreLine}`,
    `- Frames: ${match.frameCount}`,
    `- Deciding frame: ${outcome.decidingFrame}`,
    outcome.victimRole ? `- Victim: ${outcome.victimRole}` : null,
    outcome.killerRole ? `- Killer: ${outcome.killerRole}` : null,
    "",
    "## Skill Casts",
    "",
    skillCasts || "- None",
    "",
    "## Star Collections",
    "",
    starCollections || "- None",
    "",
    "## Behavior Score",
    "",
    `- Perspective: ${behavior.perspectiveRole}`,
    `- Score: ${behavior.score}/100`,
    "",
    "## Preserve",
    "",
    renderBehaviorItems(behavior.preserve),
    "",
    "## Fix",
    "",
    renderBehaviorItems(behavior.fix),
    "",
    "## Hard Constraints",
    "",
    renderBehaviorChecks(behavior.hardConstraints),
    "",
    "## Brave Baseline",
    "",
    renderBehaviorChecks(behavior.braveBaseline),
    "",
  ].filter((line) => line !== null).join("\n");
}

function increment(bucket, key) {
  bucket[key] = (bucket[key] ?? 0) + 1;
}

function sortedEntries(object) {
  return Object.entries(object).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function summarizeBatch(analyses, perspectiveRole = "challenger") {
  const summary = {
    total: analyses.length,
    wins: 0,
    losses: 0,
    categories: {},
    maps: {},
    opponents: {},
    behaviorScoreTotal: 0,
    preserve: {},
    fix: {},
    hardConstraints: {},
    braveBaseline: {},
  };

  for (const analysis of analyses) {
    const won = analysis.outcome.winnerRole === perspectiveRole;
    if (won) summary.wins++;
    else summary.losses++;

    increment(summary.categories, analysis.outcome.category);
    increment(summary.maps, analysis.match.mapId);

    const opponentRole = perspectiveRole === "challenger" ? "defender" : "challenger";
    const opponentName = analysis.players[opponentRole]?.name ?? opponentRole;
    increment(summary.opponents, opponentName);

    const behavior = scoreBehavior(analysis, perspectiveRole);
    summary.behaviorScoreTotal += behavior.score;
    for (const item of behavior.preserve) increment(summary.preserve, item.id);
    for (const item of behavior.fix) increment(summary.fix, item.id);
    for (const item of behavior.hardConstraints) increment(summary.hardConstraints, item.id);
    for (const item of behavior.braveBaseline) increment(summary.braveBaseline, item.id);
  }

  return summary;
}

function table(title, entries) {
  const rows = sortedEntries(entries);
  return [
    `## ${title}`,
    "",
    "| Name | Count |",
    "| --- | ---: |",
    ...(rows.length ? rows.map(([name, count]) => `| ${name} | ${count} |`) : ["| None | 0 |"]),
  ].join("\n");
}

export function renderBatchReport(analyses, perspectiveRole = "challenger") {
  const summary = summarizeBatch(analyses, perspectiveRole);
  const winRate = summary.total === 0 ? 0 : Math.round((summary.wins / summary.total) * 1000) / 10;
  const behaviorScore = summary.total === 0
    ? 0
    : Math.round((summary.behaviorScoreTotal / summary.total) * 10) / 10;

  return [
    "# Match Batch Report",
    "",
    `- Perspective: ${perspectiveRole}`,
    `- Total: ${summary.total}`,
    `- Wins: ${summary.wins}`,
    `- Losses: ${summary.losses}`,
    `- Win rate: ${winRate}%`,
    `- Avg behavior score: ${behaviorScore}/100`,
    "",
    table("Outcome Categories", summary.categories),
    "",
    table("Maps", summary.maps),
    "",
    table("Opponents", summary.opponents),
    "",
    table("Preserve Signals", summary.preserve),
    "",
    table("Fix Signals", summary.fix),
    "",
    table("Hard Constraint Breaches", summary.hardConstraints),
    "",
    table("Brave Baseline Signals", summary.braveBaseline),
    "",
  ].join("\n");
}
