"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { DemoStatusIndicator } from "@/components/dashboard/demo-status-indicator";
import { isRealDemoFlowEnabled } from "@/lib/feature-flags";
import { fetchIngestBootstrap } from "@/lib/ingest-bootstrap-client";
import {
  DEMO_SOURCES,
  markIntakeComplete,
  markOperationsConnected,
  markSourcesConnected,
} from "@/lib/intake-demo";

type SourceStatus = "ready" | "connecting" | "connected";

export function DemoIntakeFlow() {
  const router = useRouter();
  const realDemoFlow = isRealDemoFlowEnabled();
  const [sourceStatus, setSourceStatus] = useState<Record<string, SourceStatus>>(
    () =>
      Object.fromEntries(DEMO_SOURCES.map((source) => [source.id, "ready"])) as Record<
        string,
        SourceStatus
      >,
  );
  const [operationsConnected, setOperationsConnected] = useState(false);
  const [connectStatus, setConnectStatus] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const isConnecting = useRef(false);

  const allConnected = useMemo(
    () => DEMO_SOURCES.every((source) => sourceStatus[source.id] === "connected"),
    [sourceStatus],
  );

  const isConnectingInProgress = DEMO_SOURCES.some(
    (source) => sourceStatus[source.id] === "connecting",
  );

  useEffect(() => {
    if (!realDemoFlow && allConnected) {
      markSourcesConnected();
    }
  }, [allConnected, realDemoFlow]);

  async function startAutoConnect() {
    if (isConnecting.current) {
      return;
    }
    isConnecting.current = true;

    for (const source of DEMO_SOURCES) {
      setSourceStatus((current) => ({ ...current, [source.id]: "connecting" }));
      await new Promise((resolve) => setTimeout(resolve, 700));
      setSourceStatus((current) => ({ ...current, [source.id]: "connected" }));
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    isConnecting.current = false;
  }

  async function handleConnectOperationsData() {
    setConnectLoading(true);
    setConnectStatus(null);

    try {
      const result = await fetchIngestBootstrap();

      if (result.outcome === "ready" || result.outcome === "seeded") {
        markOperationsConnected();
        markIntakeComplete();
        setOperationsConnected(true);
        setConnectStatus("Operations data connected.");
        return;
      }

      if (result.outcome === "unconfigured") {
        setConnectStatus("Operations data is unavailable right now.");
        return;
      }

      setConnectStatus(result.errorSummary ?? "Could not connect stadium operations data.");
    } catch {
      setConnectStatus("Could not connect stadium operations data.");
    } finally {
      setConnectLoading(false);
    }
  }

  function openCommandCenter() {
    markIntakeComplete();
    router.push("/command");
  }

  if (realDemoFlow) {
    return (
      <div className="landing-shell intake-shell">
        <main className="intake-main">
          <header className="intake-header">
            <div>
              <Link
                href="/"
                className="text-sm text-slate-500 transition-colors hover:text-[#07111c]"
              >
                Back to landing
              </Link>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#07111c]">
                Stadium operations intake
              </h1>
              <p className="mt-2 max-w-[52ch] text-sm leading-5 text-slate-600">
                Connect stadium operations data, then open the command center to pull
                current incident reports.
              </p>
            </div>
          </header>

          <section className="ops-panel">
            <h2 className="ops-heading mb-3 text-sm">Connect stadium operations data</h2>
            <p className="text-sm text-slate-600">
              Loads current incidents, policies, roster, and radio transcripts when
              Elastic is available.
            </p>
            <DemoStatusIndicator className="mt-3" />

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {!operationsConnected ? (
                <button
                  type="button"
                  className="landing-cta-primary"
                  data-testid="connect-operations-data"
                  disabled={connectLoading}
                  onClick={() => void handleConnectOperationsData()}
                >
                  {connectLoading ? "Connecting..." : "Connect operations data"}
                </button>
              ) : (
                <button
                  type="button"
                  className="landing-cta-primary"
                  data-testid="open-command-center"
                  onClick={openCommandCenter}
                >
                  Open command center
                </button>
              )}
              {connectStatus ? (
                <p className="text-sm text-slate-600" data-testid="intake-connect-status">
                  {connectStatus}
                </p>
              ) : null}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="landing-shell intake-shell">
      <main className="intake-main">
        <header className="intake-header">
          <div>
            <Link
              href="/"
              className="text-sm text-slate-500 transition-colors hover:text-[#07111c]"
            >
              Back to landing
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#07111c]">
              Operations intake
            </h1>
            <p className="mt-2 max-w-[52ch] text-sm leading-5 text-slate-600">
              Connect operations sources, then open the command center to pull reports.
            </p>
          </div>
        </header>

        <section className="ops-panel">
          <h2 className="ops-heading mb-3 text-sm">Connect operations sources</h2>
          <ul className="intake-source-list">
            {DEMO_SOURCES.map((source) => {
              const status = sourceStatus[source.id];

              return (
                <li key={source.id} className="intake-source-row">
                  <div>
                    <p className="font-medium text-[#07111c]">{source.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Operations source</p>
                  </div>
                  <span
                    className={`intake-status-badge ${
                      status === "connected"
                        ? "intake-status-connected"
                        : status === "connecting"
                          ? "intake-status-connecting"
                          : "intake-status-ready"
                    }`}
                    data-testid={`source-status-${source.id}`}
                  >
                    {status === "connected"
                      ? "Connected"
                      : status === "connecting"
                        ? "Connecting..."
                        : "Not connected"}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!allConnected ? (
              <button
                type="button"
                className="landing-cta-primary"
                data-testid="connect-demo-sources"
                disabled={isConnectingInProgress}
                onClick={() => void startAutoConnect()}
              >
                Connect operations sources
              </button>
            ) : (
              <button
                type="button"
                className="landing-cta-primary"
                data-testid="open-command-center"
                onClick={openCommandCenter}
              >
                Open command center
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
