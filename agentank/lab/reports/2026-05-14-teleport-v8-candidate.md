# Teleport v8 Candidate

Date: 2026-05-14

Status: candidate only, not published.

## Goal

Reduce the two crash patterns found during the 山大王 master push:

1. Same-line reciprocal fire where the enemy bullet reaches our tile before our bullet can hit.
2. Post-teleport star pickup followed by staying on an enemy firing lane.

## Code

Candidate file: `agentank/teleport-main-v8-candidate.js`

Base: `agentank/teleport-main-v7-candidate.js`, which corresponds to the current published AgentTank code version 5.

Changes:
- Track a short post-teleport window after every successful `me.teleport(...)` call.
- Treat the current tile as unsafe during that window if the enemy can form a long one-turn line shot.
- Block firing back when a visible enemy bullet will reach our tile no later than our reciprocal shot would hit.

## Tests

Local verification:

```bash
node --test agentank/lab/scripts/tests/*.test.mjs
node --check agentank/teleport-main-v8-candidate.js
rg -n "agtk_[0-9A-Za-z]{24,}" README.md agentank
git diff --check
```

Result:
- 35 / 35 script tests passed.
- Candidate syntax check passed.
- No tank keys found.
- Diff whitespace check passed.

## Simulation Status

An initial broader v8 version was too conservative and dropped training performance:

- Run: `agentank/lab/data/simulations/2026-05-14T11-00-12-032Z`
- Result: 9 / 12
- Losses:
  - nova-scout on public-map-6.
  - azure-hunter on classic.
  - crimson-bastion on random.

The candidate was then narrowed:
- Do not ban future path cells during the whole post-teleport window.
- Only trigger the new post-teleport escape when the current tile is already a lane trap.

The narrowed version still needs a fresh private training simulation before publish. The API simulation step was not completed in this run because the Codex environment hit its usage limit while requesting network execution.

## Publish Gate

Do not publish v8 until all of these are true:

- Private training simulation is at least 12 / 12 on nova-scout, azure-hunter, and crimson-bastion across classic, arena, public-map-6, and random.
- The candidate does not reintroduce broad star avoidance from the unpublished v6.
- If published, the first public batch must be capped at two matches:
  - `1004`: random, arena.
  - No classic against `1004`.

## Next Command

When network execution is available:

```bash
AGENTANK_TELEPORT_KEY=<key> node agentank/lab/scripts/simulate-candidates.mjs \
  --tank teleport-main \
  --code teleport-main=agentank/teleport-main-v8-candidate.js \
  --maps classic,arena,public-map-6,random \
  --repeat 1 \
  --sleep-ms 1200
```
