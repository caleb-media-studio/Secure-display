import test from "node:test";
import assert from "node:assert/strict";
import {startSyntheticFairPlayPlayback} from "../dist/index.js";

function makeVideo() {
  return {
    hidden:false,
    controls:true,
    disablePictureInPicture:false,
    disableRemotePlayback:false,
    paused:false,
    pause() {this.paused=true;},
  };
}
const fixture = {
  classification:"synthetic-test-only",format:"fairplay-hls",
  encryptedMediaUrl:"https://example.test/synthetic.m3u8",
  certificateUrl:"https://example.test/drm/certificate",
  licenseProxyUrl:"https://example.test/drm/license",
  keySystem:"com.apple.fps",
};
function fakePlayer(drm) {
  const calls = {config:null,media:null,uri:null,destroyed:false};
  const player = {
    async attach(video) {calls.media=video;},
    configure(config) {calls.config=config;},
    async load(uri) {calls.uri=uri;},
    drmInfo() {return drm;},
    async destroy() {calls.destroyed=true;},
    addEventListener(){},
    removeEventListener(){},
  };
  return {player,calls};
}
test("licensed synthetic FairPlay media uses secure proxy and validates real DRM selection", async()=>{
  const saved=globalThis.location;
  globalThis.location={href:"https://example.test/"};
  try {
    const video=makeVideo();
    const {player,calls}=fakePlayer({keySystem:"com.apple.fps"});
    const statuses=[];
    const handle=await startSyntheticFairPlayPlayback(video,fixture,async()=>player,
      s=>statuses.push(s),true);
    assert.equal(calls.config.drm.servers["com.apple.fps"],fixture.licenseProxyUrl);
    assert.equal(calls.config.drm.advanced["com.apple.fps"].serverCertificateUri,fixture.certificateUrl);
    assert.equal(calls.config.streaming.useNativeHlsForFairPlay,true);
    assert.equal(calls.uri,fixture.encryptedMediaUrl);
    assert.equal(video.hidden,false);
    assert.deepEqual(statuses,["initializing","synthetic-playback-available"]);
    await handle.destroy();
    assert.equal(video.hidden,true);
    assert.equal(calls.destroyed,true);
  } finally { if(saved===undefined) delete globalThis.location; else globalThis.location=saved; }
});
test("clear HLS fallback cannot cause synthetic video reveal", async()=>{
  const saved=globalThis.location;
  globalThis.location={href:"https://example.test/"};
  try {
    const video=makeVideo();
    const {player,calls}=fakePlayer(null);
    await assert.rejects(startSyntheticFairPlayPlayback(video,fixture,async()=>player,undefined,true));
    assert.equal(video.hidden,true);
    assert.equal(calls.destroyed,true);
  } finally { if(saved===undefined) delete globalThis.location; else globalThis.location=saved; }
});
test("insecure browsing context rejects before initializing player", async()=>{
  const video=makeVideo();
  await assert.rejects(startSyntheticFairPlayPlayback(video,fixture,async()=>{throw Error("must not run");},undefined,false));
  assert.equal(video.hidden,true);
});
