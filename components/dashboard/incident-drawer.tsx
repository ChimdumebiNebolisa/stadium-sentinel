"use client";

import type { MouseEvent, ReactNode } from "react";

type WorkspaceView = "evidence" | "staff" | "timeline" | "report" | "source";

type WorkspaceTab = {
  id: WorkspaceView;
  label: string;
};

type IncidentDrawerProps = {
  activeWorkspace: WorkspaceView | null;
  latestSummary: string;
  onOpenWorkspace: (view: WorkspaceView) => void;
  onToggleExpanded: () => void;
  evidencePanel: ReactNode;
  staffPanel: ReactNode;
  timelinePanel: ReactNode;
  reportPanel: ReactNode;
  sourceLogPanel: ReactNode;
};

const workspaceTabs: WorkspaceTab[] = [
  { id: "evidence", label: "Evidence" },
  { id: "staff", label: "Staff Update" },
  { id: "timeline", label: "Incident log" },
  { id: "report", label: "Report" },
  { id: "source", label: "Source log" },
];

function DrawerTabs({
  activeWorkspace,
  onOpenWorkspace,
  className,
}: {
  activeWorkspace: WorkspaceView | null;
  onOpenWorkspace: (view: WorkspaceView) => void;
  className?: string;
}) {
  function handleTabClick(event: MouseEvent<HTMLButtonElement>, view: WorkspaceView) {
    event.stopPropagation();
    onOpenWorkspace(view);
  }

  return (
    <div className={className} aria-label="Workspace panels" role="tablist">
      {workspaceTabs.map((tab) => {
        const isActive = activeWorkspace === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`workspace-panel-${tab.id}`}
            onClick={(event) => handleTabClick(event, tab.id)}
            className={`utility-tab ${isActive ? "utility-tab-active" : "utility-tab-idle"}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function IncidentDrawer({
  activeWorkspace,
  latestSummary,
  onOpenWorkspace,
  onToggleExpanded,
  evidencePanel,
  staffPanel,
  timelinePanel,
  reportPanel,
  sourceLogPanel,
}: IncidentDrawerProps) {
  const isExpanded = activeWorkspace !== null;

  return (
    <section
      className="incident-drawer utility-drawer"
      data-state={isExpanded ? "expanded" : "collapsed"}
      data-testid="utility-drawer"
    >
      <div className="incident-drawer-content">
        <div className="incident-drawer-body min-h-0 overflow-hidden px-3 py-2">
          <div
            id="workspace-panel-evidence"
            data-state={activeWorkspace === "evidence" ? "open" : "closed"}
            className="utility-drawer-panel h-full overflow-y-auto"
          >
            {evidencePanel}
          </div>

          <div
            id="workspace-panel-staff"
            data-state={activeWorkspace === "staff" ? "open" : "closed"}
            className="utility-drawer-panel h-full overflow-y-auto"
          >
            {staffPanel}
          </div>

          <div
            id="workspace-panel-timeline"
            data-state={activeWorkspace === "timeline" ? "open" : "closed"}
            className="utility-drawer-panel h-full overflow-y-auto"
          >
            {timelinePanel}
          </div>

          <div
            id="workspace-panel-report"
            data-state={activeWorkspace === "report" ? "open" : "closed"}
            className="utility-drawer-grid h-full gap-4 overflow-y-auto xl:grid-cols-[24rem_minmax(0,1fr)]"
          >
            {reportPanel}
          </div>

          <div
            id="workspace-panel-source"
            data-state={activeWorkspace === "source" ? "open" : "closed"}
            className="utility-drawer-panel h-full overflow-y-auto"
          >
            {sourceLogPanel}
          </div>
        </div>
      </div>

      <div className="incident-drawer-handle utility-drawer-bar">
        <button
          type="button"
          className="incident-drawer-toggle"
          data-testid="incident-drawer-handle"
          onClick={onToggleExpanded}
          aria-expanded={isExpanded}
        >
          <span className="incident-drawer-grip" aria-hidden="true" />
          <span className="incident-drawer-label">Pull up incident files</span>
        </button>

        <DrawerTabs
          activeWorkspace={activeWorkspace}
          onOpenWorkspace={onOpenWorkspace}
          className="incident-drawer-handle-tabs flex min-w-0 items-center gap-2"
        />

        <p
          className="utility-latest"
          title={latestSummary}
          data-testid="utility-latest-update"
        >
          {latestSummary}
        </p>
      </div>
    </section>
  );
}
