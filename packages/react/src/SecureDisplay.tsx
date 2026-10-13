import {useEffect, useState} from "react";
import {probeDrmPaths, evaluateDisplayPolicy, type DrmProbe, type DisclosurePolicy} from "@caleb-media-studio-llc/core";

export interface SecureDisplayProps {
  /** Strict policy blocks every attempt to display confidential content. */
  policy?: DisclosurePolicy;
  className?: string;
  onProbe?: (probes: DrmProbe[]) => void;
}
/**
 * A fail-closed policy gate. NOT a protected display surface or video renderer.
 * Do not pass secrets into React props, state, HTML attributes, or children.
 */
export function SecureDisplay({policy = "capture-exclusion-required", className, onProbe}: SecureDisplayProps) {
  const [state, setState] = useState<"idle" | "checking" | "complete">("idle");
  const [probes, setProbes] = useState<DrmProbe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const decision = evaluateDisplayPolicy(policy, probes);
  useEffect(() => {
    setState("idle");
    setProbes([]);
    setError(null);
  }, [policy]);
  async function check() {
    setState("checking");
    setError(null);
    try {
      const next = await probeDrmPaths();
      setProbes(next);
      onProbe?.(next);
    } catch {
      setError("DRM probe failed. Content remains blocked.");
      setProbes([]);
    } finally {
      setState("complete");
    }
  }
  return <section className={className} aria-label="Secure Display status" data-protection-status={decision.status}>
    <strong>{decision.status === "blocked" ? "Sensitive display blocked" : "Synthetic DRM lab only"}</strong>
    <p role="status">{error ?? decision.reason}</p>
    <button type="button" onClick={() => void check()} disabled={state === "checking"}>
      {state === "checking" ? "Checking DRM availability..." : "Check browser DRM availability"}
    </button>
    {state === "complete" && <ul aria-label="DRM capability results">{probes.map(probe =>
      <li key={probe.kind}>{probe.kind}: {probe.status}. Capture exclusion: not verified.</li>)}</ul>}
  </section>;
}
