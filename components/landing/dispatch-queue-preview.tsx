"use client";

import { useState } from "react";

import { SearchIcon } from "@/components/landing/landing-icons";

type DispatchRow = {
  time: string;
  incident: string;
  status: "DISPATCHED" | "PENDING" | "RESOLVED";
  location: string;
  assigned: string | null;
  team: "SECURITY" | "FACILITIES";
};

type FilterDef = {
  label: string;
  count: number;
  active: boolean;
};

type ActiveTab = "ALL" | "SECURITY" | "FACILITIES";

function StatusPill({ status }: { status: DispatchRow["status"] }) {
  return (
    <span className={`landing-status-pill landing-status-${status.toLowerCase()}`}>
      {status}
    </span>
  );
}

export function DispatchQueuePreview({
  rows,
  filters,
}: {
  rows: ReadonlyArray<DispatchRow>;
  filters: ReadonlyArray<FilterDef>;
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("ALL");
  const [searchText, setSearchText] = useState("");

  const filteredRows = rows.filter((row) => {
    const tabMatch = activeTab === "ALL" || row.team === activeTab;
    const searchMatch =
      !searchText.trim() ||
      row.incident.toLowerCase().includes(searchText.toLowerCase()) ||
      row.location.toLowerCase().includes(searchText.toLowerCase());
    return tabMatch && searchMatch;
  });

  return (
    <div className="landing-mockup-panel landing-queue-panel" data-testid="landing-queue-panel">
      <div className="landing-queue-toolbar">
        <div className="landing-queue-tabs">
          {filters.map((filter) => {
            const tab = filter.label as ActiveTab;
            return (
              <button
                key={filter.label}
                type="button"
                className={activeTab === tab ? "landing-queue-tab active" : "landing-queue-tab"}
                onClick={() => setActiveTab(tab)}
              >
                {filter.label} ({filter.count})
              </button>
            );
          })}
        </div>
        <div className="landing-queue-search">
          <SearchIcon />
          <input
            type="text"
            placeholder="Filter queue..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="bg-transparent outline-none"
          />
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
          {filteredRows.length === 0 ? (
            <tr>
              <td colSpan={5} className="landing-unassigned" style={{ textAlign: "center" }}>
                No incidents match this filter.
              </td>
            </tr>
          ) : (
            filteredRows.map((row) => (
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
