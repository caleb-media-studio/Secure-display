/** Pure validation shared by the research extension, native host and Node tests. */
export const NATIVE_HOST_NAME="com.calebmedia.secure_display_research";
const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const NONCE=/^[A-Za-z0-9_-]{16,128}$/;
const base64url=/^[A-Za-z0-9_-]+$/;
export function assertObject(x,label="value"){
 if(!x || typeof x!=="object" || Array.isArray(x))throw Error(label+" must be an object");
 return x;
}
export function parseSecureUrl(value,{localhost=false}={}){
 if(typeof value!=="string")throw Error("Expected URL string");
 const url=new URL(value);
 if(url.username||url.password||url.hash)throw Error("Credentials and fragments are forbidden in URLs");
 if(url.protocol!=="https:" && !(localhost&&url.protocol==="http:"&&["localhost","127.0.0.1","[::1]"].includes(url.hostname)))
  throw Error("HTTPS is required outside loopback");
 return url;
}
export function validateEnterpriseConfig(input){
 const cfg=assertObject(input,"managed enterprise configuration");
 const issuer=parseSecureUrl(cfg.issuer);
 const api=parseSecureUrl(cfg.apiBaseUrl);
 const allow=parseSecureUrl(cfg.allowedOrigin);
 if(issuer.search||api.search||allow.search||allow.pathname!=="/")
  throw Error("Enterprise URLs must be clean (no query; allowedOrigin is an origin)");
 if(!ID.test(cfg.tenantId||"")||typeof cfg.clientId!=="string"||cfg.clientId.length<8||cfg.clientId.length>256)
  throw Error("Invalid tenant or public OIDC client identifier");
 if(cfg.allowDomReveal!==true&&cfg.allowDomReveal!==false)
  throw Error("allowDomReveal must be set explicitly by managed enterprise policy");
 return Object.freeze({
  issuer:issuer.href.replace(/\/$/,""),
  apiBaseUrl:api.href.replace(/\/$/,""),
  allowedOrigin:allow.origin,
  tenantId:cfg.tenantId,clientId:cfg.clientId,
  allowDomReveal:cfg.allowDomReveal,
 });
}
export function validateRect(x){
 const r=assertObject(x,"rect");
 const out={};
 for(const field of ["x","y","width","height"]){
  const v=r[field];
  if(!Number.isFinite(v)||v<0||v>1e5)throw Error("Invalid rect "+field);
  out[field]=Math.round(v*100)/100;
 }
 if(out.width<1||out.height<1)throw Error("Empty protected rect");
 return out;
}
export function validateEnvelope(x,id,origin){
 const e=assertObject(x,"document envelope");
 if(e.version!==1||e.algorithm!=="AES-256-GCM"||e.documentId!==id||e.audienceOrigin!==origin)
  throw Error("Encrypted document metadata mismatch");
 if(!ID.test(e.keyId||"")||typeof e.ivBase64url!=="string"||!base64url.test(e.ivBase64url)||
 typeof e.ciphertextBase64url!=="string"||!base64url.test(e.ciphertextBase64url)||
 e.ciphertextBase64url.length>1_500_000)
  throw Error("Invalid encrypted document envelope");
 return e;
}
export function validateWrappedKey(x){
 const w=assertObject(x,"wrapped key response");
 if(w.algorithm!=="RSA-OAEP-256"||typeof w.wrappedKeyBase64url!=="string"||
 !base64url.test(w.wrappedKeyBase64url)||w.wrappedKeyBase64url.length>2048)
  throw Error("Invalid wrapped key response");
 return w;
}
export function validatedDocId(x){if(!ID.test(x||""))throw Error("Document ID must be an opaque identifier");return x;}
export function assertSenderTab(sender,expectedOrigin){
 const url=sender?.tab?.url||sender?.url||"";
 if(!url||parseSecureUrl(url,{localhost:true}).origin!==expectedOrigin||sender?.frameId!==0)
  throw Error("Request did not come from an approved top-level tab");
 return true;
}
export function validateOAuthState(state){if(typeof state!=="string"||!NONCE.test(state))throw Error("Invalid OAuth state");return state;}
