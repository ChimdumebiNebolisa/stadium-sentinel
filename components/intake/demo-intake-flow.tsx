"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  DEMO_SOURCES,
  markIntakeComplete,
  markSourcesConnected,
} from "@/lib/intake-demo";

type SourceStatus = "ready" | "connecting" | "connected";

export function DemoIntakeFlow() {
  const router = useRouter();
  const [sourceStatus, setSourceStatus] = useState<Record<string, SourceStatus>>(
    () =>
      Object.fromEntries(DEMO_SOURCES.map((source) => [source.id, "ready"])) as Record<
        string,
        SourceStatus
      >,
  );
  const isConnecting = useRef(false);

  const allConnected = useMemo(
    () => DEMO_SOURCES.every((source) => sourceStatus[source.id] === "connected"),
    [sourceStatus],
  );

  const isConnectingInProgress = DEMO_SOURCES.some(
    (source) => sourceStatus[source.id] === "connecting",
  );

  // Persist source connection flag to localStorage when all sources reach "connected"
  useEffect(() => {
    if (allConnected) markSourcesConnected();
  }, [allConnected]);

  async function startAutoConnect() {
    if (isConnecting.current) return;
    isConnecting.current = true;

    for (const source of DEMO_SOURCES) {
      setSourceStatus((current) => ({ ...current, [source.id]: "connecting" }));
      await new Promise((resolve) => setTimeout(resolve, 700));
      setSourceStatus((current) => ({ ...current, [source.id]: "connected" }));
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    isConnecting.current = false;
  }

  function openCommandCenter() {
    markIntakeComplete();
    router.push("/command");
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
              ← Back to landing
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#07111c]">
              Simulated intake demo
            </h1>
            <p className="mt-2 max-w-[52ch] text-sm leading-5 text-slate-600">
              Connect demo sources, then open the command center to pull reports.
            </p>
          </div>
        </header>

        <section className="ops-panel">
          <h2 className="ops-heading mb-3 text-sm">Connect demo sources</h2>
          <ul className="intake-source-list">
            {DEMO_SOURCES.map((source) => {
              const status = sourceStatus[source.id];

              return (
                <li key={source.id} className="intake-source-row">
                  <div>
                    <p className="font-medium text-[#07111c]">{source.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Mock connection</p>
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
                Connect demo sources
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
