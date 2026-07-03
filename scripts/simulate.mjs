import { spawnSync } from "node:child_process";

const args = [
  "lab/scripts/simulate-candidates.mjs",
  "--tank",
  "shield-main",
  "--code",
  "shield-main=active/shield-main.js",
  "--opponents",
  "nova-scout,azure-hunter,crimson-bastion",
  "--maps",
  "classic,arena,random",
  "--repeat",
  "1",
  "--sleep-ms",
  "2200",
  "--output-root",
  "/tmp/agentank-runs/simulations",
];

const result = spawnSync("node", args, { stdio: "inherit" });
process.exit(result.status ?? 1);
