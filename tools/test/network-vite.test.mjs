import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createNetworkViteConfig} from "../network-vite-config.mjs";
import {isPrivateIPv4,certificateNames} from "../setup-network-tls.mjs";

test("Vite binds all local interfaces but never embeds credentials into browser HTML",()=>{
 const root=mkdtempSync(join(tmpdir(),"sd-lan-"));
 try {
   const conf=createNetworkViteConfig({repoRoot:root,env:{}});
   assert.equal(conf.server.host,"0.0.0.0");
   assert.equal(conf.server.https,undefined);
   assert.ok(conf.server.fs.deny.includes("**/.secure-display-local/**"));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test("local cert/key are used together; a partial pair is rejected",()=>{
 const root=mkdtempSync(join(tmpdir(),"sd-tls-"));
 try {
   const dir=join(root,".secure-display-local/tls");
   mkdirSync(dir,{recursive:true});
   writeFileSync(join(dir,"cert.pem"),"SYNTHETIC CERT");
   assert.throws(()=>createNetworkViteConfig({repoRoot:root,env:{}}));
   writeFileSync(join(dir,"key.pem"),"SYNTHETIC KEY");
   const conf=createNetworkViteConfig({repoRoot:root,env:{}});
   assert.equal(conf.server.https.cert.toString(),"SYNTHETIC CERT");
   assert.equal(conf.server.https.key.toString(),"SYNTHETIC KEY");
   assert.throws(()=>createNetworkViteConfig({repoRoot:root,env:{SECURE_DISPLAY_HTTPS_CERT:"/tmp/example.pem"}}));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test("certificate name discovery only includes private IPv4 interfaces",()=>{
 const names=certificateNames({
   en0:[{family:"IPv4",internal:false,address:"192.168.1.55"}],
   utun:[{family:"IPv4",internal:false,address:"100.120.2.2"}],
   en1:[{family:"IPv4",internal:false,address:"10.0.0.3"}],
   lo0:[{family:"IPv4",internal:true,address:"127.0.0.1"}],
 },"my-mac");
 assert.ok(names.includes("my-mac.local"));
 assert.ok(names.includes("192.168.1.55"));
 assert.ok(names.includes("10.0.0.3"));
 assert.ok(!names.includes("100.120.2.2"));
 assert.equal(isPrivateIPv4("172.16.4.1"),true);
 assert.equal(isPrivateIPv4("172.32.0.1"),false);
});
