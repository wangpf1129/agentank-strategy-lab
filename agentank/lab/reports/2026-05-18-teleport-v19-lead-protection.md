# Teleport v19 Lead Protection

Date: 2026-05-18

Tank: 山大王 / teleport-main / teleport skill

Status: v19 was published to AgentTank as code version 14.

## Why This Change

The diamond probe showed that v15 can climb through platinum, but it gives back points in higher-score random pools when 山大王 is already ahead and then dies:

- `mat_FKBbj6gKsIY3ENNSQ`: ahead 4-0, then died to cloak pressure from No.0.
- `mat_H56wpPnfhLK6efGEt`: ahead 3-1, then died after taking a star on a live horizontal firing lane from 王大帅.
- `mat_A9NoHqDI04N8kr9ky`: lost 2-5 by star tempo to Void Stalker.

The priority for this version is not more aggression. It is score protection: when already ahead by stars, stop volunteering for obvious lane deaths.

## Candidate History

`teleport-main-v16-candidate.js`

- Added broad lead-protection and fast-route star-race logic.
- Rejected: private training fell to 16 / 18, including 0-0 runtime losses.
- Lesson: extra strategy code can lose tied games through runtime.

`teleport-main-v17-candidate.js`

- Reduced v16 to a lighter lead-protection version.
- Rejected: private training improved to 17 / 18, but still lost a 0-0 runtime case.

`teleport-main-v18-candidate.js`

- Reduced further to reuse v15's existing threat functions.
- Rejected: private training was 17 / 18; it still failed a public-map-6 crash after collecting a star while ahead.
- Root cause: AgentTank did not reliably expose `me.stars` / `me.score` to candidate code, so the lead guard did not always activate.

`teleport-main-v19-candidate.js`

- Added lightweight internal star tracking by watching the previous star disappear and attributing it to the tank standing on that tile.
- Kept the v18 safety change small:
  - Avoid adjacent star pickup when that pickup creates a two-star lead but the star tile is in a bullet, quick-aim, one-step-aim, moving-aim, or hidden-lane trap.
  - When already ahead by at least two stars and no star is active, escape obvious current-lane danger instead of trading or drifting forward.
- Does not add the broad v16 fast-route logic.

## Verification

TDD policy tests were added for:

- `leadProtectionActive`
- `starRaceNeedsFastRoute`

Local checks:

```bash
node --check agentank/teleport-main-v19-candidate.js
node --test agentank/lab/scripts/tests/*.test.mjs
```

Result:

- v19 syntax check passed.
- 38 / 38 lab script tests passed.

Private simulation gates:

| Candidate | Run | Result | Notes |
| --- | --- | ---: | --- |
| v16 | `agentank/lab/data/simulations/2026-05-18T03-38-30-512Z` | 16 / 18 | rejected |
| v17 | `agentank/lab/data/simulations/2026-05-18T03-42-07-802Z` | 17 / 18 | rejected |
| v18 | `agentank/lab/data/simulations/2026-05-18T03-44-47-209Z` | 17 / 18 | rejected |
| v19 targeted regression | `agentank/lab/data/simulations/2026-05-18T03-47-26-307Z` | 1 / 1 | fixed the v18 public-map-6 crash point |
| v19 full gate | `agentank/lab/data/simulations/2026-05-18T03-47-46-730Z` | 18 / 18 | publishable |

Full gate map set:

- `classic`
- `arena`
- `public-map-6`
- `public-map-15`
- `public-map-16`
- `random`

Training bots:

- `nova-scout`
- `azure-hunter`
- `crimson-bastion`

## Publish

Published as AgentTank code version 14.

- Code hash: `aa83b51bea763fa66d1470e371fad60b9841d26f7a96557f9a344a7b1f1761e7`
- Rank score at publish snapshot: 1166
- Tier at publish snapshot: platinum I +66
- Public rank at publish snapshot: 449 / 1270

## Rollout Rule

Do not immediately random-queue a large batch after publishing.

Recommended next action:

1. Run one public match checkpoint.
2. Fetch rank score immediately.
3. If the match is a win, continue one at a time toward 1200.
4. If it is a crash loss, stop and inspect before another challenge.
5. If it is a star loss without death, one recovery attempt is acceptable.
