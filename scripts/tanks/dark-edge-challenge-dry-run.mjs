import { spawnSync } from "node:child_process";

const args = [
  "lab/scripts/grind-adaptive-real.mjs",
  "--tank",
  "dark-edge",
  "--climb-policy",
  "--limit",
  "3",
  "--use-run-history",
  "--random-when-empty",
  "--output-dir",
  "/tmp/agentank-runs/dark-edge/matches",
  "--run-dir",
  "/tmp/agentank-runs/dark-edge/challenge-runs",
];

const result = spawnSync("node", args, { stdio: "inherit" });
process.exit(result.status ?? 1);
