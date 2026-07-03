# Scripts

These are reusable AgentTank tools. Prefer root `npm` scripts for normal work:

```bash
npm run check
npm run test:lab
npm run simulate
npm run challenge:dry
```

Use `npm run challenge:run` only after explicit confirmation. Real challenges affect rank and match records.

## Output Policy

Root wrappers write simulation and challenge outputs to `/tmp/agentank-runs/`.

Do not rebuild a raw data archive inside this repository. If a result matters, summarize it in `state/cycle.md` and keep only the match id or run id.

## Direct Tooling

Analyze one fetched match:

```bash
node lab/scripts/analyze-match.mjs /tmp/agentank-runs/matches/<match-id>.json
```

Fetch one public match when a match id is named:

```bash
node lab/scripts/fetch-match.mjs mat_abc123 /tmp/agentank-runs/matches
```

Run focused real challenge dry-run through the wrapper:

```bash
npm run challenge:dry
```

## Credential Rule

Do not hard-code tank keys. Use environment variables only.
