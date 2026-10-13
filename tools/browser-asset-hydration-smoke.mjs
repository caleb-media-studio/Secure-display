#!/usr/bin/env node
/**
 * Synthetic browser-only lifecycle test. The adapter is a mock and does NOT
 * validate DRM or screen-capture exclusion; never use its assertions as proof
 * of security. Exercises async hash hydration, native clicks and fail-closed.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright-core";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const js=readFileSync(resolve(root,"packages/secure-div/src/secure-div.js"),"utf8");
const geometry=readFileSync(resolve(root,"packages/secure-div/src/selection-geometry.js"),"utf8");
const fingerprint=readFileSync(resolve(root,"packages/secure-div/src/dom-fingerprint.js"),"utf8");
const url="http://secure-display-attribute-hydration.test";
const html=`<!doctype html><html><head>
  <style>
    secure-div {display:block;width:960px;height:540px;opacity:0!important;}
    body {margin:0;}
  </style></head><body>
  <secure-div data-asset-id="demo-card" data-source-sha256="">
    <h2>Public synthetic test content</h2>
    <button type="button" id="action">Clickable native button</button>
  </secure-div>
  <output id="count">0</output>
  </body></html>`;
let browser;
try {
 const executablePath=process.env.SECURE_DISPLAY_CHROME_PATH;
 browser=await chromium.launch(executablePath
  ?{headless:true,executablePath}:{headless:true,channel:"chrome"});
 const page=await browser.newPage({viewport:{width:1120,height:720}});
 await page.route(url+"/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/")return route.fulfill({status:200,contentType:"text/html",body:html});
  if(path==="/secure-div.js")return route.fulfill({status:200,contentType:"application/javascript",body:js});
  if(path==="/selection-geometry.js")return route.fulfill({status:200,contentType:"application/javascript",body:geometry});
  if(path==="/dom-fingerprint.js")return route.fulfill({status:200,contentType:"application/javascript",body:fingerprint});
  return route.fulfill({status:404,body:"Not found"});
 });
 await page.goto(url+"/");
 await page.evaluate(async()=>{
  const {registerSecureDiv}=await import("/secure-div.js");
  window.mockLoads=0;
  window.statuses=[];
  const secure=document.querySelector("secure-div");
  secure.addEventListener("secure-state-change",e=>window.statuses.push(e.detail.state));
  const counter=document.querySelector("#count");
  document.querySelector("#action").addEventListener("click",()=>{
   counter.textContent=String(Number(counter.textContent)+1);
  });
  registerSecureDiv(async(video,signal,assetId,sha)=>{
   window.mockLoads+=1;
   if(assetId!=="demo-card"||sha!=="a".repeat(64))throw Error("Unexpected mock asset");
   return {width:960,height:540,drm:"MOCK_NOT_REAL_DRM",destroy:async()=>{}};
  });
 });
 await page.waitForFunction(()=>document.querySelector("secure-div").dataset.secureState==="blocked");
 const initial=await page.evaluate(()=>({
   loads:window.mockLoads,
   opacity:getComputedStyle(document.querySelector("secure-div")).opacity,
   videoOpacity:document.querySelector("video.sd-video-portal").style.opacity,
 }));
 assert.equal(initial.loads,0,"Missing hash must never call the license adapter.");
 assert.equal(initial.opacity,"0","DOM must remain invisible before asset binding.");
 assert.equal(initial.videoOpacity,"0");

 await page.evaluate(()=>document.querySelector("secure-div")
  .setAttribute("data-source-sha256","a".repeat(64)));
 await page.waitForFunction(()=>document.querySelector("secure-div").dataset.secureState==="playing");
 const hydrated=await page.evaluate(()=>({
   loads:window.mockLoads,
   opacity:getComputedStyle(document.querySelector("secure-div")).opacity,
   videoOpacity:document.querySelector("video.sd-video-portal").style.opacity,
 }));
 assert.equal(hydrated.loads,1,"Adding a valid SHA must initiate one mock playback.");
 assert.equal(hydrated.opacity,"0","Original DOM must never be painted.");
 assert.equal(hydrated.videoOpacity,"1","Portal becomes available only after adapter returned.");

 await page.locator("#action").click();
 assert.equal(await page.locator("#count").textContent(),"1",
   "Original native button must remain clickable with the protected portal.");

 await page.evaluate(()=>document.querySelector("secure-div")
  .setAttribute("data-source-sha256","invalid"));
 await page.waitForFunction(()=>document.querySelector("secure-div").dataset.secureState==="blocked");
 const invalidated=await page.evaluate(()=>({
  loads:window.mockLoads,
  opacity:getComputedStyle(document.querySelector("secure-div")).opacity,
  videoOpacity:document.querySelector("video.sd-video-portal").style.opacity,
  statuses:window.statuses,
 }));
 assert.equal(invalidated.loads,1,"Invalid hash must not call playback adapter.");
 assert.equal(invalidated.opacity,"0");
 assert.equal(invalidated.videoOpacity,"0");
 assert.ok(invalidated.statuses.includes("playing"));
 assert.ok(invalidated.statuses.includes("blocked"));
 console.log("PASS: missing hash blocked, late hash retried, native click works, invalidation hides portal.");
} catch(error){
 console.error("Mock asset hydration browser test failed:",error);
 process.exitCode=1;
} finally {await browser?.close();}
