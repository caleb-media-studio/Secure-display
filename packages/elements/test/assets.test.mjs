import test from "node:test";
import assert from "node:assert/strict";
import { validateSyntheticDrmAsset, SECURE_ELEMENT_TAGS } from "../dist/index.js";

const known = {
  classification: "synthetic-test-only",
  encryptedMediaUrl: "https://example.test/asset.cenc.mp4",
  keySystem: "com.widevine.alpha",
  contentType: 'video/mp4; codecs="avc1.42E01E"',
  robustness: "HW_SECURE_ALL",
};

test("custom tags expose text, paragraph and heading", () => {
  assert.deepEqual([...SECURE_ELEMENT_TAGS], ["secure-text","secure-p","secure-h1"]);
});
test("accepts permitted hardware DRM synthetic test descriptor", () => {
  assert.doesNotThrow(() => validateSyntheticDrmAsset(known,"https://example.test/"));
});
test("does not allow confidential material", () => {
  assert.throws(() => validateSyntheticDrmAsset({
    ...known, classification: "confidential"
  },"https://example.test/"));
});
test("does not accept software Widevine fallback", () => {
  assert.throws(() => validateSyntheticDrmAsset({...known, robustness: undefined},"https://example.test/"));
});
test("does not accept unprotected or credential-bearing media URLs", () => {
  assert.throws(() => validateSyntheticDrmAsset({...known, encryptedMediaUrl: "http://example.test/file"},"https://example.test/"));
  assert.throws(() => validateSyntheticDrmAsset({...known, encryptedMediaUrl: "https://secret:pw@example.test/file"},"https://example.test/"));
});
test("FairPlay cannot silently use CENC adapter", () => {
  assert.throws(() => validateSyntheticDrmAsset({...known, keySystem:"com.apple.fps",robustness:undefined},"https://example.test/"));
});
