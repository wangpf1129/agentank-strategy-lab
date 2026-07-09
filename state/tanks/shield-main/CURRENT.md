# Current Tank State

Tank: shield-main
Active source: active/shield-main.js
Baseline source: active/shield-main.js
Candidate source: active/shield-main.js
Strategy architecture: docs/shield-main-strategy-architecture.md

## Isolation

This workspace is currently scoped to tank 4839 `500`. Dark Edge state is parked under `state/tanks/dark-edge/` and should only be touched through explicit Dark Edge scripts or a separate Dark Edge session.

## Current Objective

Goal mode: train shield-main / tank 4839 `500` / boost toward a stable 2600-point phase. Follow the existing method in `docs/agentank-evolution-method.md`, `state/training-space.json`, and `state/cycle.md`: one clear axis per round, leaderboard boost replay reference, publish gates, bounded real challenges with stop-loss, and fast rollback when a candidate keeps drifting down.

## Current Hypothesis

Live shield-main is codeVersion 70 at rankScore 1551, Master III after a Champion I top-50 sample and publish. v70 keeps the v69 boost-frame economy and fixes one hazard axis from the top-50 losses: active enemy bullet danger now includes `game.visibleBullets`, and urgent bullet-lane exits can take the immediately executable safe step instead of being blocked by future reply-line caution.

## Protected Behaviors

- Visible bullet danger must be handled before clear shots, boost casts, or star movement.
- Current bullet danger should prefer an immediately executable go exit before turn-only escape.
- Long bullet lanes and reply-capable gunlines must force a safe line exit or an aimed trade before value movement.
- Star and fallback value movement must not step into a reply-capable gunline before the shot exists.
- Recently seen hidden enemy lanes must still count as reply-capable for short value movement.
- Recent enemy bullets must expose fixed grass or hidden shooter lanes before value movement.
- Bullet-lane exits must commit briefly to the selected perpendicular move instead of recalculating into turn oscillation.
- Current enemy bullet positions must count as occupied danger, not only future projected positions.
- Active enemy bullet danger must include visible bullets, not only enemy.bullet.
- Urgent bullet-lane exits may ignore future reply-line caution when the alternative is being hit by the active bullet.
- Same-frame close muzzle shots must force an immediately executable go exit or an already-aimed trade before turn-only actions.
- Close same-row or same-column gunlines must counterfire or exit before wandering.
- Distant one-turn gunlines should not steal an adjacent safe star before they are an immediate threat.
- Already aimed close reply lanes should counterfire before generic gunline exit.
- Adjacent safe stars must be collected before boost, pressure, or patrol actions.
- Opening far-star boost must wait a few frames for board observation unless the route is already proven valuable.
- Boost must not be cast when the tank is not already facing a useful star or gunline route.
- Boost may be cast for an aligned valuable star route, but not for a close star that can be walked to.
- Active boost should create value through same-frame turn plus fire, go plus free turn toward a gunline, free turn plus go toward a valuable star route, or go plus free turn plus fire into a back shot.
- Boosted near-star control must avoid overshooting a one-step star.
- The shield-main candidate must stay boost-only and must not reintroduce shield-pressure branches.

## Verification

Before publishing, review code quality and strategy conflicts, then run syntax checks, focused shield-main tests, lab tests, simulation with `AGENTANK_SHIELD_KEY`, and shield-main challenge dry-run. Real challenges require explicit confirmation. v70 gates passed focused shield-main tests 30/30, `npm run test:lab`, `npm run check`, `git diff --check`, server simulation 9/9 at `/tmp/agentank-runs/simulations/2026-07-09T11-38-37-005Z`, and shield-main dry-run `/tmp/agentank-runs/shield-main/challenge-runs/2026-07-09T11-39-08-976Z.json`. The top-50 Champion I real sample before the patch was 4W/11L, run score 1547 -> 1564, with repeated visible-bullet lane deaths; the v70 publish snapshot confirmed codeVersion 70, rankScore 1551, Master III, record 995-969-0, needsFix=false.
