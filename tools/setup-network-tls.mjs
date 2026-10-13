#!/usr/bin/env node
import {networkInterfaces,hostname} from "node:os";
import {spawnSync} from "node:child_process";
import {mkdirSync,chmodSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");

export function isPrivateIPv4(address) {
  const parts=String(address).split(".").map(Number);
  if(parts.length!==4 || parts.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
  const [a,b]=parts;
  return a===10 || (a===172&&b>=16&&b<=31) || (a===192&&b===168);
}
export function certificateNames(interfaces=networkInterfaces(),host=hostname()) {
  const names=new Set(["localhost","127.0.0.1","::1"]);
  const shortHost=String(host).trim();
  if(shortHost && /^[A-Za-z0-9.-]+$/.test(shortHost)) {
    names.add(shortHost);
    if(!shortHost.includes(".")) names.add(shortHost+".local");
  }
  for(const entries of Object.values(interfaces)) {
    for(const info of entries||[]){
      if(info.family==="IPv4"&&!info.internal&&isPrivateIPv4(info.address))
        names.add(info.address);
    }
  }
  return [...names];
}
function main() {
  if(process.argv.includes("--help")) {
    console.log("Usage: bun run network:cert\nRequires mkcert installed and \"mkcert -install\" already run.\nGenerates an ignored development certificate for localhost + local IPs.");
    return;
  }
  const names=certificateNames();
  if(!names.some(isPrivateIPv4)) {
    console.error("No private IPv4 interface found. Connect to your LAN, then retry.");
    process.exitCode=1;return;
  }
  const dir=resolve(ROOT,".secure-display-local/tls");
  const key=resolve(dir,"key.pem"),cert=resolve(dir,"cert.pem");
  mkdirSync(dir,{recursive:true,mode:0o700});
  const run=spawnSync("mkcert",["-cert-file",cert,"-key-file",key,...names],{stdio:"inherit"});
  if(run.error||run.status!==0) {
    console.error("mkcert failed. Install with: brew install mkcert; then run: mkcert -install");
    process.exitCode=1;return;
  }
  chmodSync(key,0o600);
  console.log("Created local-only TLS cert and key (ignored by Git):",dir);
  console.log("Run: bun run example:document");
  console.log("Then open a HTTPS LAN URL on another device. That device must trust the local mkcert root CA; never ignore certificate warnings for confidential data.");
  console.log("Re-run this command if your LAN IP changes.");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) main();
