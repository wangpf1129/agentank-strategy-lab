import { parseList } from "./challenge-plan.mjs";

export function parseNumericIds(value, name = "opponents") {
  return parseList(value, name).map((item) => {
    const parsed = Number.parseInt(item, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || String(parsed) !== item) {
      throw new Error(`Invalid ${name} id: ${item}`);
    }
    return parsed;
  });
}

export function normalizeLeaderboardRows(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : payload?.rows ?? payload?.leaderboard ?? payload?.items ?? [];

  return rows
    .filter((row) => row && typeof row === "object")
    .map((row) => ({
      id: row.tankId ?? row.id,
      name: row.tankName ?? row.name ?? null,
      rankScore: Number.isFinite(row.rankScore) ? row.rankScore : null,
      rankTier: row.rankTier ?? null,
      rankDivision: row.rankDivision ?? null,
      rankPoints: row.rankPoints ?? null,
      elo: Number.isFinite(row.elo) ? row.elo : null,
      wins: Number.isFinite(row.wins) ? row.wins : null,
      losses: Number.isFinite(row.losses) ? row.losses : null,
      skillType: row.skillType ?? null,
      codeVersion: row.codeVersion ?? null,
      submittedBy: row.submittedBy ?? null,
      source: "leaderboard",
    }))
    .filter((row) => Number.isInteger(row.id) && row.id > 0);
}

