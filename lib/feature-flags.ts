/** Venue schematic panel — off by default for real-demo / hackathon path. */
export function isVenueOrientationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_VENUE_ORIENTATION === "true";
}
