#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
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
  buildChallengePlan,
  buildChallengeRequestBody,
  extractMatchId,
} from "./lib/challenge-plan.mjs";

function usage() {
  return [
    "Usage:",
    "  node lab/scripts/run-real-challenges.mjs --opponents <ids> [options]",
    "",
    "Options:",
    "  --tank <codename|all>       Tank to run: freeze-main, teleport-main, shield-main, or all. Default: all",
    "  --opponents <ids>           Comma-separated public opponent tank ids. Required.",
    "  --maps <ids>                Comma-separated map ids. Default: random",
    "  --repeat <n>                Rounds per opponent/map/tank combination. Default: 1",
    "  --limit <n>                 Maximum challenges in this run. Default: 20",
    "  --sleep-ms <n>              Delay between real challenges. Default: 5000",
    "  --output-dir <path>         Where replay JSON files are saved. Default: /tmp/agentank-runs/matches",
    "  --run-dir <path>            Where run logs are saved. Default: /tmp/agentank-runs/challenge-runs",
    "  --execute                   Send real AgentTank challenges. Without it, this is a dry run.",
    "",
    "Examples:",
    "  node lab/scripts/run-real-challenges.mjs --opponents 829,913 --maps random,arena --repeat 2",
    "  AGENTANK_SHIELD_KEY=<key> node lab/scripts/run-real-challenges.mjs --tank shield-main --opponents 829 --maps arena --repeat 5 --execute",
    "",
    "Real tank keys must come from environment variables. Never commit them.",
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  return readJsonResponse(url, response, options.method ?? "GET");
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

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log(usage());
  process.exit(0);
}

const execute = argv.includes("--execute");
const plan = buildChallengePlan({
  tanks: readOption(argv, "--tank", "all"),
  opponents: readOption(argv, "--opponents"),
  maps: readOption(argv, "--maps", "random"),
  repeat: readPositiveInteger(argv, "--repeat", 1),
  limit: readPositiveInteger(argv, "--limit", 20),
});

const sleepMs = readPositiveInteger(argv, "--sleep-ms", 5000);
const outputDir = readOption(argv, "--output-dir", "/tmp/agentank-runs/matches");
const runDir = readOption(argv, "--run-dir", "/tmp/agentank-runs/challenge-runs");
const run = {
  runId: safeTimestamp(),
  startedAt: new Date().toISOString(),
  execute,
  sleepMs,
  outputDir,
  planCount: plan.length,
  plan,
  results: [],
};

const runPath = await writeRunLog(runDir, run);
console.log(`Run log: ${runPath}`);
console.log(`Mode: ${execute ? "execute" : "dry-run"}`);
console.log(`Planned challenges: ${plan.length}`);

if (!execute) {
  for (const [index, item] of plan.entries()) {
    console.log(
      `${index + 1}. ${item.tankCodename} -> opponent ${item.opponentId} on ${item.mapId} round ${item.round}`,
    );
  }
  console.log("Add --execute to send real challenges.");
  process.exit(0);
}

for (const [index, item] of plan.entries()) {
  const key = process.env[item.envName];
  if (!key) {
    throw new Error(`Missing environment variable for ${item.tankCodename}: ${item.envName}`);
  }

  console.log(
    `${index + 1}/${plan.length}: ${item.tankCodename} -> opponent ${item.opponentId} on ${item.mapId}`,
  );
  const startedAt = new Date().toISOString();
  const response = await postChallenge(item, key);
  const matchId = extractMatchId(response);
  const replayPath = matchId ? await fetchAndStoreMatch(matchId, outputDir) : null;
  run.results.push({
    ...item,
    startedAt,
    finishedAt: new Date().toISOString(),
    matchId,
    replayPath,
    challengeResponse: response,
  });
  await writeRunLog(runDir, run);
  console.log(matchId ? `  saved ${replayPath}` : "  no match id found in response");

  if (index < plan.length - 1) {
    await sleep(sleepMs);
  }
}

run.finishedAt = new Date().toISOString();
await writeRunLog(runDir, run);
console.log(`Completed run: ${runPath}`);
