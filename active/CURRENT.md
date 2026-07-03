# Current Tank State

Tank: teleport-main
Active source: active/teleport-main.js
Baseline source: archive/tanks/teleport-main-v26-candidate.js
Candidate source: active/teleport-main.js

## Current Objective

Recover fast ladder iteration with a small active context and the method from `docs/agentank-evolution-method.md`.

## Current Hypothesis

Post-star close-quarter escape and adjacent lane denial are the next strategy bottleneck.

## Protected Behaviors

- Do not skip safe immediate star pickup.
- Do not step deeper into adjacent firing lane.
- Do not take distant grass trap when overload can win the star first.
- Do not fire while enemy bullet crosses current tile.

## Verification

Run local syntax and focused tests before any publish or real challenge.
