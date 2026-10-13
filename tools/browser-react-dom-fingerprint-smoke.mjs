#!/usr/bin/env node
/**
 * Compare ACTUAL React JSX against the build-time source DOM.
 * This checks static content identity only; no licensed playback or
 * screenshot exclusions are claimed by this browser test.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright-core";
import {createServer} from "vite";
import {serializeProtectedChildren} from "../packages/secure-div/src/dom-fingerprint.js";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const example=resolve(root,"examples/auto-secure-element");
let browser;
let server;
try {
 server=await createServer({
  root:example,
  configFile:resolve(example,"vite.config.mjs"),
  server:{host:"127.0.0.1",port:0,strictPort:false,https:undefined},
  logLevel:"error",
 });
 await server.listen();
 const bound=server.httpServer?.address();
 if(!bound||typeof bound==="string")throw Error("Vite did not expose a port.");
 const base="http://127.0.0.1:"+bound.port;
 const executablePath=process.env.SECURE_DISPLAY_CHROME_PATH;
 browser=await chromium.launch(executablePath
  ?{headless:true,executablePath}:{headless:true,channel:"chrome"});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 await page.goto(base+"/react/",{waitUntil:"load"});
 await page.locator("secure-div").waitFor();
 const react=await page.locator("secure-div").evaluate(serializeProtectedChildren);
 const reactClass=await page.locator("secure-div").getAttribute("class");
 const ref=await browser.newPage({viewport:{width:1200,height:900}});
 await ref.goto(base+"/secure-content.html",{waitUntil:"load"});
 const original=await ref.locator("#snapshot-source").evaluate(serializeProtectedChildren);
 const originalClass=await ref.locator("#snapshot-source").getAttribute("class");
 assert.equal(reactClass,originalClass,"React root style class must match packaged source.");
 assert.equal(createHash("sha256").update(react).digest("hex"),
  createHash("sha256").update(original).digest("hex"),
  "Rendered React children diverged from the HTML source used by the DRM build.");
 const state=await page.locator("secure-div").getAttribute("data-secure-state");
 assert.equal(state,"blocked","Without a packaged DRM manifest this must fail closed.");
 const alpha=await page.locator("secure-div").evaluate(el=>getComputedStyle(el).opacity);
 assert.equal(alpha,"0");
 console.log("PASS: React children exactly match the packaged DOM structure; missing DRM stays blocked.");
} catch(error) {
 console.error("React-to-snapshot DOM fingerprint test failed:",error);
 process.exitCode=1;
} finally {
 await browser?.close();
 await server?.close();
}
