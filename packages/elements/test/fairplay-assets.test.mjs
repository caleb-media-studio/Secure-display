import test from "node:test";
import assert from "node:assert/strict";
import { validateSyntheticDrmAsset } from "../dist/index.js";

const fairPlay = {
  classification: "synthetic-test-only",
  format: "fairplay-hls",
  keySystem: "com.apple.fps",
  encryptedMediaUrl: "https://example.test/synthetic.m3u8",
  certificateUrl: "https://example.test/certificate",
  licenseProxyUrl: "https://example.test/licensing",
};
test("synthetic FairPlay HLS descriptors validate", ()=>{
  assert.doesNotThrow(()=>validateSyntheticDrmAsset(fairPlay,"https://example.test/"));
});
test("FairPlay cannot accidentally use CENC or clear playback", ()=>{
  assert.throws(()=>validateSyntheticDrmAsset({...fairPlay,format:"cenc"},"https://example.test/"));
  assert.throws(()=>validateSyntheticDrmAsset({...fairPlay,encryptedMediaUrl:"http://remote.test/playlist.m3u8"},"https://example.test/"));
  assert.throws(()=>validateSyntheticDrmAsset({...fairPlay,classification:"confidential"},"https://example.test/"));
});
