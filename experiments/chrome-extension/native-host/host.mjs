#!/usr/bin/env node
/**
 * Chrome Native Messaging research host. Capability probe only.
 * It never changes a Chrome-owned window or calls private macOS APIs.
 */
import {validateRect,parseSecureUrl} from "../shared/protocol.mjs";
const MAX_IN=64*1024;
let pending=Buffer.alloc(0);
function writeMessage(msg){
 const encoded=Buffer.from(JSON.stringify(msg),"utf8");
 if(encoded.length>1_000_000)throw Error("Host response too large");
 const head=Buffer.alloc(4);head.writeUInt32LE(encoded.length);
 process.stdout.write(Buffer.concat([head,encoded]));
}
export function handleProbe(value){
 if(!value||value.kind!=="CAPABILITY_PROBE"||typeof value.requestId!=="string"||
 !/^[A-Za-z0-9_-]{16,128}$/.test(value.requestId))throw Error("Invalid probe envelope");
 if(!Number.isInteger(value.tabId)||!Number.isInteger(value.windowId))
  throw Error("Missing Chrome tab/window correlation");
 parseSecureUrl(value.origin,{localhost:true});
 validateRect(value.rect);
 // A child process cannot assume authority to mutate Chrome's window.
 // Neither the CDM nor the native host exposes an endorsed screenshot API.
 return {requestId:value.requestId,supported:false,backend:"none",
  reason:"No verified Chrome-owned native capture exclusion bridge. Read-only research probe only.",
  platform:process.platform};
}
export function respond(data){
 try{return handleProbe(data);}
 catch(error){return {requestId:typeof data?.requestId==="string"?data.requestId:"",
  supported:false,backend:"none",reason:"Invalid native probe: "+error.message.slice(0,120)};}
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 process.stdin.on("data",chunk=>{
  pending=Buffer.concat([pending,chunk]);
  if(pending.length>MAX_IN){process.stderr.write("Native probe size limit\n");process.exit(1);}
  while(pending.length>=4){
   const length=pending.readUInt32LE(0);
   if(length<2||length>MAX_IN){process.stderr.write("Invalid message frame\n");process.exit(1);}
   if(pending.length<4+length)break;
   const body=pending.subarray(4,4+length);pending=pending.subarray(4+length);
   let message;
   try{message=JSON.parse(body.toString("utf8"));}
   catch{message={kind:"bad-frame"};}
   writeMessage(respond(message));
  }
 });
}
