# Scripts

Helper scripts for repeatable AgentTank experiments.

## Test

```bash
node --test agentank/lab/scripts/tests/*.test.mjs
```

## Analyze A Match

```bash
node agentank/lab/scripts/analyze-match.mjs agentank/lab/data/matches/mat_example.json
```

The output is a compact Markdown review with result type, score, deciding frame, skill casts, and star collections.

## Analyze A Directory

```bash
node agentank/lab/scripts/analyze-directory.mjs
node agentank/lab/scripts/analyze-directory.mjs agentank/lab/data/matches defender
```

The output aggregates win rate, result categories, maps, and opponents. Use `challenger` or `defender` depending on which side your tank played.

## Fetch A Public Match

```bash
node agentank/lab/scripts/fetch-match.mjs mat_abc123
node agentank/lab/scripts/fetch-match.mjs https://agentank.ai/history/mat_abc123
```

Files are saved to `agentank/lab/data/matches/` by default.

## Fetch Leaderboard Snapshot

```bash
AGENTANK_KEY=<key> node agentank/lab/scripts/fetch-leaderboard.mjs
```

Files are saved to `agentank/lab/data/leaderboards/` by default.

Do not hard-code tank keys in scripts. Read credentials from environment variables.

## Fetch Tank Snapshot

```bash
AGENTANK_FREEZE_KEY=<key> node agentank/lab/scripts/fetch-tank-snapshot.mjs freeze-main AGENTANK_FREEZE_KEY
AGENTANK_TELEPORT_KEY=<key> node agentank/lab/scripts/fetch-tank-snapshot.mjs teleport-main AGENTANK_TELEPORT_KEY
```

Files are saved under `agentank/lab/data/fleet/<codename>/` by default:
- `tank.json`
- `matches.json`

Responses are sanitized before storage. Real tank keys must still stay outside the repository.

## Simulate Candidate Code

Use this before publishing. It sends private simulations with candidate code and stores sanitized replay JSON under `agentank/lab/data/simulations/<run-id>/`.

```bash
AGENTANK_FREEZE_KEY=<key> AGENTANK_TELEPORT_KEY=<key> \
  node agentank/lab/scripts/simulate-candidates.mjs \
  --code freeze-main=agentank/tank-captain-freeze-control-v7-candidate.js \
  --code teleport-main=agentank/teleport-main-v6-candidate.js
```

## Run Real Challenge Batches

Use this for controlled public match sampling after a candidate is published. Real challenges affect public records and ELO, so the script defaults to dry-run. Add `--execute` only when the opponent list, maps, repeat count, and limit are intentional.

```bash
node agentank/lab/scripts/run-real-challenges.mjs --opponents 829,913 --maps random,arena --repeat 2
AGENTANK_FREEZE_KEY=<key> AGENTANK_TELEPORT_KEY=<key> node agentank/lab/scripts/run-real-challenges.mjs --opponents 829,913 --maps random,arena --repeat 2 --limit 20 --execute
```

Useful patterns:

- Start with `--limit 20` or `--limit 40`, then analyze before scaling further.
- Use `--tank freeze-main` or `--tank teleport-main` when testing a tank-specific counter.
- Keep `--sleep-ms` at several seconds or higher to avoid hammering the API.

Run logs are saved under `agentank/lab/data/challenge-runs/`. Replay files are saved under `agentank/lab/data/matches/`.

## Planned Next Scripts

- Classify death causes in batches.
- Compare candidate versions.
- Generate map heat reports.
