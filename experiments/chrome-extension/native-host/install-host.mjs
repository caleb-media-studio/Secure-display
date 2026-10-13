#!/usr/bin/env node
/**
 * Explicit local Chrome-only native messaging registration. No automatic
 * installation. Never enable for any extension other than user-supplied ID.
 */
import {mkdirSync,writeFileSync,chmodSync} from "node:fs";
import {resolve,dirname,join} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";
import {NATIVE_HOST_NAME} from "../shared/protocol.mjs";
function quote(s){return "'"+s.replaceAll("'","'\\''")+"'";}
export function buildHostFiles(extensionId,hostScript,nodeBinary,wrapper){
 if(!/^[a-p]{32}$/.test(extensionId))throw Error("Expected the exact 32-character Chrome extension ID");
 if(!hostScript.startsWith("/")||!nodeBinary.startsWith("/")||!wrapper.startsWith("/"))
  throw Error("Native messaging paths must be absolute");
 return {
  wrapper:"#!/bin/sh\nexec "+quote(nodeBinary)+" "+quote(hostScript)+"\n",
  manifest:{name:NATIVE_HOST_NAME,description:"Read-only Secure Display capture research probe",
   path:wrapper,type:"stdio",allowed_origins:["chrome-extension://"+extensionId+"/"]}
 };
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 if(process.platform!=="darwin")throw Error("This installer is for macOS Google Chrome only");
 const extensionId=process.argv[2];
 const here=dirname(fileURLToPath(import.meta.url));
 const host=resolve(here,"host.mjs");
 const registration=join(homedir(),"Library/Application Support/Google/Chrome/NativeMessagingHosts");
 const bin=join(homedir(),".secure-display-native-probe");
 const wrapper=join(bin,"run-host.sh");
 const files=buildHostFiles(extensionId,host,process.execPath,wrapper);
 mkdirSync(registration,{recursive:true,mode:0o700});mkdirSync(bin,{recursive:true,mode:0o700});
 writeFileSync(wrapper,files.wrapper,{mode:0o700});chmodSync(wrapper,0o700);
 writeFileSync(join(registration,NATIVE_HOST_NAME+".json"),JSON.stringify(files.manifest,null,2)+"\n",{mode:0o600});
 console.log("Registered read-only native capability probe for extension "+extensionId);
 console.log("No screenshot exclusion has been installed or enabled.");
}
