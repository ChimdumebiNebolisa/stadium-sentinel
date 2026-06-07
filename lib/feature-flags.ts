/** Venue schematic panel — off by default for real-demo / hackathon path. */
export function isVenueOrientationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_VENUE_ORIENTATION === "true";
}

export function isElasticPullEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_ELASTIC_PULL !== "false";
}

export function isSentinelAgentEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_SENTINEL_AGENT !== "false";
}

export function isSentinelVoiceEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_SENTINEL_VOICE === "true";
}

export function isRadioTranscriptPanelEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_RADIO_TRANSCRIPT === "true";
}

const RADIO_TRANSCRIPT_PANEL_OVERRIDE_KEY = "stadium-sentinel-show-radio-transcript";

/** Dev/e2e override when the build-time flag is off. */
export function readRadioTranscriptPanelEnabled(): boolean {
  if (isRadioTranscriptPanelEnabled()) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(RADIO_TRANSCRIPT_PANEL_OVERRIDE_KEY) === "true";
}

export { RADIO_TRANSCRIPT_PANEL_OVERRIDE_KEY };
