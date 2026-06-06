import Link from "next/link";

import {
  DEMO_REPORT_TEXT,
  EXPECTED_INCIDENT_PREVIEW,
  LANDING_SOURCE_CARDS,
  WORKFLOW_STEPS,
} from "@/lib/intake-demo";

export function LandingPage() {
  return (
    <div className="landing-shell">
      <main className="landing-main">
        <header className="landing-header">
          <span className="text-[1.05rem] font-semibold tracking-tight text-white">
            Stadium Sentinel
          </span>
          <Link
            href="/command"
            className="text-sm text-slate-400 transition-colors hover:text-white"
          >
            Open command center
          </Link>
        </header>

        <section className="landing-hero ops-panel">
          <p className="landing-eyebrow">Stadium incident operations</p>
          <h1 className="landing-headline">
            Turn messy stadium reports into dispatch-ready incidents.
          </h1>
          <p className="landing-subtext">
            Stadium Sentinel receives reports from guest services, security,
            facilities, and radio logs, then organizes them into priorities,
            teams, timelines, and reports.
          </p>
          <div className="landing-cta-row">
            <Link
              href="/demo/intake"
              className="landing-cta-primary"
              data-testid="cta-intake-demo"
            >
              Run live intake demo
            </Link>
            <Link
              href="/command"
              className="landing-cta-secondary"
              data-testid="cta-command-center"
            >
              Open command center
            </Link>
          </div>
        </section>

        <section className="landing-sources">
          <h2 className="ops-heading mb-4">Demo sources that can receive reports</h2>
          <div className="landing-source-grid">
            {LANDING_SOURCE_CARDS.map((source) => (
              <article key={source} className="landing-source-card ops-panel">
                <span className="landing-source-dot" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-white">{source}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Mock source connection for demo intake — not a live CRM link.
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-workflow ops-panel">
          <h2 className="ops-heading mb-4">Workflow</h2>
          <ol className="landing-workflow-steps">
            {WORKFLOW_STEPS.map((step, index) => (
              <li key={step} className="landing-workflow-step">
                <span className="landing-workflow-index">{index + 1}</span>
                <span>{step}</span>
                {index < WORKFLOW_STEPS.length - 1 ? (
                  <span className="landing-workflow-arrow" aria-hidden="true">
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-preview ops-panel">
          <h2 className="ops-heading mb-4">Demo preview</h2>
          <div className="landing-preview-grid">
            <div className="landing-preview-block">
              <p className="ops-label mb-2">Scattered staff report</p>
              <blockquote className="landing-preview-quote">
                &ldquo;{DEMO_REPORT_TEXT}&rdquo;
              </blockquote>
            </div>
            <div className="landing-preview-block">
              <p className="ops-label mb-2">Organized incidents</p>
              <ul className="landing-preview-output" data-testid="landing-expected-incidents">
                {EXPECTED_INCIDENT_PREVIEW.map((incident) => (
                  <li key={incident.id} className="landing-preview-row">
                    <span className="font-medium text-white">{incident.title}</span>
                    <span className="text-slate-400">—</span>
                    <span className="text-amber-200">{incident.priority}</span>
                    <span className="text-slate-400">—</span>
                    <span className="text-slate-300">{incident.team}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <p className="text-sm text-slate-500">
            Demo simulation only — mock source connections, not live CRM
            integrations.
          </p>
        </footer>
      </main>
    </div>
  );
}
