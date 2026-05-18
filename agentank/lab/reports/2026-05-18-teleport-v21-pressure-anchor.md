# Teleport v21 Pressure Anchor

Date: 2026-05-18

Tank: 山大王 / `teleport-main` / teleport skill

## Trigger Match

User-provided replay:

- `mat_4nSiFBdnWZB7pdV7B`
- Opponent: `eihei` / boost
- Result: loss by crash
- Score line: 2-1
- Deciding frame: 65

## Root Cause

山大王 was not just "letting stars go"; the bigger issue was that star pursuit overrode positional safety whenever a new star existed.

Frame sequence:

- Frame 42: teleport to `[1,6]` to contest the star at `[3,6]`.
- Frame 44: collect the star and lead 2-1.
- Frame 54: next star appears at `[16,2]`, far right/top.
- Frames 55-65: 山大王 walks toward that star through row 2.
- Frame 61: eihei fires horizontally from the left side.
- Frame 65: 山大王 steps to `[11,2]` and crashes into the bullet.

v20 protected +1 leads against boost threats only when no star existed. Once a star spawned, the tank returned to pure star routing.

## v21 Change

Patch: `agentank/teleport-main-v21-candidate.js`

Behavior changes:

- Adds a boost lead lane trap detector.
- Treats star routes through a boost tank's long firing lane as unsafe when 山大王 already leads.
- If a risky star route is detected, prefer:
  - direct shot if available,
  - safe pressure anchor between current position and the star,
  - turning toward the enemy instead of blindly walking into the star lane.

This is meant to make 山大王 more active: when the star is enemy-side bait, it should hold a better map position or pressure the enemy rather than simply wait or walk into danger.

## Verification

Commands:

```bash
node --test agentank/lab/scripts/tests/*.test.mjs
node --check agentank/teleport-main-v21-candidate.js
node --check agentank/lab/scripts/publish-tank-code.mjs
```

Results:

- Unit/script tests: 40 / 40 passing
- Syntax checks: passing
- Training matrix: 18 / 18 wins
- Training run: `agentank/lab/data/simulations/2026-05-18T04-49-50-455Z/run.json`

Published:

- Code version: 16
- Code hash: `05e49da13609a119852885b6ef6bdcf278b17de96e7d6037ac4f9304dcf64907`
- Published score snapshot: 1159, platinum I +59

## Public Validation

Post-publish validation against the same opponent type:

| Match | Opponent | Map | Result | Score | Rank score |
| --- | --- | --- | --- | --- | ---: |
| `mat_94aryz9ChO4IVAGJK` | eihei / boost | random | win by stars | 3-0 | 1159 -> 1180 |

Final refreshed state:

- Rank score: 1180
- Tier: platinum I +80
- Public rank: 441 / 1272
- Record: 236 wins, 205 losses
- Published code: v21, code version 16

## Next Rule

Stop here rather than forcing random battles. 山大王 is 20 points from diamond, and the next match should be selected deliberately.

Preferred next step:

- Search current targets around 1180-1210.
- Avoid cloak targets unless necessary.
- Prefer boost targets only if their current score is close enough and the v21 pressure-anchor behavior remains positive.
