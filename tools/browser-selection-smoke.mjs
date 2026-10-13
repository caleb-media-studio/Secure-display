#!/usr/bin/env node
/**
 * Browser test for normal text selection on opacity:0 DOM, with its text-free
 * highlight rendered outside the hidden host. No DRM required for this test:
 * protected-video capture is a separate user hardware verification.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright-core";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const documentHtml=readFileSync(resolve(root,"examples/auto-secure-element/public/secure-content.html"),"utf8");
const selectionCode=readFileSync(resolve(root,"examples/auto-secure-element/src/selection-geometry.js"),"utf8");
const host="http://secure-display-selection.test";
let browser;
try{
 const executablePath=process.env.SECURE_DISPLAY_CHROME_PATH;
 browser=await chromium.launch(executablePath
  ?{headless:true,executablePath}:{headless:true,channel:"chrome"});
 const page=await browser.newPage({viewport:{width:1120,height:780}});
 await page.route(host+"/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==="/")return route.fulfill({status:200,contentType:"text/html",body:documentHtml});
  if(path==="/selection-geometry.js")return route.fulfill({
   status:200,contentType:"application/javascript",body:selectionCode,
  });
  return route.fulfill({status:404,body:"Not found"});
 });
 await page.goto(host+"/",{waitUntil:"load"});
 // Reproduce the essential secure-div mechanic: source paint is removed,
 // not the DOM content, layout, or browser-native text selection.
 await page.addStyleTag({content:"#snapshot-source{opacity:0!important;user-select:text;-webkit-user-select:text;}"});
 const points=await page.evaluate(()=>{
  const text=document.querySelector("#snapshot-source p").firstChild;
  const rect=(start,end)=>{
   const range=document.createRange();
   range.setStart(text,start);range.setEnd(text,end);
   const b=range.getBoundingClientRect();
   return {x:b.left+b.width/2,y:b.top+b.height/2};
  };
  return {from:rect(1,2),to:rect(24,25)};
 });
 await page.mouse.move(points.from.x,points.from.y);
 await page.mouse.down();
 await page.mouse.move(points.to.x,points.to.y,{steps:20});
 await page.mouse.up();
 const native=await page.evaluate(async()=>{
  const module=await import("/selection-geometry.js");
  const host=document.querySelector("#snapshot-source");
  const selection=window.getSelection();
  const rectangles=module.selectionGeometry(host,selection);
  const overlay=document.createElement("div");
  overlay.style.cssText="position:fixed;inset:0;z-index:1000000;pointer-events:none";
  document.body.append(overlay);
  module.updateSelectionIndicator(overlay,rectangles);
  return {
   selectedText:selection.toString(),
   rectangleCount:rectangles.length,
   overlayCount:overlay.children.length,
   sourceOpacity:getComputedStyle(host).opacity,
   overlaysWithText:[...overlay.children].some(child=>child.textContent?.trim().length>0),
  };
 });
 assert.equal(native.sourceOpacity,"0","Source DOM must remain visually transparent.");
 assert.ok(native.selectedText.length>4,
  "Actual mouse drag did not select invisible source text.");
 assert.match(native.selectedText,/page is protected/i,
  "Native selection did not follow the original paragraph.");
 assert.ok(native.rectangleCount>0,"Selection geometry was not reconstructed.");
 assert.equal(native.overlayCount,native.rectangleCount);
 assert.equal(native.overlaysWithText,false,"Selection markers must not contain plaintext.");
 console.log("PASS: real mouse drag selected opacity:0 HTML text, with "+native.rectangleCount+
  " text-free selection highlight rectangles.");
}catch(error){
 console.error("Selection browser smoke failed:",error);
 process.exitCode=1;
}finally{await browser?.close();}
