import test from "node:test";
import assert from "node:assert/strict";
import {MODES,modePolicy,drmSource} from "../src/mode-policy.js";
test("full protected mode never reveals normal text; blocks before actual playback",()=>{
 assert.deepEqual(modePolicy("protected",false),{
  showDom:false,showVideo:false,videoOpacity:1,enableProtectedHotspot:false});
 assert.deepEqual(modePolicy("protected",true),{
  showDom:false,showVideo:true,videoOpacity:1,enableProtectedHotspot:true});
});
test("overlay experiment deliberately leaves DOM capturable",()=>{
 const overlay=modePolicy("overlay",true);
 assert.equal(overlay.showDom,true);
 assert.equal(overlay.videoOpacity,0.015);
 assert.equal(overlay.enableProtectedHotspot,false);
 assert.equal(modePolicy("overlay",false).showVideo,false);
});
test("unprotected comparison mode never shows DRM video",()=>{
 const normal=modePolicy("normal",true);
 assert.equal(normal.showDom,true);
 assert.equal(normal.showVideo,false);
 assert.ok(MODES.includes("normal"));
 assert.throws(()=>modePolicy("bogus",true));
});
test("only explicit FairPlay and Widevine paths available",()=>{
 assert.equal(drmSource("fairplay").keySystem,"com.apple.fps");
 assert.equal(drmSource("widevine").keySystem,"com.widevine.alpha");
 assert.match(drmSource("fairplay").manifest,/\.m3u8$/);
 assert.match(drmSource("widevine").manifest,/\.mpd$/);
 assert.throws(()=>drmSource("clearkey"));
});
