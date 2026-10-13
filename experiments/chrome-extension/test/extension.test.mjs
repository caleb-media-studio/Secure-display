import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {validateEnterpriseConfig,validateEnvelope,validateWrappedKey,validateRect,parseSecureUrl,validatedDocId} from "../shared/protocol.mjs";
import {randomBase64url,pkceChallenge,generateRecipient,decryptEnvelope,bytesToBase64url} from "../shared/crypto.mjs";
import {handleProbe,respond} from "../native-host/host.mjs";
import {buildHostFiles} from "../native-host/install-host.mjs";
const root=new URL("../",import.meta.url);
const managed={issuer:"https://login.example.org/tenant/v2.0",apiBaseUrl:"https://api.example.org",
 clientId:"public-extension-client-123",allowedOrigin:"https://app.example.org",
 tenantId:"tenant_1",allowDomReveal:false,scope:"openid profile api://secure-display.read"};
test("managed enterprise SSO config enforces exact HTTPS origins, no secrets and explicit DOM policy",()=>{
 const c=validateEnterpriseConfig(managed);
 assert.equal(c.allowedOrigin,"https://app.example.org");
 assert.equal(c.scope,managed.scope);
 assert.equal(c.allowDomReveal,false);
 for(const patch of [{allowedOrigin:"http://app.example.org"},
  {issuer:"http://login.example.org"},{apiBaseUrl:"https://user:pass@api.example.org"},
  {allowDomReveal:undefined},{tenantId:"../../other"},{allowedOrigin:"https://evil.org/a"},
  {apiBaseUrl:"javascript:alert(1)"}])assert.throws(()=>validateEnterpriseConfig({...managed,...patch}));
 assert.equal(parseSecureUrl("http://localhost:5173",{localhost:true}).origin,"http://localhost:5173");
 assert.throws(()=>parseSecureUrl("http://example.com"));
});
test("protected region and document IDs are bounded, no page content enters probe messages",()=>{
 assert.deepEqual(validateRect({x:1.123,y:5,width:50,height:25}),{x:1.12,y:5,width:50,height:25});
 assert.throws(()=>validateRect({x:NaN,y:0,width:1,height:1}));
 assert.throws(()=>validateRect({x:0,y:0,width:0,height:1}));
 assert.equal(validatedDocId("doc_23"),"doc_23");
 assert.throws(()=>validatedDocId("../secret"));
});
test("enterprise envelope AES-GCM decrypts with nonextractable RSA-OAEP private key and bound AAD",async()=>{
 const id="synthetic_1",origin=managed.allowedOrigin,nonce=randomBase64url(24),keyId="key_test_1";
 const recipient=await generateRecipient();
 assert.equal(recipient.privateKey.extractable,false);
 const aes=await webcrypto.subtle.generateKey({name:"AES-GCM",length:256},true,["encrypt","decrypt"]);
 const iv=webcrypto.getRandomValues(new Uint8Array(12));
 const text="SYNTHETIC TEST ONLY";
 const encrypted=await webcrypto.subtle.encrypt({name:"AES-GCM",iv,
  additionalData:new TextEncoder().encode("secure-display/v1/"+id+"/"+origin)},
 aes,new TextEncoder().encode(text));
 const pub=await webcrypto.subtle.importKey("jwk",recipient.publicKeyJwk,
  {name:"RSA-OAEP",hash:"SHA-256"},false,["wrapKey"]);
 const wrapped=await webcrypto.subtle.wrapKey("raw",aes,pub,{name:"RSA-OAEP"});
 const envelope={version:1,algorithm:"AES-256-GCM",documentId:id,audienceOrigin:origin,
  keyId,ivBase64url:bytesToBase64url(iv),ciphertextBase64url:bytesToBase64url(new Uint8Array(encrypted))};
 const keyResponse={documentId:id,nonce,keyId,algorithm:"RSA-OAEP-256",
  wrappedKeyBase64url:bytesToBase64url(new Uint8Array(wrapped))};
 assert.deepEqual(validateWrappedKey(keyResponse,id,nonce,keyId),keyResponse);
 assert.equal(await decryptEnvelope(envelope,keyResponse,recipient.privateKey,id,origin,nonce),text);
 await assert.rejects(
  ()=>decryptEnvelope(envelope,keyResponse,recipient.privateKey,id,origin,"wrong-challenge"),
  /document challenge/,
  "Decryption must never accept a wrapped key returned for another challenge"
 );
 assert.throws(()=>validateWrappedKey(keyResponse,id,"wrong-challenge",keyId));
 assert.throws(()=>validateWrappedKey(keyResponse,id,nonce,"wrong-key"));
 assert.throws(()=>validateEnvelope(envelope,"another_doc",origin));
 await assert.rejects(()=>decryptEnvelope({...envelope,ivBase64url:bytesToBase64url(iv.map((v,i)=>i===0?v^1:v))},
 keyResponse,recipient.privateKey,id,origin,nonce));
});
test("PKCE challenge is deterministic and generated verifier is unpredictable",async()=>{
 const a=randomBase64url(),b=randomBase64url();
 assert.notEqual(a,b);assert.equal(a.length,43);
 assert.equal(await pkceChallenge("test"),"n4bQgYhMfWWaL-qgxVrQFaO_TxsrC4Is0V1sFbDwCgg");
});
test("native host is probe only: no window mutations or bogus successful protection state",()=>{
 const envelope={kind:"CAPABILITY_PROBE",requestId:randomBase64url(24),
  tabId:100,windowId:10,origin:managed.allowedOrigin,
  rect:{x:10,y:20,width:500,height:150}};
 assert.equal(handleProbe(envelope).supported,false);
 assert.equal(respond({...envelope,rect:{x:-10,y:0,width:20,height:10}}).supported,false);
 assert.equal(respond({...envelope,kind:"APPLY_CAPTURE_EXCLUSION"}).supported,false);
 const files=buildHostFiles("abcdefghijklmnopabcdefghijklmnop","/tmp/host.mjs",
  "/usr/local/bin/node","/tmp/run-host.sh");
 assert.deepEqual(files.manifest.allowed_origins,
  ["chrome-extension://abcdefghijklmnopabcdefghijklmnop/"]);
 assert.throws(()=>buildHostFiles("wildcard","/tmp/host.mjs","/tmp/node","/tmp/wrapper"));
});
test("native messaging process uses length-prefixed JSON framing",()=>{
 const id=randomBase64url(24);
 const msg=Buffer.from(JSON.stringify({kind:"CAPABILITY_PROBE",requestId:id,
  tabId:1,windowId:2,origin:"https://example.org",rect:{x:0,y:0,width:5,height:6}}));
 const framed=Buffer.alloc(4+msg.length);framed.writeUInt32LE(msg.length);msg.copy(framed,4);
 const script=fileURLToPath(new URL("../native-host/host.mjs",import.meta.url));
 const child=spawnSync(process.execPath,[script],{input:framed,timeout:10000});
 assert.equal(child.status,0,child.stderr.toString());
 const out=child.stdout;assert.equal(out.readUInt32LE(0),out.length-4);
 const response=JSON.parse(out.subarray(4).toString());
 assert.equal(response.requestId,id);assert.equal(response.supported,false);
});

test("Chrome managed policy schema is supported and extension stays opt-in",()=>{
 const schema=JSON.parse(readFileSync(new URL("../managed-schema.json",import.meta.url),"utf8"));
 const manifest=JSON.parse(readFileSync(new URL("../manifest.json",import.meta.url),"utf8"));
 assert.equal(schema.type,"object");
 assert.equal(Object.hasOwn(schema,"additionalProperties"),false,"Chrome forbids top-level additionalProperties in managed policy schemas");
 assert.equal(manifest.manifest_version,3);
 assert.ok(!manifest.content_scripts,"Extension must never auto-inject into websites");
 assert.ok(!manifest.host_permissions,"No default enterprise host grants");
 assert.ok(manifest.optional_host_permissions.includes("https://*/*"));
});
