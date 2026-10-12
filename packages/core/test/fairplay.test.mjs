import test from "node:test";
import assert from "node:assert/strict";
import { validateFairPlayConfiguration, startSyntheticFairPlayPlayback } from "../dist/index.js";

const asset = {
  classification: "synthetic-test-only",
  format: "fairplay-hls",
  keySystem: "com.apple.fps",
  encryptedMediaUrl: "https://example.test/media/synthetic.m3u8",
  certificateUrl: "https://example.test/drm/cert",
  licenseProxyUrl: "https://example.test/drm/license",
};

test("FairPlay requires synthetic classification and valid HTTPS HLS",()=>{
 assert.doesNotThrow(()=>validateFairPlayConfiguration(asset,"https://example.test/"));
 assert.throws(()=>validateFairPlayConfiguration({...asset,classification:"confidential"},"https://example.test/"));
 assert.throws(()=>validateFairPlayConfiguration({...asset,encryptedMediaUrl:"https://example.test/clear.mp4"},"https://example.test/"));
 assert.throws(()=>validateFairPlayConfiguration({...asset,licenseProxyUrl:"http://outside.test/license"},"https://example.test/"));
 assert.throws(()=>validateFairPlayConfiguration({...asset,certificateUrl:"https://username:password@example.test/cert"},"https://example.test/"));
});
