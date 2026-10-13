import React from "react";
import {createRoot} from "react-dom/client";
import {SecureDisplay} from "@caleb-media-studio-llc/react";
import "./style.css";

function Lab() {
  return <main>
    <p className="eyebrow">OPEN SOURCE RESEARCH / ALPHA</p>
    <h1>Secure Display</h1>
    <p className="lead">Researching protected video paths for browser-based sensitive reports.</p>
    <aside>
      <strong>Important:</strong> This is a DRM compatibility experiment, not a proven screenshot blocker.
      No sensitive records, secrets, or real licenses are loaded.
    </aside>
    <SecureDisplay policy="capture-exclusion-required" className="panel" />
    <h2>What this lab can establish</h2>
    <p>A browser can accept or reject a requested DRM configuration. Only end-to-end device testing
      with genuinely encrypted media can measure which screenshots and screen shares omit video.</p>
    <p className="footer">Chrome • Safari • Edge | HTTPS or localhost required</p>
  </main>;
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode><Lab /></React.StrictMode>
);
