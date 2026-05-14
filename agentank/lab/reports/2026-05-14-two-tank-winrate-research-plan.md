# Two-Tank Win-Rate Research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe this repository as a win-rate-first research and experiment lab for the user's freeze and teleport AgentTank bots.

**Architecture:** Keep tank secrets out of source control, register only public-safe tank metadata, and translate AI competition knowledge into AgentTank experiments. The repository should connect every knowledge card to concrete metrics, playbooks, and candidate-code directions.

**Tech Stack:** Markdown knowledge base, existing Node.js replay-analysis scripts, GitHub repository history.

---

### Task 1: Fleet Registry

**Files:**
- Create: `agentank/lab/fleet/README.md`
- Create: `agentank/lab/config/env.example`

- [x] Define the two primary tanks as first-class research targets.
- [x] Document environment variable names for keys.
- [x] Explicitly forbid committing tank keys.

### Task 2: Win-Rate Knowledge Base

**Files:**
- Create: `agentank/lab/knowledge/README.md`
- Create: `agentank/lab/knowledge/agentank-mechanics.md`
- Create: `agentank/lab/knowledge/win-rate-methods.md`

- [x] Capture AgentTank mechanics that can affect strategy.
- [x] Translate major AI competition ideas into AgentTank-specific methods.
- [x] Keep each method tied to experiments and candidate-code changes.

### Task 3: Core Knowledge Cards

**Files:**
- Create: `agentank/lab/knowledge/cards/self-play.md`
- Create: `agentank/lab/knowledge/cards/league-training.md`
- Create: `agentank/lab/knowledge/cards/exploiter-agents.md`
- Create: `agentank/lab/knowledge/cards/value-functions.md`
- Create: `agentank/lab/knowledge/cards/partial-observability.md`

- [x] Use a fixed template for every card.
- [x] End every card with AgentTank landing, experiment, code direction, success metric, and risk.

### Task 4: Playbooks

**Files:**
- Create: `agentank/lab/playbooks/README.md`
- Create: `agentank/lab/playbooks/dual-tank-roadmap.md`
- Create: `agentank/lab/playbooks/skill-matchups.md`
- Move or preserve existing notes under `agentank/lab/notes/`.

- [x] Define freeze tank and teleport tank roles.
- [x] Map opponent skills to expected counter-strategies.
- [x] Define the next experiments that should improve win rate.

### Task 5: Verification And Sync

**Files:**
- No new code changes required.

- [ ] Run Node tests.
- [ ] Check scripts syntax.
- [ ] Scan for tank key prefixes.
- [ ] Commit and push.

