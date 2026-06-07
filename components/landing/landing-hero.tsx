import Link from "next/link";

import { DashboardIcon, PlayIcon } from "@/components/landing/landing-icons";

export function LandingHero() {
  return (
    <section className="landing-hero">
      <p className="landing-eyebrow">Stadium incident operations</p>
      <h1 className="landing-headline">
        Make every stadium report easy to understand and act on.
      </h1>
      <p className="landing-subtext">
        Stadium Sentinel brings simulated reports from guest services, security,
        facilities, and radio notes into one command file, then turns them into
        assigned incidents with priorities, next actions, timelines, and report
        output.
      </p>
      <div className="landing-cta-row">
        <Link
          href="/command"
          className="landing-cta-primary"
          data-testid="hero-cta-intake-demo"
        >
          <PlayIcon />
          Run intake demo
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
