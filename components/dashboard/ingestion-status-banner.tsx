"use client";

import { useEffect, useState } from "react";

type IngestionStatusBannerProps = {
  fallbackMessage?: string | null;
  refreshKey?: number;
};

type IngestionStatusPayload = {
  statusLine: string;
  detailLine: string;
  elasticConfigured: boolean;
  seedHealth?: {
    ready: boolean;
  };
};

export function IngestionStatusBanner({
  fallbackMessage,
  refreshKey = 0,
}: IngestionStatusBannerProps) {
  const [status, setStatus] = useState<IngestionStatusPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/ingest/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload) {
          setStatus(payload as IngestionStatusPayload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({
            statusLine: "Operations data not connected",
            detailLine:
              "Connect stadium operations data to load current incidents from Elastic.",
            elasticConfigured: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (!status && !fallbackMessage) {
    return null;
  }

  return (
    <div
      className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5"
      data-testid="ingestion-status-banner"
    >
      {status ? (
        <>
          <p className="text-xs font-semibold text-slate-800">{status.statusLine}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-600">{status.detailLine}</p>
          {status.seedHealth?.ready ? (
            <p
              className="mt-0.5 text-xs leading-5 text-emerald-800"
              data-testid="ingestion-seed-ready"
            >
              Seeded stadium operations data ready for retrieval.
            </p>
          ) : null}
        </>
      ) : null}
      {fallbackMessage ? (
        <p className="mt-1 text-xs leading-5 text-amber-900">{fallbackMessage}</p>
      ) : null}
    </div>
  );
}
