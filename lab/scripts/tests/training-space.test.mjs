import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { markdownSection, validateTrainingSpace } from "../lib/training-space.mjs";

function write(root, relativePath, contents) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function createFixture(overrides = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "agentank-space-"));
  const space = {
    version: 1,
    activeTank: "shield-main",
    candidateSource: "active/shield-main.js",
    testFile: "lab/scripts/tests/shield-main-strategy.test.mjs",
    referenceRepo: "https://github.com/tylearymf/agentank-evolution-lab",
    method: { name: "real-review bounded evolution" },
    boundedAxes: [
      {
        id: "hazard-first",
        purpose: "Keep fatal risk first.",
        requiredTests: ["future bullet danger"],
      },
    ],
    protectedBehaviors: ["Do not skip safe immediate star pickup."],
    cycleGate: { oneHypothesisRequired: true, maxHypothesisCharacters: 120 },
    driftRules: ["Do not add match-id-only patches."],
    requiredDocPhrases: ["勇敢基准", "硬约束", "目标池", "回滚"],
    ...overrides.space,
  };

  write(root, "state/training-space.json", JSON.stringify(space, null, 2));
  write(root, "active/CURRENT.md", overrides.current ?? [
    "# Current Tank State",
    "",
    "Tank: shield-main",
    "Candidate source: active/shield-main.js",
    "",
    "## Protected Behaviors",
    "",
    "- Do not skip safe immediate star pickup.",
  ].join("\n"));
  write(root, "docs/agentank-evolution-method.md", overrides.docs ??
    "Source reference: https://github.com/tylearymf/agentank-evolution-lab\n\n勇敢基准 硬约束 目标池 回滚\n");
  write(root, "state/cycle.md", overrides.cycle ?? [
    "# Current Cycle",
    "",
    "## One Hypothesis",
    "",
    "shield-main keeps hazard-first movement without losing star tempo.",
    "",
    "## Next Action",
    "",
    "Run checks.",
  ].join("\n"));
  write(root, "lab/scripts/tests/shield-main-strategy.test.mjs", overrides.tests ??
    "test('shield-main handles future bullet danger before taking a clear shot', () => {});\n");
  write(root, "package.json", JSON.stringify({
    scripts: {
      check: "node --check active/shield-main.js && node scripts/space-check.mjs",
    },
  }, null, 2));
  return root;
}

test("extracts a markdown section by heading", () => {
  const markdown = [
    "# Doc",
    "",
    "## One Hypothesis",
    "",
    "Only this text.",
    "",
    "## Next Action",
    "",
    "Skip.",
  ].join("\n");

  assert.equal(markdownSection(markdown, "## One Hypothesis"), "Only this text.");
});

test("validates the training space contract", () => {
  const root = createFixture();
  const result = validateTrainingSpace(root);

  assert.deepEqual(result.errors, []);
  assert.equal(result.space.activeTank, "shield-main");
});

test("fails when required regression coverage is missing", () => {
  const root = createFixture({ tests: "test('unrelated behavior', () => {});\n" });
  const result = validateTrainingSpace(root);

  assert.ok(result.errors.some((error) => error.includes("future bullet danger")));
});

test("fails when package check does not include the space gate", () => {
  const root = createFixture();
  write(root, "package.json", JSON.stringify({ scripts: { check: "node --check active/shield-main.js" } }, null, 2));

  const result = validateTrainingSpace(root);

  assert.ok(result.errors.some((error) => error.includes("space-check")));
});

test("validates review gate scripts and report sections", () => {
  const root = createFixture({
    space: {
      reviewGate: {
        scoreModule: "lab/scripts/lib/behavior-score.mjs",
        requiredPackageScripts: ["review:match", "review:batch"],
        requiredReportSections: ["## Behavior Score", "## Preserve"],
        requiredBehaviorSignals: ["fix-bullet-death"],
      },
    },
  });
  write(root, "lab/scripts/lib/behavior-score.mjs", "const id = 'fix-bullet-death';\n");
  write(root, "lab/scripts/lib/match-analysis.mjs", [
    "const report = [",
    "  '## Behavior Score',",
    "  '## Preserve',",
    "];",
  ].join("\n"));
  write(root, "package.json", JSON.stringify({
    scripts: {
      check: "node scripts/space-check.mjs",
      "review:match": "node lab/scripts/analyze-match.mjs",
      "review:batch": "node lab/scripts/analyze-directory.mjs",
    },
  }, null, 2));

  const result = validateTrainingSpace(root);

  assert.deepEqual(result.errors, []);
});

test("fails review gate when a package review script is missing", () => {
  const root = createFixture({
    space: {
      reviewGate: {
        scoreModule: "lab/scripts/lib/behavior-score.mjs",
        requiredPackageScripts: ["review:match"],
        requiredReportSections: ["## Behavior Score"],
        requiredBehaviorSignals: ["fix-bullet-death"],
      },
    },
  });
  write(root, "lab/scripts/lib/behavior-score.mjs", "const id = 'fix-bullet-death';\n");
  write(root, "lab/scripts/lib/match-analysis.mjs", "const section = '## Behavior Score';\n");

  const result = validateTrainingSpace(root);

  assert.ok(result.errors.some((error) => error.includes("review:match")));
});
