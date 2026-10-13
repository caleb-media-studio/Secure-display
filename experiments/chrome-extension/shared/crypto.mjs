import {validateEnvelope,validateWrappedKey} from "./protocol.mjs";
const webcrypto=globalThis.crypto;
export function bytesToBase64url(bytes){
 let binary="";
 for(const v of bytes)binary+=String.fromCharCode(v);
 return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
export function base64urlToBytes(value){
 if(typeof value!=="string"||!/^[a-zA-Z0-9_-]+$/.test(value))throw Error("Invalid base64url");
 const normalized=value.replace(/-/g,"+").replace(/_/g,"/");
 const str=atob(normalized+"=".repeat((4-normalized.length%4)%4));
 return Uint8Array.from(str,c=>c.charCodeAt(0));
}
export function randomBase64url(length=32){
 const bytes=new Uint8Array(length);webcrypto.getRandomValues(bytes);return bytesToBase64url(bytes);
}
export async function pkceChallenge(verifier){
 const hash=await webcrypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier));
 return bytesToBase64url(new Uint8Array(hash));
}
export async function generateRecipient(){
 // Public JWK is exportable; the private unwrap key is not.
 const pair=await webcrypto.subtle.generateKey({name:"RSA-OAEP",modulusLength:3072,
  publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},false,["wrapKey","unwrapKey"]);
 return {privateKey:pair.privateKey,publicKeyJwk:await webcrypto.subtle.exportKey("jwk",pair.publicKey)};
}
export async function decryptEnvelope(envelope,wrapped,privateKey,id,origin){
 const e=validateEnvelope(envelope,id,origin);
 const w=validateWrappedKey(wrapped);
 const iv=base64urlToBytes(e.ivBase64url);
 if(iv.length!==12)throw Error("AES-GCM IV must be 96 bits");
 const ciphertext=base64urlToBytes(e.ciphertextBase64url);
 if(ciphertext.length<16)throw Error("Missing AES-GCM tag");
 const key=await webcrypto.subtle.unwrapKey("raw",base64urlToBytes(w.wrappedKeyBase64url),
 privateKey,{name:"RSA-OAEP"},{name:"AES-GCM",length:256},false,["decrypt"]);
 const plaintext=await webcrypto.subtle.decrypt({name:"AES-GCM",iv,
  additionalData:new TextEncoder().encode("secure-display/v1/"+id+"/"+origin)},key,ciphertext);
 return new TextDecoder("utf-8",{fatal:true}).decode(plaintext);
}
