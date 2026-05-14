# Dual Tank Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect safe baseline data for `freeze-main` and `teleport-main` so future win-rate improvements start from evidence.

**Architecture:** Add a small authenticated fetch script that reads keys from environment variables, writes sanitized tank context and recent match data under `agentank/lab/data/fleet/`, then summarize the first baseline in a report. Keep real tank keys out of repository files.

**Tech Stack:** Node.js ESM, built-in `node:test`, built-in `fetch`, Markdown reports.

---

### Task 1: Safe Snapshot Helpers

**Files:**
- Modify: `agentank/lab/scripts/lib/agentank-api.mjs`
- Modify: `agentank/lab/scripts/tests/agentank-api.test.mjs`

- [x] Add tests for redacting sensitive keys from nested objects.
- [x] Add tests for AgentTank API URL construction.
- [x] Implement minimal helper functions.

### Task 2: Tank Snapshot CLI

**Files:**
- Create: `agentank/lab/scripts/fetch-tank-snapshot.mjs`
- Modify: `agentank/lab/scripts/README.md`

- [x] Read codename and environment variable name from CLI args.
- [x] Fetch `/api/agent/tank` and `/api/agent/tank/matches?limit=20&offset=0`.
- [x] Sanitize and save JSON files under `agentank/lab/data/fleet/<codename>/`.

### Task 3: Baseline Data

**Files:**
- Create: `agentank/lab/data/fleet/freeze-main/tank.json`
- Create: `agentank/lab/data/fleet/freeze-main/matches.json`
- Create: `agentank/lab/data/fleet/teleport-main/tank.json`
- Create: `agentank/lab/data/fleet/teleport-main/matches.json`

- [ ] Fetch both tank snapshots using local environment variables.
- [ ] Scan saved files for tank key prefixes before commit.

### Task 4: Baseline Report

**Files:**
- Create: `agentank/lab/reports/2026-05-14-dual-tank-baseline.md`

- [ ] Summarize current status, recent matches, and first experiments for both tanks.
- [ ] Separate freeze-main and teleport-main recommendations.

### Task 5: Verification And Sync

- [ ] Run Node tests.
- [ ] Check script syntax.
- [ ] Scan for tank key prefixes.
- [ ] Commit and push.

