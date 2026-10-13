import test from "node:test";
import assert from "node:assert/strict";
import {MODES,modePolicy,drmSource,NEAR_INVISIBLE_OPACITY,OPACITY_PRESETS,opacityPreset} from "../src/mode-policy.js";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
test("full protected mode never reveals normal text; blocks before actual playback",()=>{
 assert.deepEqual(modePolicy("protected",false),{
  showDom:false,showVideo:false,videoOpacity:1,enableProtectedHotspot:false});
 assert.deepEqual(modePolicy("protected",true),{
  showDom:false,showVideo:true,videoOpacity:1,enableProtectedHotspot:true});
});
test("overlay experiment deliberately leaves DOM capturable",()=>{
 const overlay=modePolicy("overlay",true);
 assert.equal(overlay.showDom,true);
 assert.equal(NEAR_INVISIBLE_OPACITY,0.000000001);
 assert.equal(overlay.videoOpacity,NEAR_INVISIBLE_OPACITY);
 assert.equal(overlay.videoOpacity.toFixed(9),"0.000000001");
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

test("browser example defaults to viewport-wide, pointer-transparent DRM experiment",()=>{
 const dir=resolve(dirname(fileURLToPath(import.meta.url)),"..");
 const source=readFileSync(resolve(dir,"src/main.js"),"utf8");
 const html=readFileSync(resolve(dir,"index.html"),"utf8");
 assert.match(source,/\?query\.get\("mode"\):"overlay"/);
 assert.match(source,/rule\.videoOpacity\.toFixed\(9\)/);
 assert.match(html,/#experiment\[data-mode="overlay"\] #protected-video/);
 assert.match(html,/width:100vw;height:100vh/);
 assert.match(html,/pointer-events:none/);
 assert.match(html,/id="dom-page">/);
 assert.match(html,/0\.0000001%/);
});

test("live opacity presets cover 0% through 100% and preserve exact percentages",()=>{
 assert.equal(OPACITY_PRESETS.length,15);
 assert.equal(opacityPreset(0).alpha,0);
 assert.equal(opacityPreset(1).label,"0.0000001%");
 assert.equal(opacityPreset(1).alpha,0.000000001);
 assert.equal(opacityPreset(8).label,"0.4%");
 assert.equal(opacityPreset(8).alpha,0.004);
 assert.equal(opacityPreset(14).alpha,1);
 assert.equal(opacityPreset(14).label,"100%");
 assert.ok(OPACITY_PRESETS.every((p,i)=>i===0||p.alpha>OPACITY_PRESETS[i-1].alpha));
 for(const index of [-1,1.1,15,NaN])assert.throws(()=>opacityPreset(index));
});
test("overlay opacity updates independently of DRM session and DOM visibility",()=>{
 for(const p of OPACITY_PRESETS) {
  const overlay=modePolicy("overlay",true,p.alpha);
  assert.equal(overlay.showDom,true);
  assert.equal(overlay.showVideo,true);
  assert.equal(overlay.enableProtectedHotspot,false);
  assert.equal(overlay.videoOpacity,p.alpha);
 }
 assert.throws(()=>modePolicy("overlay",true,-0.1));
 assert.throws(()=>modePolicy("overlay",true,Infinity));
 assert.throws(()=>modePolicy("overlay",true,1.01));
});
test("slider controls DOM and video CSS without reinitializing DRM",()=>{
 const dir=resolve(dirname(fileURLToPath(import.meta.url)),"..");
 const source=readFileSync(resolve(dir,"src/main.js"),"utf8");
 const html=readFileSync(resolve(dir,"index.html"),"utf8");
 assert.match(source,/opacitySlider.addEventListener\("input"/);
 assert.match(source,/opacityIndex=Number\(opacitySlider.value\)/);
 assert.match(source,/modePolicy\(mode,playing,preset.alpha\)/);
 assert.match(source,/preset.alpha.toFixed\(9\)/);
 assert.match(html,/id="opacity-slider" type="range"/);
 assert.match(html,/id="opacity-value"/);
 assert.match(html,/id="opacity-css"/);
});
