#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  AGENTANK_BASE_URL,
  buildAgentApiUrl,
  readJsonResponse,
  safeTimestamp,
  sanitizeForStorage,
} from "./lib/agentank-api.mjs";

function usage() {
  return [
    "Usage:",
    "  node lab/scripts/research-boost-leaderboard.mjs [options]",
    "",
    "Options:",
    "  --top-tanks <n>           Number of score-ranked boost tanks to sample. Default: 12",
    "  --matches-per-tank <n>    Recent matches to fetch per sampled tank. Default: 4",
    "  --max-matches <n>         Global replay event cap after de-dupe. Default: 40",
    "  --output-root <path>      Output root. Default: /tmp/agentank-runs/boost-leaderboard-research",
    "",
    "Behavior:",
    "  - Fetches /api/leaderboard?period=all&sort=score&skill=boost.",
    "  - Fetches public tank match lists and public agent event views.",
    "  - Writes raw public samples and a compact report under /tmp by default.",
    "  - Does not publish code or run challenges.",
  ].join("\n");
}

function readOption(argv, name, defaultValue = undefined) {
  const index = argv.indexOf(name);
  if (index === -1) return defaultValue;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

function readPositiveInteger(argv, name, defaultValue) {
  const value = readOption(argv, name, defaultValue);
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

async function fetchJson(url) {
  const response = await fetch(url);
  return readJsonResponse(url, response);
}

function tankToken(row) {
  return row?.tankUrlId ?? row?.urlId ?? row?.tankId ?? row?.id;
}

function tankId(row) {
  return row?.tankId ?? row?.id ?? null;
}

function tankName(row) {
  return row?.tankName ?? row?.name ?? `tank-${tankId(row) ?? "unknown"}`;
}

function publicMatchToken(match) {
  return match?.urlId ?? match?.matchUrlId ?? match?.id;
}

function normalizeLeaderboard(rows) {
  return rows.map((row, index) => ({
    rank: row.rank ?? index + 1,
    tankId: tankId(row),
    tankUrlId: row.tankUrlId ?? row.urlId ?? null,
    tankName: tankName(row),
    skillType: row.skillType ?? row.skill ?? null,
    rankScore: row.rankScore ?? null,
    rankTier: row.rankTier ?? null,
    rankDivision: row.rankDivision ?? null,
    wins: row.wins ?? null,
    losses: row.losses ?? null,
    winRate: row.winRate ?? null,
    codeVersion: row.codeVersion ?? null,
  }));
}

function matchIncludesTank(match, id) {
  return match?.challengerTankId === id || match?.defenderTankId === id;
}

function roleForTank(match, id) {
  if (match?.challengerTankId === id) return "challenger";
  if (match?.defenderTankId === id) return "defender";
  return null;
}

function nameForRole(match, role) {
  if (role === "challenger") return match?.challengerTankName ?? null;
  if (role === "defender") return match?.defenderTankName ?? null;
  return null;
}

function winnerRole(match) {
  if (match?.winnerRole) return match.winnerRole;
  if (match?.winnerTankId === match?.challengerTankId) return "challenger";
  if (match?.winnerTankId === match?.defenderTankId) return "defender";
  return null;
}

function opponentRole(role) {
  return role === "challenger" ? "defender" : "challenger";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function increment(map, key, amount = 1) {
  const safeKey = key ?? "unknown";
  map[safeKey] = (map[safeKey] ?? 0) + amount;
}

function nearestPriorStar(events, frame) {
  let current = null;
  for (const event of events) {
    if (event.frame > frame) break;
    if (event.event === "star_spawned") current = event;
  }
  return current;
}

function summarizeFocusMatch({ match, eventsPayload, focusTank }) {
  const events = asArray(eventsPayload?.events).slice().sort((a, b) => (a.frame ?? 0) - (b.frame ?? 0));
  const role = roleForTank(match, focusTank.tankId);
  const focusName = nameForRole(match, role) ?? focusTank.tankName;
  const otherRole = opponentRole(role);
  const otherName = nameForRole(match, otherRole);
  const won = winnerRole(match) === role;
  const resultReason = match?.resultReason ?? eventsPayload?.match?.resultReason ?? "unknown";
  const focusSummary = eventsPayload?.summary?.tanks?.[focusName] ?? {};
  const otherSummary = otherName ? eventsPayload?.summary?.tanks?.[otherName] ?? {} : {};

  const focusSkillCasts = events.filter((event) => (
    event.event === "skill_cast" && event.tank === focusName && event.skill === "boost"
  ));
  const opponentSkillCasts = events.filter((event) => (
    event.event === "skill_cast" && event.tank !== focusName
  ));
  const starSpawns = events.filter((event) => event.event === "star_spawned");
  const focusStarCollections = events.filter((event) => (
    event.event === "star_collected" && event.tank === focusName
  ));
  const otherStarCollections = events.filter((event) => (
    event.event === "star_collected" && event.tank !== focusName
  ));
  const focusFireFrames = events.filter((event) => event.event === "fire" && event.tank === focusName);
  const focusWallShots = events.filter((event) => event.event === "shot_wall" && event.tank === focusName);
  const focusHits = events.filter((event) => event.event === "shot_hit" && event.tank === focusName);
  const focusCrashes = events.filter((event) => (
    String(event.event).includes("crash") && (event.tank === focusName || event.victim === focusName)
  ));

  const firstSpawn = starSpawns[0] ?? null;
  const firstBoost = focusSkillCasts[0] ?? null;
  const firstFocusStar = focusStarCollections[0] ?? null;
  const firstOtherStar = otherStarCollections[0] ?? null;
  const boostDeltas = focusSkillCasts
    .map((cast) => {
      const spawn = nearestPriorStar(starSpawns, cast.frame);
      return spawn ? cast.frame - spawn.frame : null;
    })
    .filter((value) => value !== null);

  const firstStarDelta = firstFocusStar && firstSpawn
    ? firstFocusStar.frame - firstSpawn.frame
    : null;
  const firstBoostDelta = firstBoost && firstSpawn
    ? firstBoost.frame - firstSpawn.frame
    : null;

  return {
    matchId: match.urlId ?? eventsPayload?.match?.urlId ?? match.id,
    createdAt: match.createdAt ?? eventsPayload?.match?.createdAt ?? null,
    mapId: match.mapId ?? eventsPayload?.match?.mapId ?? null,
    focusTankId: focusTank.tankId,
    focusTankName: focusName,
    focusRank: focusTank.rank,
    focusRankScore: focusTank.rankScore,
    role,
    opponentTankId: role === "challenger" ? match.defenderTankId : match.challengerTankId,
    opponentTankName: otherName,
    opponentSkill: opponentSkillCasts[0]?.skill ?? null,
    won,
    resultReason,
    frameCount: eventsPayload?.summary?.framesTotal ?? null,
    stars: focusSummary.stars ?? focusStarCollections.length,
    opponentStars: otherSummary.stars ?? otherStarCollections.length,
    skillCasts: focusSkillCasts.length,
    firstBoostFrame: firstBoost?.frame ?? null,
    firstBoostDeltaFromStar: firstBoostDelta,
    boostDeltasFromStar: boostDeltas,
    firstOwnStarFrame: firstFocusStar?.frame ?? null,
    firstOwnStarDeltaFromSpawn: firstStarDelta,
    firstOpponentStarFrame: firstOtherStar?.frame ?? null,
    shotsFired: focusSummary.shotsFired ?? focusFireFrames.length,
    shotsWall: focusSummary.shotsWall ?? focusWallShots.length,
    shotsHit: focusSummary.shotsHit ?? focusHits.length,
    moves: focusSummary.moves ?? null,
    turns: focusSummary.turns ?? null,
    crashes: focusSummary.crashes ?? focusCrashes.length,
    diagnosis: focusSummary.diagnosis ?? null,
    openingBoost: firstBoostDelta !== null && firstBoostDelta <= 3,
    boostBeforeFirstOwnStar: !!(firstBoost && (!firstFocusStar || firstBoost.frame <= firstFocusStar.frame)),
  };
}

function aggregateSummaries(summaries) {
  const out = {
    total: summaries.length,
    wins: 0,
    losses: 0,
    resultReasons: {},
    opponentSkills: {},
    byTank: {},
    openingBoost: 0,
    boostBeforeFirstOwnStar: 0,
    starWins: 0,
    crashWins: 0,
    runtimeLosses: 0,
    noSkillGames: 0,
    firstStarDeltas: [],
    boostDeltas: [],
  };

  for (const summary of summaries) {
    if (summary.won) out.wins++;
    else out.losses++;
    increment(out.resultReasons, `${summary.won ? "win" : "loss"}:${summary.resultReason}`);
    increment(out.opponentSkills, summary.opponentSkill ?? "unknown");
    if (summary.openingBoost) out.openingBoost++;
    if (summary.boostBeforeFirstOwnStar) out.boostBeforeFirstOwnStar++;
    if (summary.won && summary.resultReason === "star") out.starWins++;
    if (summary.won && summary.resultReason === "crashed") out.crashWins++;
    if (!summary.won && summary.resultReason === "runTime") out.runtimeLosses++;
    if (summary.skillCasts === 0) out.noSkillGames++;
    if (Number.isFinite(summary.firstOwnStarDeltaFromSpawn)) {
      out.firstStarDeltas.push(summary.firstOwnStarDeltaFromSpawn);
    }
    for (const delta of summary.boostDeltasFromStar) {
      if (Number.isFinite(delta)) out.boostDeltas.push(delta);
    }

    const tank = out.byTank[summary.focusTankId] ?? {
      tankName: summary.focusTankName,
      rank: summary.focusRank,
      rankScore: summary.focusRankScore,
      total: 0,
      wins: 0,
      openingBoost: 0,
      skillCasts: 0,
      stars: 0,
      shotsFired: 0,
    };
    tank.total++;
    if (summary.won) tank.wins++;
    if (summary.openingBoost) tank.openingBoost++;
    tank.skillCasts += summary.skillCasts;
    tank.stars += summary.stars;
    tank.shotsFired += summary.shotsFired;
    out.byTank[summary.focusTankId] = tank;
  }

  out.avgFirstOwnStarDelta = average(out.firstStarDeltas);
  out.avgBoostDelta = average(out.boostDeltas);
  return out;
}

function average(values) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function pct(numerator, denominator) {
  if (!denominator) return "0.0%";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function formatNumber(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

function renderMarkdown({ leaderboard, summaries, aggregate }) {
  const rows = summaries
    .slice()
    .sort((left, right) => {
      if (left.focusRank !== right.focusRank) return left.focusRank - right.focusRank;
      return String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""));
    });

  const lines = [
    "# Boost Leaderboard Research",
    "",
    `- Sampled tanks: ${Object.keys(aggregate.byTank).length}`,
    `- Sampled matches: ${aggregate.total}`,
    `- Focus-tank record in sampled matches: ${aggregate.wins}W/${aggregate.losses}L (${pct(aggregate.wins, aggregate.total)})`,
    `- Opening boost within 3 frames of a star spawn: ${aggregate.openingBoost}/${aggregate.total} (${pct(aggregate.openingBoost, aggregate.total)})`,
    `- Boost before first own star pickup: ${aggregate.boostBeforeFirstOwnStar}/${aggregate.total} (${pct(aggregate.boostBeforeFirstOwnStar, aggregate.total)})`,
    `- No-boost games: ${aggregate.noSkillGames}/${aggregate.total} (${pct(aggregate.noSkillGames, aggregate.total)})`,
    `- Avg first own star pickup delta: ${formatNumber(aggregate.avgFirstOwnStarDelta)} frames from spawn`,
    `- Avg boost timing: ${formatNumber(aggregate.avgBoostDelta)} frames from latest star spawn`,
    "",
    "## Top Boost Tanks",
    "",
    "| Rank | Tank | Score | W/L | Win rate | Version |",
    "| --- | --- | ---: | ---: | ---: | ---: |",
  ];

  leaderboard.slice(0, 20).forEach((tank) => {
    lines.push(`| ${tank.rank} | ${tank.tankName} (${tank.tankId}) | ${tank.rankScore} | ${tank.wins}/${tank.losses} | ${pct(tank.wins ?? 0, (tank.wins ?? 0) + (tank.losses ?? 0))} | ${tank.codeVersion ?? "n/a"} |`);
  });

  lines.push("", "## Per-Tank Sample", "", "| Rank | Tank | Matches | W/L | Opening boost | Boost casts | Stars | Shots |", "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |");
  Object.entries(aggregate.byTank)
    .map(([id, tank]) => ({ id, ...tank }))
    .sort((left, right) => left.rank - right.rank)
    .forEach((tank) => {
      lines.push(`| ${tank.rank} | ${tank.tankName} (${tank.id}) | ${tank.total} | ${tank.wins}/${tank.total - tank.wins} | ${tank.openingBoost} | ${tank.skillCasts} | ${tank.stars} | ${tank.shotsFired} |`);
    });

  lines.push("", "## Result Buckets", "", "| Bucket | Count |", "| --- | ---: |");
  Object.entries(aggregate.resultReasons)
    .sort((left, right) => right[1] - left[1])
    .forEach(([bucket, count]) => lines.push(`| ${bucket} | ${count} |`));

  lines.push("", "## Match Notes", "", "| Match | Tank | Result | Stars | Boost | First star delta | Opponent skill | Diagnosis |", "| --- | --- | --- | ---: | ---: | ---: | --- | --- |");
  rows.forEach((summary) => {
    const result = `${summary.won ? "W" : "L"}:${summary.resultReason}`;
    const diagnosis = String(summary.diagnosis ?? "").replaceAll("|", "/");
    lines.push(`| ${summary.matchId} | ${summary.focusTankName} | ${result} | ${summary.stars}-${summary.opponentStars} | ${summary.skillCasts} | ${summary.firstOwnStarDeltaFromSpawn ?? "n/a"} | ${summary.opponentSkill ?? "unknown"} | ${diagnosis} |`);
  });

  return `${lines.join("\n")}\n`;
}

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log(usage());
  process.exit(0);
}

const topTanks = readPositiveInteger(argv, "--top-tanks", 12);
const matchesPerTank = readPositiveInteger(argv, "--matches-per-tank", 4);
const maxMatches = readPositiveInteger(argv, "--max-matches", 40);
const outputRoot = readOption(argv, "--output-root", "/tmp/agentank-runs/boost-leaderboard-research");

const runDir = path.join(outputRoot, safeTimestamp());
const eventsDir = path.join(runDir, "events");
await mkdir(eventsDir, { recursive: true });

const leaderboardUrl = buildAgentApiUrl("/api/leaderboard", {
  period: "all",
  sort: "score",
  skill: "boost",
});
const leaderboardPayload = await fetchJson(leaderboardUrl);
const leaderboard = normalizeLeaderboard(Array.isArray(leaderboardPayload) ? leaderboardPayload : []);
const sampledTanks = leaderboard.slice(0, topTanks);

const matchCandidates = [];
const seenMatches = new Set();
for (const tank of sampledTanks) {
  const token = tankToken(tank);
  if (!token) continue;
  const url = `${AGENTANK_BASE_URL}/api/tanks/${encodeURIComponent(token)}/matches?limit=${matchesPerTank}&offset=0`;
  const payload = await fetchJson(url);
  const matches = asArray(payload?.matches).filter((match) => matchIncludesTank(match, tank.tankId));
  await writeFile(
    path.join(runDir, `tank-${tank.tankId}-matches.json`),
    `${JSON.stringify(sanitizeForStorage(payload), null, 2)}\n`,
    "utf8",
  );
  for (const match of matches) {
    const matchId = publicMatchToken(match);
    if (!matchId || seenMatches.has(String(matchId))) continue;
    seenMatches.add(String(matchId));
    matchCandidates.push({ tank, match });
    if (matchCandidates.length >= maxMatches) break;
  }
  if (matchCandidates.length >= maxMatches) break;
}

const summaries = [];
for (const candidate of matchCandidates) {
  const matchId = publicMatchToken(candidate.match);
  const url = `${AGENTANK_BASE_URL}/api/matches/${encodeURIComponent(matchId)}/agent.json?view=events`;
  const eventsPayload = await fetchJson(url);
  await writeFile(
    path.join(eventsDir, `${matchId}.events.json`),
    `${JSON.stringify(sanitizeForStorage(eventsPayload), null, 2)}\n`,
    "utf8",
  );
  summaries.push(summarizeFocusMatch({
    match: candidate.match,
    eventsPayload,
    focusTank: candidate.tank,
  }));
}

const aggregate = aggregateSummaries(summaries);
const report = {
  generatedAt: new Date().toISOString(),
  source: {
    leaderboardUrl,
    topTanks,
    matchesPerTank,
    maxMatches,
  },
  leaderboard,
  matches: summaries,
  aggregate,
};

await writeFile(path.join(runDir, "leaderboard.json"), `${JSON.stringify(leaderboard, null, 2)}\n`, "utf8");
await writeFile(path.join(runDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(path.join(runDir, "report.md"), renderMarkdown({ leaderboard, summaries, aggregate }), "utf8");

console.log(path.join(runDir, "report.md"));
