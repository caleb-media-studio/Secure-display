/** Explicitly distinguishes missing example setup from browser/CDM failure. */
export class SecureDisplaySetupError extends Error {
  readonly code = "DRM_PROVIDER_NOT_CONFIGURED" as const;
  constructor() {
    super("DRM test provider is not configured.");
    this.name = "SecureDisplaySetupError";
  }
}
