const $=id=>document.getElementById(id);
let state=null;
const display=s=>{ $("message").textContent=s; };
async function send(type,extras={}){
 const response=await chrome.runtime.sendMessage({type,...extras});
 if(!response?.ok)throw Error(response?.error||"Extension unavailable");
 return response;
}
function enableButtons(loading){
 for(const id of ["login","logout","view","reveal","probe"])$(id).disabled=loading;
 if(!loading&&state){
  $("login").disabled=!state.configured||state.authenticated;
  $("logout").disabled=!state.authenticated;
  $("view").disabled=!state.authenticated;
  $("reveal").disabled=!state.authenticated||!state.allowDomReveal;
 }
}
async function refresh(){
 state=await send("STATUS");
 $("status").textContent=state.configured
  ?("Enterprise site: "+state.allowedOrigin+"\nSSO: "+(state.authenticated?"Connected":"Not signed in")+
   "\nDOM reveal policy: "+(state.allowDomReveal?"permitted":"disabled"))
  :"Enterprise SSO not configured. Native read-only capability probing is available.";
 enableButtons(false);
}
async function authorizeOrigins(){
 const roots=[state.issuerOrigin,state.apiOrigin].filter(Boolean);
 const unique=[...new Set(roots)].map(s=>s+"/*");
 if(!unique.length)throw Error("Enterprise identity provider not configured");
 // Chrome requires permission prompts to be initiated by a user click.
 if(!await chrome.permissions.request({origins:unique}))
  throw Error("Permission for enterprise SSO endpoints was denied");
}
async function run(type,callback=async()=>{}){
 enableButtons(true);display("Working…");
 try{await callback();display(type+" completed.");}
 catch(e){display("Error: "+e.message);}
 finally{try{await refresh();}catch(e){display("Error: "+e.message);enableButtons(false);}}
}
$("login").addEventListener("click",()=>run("Sign in",async()=>{
 await authorizeOrigins();await send("LOGIN");
}));
$("logout").addEventListener("click",()=>run("Sign out",async()=>{await send("LOGOUT");$("viewer").hidden=true;$("viewer").textContent="";}));
$("view").addEventListener("click",()=>run("Document view",async()=>{
 const {plaintext}=await send("READ",{documentId:$("document").value.trim()});
 $("viewer").textContent=plaintext;
 $("viewer").hidden=false;
}));
$("reveal").addEventListener("click",()=>run("DOM reveal",async()=>{
 const res=await send("REVEAL",{documentId:$("document").value.trim()});
 display(res.warning);
}));
$("probe").addEventListener("click",()=>run("Native probe",async()=>{
 const res=await send("PROBE");
 display("Capture backend: "+(res.backend||"none")+"\nAvailable: "+res.supported+"\n"+res.reason);
}));
refresh().catch(e=>{display(e.message);enableButtons(false)});
