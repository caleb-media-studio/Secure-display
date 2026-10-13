import {createRoot} from "react-dom/client";
import {App} from "./App.js";
import "./setup.js";

// The page's head contains a fail-closed CSS guard before React boots.
const root=document.getElementById("app");
if(!root)throw Error("React demo mount point is missing.");
createRoot(root).render(<App />);
