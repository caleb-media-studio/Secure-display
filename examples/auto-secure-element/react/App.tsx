import {useState} from "react";
import {SecureDiv} from "@caleb-media-studio-llc/react";

/** Everything below is normal JSX. DRM configuration is NOT repeated here. */
export function App(){
 const [clicks,setClicks]=useState(0);
 return <section>
  <div className="demo">
   <SecureDiv className="secure-card">
    <div className="orb" aria-hidden="true"/>
    <div className="eyebrow">Secure Display · DOM-driven prototype</div>
    <h2>Real HTML. Protected pixels.</h2>
    <p>This page is protected by Security Display GitHub repo, and this is a test.</p>
    <button type="button" id="real-button" onClick={()=>setClicks(n=>n+1)}>
     Click this real HTML button
    </button>
    <div className="footer">Normal DOM interactions remain enabled · Synthetic test data only</div>
   </SecureDiv>
  </div>
  <p id="clicks">React click counter: {clicks}</p>
  <p>Encrypted output requires matching synthetic media. Mismatches and DRM failures block.</p>
 </section>;
}
