import { readFileSync } from "node:fs";
import path from "node:path";

function readText(root, relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(root, relativePath) {
  return JSON.parse(readText(root, relativePath));
}

export function markdownSection(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) return "";
  const level = heading.match(/^#+/)?.[0].length ?? 1;
  const out = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^(#+)\s/);
    if (match && match[1].length <= level) break;
    out.push(line);
  }
  return out.join("\n").trim();
}

function assertStringArray(value, name, errors) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    errors.push(`${name} must be a non-empty string array`);
  }
}

function assertOptionalStringArray(value, name, errors) {
  if (value === undefined) return;
  assertStringArray(value, name, errors);
}

export function validateTrainingSpace(root = process.cwd()) {
  const errors = [];
  const warnings = [];

  let space;
  try {
    space = readJson(root, "state/training-space.json");
  } catch (error) {
    return {
      errors: [`Could not read state/training-space.json: ${error.message}`],
      warnings,
      space: null,
    };
  }

  for (const key of ["activeTank", "candidateSource", "testFile", "referenceRepo"]) {
    if (typeof space[key] !== "string" || !space[key].trim()) {
      errors.push(`training-space.${key} is required`);
    }
  }
  assertStringArray(space.protectedBehaviors, "training-space.protectedBehaviors", errors);
  assertStringArray(space.driftRules, "training-space.driftRules", errors);
  assertStringArray(space.requiredDocPhrases, "training-space.requiredDocPhrases", errors);

  if (!Array.isArray(space.boundedAxes) || !space.boundedAxes.length) {
    errors.push("training-space.boundedAxes must contain at least one axis");
  } else {
    const ids = new Set();
    for (const [index, axis] of space.boundedAxes.entries()) {
      const prefix = `training-space.boundedAxes[${index}]`;
      if (!axis || typeof axis !== "object") {
        errors.push(`${prefix} must be an object`);
        continue;
      }
      if (typeof axis.id !== "string" || !axis.id.trim()) {
        errors.push(`${prefix}.id is required`);
      } else if (ids.has(axis.id)) {
        errors.push(`${prefix}.id duplicates ${axis.id}`);
      } else {
        ids.add(axis.id);
      }
      if (typeof axis.purpose !== "string" || !axis.purpose.trim()) {
        errors.push(`${prefix}.purpose is required`);
      }
      assertStringArray(axis.requiredTests, `${prefix}.requiredTests`, errors);
    }
  }

  const current = readText(root, "active/CURRENT.md");
  if (!current.includes(`Tank: ${space.activeTank}`)) {
    errors.push(`active/CURRENT.md must name Tank: ${space.activeTank}`);
  }
  if (!current.includes(`Candidate source: ${space.candidateSource}`)) {
    errors.push(`active/CURRENT.md must name Candidate source: ${space.candidateSource}`);
  }
  for (const behavior of space.protectedBehaviors ?? []) {
    if (!current.includes(behavior)) {
      errors.push(`active/CURRENT.md is missing protected behavior: ${behavior}`);
    }
  }

  const docs = readText(root, "docs/agentank-evolution-method.md");
  if (!docs.includes(space.referenceRepo)) {
    errors.push(`docs/agentank-evolution-method.md must reference ${space.referenceRepo}`);
  }
  for (const phrase of space.requiredDocPhrases ?? []) {
    if (!docs.includes(phrase)) {
      errors.push(`docs/agentank-evolution-method.md is missing required phrase: ${phrase}`);
    }
  }

  const cycle = readText(root, "state/cycle.md");
  const hypothesis = markdownSection(cycle, "## One Hypothesis");
  if (space.cycleGate?.oneHypothesisRequired && !hypothesis) {
    errors.push("state/cycle.md must include a non-empty ## One Hypothesis section");
  }
  const maxHypothesisCharacters = space.cycleGate?.maxHypothesisCharacters;
  if (Number.isInteger(maxHypothesisCharacters) && hypothesis.length > maxHypothesisCharacters) {
    errors.push(`state/cycle.md hypothesis is too broad (${hypothesis.length} > ${maxHypothesisCharacters} chars)`);
  }
  if (!cycle.includes(space.activeTank)) {
    errors.push(`state/cycle.md must mention active tank ${space.activeTank}`);
  }

  const tests = readText(root, space.testFile);
  const requiredTestPhrases = new Set();
  for (const axis of space.boundedAxes ?? []) {
    for (const phrase of axis.requiredTests ?? []) {
      requiredTestPhrases.add(phrase);
    }
  }
  for (const phrase of requiredTestPhrases) {
    if (!tests.includes(phrase)) {
      errors.push(`${space.testFile} is missing required test phrase: ${phrase}`);
    }
  }

  const packageJson = readJson(root, "package.json");
  const checkScript = packageJson.scripts?.check ?? "";
  if (!checkScript.includes("scripts/space-check.mjs")) {
    errors.push("package.json check script must run scripts/space-check.mjs");
  }

  if (space.reviewGate) {
    if (typeof space.reviewGate.scoreModule !== "string" || !space.reviewGate.scoreModule.trim()) {
      errors.push("training-space.reviewGate.scoreModule is required when reviewGate is set");
    } else {
      let scoreModule = "";
      try {
        scoreModule = readText(root, space.reviewGate.scoreModule);
      } catch (error) {
        errors.push(`Could not read ${space.reviewGate.scoreModule}: ${error.message}`);
      }
      for (const signal of space.reviewGate.requiredBehaviorSignals ?? []) {
        if (!scoreModule.includes(signal)) {
          errors.push(`${space.reviewGate.scoreModule} is missing review signal: ${signal}`);
        }
      }
    }

    assertOptionalStringArray(
      space.reviewGate.requiredReportSections,
      "training-space.reviewGate.requiredReportSections",
      errors,
    );
    assertOptionalStringArray(
      space.reviewGate.requiredBehaviorSignals,
      "training-space.reviewGate.requiredBehaviorSignals",
      errors,
    );
    assertOptionalStringArray(
      space.reviewGate.requiredPackageScripts,
      "training-space.reviewGate.requiredPackageScripts",
      errors,
    );

    const matchAnalysis = readText(root, "lab/scripts/lib/match-analysis.mjs");
    for (const section of space.reviewGate.requiredReportSections ?? []) {
      if (!matchAnalysis.includes(section)) {
        errors.push(`lab/scripts/lib/match-analysis.mjs is missing report section: ${section}`);
      }
    }
    for (const scriptName of space.reviewGate.requiredPackageScripts ?? []) {
      if (typeof packageJson.scripts?.[scriptName] !== "string") {
        errors.push(`package.json is missing review script: ${scriptName}`);
      }
    }
  }

  return { errors, warnings, space };
}
