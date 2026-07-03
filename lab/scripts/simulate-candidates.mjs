#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  authHeaders,
  buildAgentApiUrl,
  readJsonResponse,
  safeTimestamp,
  sanitizeForStorage,
} from "./lib/agentank-api.mjs";
import { parseList, resolveTankConfigs } from "./lib/challenge-plan.mjs";

function usage() {
  return [
    "Usage:",
    "  node lab/scripts/simulate-candidates.mjs --code <tank=path> [options]",
    "",
    "Options:",
    "  --tank <codename|all>       Tank to simulate: freeze-main, teleport-main, or all. Default: all",
    "  --code <tank=path>          Candidate code file. Repeat for multiple tanks.",
    "  --opponents <ids>           Comma-separated training bots. Default: nova-scout,azure-hunter,crimson-bastion",
    "  --maps <ids>                Comma-separated map ids. Default: classic,arena,public-map-6,random",
    "  --repeat <n>                Rounds per opponent/map/tank combination. Default: 1",
    "  --limit <n>                 Maximum simulations in this run. Default: all planned simulations",
    "  --sleep-ms <n>              Delay between simulations. Default: 2100",
    "  --output-root <path>        Output root. Default: /tmp/agentank-runs/simulations",
    "",
    "Examples:",
    "  AGENTANK_TELEPORT_KEY=<key> node lab/scripts/simulate-candidates.mjs --tank teleport-main --code teleport-main=active/teleport-main.js",
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

function readRepeatedOption(argv, name) {
  const values = [];
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === name) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${name}`);
      }
      values.push(value);
      index++;
    }
  }
  return values;
}

function readPositiveInteger(argv, name, defaultValue) {
  const value = readOption(argv, name, defaultValue);
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function optionalPositiveInteger(argv, name) {
  const value = readOption(argv, name);
  if (value === undefined) return Number.POSITIVE_INFINITY;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseCodeSpecs(values) {
  const specs = new Map();
  for (const value of values) {
    const splitAt = value.indexOf("=");
    if (splitAt <= 0 || splitAt === value.length - 1) {
      throw new Error(`Invalid --code value: ${value}. Expected tank=path.`);
    }
    specs.set(value.slice(0, splitAt), value.slice(splitAt + 1));
  }
  return specs;
}

function buildPlan({ tanks, opponents, maps, repeat, limit }) {
  const tankConfigs = resolveTankConfigs(tanks);
  const opponentIds = parseList(opponents, "opponents");
  const mapIds = parseList(maps, "maps");
  const plan = [];

  for (const round of Array.from({ length: repeat }, (_, index) => index + 1)) {
    for (const opponentId of opponentIds) {
      for (const mapId of mapIds) {
        for (const tank of tankConfigs) {
          plan.push({ ...tank, opponentId, mapId, round });
          if (plan.length >= limit) return plan;
        }
      }
    }
  }
  return plan;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  return readJsonResponse(url, response, options.method ?? "GET");
}

function resultBucket(result) {
  if (result?.winner === "me") return "wins";
  if (result?.winner && result.winner !== "draw") return "losses";
  return "draws";
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(usage());
    return;
  }

  const codeSpecs = parseCodeSpecs(readRepeatedOption(argv, "--code"));
  const tanks = readOption(argv, "--tank", "all");
  const opponents = readOption(argv, "--opponents", "nova-scout,azure-hunter,crimson-bastion");
  const maps = readOption(argv, "--maps", "classic,arena,public-map-6,random");
  const repeat = readPositiveInteger(argv, "--repeat", 1);
  const limit = optionalPositiveInteger(argv, "--limit");
  const sleepMs = readPositiveInteger(argv, "--sleep-ms", 2100);
  const outputRoot = readOption(argv, "--output-root", "/tmp/agentank-runs/simulations");

  const plan = buildPlan({ tanks, opponents, maps, repeat, limit });
  const runId = safeTimestamp();
  const outputDir = path.join(outputRoot, runId);
  await mkdir(outputDir, { recursive: true });

  const codeByTank = new Map();
  for (const tank of resolveTankConfigs(tanks)) {
    const codePath = codeSpecs.get(tank.codename);
    if (!codePath) throw new Error(`Missing --code for ${tank.codename}`);
    codeByTank.set(tank.codename, await readFile(codePath, "utf8"));
  }

  const run = {
    runId,
    startedAt: new Date().toISOString(),
    sleepMs,
    planCount: plan.length,
    plan,
    results: [],
    summary: {},
  };
  await writeFile(path.join(outputDir, "run.json"), `${JSON.stringify(sanitizeForStorage(run), null, 2)}\n`, "utf8");
  console.log(`Run dir: ${outputDir}`);
  console.log(`Planned simulations: ${plan.length}`);

  for (const [index, item] of plan.entries()) {
    const key = process.env[item.envName];
    if (!key) throw new Error(`Missing environment variable for ${item.codename}: ${item.envName}`);

    console.log(`${index + 1}/${plan.length}: ${item.codename} vs ${item.opponentId} on ${item.mapId}`);
    const response = await fetchJson(buildAgentApiUrl("/api/agent/tank/simulate"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(key),
      },
      body: JSON.stringify({
        opponentId: item.opponentId,
        mapId: item.mapId,
        code: codeByTank.get(item.codename),
      }),
    });

    const file = `${item.codename}-${item.opponentId}-${item.mapId}-r${item.round}.json`;
    await writeFile(path.join(outputDir, file), `${JSON.stringify(sanitizeForStorage(response), null, 2)}\n`, "utf8");
    run.results.push({ ...item, file, winner: response?.winner, resultReason: response?.resultReason });

    const bucket = resultBucket(response);
    run.summary[item.codename] ??= { wins: 0, losses: 0, draws: 0, total: 0 };
    run.summary[item.codename][bucket]++;
    run.summary[item.codename].total++;
    await writeFile(path.join(outputDir, "run.json"), `${JSON.stringify(sanitizeForStorage(run), null, 2)}\n`, "utf8");

    if (index < plan.length - 1) await sleep(sleepMs);
  }

  run.finishedAt = new Date().toISOString();
  await writeFile(path.join(outputDir, "run.json"), `${JSON.stringify(sanitizeForStorage(run), null, 2)}\n`, "utf8");
  console.log(JSON.stringify(run.summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
