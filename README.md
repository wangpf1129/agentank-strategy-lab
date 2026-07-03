# AgenTank Lean Workbench

This repo is for fast AgentTank iteration with a small active workspace and bounded strategy changes.

It stores:

- Active tank source files.
- Current training state and cycle notes.
- Replay review and behavior-scoring scripts.
- Simulation, dry-run, publish, and bounded real-challenge helpers.
- Focused regression tests for protected behavior.

Do not commit tank keys or API tokens. Use environment variables for authenticated API calls.

Read in this order:

1. `active/CURRENT.md`
2. `docs/agentank-evolution-method.md`
3. `state/training-space.json`
4. `state/latest.json`
5. `state/avoid-list.json`
6. `state/cycle.md`
7. `active/shield-main.js`
8. `active/teleport-main.js`

Before publishing or running a real challenge:

1. `npm run check`
2. Focused strategy test or `npm run test:lab`
3. `npm run simulate` when credentials are available
4. `npm run challenge:dry`
5. Ask before `npm run challenge:run`

Do not read raw replay folders unless a match id is named.
Do not patch archived versions directly.
Do not run real challenges without an explicit execute decision.
