# AgentTank Lab

This directory keeps the research trail for AgentTank strategy work.

Primary objective: improve the ladder score, tier, public rank, and visibility of the user's two main tanks:
- `freeze-main`: freeze skill, control and tempo denial.
- `teleport-main`: teleport skill, star theft and map tempo.

Goals:
- Preserve match evidence before changing code.
- Compare strategy versions with repeatable experiments.
- Separate map control, star racing, firing, dodging, and skill timing.
- Keep opponent-specific findings in one place.
- Translate AI competition methods into concrete AgentTank experiments.

Rules:
- Do not store tank keys here. Use environment variables or local shell history for API auth.
- Every strategy change should start from a hypothesis and end with measured results.
- Use match wins, losses, star scores, kills, and runtime as diagnostics. The primary public metric is ladder movement: `rankScore`, tier/division/points, and public rank.
- Prefer many small experiments over one large mixed change.
- Keep published tank source files in `../`; keep analysis, data, and reports here.

Suggested workflow:
1. Save raw match JSON under `data/matches/`.
2. Record leaderboard snapshots under `data/leaderboards/`.
3. Extract or describe map layouts under `data/maps/`.
4. Write one experiment note from `templates/experiment.md`.
5. Run simulations or real challenges.
6. Summarize results under `reports/`.
7. Only then decide whether to patch the tank.

First commands:

```bash
node --test agentank/lab/scripts/tests/*.test.mjs
node agentank/lab/scripts/fetch-match.mjs mat_3hWOW9k5vPJKoS5Ea
node agentank/lab/scripts/analyze-match.mjs agentank/lab/data/matches/mat_3hWOW9k5vPJKoS5Ea.json
```

Key sections:
- `fleet/`: primary tank roles and safe environment variable names.
- `knowledge/`: ladder-score-focused game AI ideas translated to AgentTank.
- `playbooks/`: practical matchup and two-tank roadmap.
- `scripts/`: replay and leaderboard tooling.
