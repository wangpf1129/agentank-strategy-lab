import assert from "node:assert/strict";
import test from "node:test";

import {
  authHeaders,
  buildMatchUrl,
  parseMatchId,
  safeTimestamp,
} from "../lib/agentank-api.mjs";

test("parses match ids from ids, history URLs, and agent JSON URLs", () => {
  assert.equal(parseMatchId("mat_abc123"), "mat_abc123");
  assert.equal(parseMatchId("https://agentank.ai/history/mat_abc123"), "mat_abc123");
  assert.equal(
    parseMatchId("https://agentank.ai/api/matches/mat_abc123/agent.json"),
    "mat_abc123",
  );
});

test("builds public match replay URL", () => {
  assert.equal(
    buildMatchUrl("mat_abc123"),
    "https://agentank.ai/api/matches/mat_abc123/agent.json",
  );
});

test("builds safe timestamps for filenames", () => {
  assert.equal(safeTimestamp(new Date("2026-05-14T07:08:09.123Z")), "2026-05-14T07-08-09-123Z");
});

test("only includes auth header when a key is present", () => {
  assert.deepEqual(authHeaders(""), {});
  assert.deepEqual(authHeaders("abc"), { Authorization: "Bearer abc" });
});
