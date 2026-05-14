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

## Planned Next Scripts

- Fetch recent own matches.
- Classify death causes in batches.
- Compare candidate versions.
- Generate map heat reports.
