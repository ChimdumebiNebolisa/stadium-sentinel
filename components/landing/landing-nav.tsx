import Link from "next/link";

import { NAV_LINKS } from "@/lib/landing-data";

export function LandingNav() {
  return (
    <nav className="landing-nav" aria-label="Primary">
      <div className="landing-nav-inner">
        <div className="landing-nav-brand">
          <span className="landing-nav-logo" aria-hidden="true" />
          <span className="landing-nav-title">Stadium Sentinel</span>
        </div>

        <div className="landing-nav-links">
          {NAV_LINKS.map((link) =>
            link.href.startsWith("#") ? (
              <a key={link.label} className="landing-nav-link" href={link.href}>
                {link.label}
              </a>
            ) : (
              <Link key={link.label} className="landing-nav-link" href={link.href}>
                {link.label}
              </Link>
            ),
          )}
        </div>

        <Link className="landing-nav-cta" href="/demo/intake">
          Launch demo
        </Link>
      </div>
    </nav>
  );
}
