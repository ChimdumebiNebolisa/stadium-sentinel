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
