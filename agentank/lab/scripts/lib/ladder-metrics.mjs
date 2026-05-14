const ROMAN_DIVISIONS = new Map([
  [1, "I"],
  [2, "II"],
  [3, "III"],
  [4, "IV"],
]);

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function addIfDefined(target, key, value) {
  if (value !== undefined) {
    target[key] = value;
  }
}

function metricValue(value, key) {
  const root = value ?? {};
  const tank = root.tank ?? {};
  const standing = root.standing ?? {};
  return firstDefined(root[key], tank[key], standing[key]);
}

function numberMetric(value, key) {
  return toFiniteNumber(metricValue(value, key));
}

export function extractLadderMetrics(value) {
  const metrics = {};

  addIfDefined(metrics, "elo", numberMetric(value, "elo"));
  addIfDefined(metrics, "rank", numberMetric(value, "rank"));
  addIfDefined(metrics, "rankDivision", numberMetric(value, "rankDivision"));
  addIfDefined(metrics, "rankPoints", numberMetric(value, "rankPoints"));
  addIfDefined(metrics, "rankScore", numberMetric(value, "rankScore"));
  addIfDefined(metrics, "rankTier", metricValue(value, "rankTier"));
  addIfDefined(metrics, "totalPublic", numberMetric(value, "totalPublic"));

  return metrics;
}

function formatDivision(rankDivision) {
  return ROMAN_DIVISIONS.get(rankDivision) ?? String(rankDivision);
}

function formatPoints(rankPoints) {
  if (rankPoints === undefined) return "";
  return rankPoints >= 0 ? ` +${rankPoints}` : ` ${rankPoints}`;
}

export function formatLadderMetrics(metrics) {
  const tier = metrics.rankTier ?? "unranked";
  const division = metrics.rankDivision === undefined ? "" : ` ${formatDivision(metrics.rankDivision)}`;
  const points = formatPoints(metrics.rankPoints);
  const score = metrics.rankScore === undefined ? "score n/a" : `score ${metrics.rankScore}`;
  const rank = metrics.rank === undefined
    ? "rank n/a"
    : `rank ${metrics.rank}${metrics.totalPublic === undefined ? "" : `/${metrics.totalPublic}`}`;

  return `${tier}${division}${points}, ${score}, ${rank}`;
}

function delta(before, after, key) {
  if (before[key] === undefined || after[key] === undefined) return undefined;
  return after[key] - before[key];
}

export function compareLadderMetrics(beforeValue, afterValue) {
  const before = extractLadderMetrics(beforeValue);
  const after = extractLadderMetrics(afterValue);
  const rankScoreDelta = delta(before, after, "rankScore");
  const rankPointsDelta = delta(before, after, "rankPoints");
  const rankDelta = delta(before, after, "rank");

  const comparison = {
    divisionChanged: before.rankDivision !== after.rankDivision,
    rankDelta,
    rankImproved: rankDelta === undefined ? undefined : rankDelta < 0,
    rankPointsDelta,
    rankScoreDelta,
    scoreImproved: rankScoreDelta === undefined ? undefined : rankScoreDelta > 0,
    tierChanged: before.rankTier !== after.rankTier,
  };

  return Object.fromEntries(
    Object.entries(comparison).filter(([, value]) => value !== undefined),
  );
}
