# AgenTank Workbench Instructions

Default language: Chinese.

Read order for every task:

1. `active/CURRENT.md`
2. `docs/agentank-evolution-method.md`
3. `state/latest.json`
4. `state/avoid-list.json`
5. `state/cycle.md`
6. `active/teleport-main.js`

Do not read `archive/` unless the user gives a specific match id, run id, opponent id, or version id.

Do not patch multiple tactical ideas in one turn.

Before publishing or real challenge:

1. Run `npm run check`.
2. Run the focused test or `npm run test:lab`.
3. Run `npm run simulate` if credentials are available.
4. Run `npm run challenge:dry`.
5. Ask before `npm run challenge:run`.

Real challenges affect rank and records. Never execute them as a hidden verification step.
