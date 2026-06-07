import type { IncidentMemorySummary } from "@/lib/demo-agent-workflow";

export function DemoMemoryPanel({
  memorySummary,
}: {
  memorySummary: IncidentMemorySummary;
}) {
  return (
    <section className="border-t border-slate-200 pt-4" data-testid="demo-memory-panel">
      <h3 className="ops-heading">{memorySummary.headline}</h3>
      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-600">
        {memorySummary.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
