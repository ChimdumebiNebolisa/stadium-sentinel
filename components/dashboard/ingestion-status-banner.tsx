"use client";

import { useEffect, useState } from "react";

type IngestionStatusBannerProps = {
  fallbackMessage?: string | null;
};

type IngestionStatusPayload = {
  statusLine: string;
  detailLine: string;
  elasticConfigured: boolean;
};

export function IngestionStatusBanner({
  fallbackMessage,
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
            statusLine: "Operating on demo/local data",
            detailLine:
              "Ingestion status unavailable. Demo/local fallback remains active.",
            elasticConfigured: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
        </>
      ) : null}
      {fallbackMessage ? (
        <p className="mt-1 text-xs leading-5 text-amber-900">{fallbackMessage}</p>
      ) : null}
    </div>
  );
}
