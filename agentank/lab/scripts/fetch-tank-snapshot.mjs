#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  authHeaders,
  buildAgentApiUrl,
  readJsonResponse,
  sanitizeForStorage,
} from "./lib/agentank-api.mjs";

function usage() {
  return [
    "Usage:",
    "  node agentank/lab/scripts/fetch-tank-snapshot.mjs <codename> <key-env-var> [output-root]",
    "",
    "Examples:",
    "  AGENTANK_FREEZE_KEY=<key> node agentank/lab/scripts/fetch-tank-snapshot.mjs freeze-main AGENTANK_FREEZE_KEY",
    "  AGENTANK_TELEPORT_KEY=<key> node agentank/lab/scripts/fetch-tank-snapshot.mjs teleport-main AGENTANK_TELEPORT_KEY",
  ].join("\n");
}

async function fetchJson(url, key) {
  const response = await fetch(url, { headers: authHeaders(key) });
  return readJsonResponse(url, response);
}

const codename = process.argv[2];
const envName = process.argv[3];
const outputRoot = process.argv[4] ?? "agentank/lab/data/fleet";

if (!codename || !envName || process.argv.includes("--help") || process.argv.includes("-h")) {
  console.error(usage());
  process.exit(codename && envName ? 0 : 1);
}

const key = process.env[envName];
if (!key) {
  throw new Error(`Missing environment variable: ${envName}`);
}

const outputDir = path.join(outputRoot, codename);
await mkdir(outputDir, { recursive: true });

const tank = await fetchJson(buildAgentApiUrl("/api/agent/tank"), key);
const matches = await fetchJson(buildAgentApiUrl("/api/agent/tank/matches", { limit: 20, offset: 0 }), key);

const files = [
  ["tank.json", tank],
  ["matches.json", matches],
];

for (const [filename, value] of files) {
  const sanitized = sanitizeForStorage(value);
  const fullPath = path.join(outputDir, filename);
  await writeFile(fullPath, `${JSON.stringify(sanitized, null, 2)}\n`, "utf8");
  console.log(fullPath);
}
