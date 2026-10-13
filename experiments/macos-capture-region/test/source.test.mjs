import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const dir=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const source=readFileSync(resolve(dir,"CaptureRegionLab.m"),"utf8");
const launcher=readFileSync(resolve(dir,"run.sh"),"utf8");
test("native API matches Chromium connection, window, shape contract",()=>{
 for(const symbol of [
  "CGSMainConnectionID","CGRegionCreateWithRect",
  "CGSSetWindowCaptureExcludeShape",
 ])assert.ok(source.includes(symbol),symbol);
 assert.match(source,/self\.excludeRegion\(self\.getConnection\(\)/);
 assert.match(source,/self\.window\.windowNumber/);
 assert.match(source,/CFRelease\(region\)/);
});
test("the experiment has partial, full, and clear capture controls",()=>{
 assert.match(source,/SDProtectionLeft/);
 assert.match(source,/SDProtectionRight/);
 assert.match(source,/SDProtectionWhole/);
 assert.match(source,/SDProtectionOff/);
 assert.match(source,/frame\.size\.width\s*\/\s*2\.0/);
 assert.match(source,/mode != SDProtectionOff/);
 assert.match(source,/NULL\)/);
});
test("real DOM and button actions are preserved in WKWebView",()=>{
 assert.match(source,/WKWebView/);
 assert.match(source,/loadHTMLString:html/);
 assert.match(source,/class='columns'/);
 assert.match(source,/onclick=/);
 assert.match(source,/CLICK LEFT/);
 assert.match(source,/CLICK RIGHT/);
 assert.match(source,/Secure Display GitHub repo<\/a>, and this is a test/);
 assert.ok(source.includes("https://github.com/caleb-media-studio/Secure-display"));
});
test("the lab changes its own window only and cleans up on exit",()=>{
 assert.match(source,/self\.blackBacking/);
 assert.match(source,/orderWindow:NSWindowBelow/);
 assert.match(source,/applicationWillTerminate/);
 assert.doesNotMatch(source,/CGWindowListCopyWindowInfo/);
 assert.match(launcher,/Darwin/);
 assert.match(launcher,/CaptureRegionLab\.m/);
 assert.match(launcher,/\.secure-display-local\/bin/);
});
