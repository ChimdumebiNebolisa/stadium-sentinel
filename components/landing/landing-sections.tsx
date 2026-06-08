import Link from "next/link";

import {
  CAPABILITY_CARDS,
  DISPATCH_FILTERS,
  DISPATCH_QUEUE_ROWS,
  FOOTER_LINKS,
  LANDING_PROOF_STATS,
  SWIMLANE_TIME_MARKS,
} from "@/lib/landing-data";

import {
  FolderIcon,
  MemoryIcon,
  MicIcon,
  PlayIcon,
} from "@/components/landing/landing-icons";
import { DispatchQueuePreview } from "@/components/landing/dispatch-queue-preview";

const capabilityIcons = {
  mic: MicIcon,
  folder: FolderIcon,
  memory: MemoryIcon,
} as const;


export function DispatchQueueSection() {
  return (
    <section id="demo" className="landing-section landing-dispatch-section">
      <div className="landing-section-heading">
        <h2>Active dispatch queue</h2>
        <p>Monitor current incidents in one focused operations command center.</p>
      </div>

      <div className="landing-sticky landing-sticky-amber landing-sticky-filter">
        <h4 className="landing-sticky-title">Sort &amp; filter</h4>
        <p className="landing-sticky-body">
          Instantly pivot views by team, location, or priority.
        </p>
      </div>

      <DispatchQueuePreview rows={DISPATCH_QUEUE_ROWS} filters={DISPATCH_FILTERS} />
    </section>
  );
}

export function SwimlaneTimelineSection() {
  return (
    <section className="landing-section">
      <div className="landing-section-heading">
        <h2>Swimlane timeline</h2>
        <p>Track response velocity across departments.</p>
      </div>

      <div className="landing-mockup-panel landing-swimlane-panel">
        <div className="landing-swimlane-times">
          {SWIMLANE_TIME_MARKS.map((mark) => (
            <span key={mark} className={mark === "NOW" ? "landing-swimlane-now" : undefined}>
              {mark}
            </span>
          ))}
        </div>

        <div className="landing-swimlane-row">
          <div className="landing-swimlane-label">Security</div>
          <div className="landing-swimlane-track">
            <span className="landing-swimlane-node start">Gate B blocked</span>
            <span className="landing-swimlane-line" />
            <span className="landing-swimlane-node dispatched">Dispatched</span>
            <span className="landing-swimlane-line" />
            <span className="landing-swimlane-node cleared">Cleared</span>
          </div>
        </div>

        <div className="landing-swimlane-row">
          <div className="landing-swimlane-label">Facilities</div>
          <div className="landing-swimlane-track">
            <span className="landing-swimlane-node start">Elevator 4 down</span>
            <span className="landing-swimlane-line" />
            <span className="landing-swimlane-node dispatched">Dispatched</span>
            <span className="landing-swimlane-line dashed" />
            <span className="landing-swimlane-node pending">Pending fix</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AskSentinelSection() {
  return (
    <section id="agent" className="landing-section landing-agent-section">
      <div className="landing-section-heading">
        <h2>Ask Sentinel by voice</h2>
        <p>
          Ask what happened, who is handling it, what changed, or what needs to happen next.
          Sentinel answers from live incident context and can open evidence, prepare dispatch,
          or draft the incident report.
        </p>
      </div>

      <div className="landing-proof-callout landing-proof-callout-agent">
        <p>{LANDING_PROOF_STATS.searchFriction.text}</p>
        <span className="landing-stat-source">{LANDING_PROOF_STATS.searchFriction.source}</span>
      </div>

      <div className="landing-agent-points">
        <article className="landing-agent-point">
          <h3>Hands-free updates</h3>
          <p>Staff ask Sentinel while moving through the venue — no dashboard hunting.</p>
        </article>
        <article className="landing-agent-point">
          <h3>Live operational memory</h3>
          <p>Answers draw from command-center updates, ground reports, and Elastic-backed incident context.</p>
        </article>
        <article className="landing-agent-point">
          <h3>Take the next step</h3>
          <p>Open evidence, prepare dispatch, or draft the incident report from the selected incident.</p>
        </article>
      </div>
    </section>
  );
}

export function CapabilityCardsSection() {
  return (
    <section className="landing-section landing-capability-section">
      <div className="landing-proof-callout landing-proof-callout-problem">
        <p>{LANDING_PROOF_STATS.staffingPressure.text}</p>
        <span className="landing-stat-source">{LANDING_PROOF_STATS.staffingPressure.source}</span>
      </div>

      <div className="landing-capability-grid">
        {CAPABILITY_CARDS.map((card) => {
          const Icon = capabilityIcons[card.icon];
          return (
            <article key={card.title} className="landing-capability-card">
              <Icon />
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function FinalCtaSection() {
  return (
    <section className="landing-section landing-final-cta-section">
      <div className="landing-final-cta-panel">
        <div className="landing-final-cta-bg" aria-hidden="true">
          <span className="landing-cta-watermark landing-cta-watermark-dispatch">DISPATCH</span>
          <span className="landing-cta-watermark landing-cta-watermark-command">COMMAND FILE</span>
          <span className="landing-cta-watermark landing-cta-watermark-ops">OPS</span>
        </div>
        <h2>Try Sentinel on a live incident.</h2>
        <p className="landing-final-cta-body">
          Ask Sentinel what happened, who is handling it, what changed, or what should happen next.
        </p>
        <div className="landing-cta-row landing-final-cta-row">
          <Link
            href="/command"
            className="landing-cta-final-primary"
            data-testid="final-cta-launch-demo"
          >
            <PlayIcon />
            Launch live demo
          </Link>
        </div>
      </div>
      <div className="landing-cta-doc landing-cta-doc-left" aria-hidden="true" />
      <div className="landing-cta-doc landing-cta-doc-right" aria-hidden="true" />
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div>
          <p className="landing-footer-brand">Stadium Sentinel</p>
          <p className="landing-footer-copy">&copy; 2026 Stadium Sentinel</p>
          <p className="landing-footer-disclaimer">
            Command center preview for soccer-stadium incident operations.
          </p>
        </div>
        <div className="landing-footer-links">
          {FOOTER_LINKS.map((label) => (
            <a key={label} href="#">
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
