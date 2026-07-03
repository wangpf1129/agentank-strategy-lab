import { readFile } from "node:fs/promises";

import {
  authHeaders,
  buildAgentApiUrl,
  readJsonResponse,
} from "../lab/scripts/lib/agentank-api.mjs";
import { PRIMARY_TANKS } from "../lab/scripts/lib/challenge-plan.mjs";

function usage() {
  return [
    "Usage:",
    "  node scripts/publish-code.mjs --tank <codename> --code <path> --notes <text> [--branch main]",
    "",
    "Keys are read from the tank's configured environment variable.",
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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  return readJsonResponse(url, response, options.method ?? "GET");
}

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log(usage());
  process.exit(0);
}

const tankCodename = readOption(argv, "--tank", "shield-main");
const tank = PRIMARY_TANKS[tankCodename];
if (!tank) throw new Error(`Unknown tank codename: ${tankCodename}`);

const codePath = readOption(argv, "--code", `active/${tankCodename}.js`);
const notes = readOption(argv, "--notes", "Codex strategy update");
const branch = readOption(argv, "--branch", "main");
const key = process.env[tank.envName];
if (!key) throw new Error(`Missing environment variable for ${tank.codename}: ${tank.envName}`);

const code = await readFile(codePath, "utf8");
const payload = await fetchJson(buildAgentApiUrl("/api/agent/tank/code"), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...authHeaders(key),
  },
  body: JSON.stringify({
    code,
    notes,
    submittedBy: "Codex",
    branch,
  }),
});

const version = typeof payload?.version === "number"
  ? payload.version
  : payload?.version?.version ?? payload?.codeVersion ?? payload?.tank?.codeVersion ?? null;
const codeHash = payload?.codeHash ?? payload?.version?.codeHash ?? payload?.tank?.codeHash ?? null;

console.log(JSON.stringify({
  tank: tank.codename,
  branch,
  version,
  codeHash,
}, null, 2));
