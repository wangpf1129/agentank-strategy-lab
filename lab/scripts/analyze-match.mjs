#!/usr/bin/env node

import { readFile } from "node:fs/promises";

import { analyzeMatch, renderMatchReport } from "./lib/match-analysis.mjs";

function usage() {
  return [
    "Usage:",
    "  node lab/scripts/analyze-match.mjs <match-json-path>",
  ].join("\n");
}

const filePath = process.argv[2];

if (!filePath) {
  console.error(usage());
  process.exit(1);
}

const raw = JSON.parse(await readFile(filePath, "utf8"));
const analysis = analyzeMatch(raw);

console.log(renderMatchReport(analysis));
