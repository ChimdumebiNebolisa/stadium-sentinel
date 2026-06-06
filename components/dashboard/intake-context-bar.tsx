"use client";

import { useEffect, useState } from "react";

import { readIntakeComplete } from "@/lib/intake-demo";

export function IntakeContextBar() {
  const [mounted, setMounted] = useState(false);
  const [intakeComplete, setIntakeComplete] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIntakeComplete(readIntakeComplete());
  }, []);

  return (
    <section
      className="ops-panel ops-strip intake-context-bar"
      data-testid="intake-context-bar"
    >
      <p className="text-sm text-slate-300">
        Sources synced: Guest Services · Security · Facilities · Radio Log
      </p>
      {mounted && intakeComplete ? (
        <div className="mt-2 space-y-1 text-sm text-slate-400">
          <p data-testid="intake-last-sync">Last sync: Demo intake completed</p>
          <p data-testid="intake-summary">
            1 staff report was consolidated into 3 incidents. Highest priority:
            Section 112 accessibility assist.
          </p>
        </div>
      ) : null}
    </section>
  );
}
