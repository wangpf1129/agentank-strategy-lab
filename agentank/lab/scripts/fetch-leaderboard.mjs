#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { AGENTANK_BASE_URL, authHeaders, safeTimestamp } from "./lib/agentank-api.mjs";

function usage() {
  return [
    "Usage:",
    "  AGENTANK_KEY=<key> node agentank/lab/scripts/fetch-leaderboard.mjs [output-dir]",
    "",
    "Environment:",
    "  AGENTANK_KEY is optional for public endpoints and required if AgentTank requires auth.",
    "  AGENTANK_LEADERBOARD_URL can override the default endpoint.",
  ].join("\n");
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(usage());
  process.exit(0);
}

const outputDir = process.argv[2] ?? "agentank/lab/data/leaderboards";
const url = process.env.AGENTANK_LEADERBOARD_URL ?? `${AGENTANK_BASE_URL}/api/agent/leaderboard`;
const response = await fetch(url, {
  headers: authHeaders(process.env.AGENTANK_KEY ?? ""),
});

if (!response.ok) {
  throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
}

const text = await response.text();
JSON.parse(text);

await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${safeTimestamp()}.json`);
await writeFile(outputPath, `${text.trim()}\n`, "utf8");

console.log(outputPath);
