# Leaderboard Target Pool: 2026-05-14

Source snapshot:

- `agentank/lab/data/leaderboards/2026-05-14T08-42-37-724Z.json`

The first real-challenge batch should cover leaderboard strength and skill diversity. The goal is not only to farm wins; it is to expose the two primary tanks to the tactics most likely to break them.

## Selected Targets

| Priority | Rank | Tank id | Tank | Skill | ELO | Record | Why it matters |
| ---: | ---: | ---: | --- | --- | ---: | --- | --- |
| 1 | 14 | 70 | 🛡 | overload | 1591 | 1924-792-0 | Primary boss target; known overload wall/offset-shot threat. |
| 2 | 9 | 367 | bi bi la bu | teleport | 1522 | 635-244-0 | Strong teleport benchmark with high ELO and enough sample size. |
| 3 | 23 | 289 | ObjectA | cloak | 1464 | 321-157-0 | Strong cloak opponent; useful for partial-visibility failures. |
| 4 | 2 | 338 | keke | boost | 1281 | 5032-944-0 | Large sample, very high win rate, strong tempo pressure. |
| 5 | 6 | 829 | DDerek tank | boost | 1188 | 902-297-0 | Regression target from the first freeze-main improvement cycle. |
| 6 | 15 | 8 | DKAGENT | shield | 1539 | 518-223-0 | Strong shield benchmark; checks wasted shots and freeze timing. |
| 7 | 21 | 363 | #001 | overload | 1460 | 376-179-0 | Second overload benchmark; validates whether fixes overfit 🛡. |
| 8 | 42 | 876 | Yakir | cloak | 1224 | 298-171-0 | Known cloak-style opponent with enough history to compare. |
| 9 | 1 | 1021 | long2ice | cloak | 1232 | 5-0-0 | Current rank 1, but low sample; scout target, not primary proof. |
| 10 | 5 | 441 | Doklead | teleport | 1285 | 281-83-0 | Second teleport benchmark; helps avoid overfitting bi bi la bu. |

## Batch 001

Dry-run verified:

```bash
node agentank/lab/scripts/run-real-challenges.mjs \
  --opponents 70,367,289,338,829,8,363,876,1021,441 \
  --maps random,classic,arena,public-map-6 \
  --repeat 1 \
  --limit 80
```

Intentional execution command:

```bash
AGENTANK_FREEZE_KEY=<key> AGENTANK_TELEPORT_KEY=<key> \
node agentank/lab/scripts/run-real-challenges.mjs \
  --opponents 70,367,289,338,829,8,363,876,1021,441 \
  --maps random,classic,arena,public-map-6 \
  --repeat 1 \
  --limit 80 \
  --sleep-ms 5000 \
  --execute
```

This creates 80 real matches:

- 10 opponents
- 4 maps
- 2 primary tanks
- 1 repeat

## Reading The Results

After the batch completes, analyze from our tanks' perspective:

```bash
node agentank/lab/scripts/analyze-directory.mjs agentank/lab/data/matches challenger
```

Then split failures by:

- overload offset-shot deaths
- cloak/grass uncertainty deaths
- teleport post-cast straight-line deaths
- shield wasted-shot or wasted-freeze patterns
- boost tempo losses by stars

The next code change should target the largest repeated failure class, not the most memorable single loss.
