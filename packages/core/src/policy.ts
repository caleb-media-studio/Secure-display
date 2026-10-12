import type { DrmProbe } from "./capabilities.js";

/** Strict protection always fails closed until a verifiable platform API exists. */
export type DisclosurePolicy = "capture-exclusion-required" | "synthetic-drm-lab";
export type DisplayDecision =
  | { status: "blocked"; reason: string }
  | { status: "synthetic-test-allowed"; reason: string };
export function evaluateDisplayPolicy(
  policy: DisclosurePolicy, probes: readonly DrmProbe[],
): DisplayDecision {
  if (policy === "capture-exclusion-required") return {
    status: "blocked",
    reason: "This browser cannot attest that independent screen-capture tools will omit these pixels.",
  };
  if (!probes.some(probe => probe.status === "candidate")) return {
    status: "blocked", reason: "No DRM candidate was found for this synthetic test.",
  };
  return {
    status: "synthetic-test-allowed",
    reason: "Only synthetic test media may be used. Screenshot exclusion remains unverified.",
  };
}
