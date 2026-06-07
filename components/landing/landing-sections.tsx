import Link from "next/link";

import {
  CAPABILITY_CARDS,
  DISPATCH_FILTERS,
  DISPATCH_QUEUE_ROWS,
  FOOTER_LINKS,
  SWIMLANE_TIME_MARKS,
  TECH_APPENDIX_ITEMS,
} from "@/lib/landing-data";

import {
  DashboardIcon,
  FolderIcon,
  MemoryIcon,
  MicIcon,
  PlayIcon,
  SearchIcon,
} from "@/components/landing/landing-icons";

const capabilityIcons = {
  mic: MicIcon,
  folder: FolderIcon,
  memory: MemoryIcon,
} as const;

function StatusPill({ status }: { status: "DISPATCHED" | "PENDING" | "RESOLVED" }) {
  return <span className={`landing-status-pill landing-status-${status.toLowerCase()}`}>{status}</span>;
}

export function DispatchQueueSection() {
  return (
    <section className="landing-section landing-dispatch-section">
      <div className="landing-section-heading">
        <h2>Active dispatch queue</h2>
        <p>
          Monitor simulated incidents across demo sources in a single pane of glass.
        </p>
      </div>

      <div className="landing-sticky landing-sticky-amber landing-sticky-filter">
        <h4 className="landing-sticky-title">Sort &amp; filter</h4>
        <p className="landing-sticky-body">
          Instantly pivot views by team, location, or priority.
        </p>
      </div>

      <div className="landing-mockup-panel landing-queue-panel">
        <div className="landing-queue-toolbar">
          <div className="landing-queue-tabs">
            {DISPATCH_FILTERS.map((filter) => (
              <span
                key={filter.label}
                className={filter.active ? "landing-queue-tab active" : "landing-queue-tab"}
              >
                {filter.label} ({filter.count})
              </span>
            ))}
          </div>
          <div className="landing-queue-search">
            <SearchIcon />
            <span>Filter queue...</span>
          </div>
        </div>

        <table className="landing-dense-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Incident</th>
              <th>Status</th>
              <th>Location</th>
              <th>Assigned to</th>
            </tr>
          </thead>
          <tbody>
            {DISPATCH_QUEUE_ROWS.map((row) => (
              <tr key={`${row.time}-${row.incident}`}>
                <td className="landing-mono">{row.time}</td>
                <td className="landing-table-desc">{row.incident}</td>
                <td>
                  <StatusPill status={row.status} />
                </td>
                <td className="landing-table-team">{row.location}</td>
                <td className={row.assigned ? "landing-table-team" : "landing-unassigned"}>
                  {row.assigned ?? "Unassigned"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

export function CapabilityCardsSection() {
  return (
    <section id="workflow" className="landing-section landing-capability-section">
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

export function TechnicalAppendixSection() {
  return (
    <section id="agent-layer" className="landing-section landing-appendix-section">
      <div className="landing-appendix-band">
        <h2>Technical appendix</h2>
        <div className="landing-appendix-grid">
          {TECH_APPENDIX_ITEMS.map((item) => (
            <article key={item.title} className="landing-appendix-card">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
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
        <h2>Open the command center.</h2>
        <div className="landing-cta-row landing-final-cta-row">
          <Link
            href="/demo/intake"
            className="landing-cta-final-primary"
            data-testid="final-cta-intake-demo"
          >
            <PlayIcon />
            Run intake demo
          </Link>
          <Link
            href="/command"
            className="landing-cta-final-secondary"
            data-testid="final-cta-command-center"
          >
            <DashboardIcon />
            Open command center
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
            Demo simulation only — mock source connections, not live CRM integrations.
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
