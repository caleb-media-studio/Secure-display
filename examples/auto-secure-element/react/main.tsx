import {useState} from "react";
import {createRoot} from "react-dom/client";
import {SecureDiv} from "@secure-display/react";
import "./setup.js";

function App(){
 const [clicks,setClicks]=useState(0);
 return <section>
  <div className="demo">
    <SecureDiv className="secure-card">
      <div className="orb" aria-hidden="true" />
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
  <p>DRM is resolved by the app's shared setup, not JSX props. Any mismatch or missing asset keeps the card hidden. Public test media is not confidential.</p>
 </section>;
}
createRoot(document.getElementById("app")!).render(<App />);
