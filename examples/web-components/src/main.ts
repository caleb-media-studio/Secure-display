import { probeDrmPaths } from "@secure-display/core";
import { registerSecureElements, SecureDisplaySetupError } from "@secure-display/elements";

/**
 * This example has no DRM provider or confidential inputs. The secure tags
 * MUST block until a licensed synthetic test stream and server-side license
 * proxy are configured. No canvas/plaintext rendering fallback.
 */
registerSecureElements({
  async resolveAsset() {
    throw new SecureDisplaySetupError();
  },
  async requestLicense() {
    throw new SecureDisplaySetupError();
  },
});

const checkButton = document.querySelector<HTMLButtonElement>("#check-drm");
const checkStatus = document.querySelector<HTMLElement>("#drm-check-status");
const checkResults = document.querySelector<HTMLUListElement>("#drm-check-results");

if (!checkButton || !checkStatus || !checkResults) {
  throw new Error("Diagnostic interface is missing.");
}
const button = checkButton;
const status = checkStatus;
const results = checkResults;

button.addEventListener("click", () => {
  void (async () => {
    button.disabled = true;
    status.textContent = "Checking EME configurations...";
    results.replaceChildren();
    try {
      const candidates = await probeDrmPaths();
      for (const candidate of candidates) {
        const item = document.createElement("li");
        item.textContent = candidate.kind + ": " + candidate.status +
          ". Screen-capture exclusion: not verified.";
        results.append(item);
      }
      status.textContent = candidates.some(candidate => candidate.status === "candidate")
        ? "Some DRM configurations were accepted. No actual encrypted media or screenshot exclusion was tested."
        : "No requested DRM configuration was accepted. This says nothing about GPU acceleration.";
    } catch {
      status.textContent = "The EME compatibility check failed; no private data was accessed.";
    } finally {
      button.disabled = false;
    }
  })();
});
