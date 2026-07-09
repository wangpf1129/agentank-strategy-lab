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

Live shield-main is codeVersion 61 at rankScore 1451, Diamond I. v60 diagnosis failed: user samples plus a bounded real run showed boost casts and boost turns were not converting into free-turn shots or star tempo. v61 is a clean boost-only behavior tree reset. It removes the old shield/boost mixed priority stack and only allows boost for aligned valuable star routes or explicit gunline creation.

## Protected Behaviors

- Visible bullet danger must be handled before clear shots, boost casts, or star movement.
- Close same-row or same-column gunlines must counterfire or exit before wandering.
- Adjacent safe stars must be collected before boost, pressure, or patrol actions.
- Boost must not be cast when the tank is not already facing a useful star or gunline route.
- Boost may be cast for an aligned valuable star route, but not for a close star that can be walked to.
- Active boost should create value through same-frame turn plus fire or go plus free turn toward a gunline.
- Boosted near-star control must avoid overshooting a one-step star.
- The shield-main candidate must stay boost-only and must not reintroduce shield-pressure branches.

## Verification

Before publishing, review code quality and strategy conflicts, then run syntax checks, focused shield-main tests, lab tests, simulation with `AGENTANK_SHIELD_KEY`, and shield-main challenge dry-run. Real challenges require explicit confirmation.
