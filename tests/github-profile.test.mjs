import assert from "node:assert/strict";
import test from "node:test";

import { formatGithubError, isAdminTokenDenied } from "../sync/update-github-profile.mjs";

test("admin token denials are 401 and 403", () => {
  assert.equal(isAdminTokenDenied(401), true);
  assert.equal(isAdminTokenDenied(403), true);
  assert.equal(isAdminTokenDenied(200), false);
  assert.equal(isAdminTokenDenied(422), false);
});

test("GitHub error formatter uses message JSON only", () => {
  assert.equal(
    formatGithubError(403, '{"message":"Resource not accessible by personal access token"}'),
    "HTTP 403: Resource not accessible by personal access token",
  );
  assert.equal(formatGithubError(500, "not-json"), "HTTP 500");
});