function toPositiveInteger(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function sortedNumericValues(values) {
  return [...values].sort((left, right) => left - right);
}

export function buildOpponentMemoryFromRuns(runs = [], {
  tankCodename = null,
  since = null,
} = {}) {
  const sinceMs = since ? Date.parse(since) : Number.NEGATIVE_INFINITY;
  if (since && Number.isNaN(sinceMs)) {
    throw new Error(`Invalid history since timestamp: ${since}`);
  }

  const attemptsByOpponent = {};
  const winsByOpponent = {};
  const lossIds = new Set();
  const gatedIds = new Set();
  const blockedIds = new Set();

  for (const run of runs) {
    if (!run || typeof run !== "object") continue;
    if (run.execute !== true) continue;
    if (tankCodename && run.tankCodename !== tankCodename) continue;

    const startedAtMs = Date.parse(run.startedAt ?? "");
    if (Number.isFinite(sinceMs) && Number.isFinite(startedAtMs) && startedAtMs < sinceMs) {
      continue;
    }

    for (const result of run.results ?? []) {
      const opponentId = toPositiveInteger(result?.opponentId);
      if (!opponentId) continue;

      attemptsByOpponent[opponentId] = (attemptsByOpponent[opponentId] ?? 0) + 1;
      if (result?.outcome?.result === "win") {
        winsByOpponent[opponentId] = (winsByOpponent[opponentId] ?? 0) + 1;
      } else if (result?.outcome?.result === "loss") {
        lossIds.add(opponentId);
      }
    }

    for (const error of run.errors ?? []) {
      const opponentId = toPositiveInteger(error?.opponentId);
      if (!opponentId) continue;
      if (error.kind === "too_far" || error.kind === "too_high") {
        gatedIds.add(opponentId);
      } else {
        blockedIds.add(opponentId);
      }
    }
  }

  return {
    attemptsByOpponent,
    winsByOpponent,
    lossIds: sortedNumericValues(lossIds),
    gatedIds: sortedNumericValues(gatedIds),
    blockedIds: sortedNumericValues(blockedIds),
  };
}

export function shouldStopForDrawdown({
  currentScore,
  peakScore,
  drawdownStop = 0,
} = {}) {
  return (
    Number.isFinite(drawdownStop)
    && drawdownStop > 0
    && Number.isFinite(currentScore)
    && Number.isFinite(peakScore)
    && peakScore - currentScore >= drawdownStop
  );
}

export function resolveClimbPolicyOptions({
  currentScore,
  climbPolicy = false,
  maxWinsPerOpponent = null,
  drawdownStop = 0,
  stopOnLoss = false,
} = {}) {
  if (!climbPolicy) {
    return { maxWinsPerOpponent, drawdownStop, stopOnLoss };
  }

  const preserveBand = Number.isFinite(currentScore) && currentScore >= 700;
  return {
    maxWinsPerOpponent: maxWinsPerOpponent ?? (preserveBand ? 1 : 2),
    drawdownStop: drawdownStop > 0 ? drawdownStop : (preserveBand ? 25 : 35),
    stopOnLoss: true,
  };
}

function scoreDistance(rankScore, currentScore) {
  if (!Number.isFinite(rankScore) || !Number.isFinite(currentScore)) return Number.POSITIVE_INFINITY;
  return Math.abs(rankScore - currentScore);
}

export function buildAdaptiveQueue({
  currentScore,
  selfTankId,
  explicitOpponentIds = [],
  explicitOnly = false,
  seedOpponentIds = [],
  leaderboardRows = [],
  blockedIds = [],
  gatedIds = [],
  lossIds = [],
  attemptsByOpponent = {},
  winsByOpponent = {},
  lowerWindow = 260,
  upperWindow = 140,
  maxPerOpponent = 2,
  maxWinsPerOpponent = Number.POSITIVE_INFINITY,
  maxCandidates = 12,
} = {}) {
  const queueById = new Map();

  explicitOpponentIds.forEach((id, index) => {
    if (!Number.isInteger(id) || id < 1) return;
    queueById.set(id, {
      id,
      name: null,
      rankScore: null,
      source: "explicit",
      explicitOrder: index,
    });
  });

  leaderboardRows.forEach((row) => {
    if (!Number.isInteger(row.id) || row.id < 1) return;
    const existing = queueById.get(row.id);
    if (explicitOnly && !existing) return;
    queueById.set(row.id, {
      ...existing,
      ...row,
      explicitOrder: existing?.explicitOrder ?? Number.POSITIVE_INFINITY,
    });
  });

  const blocked = new Set(blockedIds);
  const gated = new Set(gatedIds);
  const losses = new Set(lossIds);
  const seeded = new Set(seedOpponentIds);
  const out = [];

  for (const candidate of queueById.values()) {
    if (candidate.id === selfTankId) continue;
    if (blocked.has(candidate.id) || gated.has(candidate.id) || losses.has(candidate.id)) continue;

    const attempts = attemptsByOpponent[candidate.id] ?? 0;
    const wins = winsByOpponent[candidate.id] ?? 0;
    if (wins >= maxWinsPerOpponent) continue;
    if (attempts >= maxPerOpponent && wins === 0) continue;
    if (attempts >= maxPerOpponent + 1 && wins > 0) continue;

    const rankScore = candidate.rankScore;
    const hasScore = Number.isFinite(rankScore);
    if (
      hasScore
      && !seeded.has(candidate.id)
      && rankScore < currentScore - lowerWindow
      && wins === 0
    ) {
      continue;
    }
    if (
      hasScore
      && rankScore > currentScore + upperWindow
      && wins === 0
    ) {
      continue;
    }

    out.push({
      ...candidate,
      attempts,
      wins,
      seeded: seeded.has(candidate.id),
      distance: scoreDistance(rankScore, currentScore),
      above: hasScore ? rankScore > currentScore : false,
    });
  }

  out.sort((left, right) => {
    if ((right.wins > 0) !== (left.wins > 0)) return right.wins - left.wins;
    if (left.seeded !== right.seeded) return left.seeded ? -1 : 1;
    if (left.above !== right.above) return left.above ? 1 : -1;
    if (left.distance !== right.distance) return left.distance - right.distance;
    if (left.attempts !== right.attempts) return left.attempts - right.attempts;
    if (left.explicitOrder !== right.explicitOrder) return left.explicitOrder - right.explicitOrder;
    return left.id - right.id;
  });

  return out.slice(0, maxCandidates);
}
