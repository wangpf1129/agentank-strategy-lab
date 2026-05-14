# AgentTank Experiment Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first reusable local experiment harness for AgentTank replay review and future strategy iteration.

**Architecture:** Keep raw data, reusable analysis logic, and command-line entry points separated under `agentank/lab`. The first phase focuses on offline match replay classification, because it can be tested deterministically before adding authenticated API workflows.

**Tech Stack:** Node.js ESM, built-in `node:test`, built-in `fetch`, Markdown reports.

---

### Task 1: Match Analysis Core

**Files:**
- Create: `agentank/lab/scripts/lib/match-analysis.mjs`
- Create: `agentank/lab/scripts/tests/match-analysis.test.mjs`

- [ ] **Step 1: Write failing tests**

Create tests for:
- timeline frame extraction from common replay shapes
- star score extraction
- final result classification
- death-cause classification for bullet crashes, star wins, and runtime games

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test agentank/lab/scripts/tests/match-analysis.test.mjs`

Expected: FAIL because `match-analysis.mjs` does not exist yet.

- [ ] **Step 3: Implement minimal analysis core**

Export pure functions:
- `normalizeMatch(raw)`
- `analyzeMatch(raw)`
- `classifyOutcome(match)`
- `summarizeTimeline(match)`

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test agentank/lab/scripts/tests/match-analysis.test.mjs`

Expected: PASS.

### Task 2: Local Match Review CLI

**Files:**
- Create: `agentank/lab/scripts/analyze-match.mjs`

- [ ] **Step 1: Add a CLI that reads one replay JSON file**

Run: `node agentank/lab/scripts/analyze-match.mjs agentank/lab/data/matches/example.json`

Expected: Prints a Markdown-style summary with result, scores, frames, and likely cause.

- [ ] **Step 2: Validate CLI against a fixture**

Use a small local fixture under `/tmp` so no raw match data has to be committed.

### Task 3: API Fetch Helpers

**Files:**
- Create: `agentank/lab/scripts/fetch-match.mjs`
- Create: `agentank/lab/scripts/fetch-leaderboard.mjs`

- [ ] **Step 1: Add public match fetch**

Fetch `https://agentank.ai/api/matches/<matchId>/agent.json` and save it under `agentank/lab/data/matches/<matchId>.json`.

- [ ] **Step 2: Add leaderboard snapshot fetch**

Fetch leaderboard data and save it under `agentank/lab/data/leaderboards/<timestamp>.json`.

- [ ] **Step 3: Keep credentials out of files**

Authenticated requests read `AGENTANK_KEY` from the environment. No tank key is written to this repository.

### Task 4: Documentation

**Files:**
- Modify: `agentank/lab/scripts/README.md`
- Modify: `agentank/lab/README.md`

- [ ] **Step 1: Document commands**

Document how to run tests, analyze a match, fetch a match, and fetch leaderboard snapshots.

- [ ] **Step 2: Document experiment loop**

Show the local loop: fetch replay -> analyze -> write experiment note -> patch candidate -> verify.

### Task 5: Verification and Sync

**Files:**
- No new files.

- [ ] **Step 1: Run tests**

Run: `node --test agentank/lab/scripts/tests/*.test.mjs`

- [ ] **Step 2: Run syntax checks**

Run: `for f in agentank/lab/scripts/*.mjs agentank/lab/scripts/lib/*.mjs; do node --check "$f"; done`

- [ ] **Step 3: Scan for secrets**

Run a secret scan for tank key prefixes and common credential words before committing.

Expected: no tank key; only safe documentation words may appear.

- [ ] **Step 4: Commit and push**

Commit message: `add experiment harness`
