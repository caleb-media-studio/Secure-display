import test from "node:test";
import assert from "node:assert/strict";
import { probeDrmPaths, DRM_CANDIDATES, assertMediaUrl } from "../dist/index.js";

test("insecure context fails closed", async () => {
  const results = await probeDrmPaths({secureContext:false, requestAccess:async()=>({keySystem:"mock"})});
  assert.equal(results.length, DRM_CANDIDATES.length);
  assert.ok(results.every(p=>p.status==="unavailable" && !p.captureExclusionVerified));
});
test("EME probe never attests screenshot protection", async () => {
  const results = await probeDrmPaths({secureContext:true,requestAccess:async(keySystem)=>({keySystem})});
  assert.ok(results.every(p=>p.status==="candidate" && !p.captureExclusionVerified));
});
test("unsupported CDM is reported", async () => {
  const results = await probeDrmPaths({secureContext:true,requestAccess:async()=>{throw Error("unsupported")}});
  assert.ok(results.every(p=>p.status==="unsupported"));
});
test("media URL rejects insecure origins and embedded credentials", () => {
  assert.throws(()=>assertMediaUrl("http://remote.test/video.mp4","https://localhost"));
  assert.throws(()=>assertMediaUrl("https://user:pass@remote.test/v.mp4","https://localhost"));
  assert.equal(assertMediaUrl("http://localhost/test.mp4","http://localhost").hostname,"localhost");
});
