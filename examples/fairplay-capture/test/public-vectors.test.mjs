import test from "node:test";
import assert from "node:assert/strict";
import {
  extractPublishedEntitlement, safePlaybackError, selectDefaultDrm,
  TEST_STREAMS, DRM_ENDPOINTS,
} from "../src/public-vectors.js";

test("public entitlement extractor validates expected format without bundling a credential",()=>{
  const sample="X-AxDRM-Message header: aaa.bbb_cc.ddd-123\nKey ID: public";
  assert.equal(extractPublishedEntitlement(sample),"aaa.bbb_cc.ddd-123");
  assert.equal(extractPublishedEntitlement("not a token"),null);
});
test("error summaries omit URLs, request bodies and challenge messages",()=>{
  const raw={code:1001,category:2,data:["https://foo.test/secret?api_key=secret",403,{token:"SECRET"}]};
  assert.deepEqual(safePlaybackError(raw),{code:1001,category:2,httpStatus:403});
  assert.ok(!JSON.stringify(safePlaybackError(raw)).includes("SECRET"));
});
test("browser auto-selection is explicit but not treated as security attestation",()=>{
  assert.equal(selectDefaultDrm("Mozilla Safari/605.1.15"),"fairplay");
  assert.equal(selectDefaultDrm("Mozilla Chrome/127 Safari/537"),"widevine");
});
test("only known external public HLS streams and license services are configured",()=>{
  for(const x of Object.values(TEST_STREAMS)) {
    const u=new URL(x.manifest);
    assert.equal(u.protocol,"https:");
    assert.ok(u.pathname.endsWith(".m3u8"));
  }
  for(const x of Object.values(DRM_ENDPOINTS)){
    assert.equal(new URL(x.license).protocol,"https:");
  }
});
