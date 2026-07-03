# AgentTank Tooling

This directory now only contains reusable scripts and tests.

Default strategy context lives outside this directory:

1. `active/CURRENT.md`
2. `docs/agentank-evolution-method.md`
3. `state/training-space.json`
4. `state/cycle.md`
5. `active/shield-main.js`

Do not rebuild a large local experiment archive here. Simulation and challenge outputs should go to `/tmp/agentank-runs/` unless a specific result needs to be promoted into a short state note.

Rules:

- Do not store tank keys in the repo.
- Do not run real challenges without explicit confirmation.
- Do not read old data by default.
- Keep `lab/scripts/` as tooling, not as the primary reasoning surface.
