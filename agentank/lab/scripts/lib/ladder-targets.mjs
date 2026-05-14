import { extractLadderMetrics, formatLadderMetrics } from "./ladder-metrics.mjs";

function totalMatches(row) {
  return Number(row.wins ?? 0) + Number(row.losses ?? 0) + Number(row.draws ?? 0);
}

function tankId(row) {
  return row.tankId ?? row.id;
}

function tankName(row) {
  return row.tankName ?? row.name ?? "";
}

export function buildStepwiseTargets({
  ownTankId,
  ownMetrics,
  leaderboard,
  minScoreGap = 0,
  maxScoreGap = 120,
  minMatches = 3,
  limit = 12,
} = {}) {
  const ownScore = extractLadderMetrics(ownMetrics).rankScore;
  if (ownScore === undefined) {
    throw new Error("ownMetrics.rankScore is required");
  }
  if (!Array.isArray(leaderboard)) {
    throw new Error("leaderboard must be an array");
  }

  return leaderboard
    .map((row) => {
      const metrics = extractLadderMetrics(row);
      return {
        draws: row.draws ?? 0,
        losses: row.losses ?? 0,
        name: tankName(row),
        rank: metrics.rank,
        rankDivision: metrics.rankDivision,
        rankPoints: metrics.rankPoints,
        rankScore: metrics.rankScore,
        rankTier: metrics.rankTier,
        scoreGap: metrics.rankScore === undefined ? undefined : metrics.rankScore - ownScore,
        skillType: row.skillType ?? row.skill ?? "",
        tankId: tankId(row),
        totalMatches: totalMatches(row),
        wins: row.wins ?? 0,
      };
    })
    .filter((row) => row.tankId !== ownTankId)
    .filter((row) => row.rankScore !== undefined && row.scoreGap !== undefined)
    .filter((row) => row.scoreGap >= minScoreGap && row.scoreGap <= maxScoreGap)
    .filter((row) => row.totalMatches >= minMatches)
    .sort((a, b) => a.scoreGap - b.scoreGap || b.totalMatches - a.totalMatches)
    .slice(0, limit);
}

export function renderStepwiseTargets(targets, ownMetrics) {
  const own = extractLadderMetrics(ownMetrics);
  const lines = [
    `Own ladder: ${formatLadderMetrics(own)}`,
    "",
    "| Tank id | Name | Skill | Score | Gap | Tier | Record |",
    "| ---: | --- | --- | ---: | ---: | --- | ---: |",
  ];

  for (const target of targets) {
    const tier = `${target.rankTier ?? "n/a"} ${target.rankDivision ?? ""} +${target.rankPoints ?? "n/a"}`;
    const record = `${target.wins}-${target.losses}-${target.draws}`;
    lines.push(
      `| ${target.tankId} | ${target.name} | ${target.skillType || "n/a"} | ${target.rankScore} | +${target.scoreGap} | ${tier} | ${record} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}
