#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  authHeaders,
  buildAgentApiUrl,
  buildMatchUrl,
  readJsonResponse,
  safeTimestamp,
  sanitizeForStorage,
} from "./lib/agentank-api.mjs";
import {
  buildChallengeRequestBody,
  extractMatchId,
  PRIMARY_TANKS,
} from "./lib/challenge-plan.mjs";
import {
  buildAdaptiveQueue,
  buildOpponentMemoryFromRuns,
  normalizeLeaderboardRows,
  parseNumericIds,
  resolveClimbPolicyOptions,
  shouldStopForDrawdown,
} from "./lib/adaptive-grind.mjs";

function usage() {
  return [
    "Usage:",
    "  node lab/scripts/grind-adaptive-real.mjs [options]",
    "",
    "Options:",
    "  --tank <codename>              Tank codename. Default: teleport-main",
    "  --opponents <ids>              Comma-separated fallback opponent ids.",
    "  --seed-opponents <ids>         Preferred fallback ids that should be tried first when available.",
    "  --maps <ids>                   Comma-separated map ids. Default: random",
    "  --limit <n>                    Settled matches target. Default: 20",
    "  --max-per-opponent <n>         Max blind retries per opponent before dropping it. Default: 2",
    "  --max-wins-per-opponent <n>    Global win cap per opponent before rotating it out.",
    "  --lower-window <n>             Max lower score gap for same-band queue. Default: 260",
    "  --upper-window <n>             Max upper score gap for same-band queue. Default: 140",
    "  --max-candidates <n>           Queue width per refresh. Default: 12",
    "  --drawdown-stop <n>            Stop when current score falls n below this run's peak. Default: disabled",
    "  --climb-policy                 Use score-band defaults for ladder pushes: 700+ rotates after 1 win and stops at -25.",
    "  --sleep-ms <n>                 Delay between real challenges. Default: 1800",
    "  --output-dir <path>            Replay output dir. Default: /tmp/agentank-runs/matches",
    "  --run-dir <path>               Run log dir. Default: /tmp/agentank-runs/challenge-runs",
    "  --explicit-only                Only queue ids passed through --opponents.",
    "  --random-when-empty           Use a server-selected rank-eligible random opponent if the queue is empty.",
    "  --use-run-history              Load prior run logs from --run-dir before queueing.",
    "  --history-since <iso>          Only load prior run logs started at/after this timestamp.",
    "  --stop-on-loss                 Stop the run immediately after a settled loss.",
    "  --execute                      Send real challenges. Without it, prints the next queue only.",
    "",
    "Behavior:",
    "  - Pull the live leaderboard every loop.",
    "  - Prefer current winners and seed opponents.",
    "  - Drop an opponent for the rest of the run after a loss or gate error.",
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

function readOptionalPositiveInteger(argv, name) {
  if (!argv.includes(name)) return null;
  return readPositiveInteger(argv, name);
}

function readNonNegativeInteger(argv, name, defaultValue) {
  const value = readOption(argv, name, defaultValue);
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  return readJsonResponse(url, response, options.method ?? "GET");
}

async function fetchLeaderboard(key) {
  return fetchJson(buildAgentApiUrl("/api/agent/leaderboard"), {
    headers: authHeaders(key),
  });
}

async function fetchTankSnapshot(key) {
  return fetchJson(buildAgentApiUrl("/api/agent/tank"), {
    headers: authHeaders(key),
  });
}

async function postChallenge(item, key) {
  return fetchJson(buildAgentApiUrl("/api/agent/tank/challenge"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(key),
    },
    body: JSON.stringify(buildChallengeRequestBody(item)),
  });
}

async function fetchAndStoreMatch(matchId, outputDir) {
  const replay = await fetchJson(buildMatchUrl(matchId));
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${matchId}.json`);
  await writeFile(outputPath, `${JSON.stringify(sanitizeForStorage(replay), null, 2)}\n`, "utf8");
  return outputPath;
}

async function writeRunLog(runDir, run) {
  await mkdir(runDir, { recursive: true });
  const runPath = path.join(runDir, `${run.runId}.json`);
  await writeFile(runPath, `${JSON.stringify(sanitizeForStorage(run), null, 2)}\n`, "utf8");
  return runPath;
}

async function loadPriorRuns(runDir) {
  let entries = [];
  try {
    entries = await readdir(runDir);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const runs = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    try {
      const raw = await readFile(path.join(runDir, entry), "utf8");
      runs.push(JSON.parse(raw));
    } catch (error) {
      console.warn(`Skipping unreadable run log ${entry}: ${error.message}`);
    }
  }
  return runs;
}

function classifyError(error) {
  const message = String(error?.message ?? error ?? "");
  if (message.includes("opponent rank score is too far")) return "too_far";
  if (message.includes("opponent rank is too high")) return "too_high";
  if (message.includes("battle function failed")) return "battle_failed";
  return "other";
}

function summarizeOutcome(response, tankId, opponentId) {
  const rankChange = (response?.rankChanges ?? []).find((item) => item.tankId === tankId);
  const winnerTankId = response?.winnerTankId;
  return {
    result: winnerTankId === tankId ? "win" : (winnerTankId ? "loss" : "other"),
    reason: response?.resultReason ?? null,
    delta: rankChange?.delta ?? 0,
    before: rankChange?.beforeRankScore ?? null,
    after: rankChange?.afterRankScore ?? null,
  };
}

function positiveTankId(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

function extractActualOpponent(response, selfTankId, fallback = {}) {
  const defenderId = positiveTankId(response?.defenderTankId);
  if (defenderId && defenderId !== selfTankId) {
    return {
      id: defenderId,
      name: response?.defenderTankName ?? fallback.name ?? null,
      rankScore: Number.isFinite(response?.defenderRankScore) ? response.defenderRankScore : fallback.rankScore ?? null,
    };
  }

  const challengerId = positiveTankId(response?.challengerTankId);
  if (challengerId && challengerId !== selfTankId) {
    return {
      id: challengerId,
      name: response?.challengerTankName ?? fallback.name ?? null,
      rankScore: Number.isFinite(response?.challengerRankScore) ? response.challengerRankScore : fallback.rankScore ?? null,
    };
  }

  return {
    id: fallback.id ?? null,
    name: fallback.name ?? null,
    rankScore: fallback.rankScore ?? null,
  };
}

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log(usage());
  process.exit(0);
}

const execute = argv.includes("--execute");
const explicitOnly = argv.includes("--explicit-only");
const randomWhenEmpty = argv.includes("--random-when-empty");
const requestedStopOnLoss = argv.includes("--stop-on-loss");
const climbPolicy = argv.includes("--climb-policy");
const useRunHistory = argv.includes("--use-run-history") || argv.includes("--history-since");
const tankCodename = readOption(argv, "--tank", "teleport-main");
const tank = PRIMARY_TANKS[tankCodename];
if (!tank) throw new Error(`Unknown tank codename: ${tankCodename}`);

const explicitOpponentIds = parseNumericIds(readOption(argv, "--opponents", ""), "opponents");
const seedOpponentIds = parseNumericIds(readOption(argv, "--seed-opponents", ""), "seed-opponents");
const mapIds = readOption(argv, "--maps", "random").split(",").map((item) => item.trim()).filter(Boolean);
if (!mapIds.length) throw new Error("At least one map id is required");

const limit = readPositiveInteger(argv, "--limit", 20);
const maxPerOpponent = readPositiveInteger(argv, "--max-per-opponent", 2);
const requestedMaxWinsPerOpponent = readOptionalPositiveInteger(argv, "--max-wins-per-opponent");
const lowerWindow = readPositiveInteger(argv, "--lower-window", 260);
const upperWindow = readPositiveInteger(argv, "--upper-window", 140);
const maxCandidates = readPositiveInteger(argv, "--max-candidates", 12);
const requestedDrawdownStop = readNonNegativeInteger(argv, "--drawdown-stop", 0);
const sleepMs = readPositiveInteger(argv, "--sleep-ms", 1800);
const outputDir = readOption(argv, "--output-dir", "/tmp/agentank-runs/matches");
const runDir = readOption(argv, "--run-dir", "/tmp/agentank-runs/challenge-runs");
const historySince = readOption(argv, "--history-since", null);

const key = process.env[tank.envName];
if (!key) throw new Error(`Missing environment variable for ${tank.codename}: ${tank.envName}`);

const startSnapshot = await fetchTankSnapshot(key);
const startScore = startSnapshot?.tank?.rankScore ?? startSnapshot?.rankScore;
if (!Number.isFinite(startScore)) throw new Error("Could not read current rank score from tank snapshot");

const climbOptions = resolveClimbPolicyOptions({
  currentScore: startScore,
  climbPolicy,
  maxWinsPerOpponent: requestedMaxWinsPerOpponent,
  drawdownStop: requestedDrawdownStop,
  stopOnLoss: requestedStopOnLoss,
});
const { maxWinsPerOpponent, drawdownStop, stopOnLoss } = climbOptions;

const historyMemory = useRunHistory
  ? buildOpponentMemoryFromRuns(await loadPriorRuns(runDir), {
    tankCodename,
    since: historySince,
  })
  : {
    attemptsByOpponent: {},
    winsByOpponent: {},
    lossIds: [],
    gatedIds: [],
    blockedIds: [],
  };

const run = {
  runId: safeTimestamp(),
  startedAt: new Date().toISOString(),
  execute,
  tankCodename,
  tankId: tank.tankId,
  startScore,
  sleepMs,
  mapIds,
  explicitOpponentIds,
  seedOpponentIds,
  config: {
    limit,
    maxPerOpponent,
    maxWinsPerOpponent,
    requestedMaxWinsPerOpponent,
    lowerWindow,
    upperWindow,
    maxCandidates,
    drawdownStop,
    requestedDrawdownStop,
    climbPolicy,
    explicitOnly,
    randomWhenEmpty,
    useRunHistory,
    historySince,
    stopOnLoss,
  },
  state: {
    currentScore: startScore,
    peakScore: startScore,
    blockedIds: [...historyMemory.blockedIds],
    gatedIds: [...historyMemory.gatedIds],
    lossIds: [...historyMemory.lossIds],
    attemptsByOpponent: { ...historyMemory.attemptsByOpponent },
    winsByOpponent: { ...historyMemory.winsByOpponent },
    historyLoaded: {
      blockedIds: historyMemory.blockedIds.length,
      gatedIds: historyMemory.gatedIds.length,
      lossIds: historyMemory.lossIds.length,
      attempts: Object.keys(historyMemory.attemptsByOpponent).length,
      winners: Object.keys(historyMemory.winsByOpponent).length,
    },
  },
  snapshots: {
    start: startSnapshot,
  },
  queueSnapshots: [],
  results: [],
  errors: [],
};

const runPath = await writeRunLog(runDir, run);
console.log(`Run log: ${runPath}`);
console.log(`Mode: ${execute ? "execute" : "dry-run"}`);
console.log(`Start score: ${startScore}`);
if (climbPolicy) {
  console.log(`Climb policy: ${JSON.stringify(climbOptions)}`);
}
if (useRunHistory) {
  console.log(`Loaded history: ${JSON.stringify(run.state.historyLoaded)}`);
}

async function refreshQueue() {
  const leaderboardPayload = await fetchLeaderboard(key);
  const leaderboardRows = normalizeLeaderboardRows(leaderboardPayload);
  const queue = buildAdaptiveQueue({
    currentScore: run.state.currentScore,
    selfTankId: tank.tankId,
    explicitOpponentIds,
    explicitOnly,
    seedOpponentIds,
    leaderboardRows,
    blockedIds: run.state.blockedIds,
    gatedIds: run.state.gatedIds,
    lossIds: run.state.lossIds,
    attemptsByOpponent: run.state.attemptsByOpponent,
    winsByOpponent: run.state.winsByOpponent,
    lowerWindow,
    upperWindow,
    maxPerOpponent,
    maxWinsPerOpponent: maxWinsPerOpponent ?? Number.POSITIVE_INFINITY,
    maxCandidates,
  });

  run.queueSnapshots.push({
    at: new Date().toISOString(),
    currentScore: run.state.currentScore,
    queue: queue.map((item) => ({
      id: item.id,
      name: item.name,
      rankScore: item.rankScore,
      skillType: item.skillType,
      attempts: item.attempts,
      wins: item.wins,
      seeded: item.seeded,
      source: item.source,
    })),
  });
  await writeRunLog(runDir, run);
  return queue;
}

const initialQueue = await refreshQueue();
if (!execute) {
  const dryQueue = initialQueue.length || !randomWhenEmpty
    ? initialQueue
    : [{
      randomOpponent: true,
      name: "server-selected rank-eligible opponent",
      mapId: mapIds[0],
      source: "random-when-empty",
    }];
  console.log(JSON.stringify(dryQueue, null, 2));
  process.exit(0);
}

while (run.results.length < limit) {
  if (shouldStopForDrawdown({
    currentScore: run.state.currentScore,
    peakScore: run.state.peakScore,
    drawdownStop,
  })) {
    console.log(
      `Stopping after drawdown: current ${run.state.currentScore}, peak ${run.state.peakScore}, limit ${drawdownStop}.`,
    );
    break;
  }

  const queue = await refreshQueue();
  if (!queue.length && !randomWhenEmpty) {
    console.log("No remaining candidates in the adaptive queue.");
    break;
  }

  const candidate = queue[0] ?? {
    id: null,
    name: "server-selected rank-eligible opponent",
    rankScore: null,
    randomOpponent: true,
    source: "random-when-empty",
  };
  const opponentKey = candidate.randomOpponent ? "random" : candidate.id;
  const attemptCount = (run.state.attemptsByOpponent[opponentKey] ?? 0) + 1;
  const mapId = mapIds[(attemptCount - 1) % mapIds.length];
  console.log(
    `${run.results.length + 1}/${limit}: ${tank.codename} -> ${candidate.randomOpponent ? "random opponent" : `opponent ${candidate.id}`} on ${mapId} (score ${run.state.currentScore})`,
  );

  const item = {
    tankCodename: tank.codename,
    tankId: tank.tankId,
    skill: tank.skill,
    envName: tank.envName,
    opponentId: candidate.id,
    randomOpponent: !!candidate.randomOpponent,
    mapId,
    round: attemptCount,
  };
  const startedAt = new Date().toISOString();

  try {
    const response = await postChallenge(item, key);
    const matchId = extractMatchId(response);
    const replayPath = matchId ? await fetchAndStoreMatch(matchId, outputDir) : null;
    const outcome = summarizeOutcome(response, tank.tankId, candidate.id);
    const actualOpponent = extractActualOpponent(response, tank.tankId, candidate);

    run.state.attemptsByOpponent[opponentKey] = attemptCount;
    if (actualOpponent.id) {
      run.state.attemptsByOpponent[actualOpponent.id] = (run.state.attemptsByOpponent[actualOpponent.id] ?? 0) + 1;
    }
    if (outcome.result === "win" && actualOpponent.id) {
      run.state.winsByOpponent[actualOpponent.id] = (run.state.winsByOpponent[actualOpponent.id] ?? 0) + 1;
    } else if (outcome.result === "loss" && actualOpponent.id) {
      run.state.lossIds.push(actualOpponent.id);
    }
    if (Number.isFinite(outcome.after)) {
      run.state.currentScore = outcome.after;
      run.state.peakScore = Math.max(run.state.peakScore, outcome.after);
    }

    run.results.push({
      ...item,
      opponentId: actualOpponent.id,
      requestedOpponentId: item.opponentId,
      startedAt,
      finishedAt: new Date().toISOString(),
      opponentName: actualOpponent.name,
      opponentRankScore: actualOpponent.rankScore,
      matchId,
      replayPath,
      challengeResponse: response,
      outcome,
    });
    await writeRunLog(runDir, run);
    console.log(
      `  ${outcome.result} ${outcome.delta >= 0 ? "+" : ""}${outcome.delta} -> ${outcome.after ?? "?"}`,
    );
    if (stopOnLoss && outcome.result === "loss") {
      console.log("Stopping after loss because --stop-on-loss is set.");
      break;
    }
    if (shouldStopForDrawdown({
      currentScore: run.state.currentScore,
      peakScore: run.state.peakScore,
      drawdownStop,
    })) {
      console.log(
        `Stopping after drawdown: current ${run.state.currentScore}, peak ${run.state.peakScore}, limit ${drawdownStop}.`,
      );
      break;
    }
  } catch (error) {
    const kind = classifyError(error);
    run.errors.push({
      at: new Date().toISOString(),
      opponentId: candidate.id,
      opponentName: candidate.name,
      kind,
      message: error.message,
    });
    if (candidate.randomOpponent) {
      run.state.blockedIds.push(opponentKey);
    } else if (kind === "too_far" || kind === "too_high") {
      run.state.gatedIds.push(candidate.id);
    } else {
      run.state.blockedIds.push(candidate.id);
    }
    await writeRunLog(runDir, run);
    console.log(`  skipped ${candidate.id}: ${kind}`);
  }

  if (run.results.length < limit) await sleep(sleepMs);
}

run.snapshots.end = await fetchTankSnapshot(key);
run.finishedAt = new Date().toISOString();
await writeRunLog(runDir, run);

const endScore = run.snapshots.end?.tank?.rankScore ?? run.snapshots.end?.rankScore ?? run.state.currentScore;
console.log(`Completed run: ${runPath}`);
console.log(`End score: ${endScore}`);
