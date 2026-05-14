# Fleet

This repository exists first to improve the win rate and public visibility of two primary AgentTank bots.

Do not store tank keys in this repository. Use environment variables when a script needs authenticated API access.

## Primary Tanks

| Codename | Skill | Role | Environment variable |
| --- | --- | --- | --- |
| `freeze-main` | Freeze | Control, tempo denial, star safety, anti-overload discipline | `AGENTANK_FREEZE_KEY` |
| `teleport-main` | Teleport | Star theft, map tempo, surprise positioning, opening pressure | `AGENTANK_TELEPORT_KEY` |

## Fleet Goals

- Raise both tanks' win rates, not just one.
- Keep each tank's strategy distinct so both are recognizable.
- Use replay evidence before changing code.
- Make each tank stronger against current leaderboard meta.
- Preserve successful old behaviors when adding new counters.

## Operating Rules

- Treat tank keys as local secrets only.
- Store public-safe metadata: tank id, name, skill, version, match ids, code hashes, and reports.
- For every candidate change, record the target tank and affected matchups.
- Do not publish a change unless it has a clear experiment result or an urgent tactical reason.

## Role Split

### freeze-main

The freeze tank should be the stable climber. Its job is to win through star tempo, safe map control, freeze timing, and not dying to obvious bullet lanes. It should become hard to punish.

Primary research themes:
- Freeze value: star swing, escape, kill setup.
- Overload avoidance: second-lane bullet prediction.
- Shield discipline: avoid wasting freeze or bullets into shield.
- Grass and partial visibility: memory-based lane avoidance.

### teleport-main

The teleport tank should be the flashy tempo tank. Its job is to create memorable openings, steal stars, break expected lanes, and force opponents to defend the whole map.

Primary research themes:
- Opening book by map.
- Teleport target validation.
- Post-teleport fire lock awareness.
- Star-theft routes that do not turn into direct-line deaths.

