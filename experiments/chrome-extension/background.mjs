/** MV3 optional companion: no automatic injections, no default capture-protection claims. */
import {NATIVE_HOST_NAME,validateEnterpriseConfig,parseSecureUrl,validatedDocId,validateEnvelope,validateWrappedKey,validateRect,validateOAuthState} from "./shared/protocol.mjs";
import {randomBase64url,pkceChallenge,generateRecipient,decryptEnvelope} from "./shared/crypto.mjs";
const live=new Map(); // Bearer tokens only in service-worker memory; lost on suspension.
async function policy(){
 try{
  const stored=await chrome.storage.managed.get(["issuer","clientId","apiBaseUrl","allowedOrigin","tenantId","allowDomReveal","scope"]);
  if(!stored?.issuer)return null;
  return validateEnterpriseConfig(stored);
 }catch(error){
  if(/not found|no schema|not available|unavailable/i.test(String(error)))return null;
  throw error;
 }
}
function safeError(error){return error instanceof Error?error.message.slice(0,240):"Request failed";}
async function activeTab(){
 const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
 if(!Number.isInteger(tab?.id)||!tab.url)throw Error("Select an ordinary HTTPS browser tab");
 return tab;
}
async function authorizedTab(config){
 const tab=await activeTab();
 if(parseSecureUrl(tab.url,{localhost:false}).origin!==config.allowedOrigin)
  throw Error("This company's policy does not authorize the active site");
 return tab;
}
function isAuthenticated(config){
 const entry=live.get(config.tenantId);
 if(!entry||entry.issuer!==config.issuer||entry.clientId!==config.clientId||
    entry.expiresAt<=Date.now()+20_000)return false;
 return true;
}
async function discoverIssuer(config){
 const url=config.issuer+"/.well-known/openid-configuration";
 const r=await fetch(url,{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error("OIDC issuer discovery failed");
 const info=await r.json();
 if(info.issuer?.replace(/\/$/,"")!==config.issuer)throw Error("OIDC issuer identity mismatch");
 const auth=parseSecureUrl(info.authorization_endpoint);
 const token=parseSecureUrl(info.token_endpoint);
 const issuerOrigin=new URL(config.issuer).origin;
 if(auth.origin!==issuerOrigin||token.origin!==issuerOrigin)
  throw Error("This research prototype requires the OIDC authorization/token endpoints on the issuer origin");
 if(auth.username||token.username)throw Error("OIDC credentials embedded in URL");
 return {auth,token};
}
async function signIn(){
 const config=await policy();if(!config)throw Error("Enterprise managed policy is not configured");
 await authorizedTab(config);
 const endpoints=await discoverIssuer(config);
 const verifier=randomBase64url(32);
 const state=validateOAuthState(randomBase64url(24));
 const nonce=randomBase64url(24);
 const redirect=chrome.identity.getRedirectURL("callback");
 const url=new URL(endpoints.auth);
 url.searchParams.set("client_id",config.clientId);
 url.searchParams.set("redirect_uri",redirect);
 url.searchParams.set("response_type","code");
 url.searchParams.set("scope",config.scope || "openid profile");
 url.searchParams.set("code_challenge_method","S256");
 url.searchParams.set("code_challenge",await pkceChallenge(verifier));
 url.searchParams.set("state",state);
 url.searchParams.set("nonce",nonce);
 const response=await chrome.identity.launchWebAuthFlow({url:url.href,interactive:true});
 if(!response)throw Error("SSO sign-in did not complete");
 const final=new URL(response);
 const expected=new URL(redirect);
 if(final.origin!==expected.origin||final.pathname!==expected.pathname||
    final.searchParams.get("state")!==state)throw Error("OAuth redirect/state mismatch");
 if(final.searchParams.has("error"))throw Error("SSO authorization was denied");
 const code=final.searchParams.get("code");
 if(!code||code.length>4096)throw Error("Missing OAuth authorization code");
 const body=new URLSearchParams({grant_type:"authorization_code",client_id:config.clientId,
  redirect_uri:redirect,code,code_verifier:verifier});
 const responseToken=await fetch(endpoints.token,{method:"POST",redirect:"error",cache:"no-store",
  headers:{"content-type":"application/x-www-form-urlencoded"},body,signal:AbortSignal.timeout(15000)});
 if(!responseToken.ok)throw Error("OIDC token exchange failed");
 const data=await responseToken.json();
 if(data.token_type?.toLowerCase()!=="bearer"||typeof data.access_token!=="string"||
 data.access_token.length<20||data.access_token.length>16_384||
 !Number.isInteger(data.expires_in)||data.expires_in<30||data.expires_in>86400)
  throw Error("OIDC token response invalid");
 // Authorization/tenant claims are enforced by the enterprise API, not by
 // trusting user-controlled extension policy or the unvalidated ID token.
 live.set(config.tenantId,{issuer:config.issuer,clientId:config.clientId,
  accessToken:data.access_token,expiresAt:Date.now()+Math.min(data.expires_in,3600)*1000});
 return {ok:true,authenticated:true};
}
async function fetchJSON(url,options={}){
 const response=await fetch(url,{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000),...options});
 if(!response.ok)throw Error("Enterprise content API rejected request (HTTP "+response.status+")");
 if(!response.headers.get("content-type")?.toLowerCase().includes("application/json"))
  throw Error("Enterprise API returned unexpected content");
 const text=await response.text();
 if(text.length>2_000_000)throw Error("Enterprise response exceeds size limit");
 return JSON.parse(text);
}
async function readDocument(docId){
 const config=await policy();if(!config)throw Error("Enterprise policy missing");
 const tab=await authorizedTab(config);
 if(!isAuthenticated(config))throw Error("SSO session expired. Sign in again.");
 const id=validatedDocId(docId);
 const url=config.apiBaseUrl+"/v1/documents/"+encodeURIComponent(id);
 const headers={Authorization:"Bearer "+live.get(config.tenantId).accessToken,
  "X-Secure-Display-Tenant":config.tenantId};
 const envelope=validateEnvelope(await fetchJSON(url,{headers}),id,config.allowedOrigin);
 const recipient=await generateRecipient();
 const challenge=randomBase64url(24);
 const wrapped=validateWrappedKey(await fetchJSON(url+"/release",{
  method:"POST",headers:{...headers,"content-type":"application/json"},
  body:JSON.stringify({keyId:envelope.keyId,documentId:id,
   audienceOrigin:config.allowedOrigin,nonce:challenge,publicKeyJwk:recipient.publicKeyJwk})
 }),id,challenge,envelope.keyId);
 // Never persist the key. It exists only inside this browser extension's
 // worker; plaintext is returned ONLY to its own extension popup.
 const plaintext=await decryptEnvelope(envelope,wrapped,recipient.privateKey,id,config.allowedOrigin,challenge);
 if(plaintext.length>250_000)throw Error("Decrypted document too large");
 return {plaintext,id,tabId:tab.id,origin:config.allowedOrigin,allowDomReveal:config.allowDomReveal};
}
function measureProtectedElement(){
 const el=document.querySelector("secure-div,[data-secure-display]");
 if(!el)return {found:false,reason:"No Secure Display marker on this page"};
 const r=el.getBoundingClientRect();
 return {found:true,rect:{x:Math.max(0,r.x),y:Math.max(0,r.y),
  width:r.width,height:r.height},origin:location.origin,
  viewport:{width:innerWidth,height:innerHeight,scale:devicePixelRatio}};
}
async function nativeProbe(){
 const tab=await activeTab();
 parseSecureUrl(tab.url,{localhost:true});
 const frames=await chrome.scripting.executeScript({target:{tabId:tab.id,frameIds:[0]},func:measureProtectedElement});
 const found=frames[0]?.result;
 if(!found?.found)return {supported:false,reason:found?.reason||"Protected element not found"};
 const rect=validateRect(found.rect);
 const response=await chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME,{
  kind:"CAPABILITY_PROBE",requestId:randomBase64url(16),
  origin:found.origin,tabId:tab.id,windowId:tab.windowId,rect});
 return {supported:response?.supported===true,reason:response?.reason||"No native capabilities",
  backend:response?.backend||"none",rect};
}
async function revealInPage(docId){
 const config=await policy();if(!config?.allowDomReveal)
  throw Error("Enterprise policy forbids exposing decrypted text in the page DOM");
 const data=await readDocument(docId);
 const result=await chrome.scripting.executeScript({target:{tabId:data.tabId,frameIds:[0]},
  func:({id,plaintext,origin})=>{
   if(location.origin!==origin)return {ok:false,reason:"Site changed"};
   const elements=[...document.querySelectorAll("[data-secure-display-doc]")].filter(
    el=>el.getAttribute("data-secure-display-doc")===id);
   if(elements.length!==1)return {ok:false,reason:"Expected exactly one matching placeholder"};
   // textContent is deliberately used; never treat decrypted data as HTML.
   elements[0].textContent=plaintext;
   elements[0].setAttribute("data-secure-display-revealed","true");
   return {ok:true};
  },args:[{id:data.id,plaintext:data.plaintext,origin:data.origin}]});
 if(!result[0]?.result?.ok)throw Error(result[0]?.result?.reason||"DOM injection failed");
 return {ok:true,warning:"Plaintext is now readable in the page DOM and is capturable."};
}
async function command(message){
 switch(message?.type){
  case "STATUS":{
   const config=await policy();
   return {configured:Boolean(config),authenticated:config?isAuthenticated(config):false,
    allowedOrigin:config?.allowedOrigin||null,apiOrigin:config?new URL(config.apiBaseUrl).origin:null,
    issuerOrigin:config?new URL(config.issuer).origin:null,allowDomReveal:config?.allowDomReveal||false,
    note:"No browser capture protection has been activated."};
  }
  case "LOGIN":return signIn();
  case "LOGOUT":live.clear();return {ok:true};
  case "READ":{const data=await readDocument(message.documentId);return {ok:true,plaintext:data.plaintext};}
  case "REVEAL":return revealInPage(message.documentId);
  case "PROBE":return nativeProbe();
  default:throw Error("Unknown extension action");
 }
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(sender.id!==chrome.runtime.id||!sender.url?.startsWith(chrome.runtime.getURL("popup.html"))){
  reply({ok:false,error:"Request rejected: sender is not extension popup"});return false;
 }
 command(message).then(result=>reply({ok:true,...result}))
  .catch(error=>reply({ok:false,error:safeError(error)}));
 return true;
});
