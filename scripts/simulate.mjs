import { spawnSync } from "node:child_process";

const args = [
  "lab/scripts/simulate-candidates.mjs",
  "--tank",
  "teleport-main",
  "--code",
  "teleport-main=active/teleport-main.js",
  "--opponents",
  "nova-scout,azure-hunter,crimson-bastion",
  "--maps",
  "classic,arena,public-map-6,random",
  "--repeat",
  "1",
  "--sleep-ms",
  "2200",
  "--output-root",
  "/tmp/agentank-runs/simulations",
];

const result = spawnSync("node", args, { stdio: "inherit" });
process.exit(result.status ?? 1);
