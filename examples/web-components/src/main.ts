import { probeDrmPaths, probeSoftwareWidevineBaseline } from "@caleb-media-studio-llc/core";
import { registerSecureElements, SecureDisplaySetupError } from "@caleb-media-studio-llc/elements";

/**
 * The example remains fail-closed. Software DRM probes are informational only,
 * never a fallback for sensitive-media rendering.
 */
registerSecureElements({
  async resolveAsset() { throw new SecureDisplaySetupError(); },
  async requestLicense() { throw new SecureDisplaySetupError(); },
});

const button = document.querySelector<HTMLButtonElement>("#check-drm");
const status = document.querySelector<HTMLElement>("#drm-check-status");
const results = document.querySelector<HTMLUListElement>("#drm-check-results");
if (!button || !status || !results) throw Error("Diagnostic interface is missing.");

button.addEventListener("click", () => {
  void (async () => {
    button.disabled = true;
    status.textContent = "Checking EME configurations (no protected data is loaded)...";
    results.replaceChildren();
    try {
      const [strict, software] = await Promise.all([
        probeDrmPaths(), probeSoftwareWidevineBaseline(),
      ]);
      for (const candidate of strict) {
        const li = document.createElement("li");
        li.textContent = candidate.kind + ": " + candidate.status +
          ". Screenshot exclusion: not verified.";
        results.append(li);
      }
      const baseline = document.createElement("li");
      baseline.textContent = "Widevine software baseline (diagnostic only): " +
        software.status +
        (software.rejectionName ? " (" + software.rejectionName + ")" : "") +
        ". " + software.note;
      results.append(baseline);
      const strictCandidate = strict.some(c => c.status === "candidate");
      status.textContent = strictCandidate
        ? "A hardware DRM configuration was accepted, but screenshot exclusion is still unverified."
        : software.status === "candidate"
          ? "Software Widevine works, but hardware-protected output was not established. Secure fields remain blocked."
          : "No requested EME configuration was accepted. This does not prove the device lacks DRM or GPU support.";
    } catch {
      status.textContent = "EME capability check failed. Secure fields remain blocked.";
    } finally {
      button.disabled = false;
    }
  })();
});
