import {useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {SecureDiv} from "@secure-display/react";
import "@secure-display/secure-div/secure-div.css";
import {startEncryptedVideo} from "../src/drm-player.js";

const adapter=async (video: HTMLVideoElement, signal: AbortSignal, assetId: string, sourceSha256: string)=>{
  if(assetId!=="demo-card")throw Error("Unrecognized synthetic asset.");
  const {player,provider,meta}=await startEncryptedVideo(video,signal,sourceSha256);
  return {destroy:()=>player.destroy(),drm:provider.type,width:meta.width,height:meta.height};
};

function App(){
 const [hash,setHash]=useState("");
 const [status,setStatus]=useState("Loading synthetic test fixture…");
 const [clicks,setClicks]=useState(0);
 const [selection,setSelection]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  (async()=>{
   const response=await fetch("/secure-content.html",{signal:controller.signal,cache:"no-store"});
   if(!response.ok)throw Error("Synthetic source fixture unavailable.");
   const fixture=await response.text();
   const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(fixture));
   if(controller.signal.aborted)return;
   const documentSource=new DOMParser().parseFromString(fixture,"text/html");
   const styles=documentSource.querySelector("#secure-fixture-style");
   if(!styles)throw Error("Shared synthetic CSS is missing.");
   document.head.appendChild(document.importNode(styles,true));
   const value=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
   setHash(value);
  })().catch(e=>{if(!controller.signal.aborted)setStatus(String(e.message||e));});
  return()=>controller.abort();
 },[]);
 return <section>
  <p id="status" role="status">{status}</p>
  <div className="demo">
   {hash&&<SecureDiv
      className="secure-card"
      assetId="demo-card"
      sourceSha256={hash}
      playbackAdapter={adapter}
      onSecureStateChange={event=>setStatus(event.state==="playing"
       ?"Protected React demo playing with "+event.drm
       :"BLOCKED: "+(event.reason||event.state))}
      onSecureSelectionChange={event=>setSelection(event.selectedCharacters)}
    >
      <div className="orb" aria-hidden="true" />
      <div className="eyebrow">Secure Display · DOM-driven prototype</div>
      <h2>Real HTML. Protected pixels.</h2>
      <p>This page is protected by Security Display GitHub repo, and this is a test.</p>
      <button type="button" id="real-button" onClick={()=>setClicks(n=>n+1)}>
        Click this real HTML button
      </button>
      <div className="footer">Normal DOM interactions remain enabled · Synthetic test data only</div>
    </SecureDiv>}
  </div>
  <p id="clicks">React click counter: {clicks}</p>
  <p id="selection-status">Selected characters: {selection}. Selection highlights are ordinary capturable DOM.</p>
  <p>This markup is real JSX, not dangerouslySetInnerHTML. The packaged reference is still a fixed 960×540 HTML fixture, so changes to JSX require rebuilding and auditing the asset match. Capture on real Safari and Chrome separately.</p>
 </section>;
}
createRoot(document.getElementById("app")!).render(<App />);
