#!/usr/bin/env node

import { readFile } from "node:fs/promises";

import {
  authHeaders,
  buildAgentApiUrl,
  readJsonResponse,
  sanitizeForStorage,
} from "./lib/agentank-api.mjs";

function usage() {
  return [
    "Usage:",
    "  node agentank/lab/scripts/publish-tank-code.mjs <code-path> <key-env-var> [notes]",
    "",
    "Examples:",
    "  AGENTANK_TELEPORT_KEY=<key> node agentank/lab/scripts/publish-tank-code.mjs agentank/teleport-main-v15-candidate.js AGENTANK_TELEPORT_KEY \"v15: star-race pressure gate\"",
  ].join("\n");
}

const codePath = process.argv[2];
const envName = process.argv[3];
const notes = process.argv[4] ?? "";

if (!codePath || !envName || process.argv.includes("--help") || process.argv.includes("-h")) {
  console.error(usage());
  process.exit(codePath && envName ? 0 : 1);
}

const key = process.env[envName];
if (!key) {
  throw new Error(`Missing environment variable: ${envName}`);
}

const code = await readFile(codePath, "utf8");
const response = await fetch(buildAgentApiUrl("/api/agent/tank/code"), {
  method: "POST",
  headers: {
    ...authHeaders(key),
    "content-type": "application/json",
  },
  body: JSON.stringify({
    code,
    submittedBy: "Codex",
    notes,
  }),
});

const payload = await readJsonResponse(buildAgentApiUrl("/api/agent/tank/code"), response, "POST");
console.log(JSON.stringify(sanitizeForStorage(payload), null, 2));
