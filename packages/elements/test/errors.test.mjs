import test from "node:test";
import assert from "node:assert/strict";
import { SecureDisplaySetupError } from "../dist/index.js";

test("provider setup error has a stable code and safe message", () => {
  const error = new SecureDisplaySetupError();
  assert.equal(error.code, "DRM_PROVIDER_NOT_CONFIGURED");
  assert.equal(error.message, "DRM test provider is not configured.");
  assert.equal(error.name, "SecureDisplaySetupError");
});
