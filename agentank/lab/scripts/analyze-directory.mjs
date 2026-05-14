#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { analyzeMatch, renderBatchReport } from "./lib/match-analysis.mjs";

function usage() {
  return [
    "Usage:",
    "  node agentank/lab/scripts/analyze-directory.mjs [match-dir] [perspective-role]",
    "",
    "Examples:",
    "  node agentank/lab/scripts/analyze-directory.mjs",
    "  node agentank/lab/scripts/analyze-directory.mjs agentank/lab/data/matches defender",
  ].join("\n");
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(usage());
  process.exit(0);
}

const directory = process.argv[2] ?? "agentank/lab/data/matches";
const perspectiveRole = process.argv[3] ?? "challenger";
const files = (await readdir(directory))
  .filter((file) => file.endsWith(".json"))
  .sort();

const analyses = [];

for (const file of files) {
  const fullPath = path.join(directory, file);
  const raw = JSON.parse(await readFile(fullPath, "utf8"));
  analyses.push(analyzeMatch(raw));
}

console.log(renderBatchReport(analyses, perspectiveRole));
