import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {checkDimensions,snapshotParameters} from "../package-dom-element.mjs";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const get=file=>readFileSync(resolve(root,file),"utf8");

test("auto-packager always snapshots a real DOM element with fixed test dimensions",()=>{
 const p=snapshotParameters();
 assert.deepEqual(p,{selector:"secure-div",width:960,height:540});
 assert.equal(checkDimensions({width:960,height:540}),true);
 assert.throws(()=>checkDimensions({width:1000,height:540}));
 assert.throws(()=>checkDimensions({width:960,height:545}));
 const source=get("tools/package-dom-element.mjs");
 assert.match(source,/\.locator\("secure-div"\)/);
 assert.match(source,/\.screenshot\(\{path:IMAGE/);
 assert.match(source,/--clear_lead|packagerArgs\(/);
 assert.match(source,/parseVector/);
 assert.match(source,/https:false/,"Developer screenshot must use HTTP even with local TLS configured.");
 assert.match(get("tools/browser-react-dom-fingerprint-smoke.mjs"),/https:false/,
  "Browser fingerprint smoke must use HTTP regardless of local HTTPS settings.");
 assert.match(get("examples/auto-secure-element/react/setup.js"),/content-type/,
  "React resolver must reject Vite SPA HTML fallback instead of JSON.parse.");
 assert.match(get("examples/auto-secure-element/src/drm-player.js"),/content-type/,
  "Runtime DRM loader must reject Vite SPA HTML fallback.");
});
test("one HTML/CSS source powers both real DOM and encrypted visual copy",()=>{
 const fixture=get("examples/auto-secure-element/public/secure-content.html");
 const app=get("examples/auto-secure-element/src/main.js");
 assert.match(fixture,/This page is protected by Security Display GitHub repo, and this is a test\./);
 assert.match(fixture,/id="snapshot-source"/);
 assert.match(fixture,/id="secure-fixture-style"/);
 assert.match(fixture,/id="real-button"/);
 assert.match(app,/fetch\("\/secure-content\.html"/);
 assert.match(app,/document\.createElement\("secure-div"\)/);
 assert.match(app,/secure\.className=source\.className/);
 assert.match(app,/secure\.innerHTML=source\.innerHTML/);
});
test("protected DOM paint is hidden before upgrade, but source event handlers remain",()=>{
 const html=get("examples/auto-secure-element/index.html");
 const element=get("packages/secure-div/src/secure-div.js");
 assert.match(html,/secure-div\{[^}]*opacity:0!important/);
 assert.match(element,/opacity:0/);
 assert.match(element,/pointer-events:none/);
 assert.match(element,/this\.dispatchEvent\(new CustomEvent/);
 assert.match(element,/new MutationObserver/);
 assert.match(element,/this\.#video\.style\.opacity="0"/);
 assert.match(element,/getBoundingClientRect/);
 assert.doesNotMatch(element,/innerHTML\s*=/);
});
test("playback fails closed without clearing into HTML",()=>{
 const source=get("examples/auto-secure-element/src/drm-player.js");
 const element=get("packages/secure-div/src/secure-div.js");
 assert.match(source,/com\.widevine\.alpha/);
 assert.match(source,/com\.apple\.fps/);
 assert.match(source,/p\.drmInfo\(\)\?\.keySystem/);
 assert.match(source,/X-AxDRM-Message/);
 assert.match(source,/automated-dom-drm-v1/);
 assert.match(element,/this\.dataset\.secureState="blocked"/);
 assert.doesNotMatch(element,/clear[- ]video/i);
});
