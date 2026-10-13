import test from "node:test";
import assert from "node:assert/strict";
import { probeSoftwareWidevineBaseline } from "../dist/index.js";

test("software probe never claims capture exclusion even when accepted", async () => {
  const result = await probeSoftwareWidevineBaseline({
    secureContext: true,
    requestAccess: async (keySystem, configs) => {
      assert.equal(keySystem, "com.widevine.alpha");
      assert.equal(configs[0].videoCapabilities[0].robustness,"SW_SECURE_CRYPTO");
      return { keySystem };
    },
  });
  assert.equal(result.status, "candidate");
  assert.equal(result.captureExclusionVerified, false);
});
test("software probe blocks insecure environments", async () => {
  const result = await probeSoftwareWidevineBaseline({
    secureContext:false,
    requestAccess: async () => { throw Error("should not run"); },
  });
  assert.equal(result.status, "unavailable");
});
test("software probe exposes only safe rejection name", async () => {
  const result = await probeSoftwareWidevineBaseline({
    secureContext:true,
    requestAccess: async () => { throw new DOMException("do not leak original diagnostic message", "NotSupportedError"); },
  });
  assert.equal(result.status,"unsupported");
  assert.equal(result.rejectionName,"NotSupportedError");
  assert.ok(!JSON.stringify(result).includes("do not leak"));
});
