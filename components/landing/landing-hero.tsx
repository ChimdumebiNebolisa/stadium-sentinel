import Link from "next/link";

import { LANDING_PROOF_STATS } from "@/lib/landing-data";

import { DashboardIcon, PlayIcon } from "@/components/landing/landing-icons";

export function LandingHero() {
  return (
    <section className="landing-hero">
      <p className="landing-eyebrow">Stadium incident operations</p>
      <h1 className="landing-headline">
        Make every stadium report easy to understand and act on.
      </h1>
      <p className="landing-subtext">
        Stadium Sentinel brings guest services, security, facilities, and radio
        updates into one command file, then turns them into assigned incidents
        with priorities, next actions, timelines, and report output.{" "}
        {LANDING_PROOF_STATS.heroAttendance.text}
      </p>
      <p className="landing-proof-line landing-proof-line-hero">
        <span className="landing-proof-source">{LANDING_PROOF_STATS.heroAttendance.source}</span>
      </p>

      <div className="landing-cta-row">
        <Link
          href="/command"
          className="landing-cta-primary"
          data-testid="hero-cta-intake-demo"
        >
          <PlayIcon />
          Open operations intake
        </Link>
        <Link
          href="/command"
          className="landing-cta-secondary"
          data-testid="hero-cta-command-center"
        >
          <DashboardIcon />
          Open command center
        </Link>
      </div>
    </section>
  );
}
