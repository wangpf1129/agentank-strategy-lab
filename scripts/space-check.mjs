#!/usr/bin/env node
import { validateTrainingSpace } from "../lab/scripts/lib/training-space.mjs";

const result = validateTrainingSpace(process.cwd());

if (result.errors.length) {
  console.error("Training space check failed:");
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}

for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
console.log(`Training space OK: ${result.space.activeTank} / ${result.space.method?.name ?? "bounded evolution"}`);
