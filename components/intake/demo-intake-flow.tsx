"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  DEMO_SOURCES,
  EXPECTED_INCIDENT_PREVIEW,
  markIntakeComplete,
  PROCESSING_STEPS,
} from "@/lib/intake-demo";

type SourceStatus = "ready" | "connected";
type IntakePhase = "connect" | "processing" | "complete";

export function DemoIntakeFlow() {
  const router = useRouter();
  const [sourceStatus, setSourceStatus] = useState<Record<string, SourceStatus>>(
    () =>
      Object.fromEntries(DEMO_SOURCES.map((source) => [source.id, "ready"])) as Record<
        string,
        SourceStatus
      >,
  );
  const [phase, setPhase] = useState<IntakePhase>("connect");
  const [processingIndex, setProcessingIndex] = useState(-1);

  const allConnected = useMemo(
    () => DEMO_SOURCES.every((source) => sourceStatus[source.id] === "connected"),
    [sourceStatus],
  );

  function connectSource(sourceId: string) {
    setSourceStatus((current) => ({
      ...current,
      [sourceId]: "connected",
    }));
  }

  async function pullLatestReports() {
    if (!allConnected || phase !== "connect") {
      return;
    }

    setPhase("processing");
    setProcessingIndex(0);

    for (let index = 0; index < PROCESSING_STEPS.length; index += 1) {
      setProcessingIndex(index);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    setPhase("complete");
  }

  function openCommandCenter() {
    markIntakeComplete();
    router.push("/command");
  }

  return (
    <div className="intake-shell">
      <main className="intake-main">
        <header className="intake-header">
          <div>
            <Link href="/" className="text-sm text-slate-400 transition-colors hover:text-white">
              ← Back to landing
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              Simulated intake demo
            </h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-6 text-slate-400">
              Mock source connection flow — demo sources can receive reports for
              simulated intake. No live CRM systems are connected.
            </p>
          </div>
        </header>

        <section className="ops-panel">
          <h2 className="ops-heading mb-4">Connect demo sources</h2>
          <ul className="intake-source-list">
            {DEMO_SOURCES.map((source) => {
              const status = sourceStatus[source.id];

              return (
                <li key={source.id} className="intake-source-row">
                  <div>
                    <p className="font-medium text-white">{source.label}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Demo source — mock connection only
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`intake-status-badge ${
                        status === "connected"
                          ? "intake-status-connected"
                          : "intake-status-ready"
                      }`}
                      data-testid={`source-status-${source.id}`}
                    >
                      {status === "connected" ? "Connected" : "Ready"}
                    </span>
                    {status === "ready" ? (
                      <button
                        type="button"
                        className="intake-connect-button"
                        data-testid={`connect-${source.id}`}
                        onClick={() => connectSource(source.id)}
                      >
                        Connect
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="landing-cta-primary"
              data-testid="pull-latest-reports"
              disabled={!allConnected || phase !== "connect"}
              onClick={() => void pullLatestReports()}
            >
              Pull latest reports
            </button>
            {phase === "complete" ? (
              <button
                type="button"
                className="landing-cta-secondary"
                data-testid="open-command-center"
                onClick={openCommandCenter}
              >
                Open command center
              </button>
            ) : null}
          </div>
        </section>

        {phase === "processing" || phase === "complete" ? (
          <section className="ops-panel" data-testid="intake-processing-panel">
            <h2 className="ops-heading mb-4">Simulated processing</h2>
            <ol className="intake-processing-list">
              {PROCESSING_STEPS.map((step, index) => {
                const isComplete =
                  phase === "complete" || (phase === "processing" && index < processingIndex);
                const isActive = phase === "processing" && index === processingIndex;

                return (
                  <li
                    key={step}
                    className={`intake-processing-step ${
                      isComplete ? "intake-processing-complete" : ""
                    } ${isActive ? "intake-processing-active" : ""}`}
                    data-testid={`processing-step-${index}`}
                  >
                    {step}
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}

        {phase === "complete" ? (
          <section className="ops-panel" data-testid="intake-complete-panel">
            <p className="text-lg font-semibold text-emerald-300" data-testid="intake-incident-count">
              3 incidents created
            </p>
            <ul className="mt-4 space-y-2">
              {EXPECTED_INCIDENT_PREVIEW.map((incident) => (
                <li
                  key={incident.id}
                  className="intake-preview-row"
                  data-testid={`intake-incident-${incident.id}`}
                >
                  <span className="font-medium text-white">{incident.title}</span>
                  <span className="text-slate-500">—</span>
                  <span className="text-amber-200">{incident.priority}</span>
                  <span className="text-slate-500">—</span>
                  <span className="text-slate-300">{incident.team}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
