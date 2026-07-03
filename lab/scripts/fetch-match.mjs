#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildMatchUrl, parseMatchId } from "./lib/agentank-api.mjs";

function usage() {
  return [
    "Usage:",
    "  node lab/scripts/fetch-match.mjs <match-id-or-url> [output-dir]",
    "",
    "Examples:",
    "  node lab/scripts/fetch-match.mjs mat_abc123",
    "  node lab/scripts/fetch-match.mjs https://agentank.ai/history/mat_abc123",
  ].join("\n");
}

const input = process.argv[2];
const outputDir = process.argv[3] ?? "/tmp/agentank-runs/matches";

if (!input) {
  console.error(usage());
  process.exit(1);
}

const matchId = parseMatchId(input);
const url = buildMatchUrl(matchId);
const response = await fetch(url);

if (!response.ok) {
  throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
}

const text = await response.text();
JSON.parse(text);

await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${matchId}.json`);
await writeFile(outputPath, `${text.trim()}\n`, "utf8");

console.log(outputPath);
