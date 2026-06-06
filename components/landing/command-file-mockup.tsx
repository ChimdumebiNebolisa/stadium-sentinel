import {
  COMMAND_FILE_META,
  COMMAND_FILE_STICKIES,
  PARSED_INCIDENTS,
  RAW_INTAKE_LINES,
} from "@/lib/landing-data";

import { LandingPriorityPill } from "@/components/landing/landing-priority-pill";
import { HistoryIcon, LockIcon, SparkleIcon, VoiceIcon } from "@/components/landing/landing-icons";

function StickyNote({
  title,
  body,
  variant,
  position,
  connectorSide,
}: {
  title: string;
  body: string;
  variant: "amber" | "blue" | "green" | "navy";
  position: "top-left" | "middle-right" | "bottom-left" | "bottom-right";
  connectorSide?: "left" | "right";
}) {
  return (
    <div className={`landing-sticky landing-sticky-${variant} landing-sticky-${position}`}>
      {connectorSide ? (
        <span
          className={`landing-sticky-connector landing-sticky-connector-${connectorSide}`}
          aria-hidden="true"
        />
      ) : null}
      <h4 className="landing-sticky-title">{title}</h4>
      <p className="landing-sticky-body">{body}</p>
    </div>
  );
}

export function CommandFileMockup() {
  return (
    <section id="demo" className="landing-mockup-section">
      {COMMAND_FILE_STICKIES.map((note) => (
        <StickyNote key={note.title} {...note} />
      ))}

      <div className="landing-mockup-panel landing-command-file-panel">
        <div className="landing-mockup-chrome">
          <div className="landing-mockup-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="landing-mockup-url">
            <LockIcon />
            {COMMAND_FILE_META.url}
          </div>
        </div>

        <div className="landing-mockup-body">
          <aside className="landing-mockup-sidebar">
            <div>
              <div className="landing-file-status">
                <span className="landing-file-pulse" aria-hidden="true" />
                <span className="landing-mono">{COMMAND_FILE_META.fileId}</span>
              </div>
              <h2 className="landing-mockup-title">{COMMAND_FILE_META.title}</h2>
              <div className="landing-event-tag">EVENT: {COMMAND_FILE_META.event}</div>
            </div>

            <dl className="landing-meta-list">
              <div>
                <dt>Status</dt>
                <dd>{COMMAND_FILE_META.status}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{COMMAND_FILE_META.created}</dd>
              </div>
              <div>
                <dt>Sources</dt>
                <dd className="landing-source-chips">
                  {COMMAND_FILE_META.sources.map((source) => (
                    <span key={source}>{source}</span>
                  ))}
                </dd>
              </div>
            </dl>
          </aside>

          <div className="landing-mockup-main">
            <div className="landing-intake-block">
              <div className="landing-intake-header">
                <h3>
                  <VoiceIcon />
                  Raw intake buffer
                </h3>
                <span className="landing-intake-timer">T-00:05:00</span>
              </div>
              <div className="landing-intake-log">
                {RAW_INTAKE_LINES.map((line) => (
                  <div key={line.timestamp} className="landing-intake-line">
                    <span className="landing-mono">
                      [{line.timestamp} - {line.source}]
                    </span>{" "}
                    &ldquo;{line.text}&rdquo;
                  </div>
                ))}
              </div>
            </div>

            <div className="landing-parsing-band">
              <div className="landing-parsing-label">
                <SparkleIcon />
                Parsing entities &amp; routing...
              </div>
              <span className="landing-parsing-count">SPLIT_COUNT: 3</span>
            </div>

            <div className="landing-table-wrap">
              <table
                className="landing-dense-table"
                data-testid="landing-expected-incidents"
              >
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Description</th>
                    <th>Priority</th>
                    <th>Team</th>
                    <th className="landing-table-action-col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {PARSED_INCIDENTS.map((incident) => (
                    <tr key={incident.id}>
                      <td className="landing-mono landing-table-id">{incident.id}</td>
                      <td className="landing-table-desc">{incident.description}</td>
                      <td>
                        <LandingPriorityPill level={incident.priority} />
                      </td>
                      <td className="landing-table-team">{incident.team}</td>
                      <td className="landing-table-action-col">
                        <span className="landing-dispatch-btn">Dispatch</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="landing-timeline-footer">
              <div className="landing-timeline-summary">
                <HistoryIcon />
                Timeline: <span>3 events logged</span>
              </div>
              <span className="landing-report-link">View full report</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
