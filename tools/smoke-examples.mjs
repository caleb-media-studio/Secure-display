#!/usr/bin/env node
/**
 * Regression: boot the HTML-element example after deleting compiled outputs.
 * Prevents stale dist files from hiding newly exported TypeScript code.
 * Requires Bun on PATH. This is a local-only synthetic demo, not a DRM test.
 */
import {spawn} from "node:child_process";
import {rmSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const pkg of ["core","elements"]) {
  rmSync(resolve(root,"packages",pkg,"dist"),{recursive:true,force:true});
}
const child = spawn("bun",["run","example:elements"],{
  cwd:root,env:{...process.env,NO_COLOR:"1"},
  stdio:["ignore","pipe","pipe"],detached:process.platform!=="win32",
});
let log = "";
let exited = false;
child.stdout.on("data",bytes => {log += bytes.toString();});
child.stderr.on("data",bytes => {log += bytes.toString();});
child.once("exit",() => {exited = true;});
child.once("error",error => {log += "\n"+String(error); exited = true;});
let passed = false;
const deadline = Date.now()+20000;
try {
  while (Date.now()<deadline && !exited) {
    await new Promise(done=>setTimeout(done,250));
    if (/No matching export|Failed to run dependency scan|\[ERROR\]/.test(log)) {
      throw Error("Vite reported a dependency or export failure");
    }
    try {
      const page = await fetch("http://127.0.0.1:5173/",{signal:AbortSignal.timeout(1500)});
      const module = await fetch("http://127.0.0.1:5173/src/main.ts",{signal:AbortSignal.timeout(1500)});
      if (page.ok && module.ok && (await module.text()).includes("SecureDisplaySetupError")) {
        await new Promise(done=>setTimeout(done,1000));
        if (/No matching export|Failed to run dependency scan|\[ERROR\]/.test(log)) {
          throw Error("Vite reported a dependency or export failure");
        }
        passed = true;
        break;
      }
    } catch(error) {
      if (String(error).includes("Vite reported")) throw error;
    }
  }
  if (!passed) throw Error("Example did not serve its module within 20 seconds");
  console.log("Smoke passed: example starts with newly compiled packages.");
} catch(error) {
  console.error(String(error));
  console.error(log.slice(-5000));
  process.exitCode = 1;
} finally {
  if (!exited) {
    try {
      if (process.platform==="win32") child.kill("SIGTERM");
      else process.kill(-child.pid,"SIGTERM");
    } catch {child.kill("SIGTERM");}
  }
}
