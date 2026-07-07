import { spawnSync } from "node:child_process";

const args = [
  "lab/scripts/grind-adaptive-real.mjs",
  "--tank",
  "shield-main",
  "--climb-policy",
  "--limit",
  "3",
  "--use-run-history",
  "--random-when-empty",
  "--output-dir",
  "/tmp/agentank-runs/shield-main/matches",
  "--run-dir",
  "/tmp/agentank-runs/shield-main/challenge-runs",
  "--execute",
];

const result = spawnSync("node", args, { stdio: "inherit" });
process.exit(result.status ?? 1);
