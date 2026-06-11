import { expect, test, type Page } from "@playwright/test";

async function openWorkspace(
  page: Page,
  panel: "Evidence" | "Incident log" | "Report" | "Source log",
) {
  const tab = page
    .getByRole("tablist", { name: "Workspace panels" })
    .getByRole("tab", { name: panel, exact: true })
    .first();

  if ((await tab.getAttribute("aria-selected")) !== "true") {
    await tab.click();
  }

  await expect(page.getByTestId("utility-drawer")).toHaveAttribute(
    "data-state",
    "expanded",
  );
}

async function openSentinelPanel(page: Page) {
  await expect(page.getByTestId("sentinel-control")).toBeVisible();
  await page.getByTestId("sentinel-control").click();
  await expect(page.getByTestId("sentinel-orb")).toBeVisible();
}

async function installMockSpeechRecognition(page: Page, transcript: string) {
  await page.addInitScript((mockTranscript) => {
    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "en-US";
      onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null =
        null;
      onerror: ((event: { error?: string }) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        this.onresult?.({
          results: [{ 0: { transcript: mockTranscript } }],
        });
        this.onend?.();
      }

      stop() {}

      abort() {}
    }

    (window as Window & {
      SpeechRecognition?: typeof MockSpeechRecognition;
      webkitSpeechRecognition?: typeof MockSpeechRecognition;
    }).SpeechRecognition = MockSpeechRecognition as unknown as typeof MockSpeechRecognition;
    (window as Window & {
      SpeechRecognition?: typeof MockSpeechRecognition;
      webkitSpeechRecognition?: typeof MockSpeechRecognition;
    }).webkitSpeechRecognition = MockSpeechRecognition as unknown as typeof MockSpeechRecognition;
  }, transcript);
}

// Deferred mock: start() begins listening but does NOT deliver a transcript.
// The transcript is only emitted when stop() is called, proving click-to-record /
// click-to-stop (a single click must not start and immediately stop recognition).
async function installDeferredMockSpeechRecognition(page: Page, transcript: string) {
  await page.addInitScript((mockTranscript) => {
    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "en-US";
      _ended = false;
      onresult:
        | ((event: { results: ArrayLike<{ isFinal?: boolean; 0: { transcript: string } }> }) => void)
        | null = null;
      onerror: ((event: { error?: string }) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        // Intentionally no transcript here — wait for an explicit stop().
        this._ended = false;
      }

      stop() {
        if (this._ended) return;
        this._ended = true;
        this.onresult?.({
          results: [{ isFinal: true, 0: { transcript: mockTranscript } }],
        });
        this.onend?.();
      }

      abort() {}
    }

    (window as Window & {
      SpeechRecognition?: typeof MockSpeechRecognition;
      webkitSpeechRecognition?: typeof MockSpeechRecognition;
    }).SpeechRecognition = MockSpeechRecognition as unknown as typeof MockSpeechRecognition;
    (window as Window & {
      SpeechRecognition?: typeof MockSpeechRecognition;
      webkitSpeechRecognition?: typeof MockSpeechRecognition;
    }).webkitSpeechRecognition = MockSpeechRecognition as unknown as typeof MockSpeechRecognition;
  }, transcript);
}

async function revealTypedSentinelInput(page: Page) {
  // The typed input is visually hidden (sr-only) but always mounted in the DOM.
  // No "Type instead" click needed — just confirm the test-id is present.
  await expect(page.getByTestId("sentinel-question-input")).toBeAttached();
}

async function askSentinel(page: Page, question: string) {
  await revealTypedSentinelInput(page);
  await page.getByTestId("sentinel-question-input").fill(question);
  await page.getByTestId("sentinel-question-input").press("Enter");
  // Compact panel no longer shows sentinel-answer; wait for the state to settle.
  await expect(page.getByTestId("sentinel-state")).not.toContainText(/thinking/i, {
    timeout: 8_000,
  });
}

async function assertNoForbiddenWording(text: string) {
  expect(text).not.toMatch(/\bCritical\b/);
  expect(text).not.toMatch(/\bLow\b(?!\s+operational)/i);
  expect(text).not.toMatch(/\bseverity\b/i);
  expect(text).not.toMatch(/\bconfidence\b/i);
  expect(text).not.toMatch(/\bscore\b/i);
  expect(text).not.toMatch(/Venue map/i);
  expect(text).not.toMatch(/Seat map/i);
}

async function enableDemoSources(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem("stadium-sentinel-demo-sources-connected", "true");
  });
  await page.reload();
}

async function pullLatestReports(page: Page) {
  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("command-strip-summary")).toContainText(/pulled|loaded/i, {
    timeout: 5_000,
  });
}

test("command center shell stays intact and uses cleaned recording copy", async ({
  page,
}) => {
  await page.goto("/command");

  await expect(page.getByTestId("dispatch-queue")).toBeVisible();
  await expect(page.getByTestId("active-incident-workspace")).toBeVisible();
  await expect(page.getByTestId("utility-drawer")).toBeVisible();
  await expect(page.getByTestId("incident-card")).toHaveCount(3);
  await expect(page.getByText("Mock Intake")).toHaveCount(0);
  await expect(page.getByText("Automatic ingest (prototype)")).toHaveCount(0);
  await expect(page.getByTestId("what-changed-summary")).toHaveCount(0);
  await expect(page.getByTestId("ingestion-status-banner")).toHaveCount(0);
  await expect(page.getByTestId("command-strip-summary")).toContainText(
    /live operations data/i,
  );
});

test("dispatch queue selection switches the active incident workspace", async ({
  page,
}) => {
  await page.goto("/command");

  await page.locator('[data-incident-id="incident-gate-b"]').click();
  await expect(page.getByTestId("selected-incident-title")).toHaveText("Gate B backed up");

  await page.locator('[data-incident-id="incident-elevator-4"]').click();
  await expect(page.getByTestId("selected-incident-title")).toHaveText("Elevator 4 down");

  await page.locator('[data-incident-id="incident-section-112"]').click();
  await expect(page.getByTestId("selected-incident-title")).toHaveText(
    "Guest needs wheelchair access near Section 112",
  );
});

test("selected queue item stays consistent across the workspace and drawer panels", async ({
  page,
}) => {
  await page.goto("/command");
  await page.locator('[data-incident-id="incident-gate-b"]').click();

  await expect(page.getByTestId("selected-incident-title")).toContainText("Gate B");
  await expect(page.getByTestId("operations-timeline-selected")).toContainText("Gate B");

  await page.getByTestId("incident-drawer-handle").click();
  await openWorkspace(page, "Evidence");
  await expect(page.getByTestId("evidence-panel")).toContainText("Gate B");

  await openWorkspace(page, "Report");
  await expect(page.getByTestId("report-input")).toBeVisible();
  await expect(page.getByTestId("report-summary-headline")).toBeVisible();

  await openWorkspace(page, "Incident log");
  await expect(page.getByTestId("timeline-panel")).toContainText("Gate B");
  await expect(page.getByTestId("incident-log-entry-source-received")).toBeVisible();

  await openWorkspace(page, "Source log");
  await expect(page.getByTestId("source-log-panel")).toContainText("Gate B");
});

test("incident header does not keep workflow buttons in the summary area", async ({
  page,
}) => {
  await page.goto("/command");

  const header = page.getByTestId("incident-header");
  await expect(header).toBeVisible();
  await expect(header.getByRole("button", { name: /Dispatch logged|Route details|Radio handoff/i })).toHaveCount(0);
});

test("drawer, evidence panel, and report panel use the cleaned structures", async ({
  page,
}) => {
  await page.goto("/command");
  await page.getByTestId("incident-drawer-handle").click();

  await openWorkspace(page, "Evidence");
  await expect(page.getByText("Evidence used")).toBeVisible();
  await expect(page.getByText("Recommended next action")).toBeVisible();
  await expect(page.getByText("Operational evidence")).toHaveCount(0);
  await expect(page.getByText("Evidence read path")).toHaveCount(0);
  await expect(page.getByText("Elastic search")).toHaveCount(0);
  await expect(page.getByTestId("evidence-panel").getByText("Observed signal:").first()).toBeVisible();

  await openWorkspace(page, "Report");
  await expect(page.getByTestId("report-input")).not.toBeEmpty();
  await expect(page.getByTestId("report-summary-headline")).toBeVisible();
  await expect(page.getByTestId("report-draft-markdown")).toHaveCount(0);
  await expect(page.getByTestId("demo-memory-panel")).toContainText("Recent command memory");
});

test("sentinel command panel opens from the command strip and supports typed fallback", async ({
  page,
}) => {
  await page.goto("/command");

  await openSentinelPanel(page);
  await expect(page.getByTestId("sentinel-state")).toBeVisible();
  // "Type instead" is removed from the visible UI — the input is sr-only but in DOM
  await expect(page.getByTestId("sentinel-question-input")).toBeAttached();
  await expect(page.getByText("Type instead")).toHaveCount(0);

  // Typed command path still works
  await askSentinel(page, "What should I do first?");
  await expect(page.getByTestId("sentinel-state")).not.toContainText(/thinking/i);
});

test("sentinel can open Evidence from a typed command", async ({ page }) => {
  await page.goto("/command");
  await openSentinelPanel(page);
  await askSentinel(page, "Show me the evidence for this incident.");

  await expect(page.getByTestId("utility-drawer")).toHaveAttribute("data-state", "expanded");
  await expect(page.getByTestId("evidence-panel")).toBeVisible();
});

test("sentinel can draft a report into the visible report field via typed command", async ({
  page,
}) => {
  await page.goto("/command");
  await openSentinelPanel(page);
  await askSentinel(page, "Write a report for this incident.");

  await openWorkspace(page, "Report");
  await expect(page.getByTestId("report-input")).toContainText("Operations report for");
  await expect(page.getByTestId("report-draft-markdown")).toHaveCount(0);
});

test("sentinel dispatch command uses the existing action path", async ({
  page,
}) => {
  await page.goto("/command");
  await openSentinelPanel(page);
  await askSentinel(page, "Dispatch the assigned team.");

  await expect(page.getByTestId("sentinel-apply-action")).toBeVisible();
  await page.getByTestId("sentinel-apply-action").click();
  // After approval, dispatch button in the workspace should reflect the approved state
  await expect(page.getByRole("button", { name: /Dispatch logged|Team dispatched/i })).toBeVisible();
});

test("voice transcript auto-submits through the typed command handler", async ({
  page,
}) => {
  await installMockSpeechSynthesis(page);
  await installMockSpeechRecognition(page, "Show me the evidence for this incident.");
  await page.goto("/command");
  await openSentinelPanel(page);

  await expect(page.getByTestId("evidence-panel")).toBeVisible({ timeout: 10_000 });
});

test("sr-only voice control stops listening and submits the deferred transcript", async ({
  page,
}) => {
  await installMockSpeechSynthesis(page);
  await installDeferredMockSpeechRecognition(
    page,
    "Show me the evidence for this incident.",
  );
  await page.goto("/command");
  await openSentinelPanel(page);

  const control = page.getByTestId("sentinel-push-to-talk");
  await waitForSentinelListening(page);
  await expect(control).toHaveText(/Stop listening/i);
  // Evidence panel should not have opened yet (transcript not delivered)
  await expect(page.getByTestId("evidence-panel")).not.toBeVisible();

  // Click stops listening — the transcript is delivered and the command runs.
  await control.click({ force: true });
  await expect(page.getByTestId("evidence-panel")).toBeVisible({ timeout: 10_000 });
});

test("voice report drafting opens the report tab and fills the editable field", async ({
  page,
}) => {
  await installMockSpeechSynthesis(page);
  await installMockSpeechRecognition(page, "Write a report for this incident.");
  await page.goto("/command");
  await openSentinelPanel(page);

  await expect(page.getByTestId("sentinel-apply-action")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("sentinel-apply-action").click();
  await expect(page.getByTestId("utility-drawer")).toHaveAttribute("data-state", "expanded", {
    timeout: 10_000,
  });
  await openWorkspace(page, "Report");
  await expect(page.getByTestId("report-input")).toContainText("Operations report for");
  await expect(page.getByTestId("report-draft-markdown")).toHaveCount(0);
});

test("voice dispatch proposals use the existing approval and write-back path", async ({
  page,
}) => {
  await installMockSpeechSynthesis(page);
  await installMockSpeechRecognition(page, "Dispatch the assigned team.");
  await page.goto("/command");
  await openSentinelPanel(page);

  await expect(page.getByTestId("sentinel-apply-action")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("sentinel-apply-action").click();
  await expect(page.getByTestId("sentinel-state")).not.toContainText(/thinking|applying/i, { timeout: 8_000 });
});

test("sentinel source-log action opens the source log drawer", async ({ page }) => {
  await page.goto("/command");
  await openSentinelPanel(page);
  await askSentinel(page, "Open source log");

  await expect(page.getByTestId("source-log-panel")).toBeVisible();
});

test("pull latest reports updates source summary and records a source log entry", async ({
  page,
}) => {
  await page.goto("/command");
  await enableDemoSources(page);
  await pullLatestReports(page);

  await expect(page.getByTestId("command-strip-summary")).toContainText(
    /live operations data pulled|latest operations data loaded/i,
  );

  await openWorkspace(page, "Source log");
  await expect(page.getByTestId("source-log-entry").first()).toBeVisible();
});

test("workspace pointer uses cleaned copy and removes the dispatch note strip", async ({
  page,
}) => {
  await page.goto("/command");

  await expect(page.getByTestId("workflow-cues")).toHaveCount(0);
  await expect(page.getByTestId("dispatch-message")).toHaveCount(0);
  await expect(page.getByTestId("follow-up-sentinel-cue")).toHaveCount(0);
  await expect(page.getByTestId("evidence-drawer-pointer")).toContainText(
    "Evidence, Staff Update, Incident log, Report, and Source log",
  );
});

test("venue context updates the selected marker and keeps venue orientation hidden", async ({
  page,
}) => {
  await page.goto("/command");

  await expect(page.getByTestId("venue-orientation-section")).toHaveCount(0);
  await expect(page.getByTestId("venue-anchor-section-112")).toHaveAttribute(
    "data-selected",
    "true",
  );

  await page.locator('[data-incident-id="incident-gate-b"]').click();
  await expect(page.getByTestId("venue-anchor-gate-b")).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.getByTestId("venue-anchor-section-112")).toHaveAttribute(
    "data-selected",
    "false",
  );
});

test("operations timeline remains visible and avoids forbidden wording", async ({ page }) => {
  await page.goto("/command");
  await page.locator('[data-incident-id="incident-gate-b"]').click();

  const opsTimeline = page.getByTestId("operations-timeline");
  await expect(opsTimeline).toBeVisible();
  await expect(opsTimeline.getByTestId("operations-timeline-selected")).toContainText(
    "Gate B",
  );
  await expect(opsTimeline).not.toContainText("Elevator 4 down");
  await expect(page.getByText("Recent activity")).toHaveCount(0);

  const bodyText = (await page.locator("body").textContent()) ?? "";
  await assertNoForbiddenWording(bodyText);
});

test("radio transcript panel is hidden by default", async ({ page }) => {
  await page.goto("/command");

  await expect(page.getByTestId("radio-transcript-panel")).toHaveCount(0);
});

// ─── Speech synthesis mock helpers ───────────────────────────────────────────

/** Installs a mock SpeechSynthesis that records speak/cancel calls in window.__sentinelSpeech. */
async function installMockSpeechSynthesis(
  page: Page,
  options?: { fireOnEnd?: boolean },
) {
  const fireOnEnd = options?.fireOnEnd ?? true;
  await page.addInitScript((shouldFireOnEnd: boolean) => {
    const calls: { type: "speak" | "cancel"; text?: string }[] = [];
    (window as any).__sentinelSpeech = calls;

    Object.defineProperty(window, "speechSynthesis", {
      writable: true,
      configurable: true,
      value: {
        speak: (utterance: any) => {
          calls.push({ type: "speak", text: utterance.text });
          if (shouldFireOnEnd) {
            queueMicrotask(() => utterance.onend?.());
          }
        },
        cancel: () => {
          calls.push({ type: "cancel" });
        },
      },
    });

    (window as any).SpeechSynthesisUtterance = class {
      rate = 1;
      pitch = 1;
      onend: (() => void) | null = null;
      constructor(public text: string) {}
    };
  }, fireOnEnd);
}

async function waitForSentinelListening(page: Page) {
  await expect(page.getByTestId("sentinel-state")).toContainText(/listening/i, {
    timeout: 5_000,
  });
}

async function getSpeechCalls(page: Page) {
  return page.evaluate(() => (window as any).__sentinelSpeech as { type: string; text?: string }[]);
}

// ─── Two-way voice (talk-back) tests ──────────────────────────────────────────

test("voice evidence command: Sentinel speaks back after Evidence opens", async ({ page }) => {
  await installMockSpeechSynthesis(page);
  await installMockSpeechRecognition(page, "Show me the evidence for this incident.");
  await page.goto("/command");
  await openSentinelPanel(page);

  await expect(page.getByTestId("evidence-panel")).toBeVisible({ timeout: 10_000 });

  const calls = await getSpeechCalls(page);
  const spoken = calls.filter((c) => c.type === "speak");
  // spoken[0] = intro, spoken[1] = command response
  expect(spoken.length).toBeGreaterThan(1);
  const hasEvidenceResponse = spoken.some((c) => /Evidence is open/i.test(c.text ?? ""));
  expect(hasEvidenceResponse).toBe(true);
  // Must not contain forbidden wording
  for (const c of spoken) {
    expect(c.text).not.toMatch(/\bCritical\b/);
    expect(c.text).not.toMatch(/\bseverity\b/i);
  }
});

test("voice report command: Sentinel speaks back after Report is drafted", async ({ page }) => {
  await installMockSpeechSynthesis(page);
  await installMockSpeechRecognition(page, "Write a report for this incident.");
  await page.goto("/command");
  await openSentinelPanel(page);

  await expect(page.getByTestId("sentinel-apply-action")).toBeVisible({ timeout: 10_000 });

  const calls = await getSpeechCalls(page);
  const spoken = calls.filter((c) => c.type === "speak");
  expect(spoken.length).toBeGreaterThan(1);
  const hasProposalResponse = spoken.some((c) =>
    /approve|go ahead|report/i.test(c.text ?? ""),
  );
  expect(hasProposalResponse).toBe(true);
});

test("voice dispatch command: Sentinel speaks back after dispatch is prepared", async ({ page }) => {
  await installMockSpeechSynthesis(page);
  await installMockSpeechRecognition(page, "Dispatch the assigned team.");
  await page.goto("/command");
  await openSentinelPanel(page);

  await expect(page.getByTestId("sentinel-apply-action")).toBeVisible({ timeout: 10_000 });

  const calls = await getSpeechCalls(page);
  const spoken = calls.filter((c) => c.type === "speak");
  expect(spoken.length).toBeGreaterThan(1);
  const hasDispatchResponse = spoken.some((c) =>
    /approve|go ahead|dispatch/i.test(c.text ?? ""),
  );
  expect(hasDispatchResponse).toBe(true);
});

test("closing Sentinel while speaking stops speech", async ({ page }) => {
  await installMockSpeechSynthesis(page);
  await installMockSpeechRecognition(page, "Show me the evidence for this incident.");
  await page.goto("/command");
  await openSentinelPanel(page);

  await expect(page.getByTestId("evidence-panel")).toBeVisible({ timeout: 10_000 });

  // Close the Sentinel panel
  await page.getByTestId("sentinel-control").click();
  await expect(page.getByTestId("sentinel-panel")).toHaveCount(0);

  const calls = await getSpeechCalls(page);
  // cancel must have been called at some point (on close)
  const cancelled = calls.filter((c) => c.type === "cancel");
  expect(cancelled.length).toBeGreaterThan(0);
});

test("typed command does not trigger speech output (only intro speech on open)", async ({ page }) => {
  await installMockSpeechSynthesis(page);
  await page.goto("/command");
  await openSentinelPanel(page);

  // Opening the panel speaks the intro — capture that baseline count
  const callsAfterOpen = await getSpeechCalls(page);
  const spokenAfterOpen = callsAfterOpen.filter((c) => c.type === "speak").length;

  await revealTypedSentinelInput(page);
  await page.getByTestId("sentinel-question-input").fill("Show me the evidence for this incident.");
  await page.getByTestId("sentinel-question-input").press("Enter");
  await expect(page.getByTestId("sentinel-state")).not.toContainText(/thinking/i, { timeout: 8_000 });

  const callsAfterTyped = await getSpeechCalls(page);
  const spokenAfterTyped = callsAfterTyped.filter((c) => c.type === "speak").length;
  // No additional speech calls triggered by the typed command
  expect(spokenAfterTyped).toBe(spokenAfterOpen);
});

test("backend-off mode keeps the deterministic api contract for the demo input", async ({
  page,
}) => {
  const response = await page.request.post("/api/agent", {
    data: {
      report:
        "Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.",
    },
  });

  expect(response.ok()).toBe(true);

  const payload = (await response.json()) as {
    incidentPackages: Array<{ incident: { id: string; priority: string } }>;
    meta: { retrievalMode: string; geminiMode: string };
  };

  expect(payload.incidentPackages).toHaveLength(3);
  expect(payload.incidentPackages.map(({ incident }) => incident.id)).toEqual([
    "incident-section-112",
    "incident-elevator-4",
    "incident-gate-b",
  ]);
  expect(payload.incidentPackages.map(({ incident }) => incident.priority)).toEqual([
    "Immediate",
    "High",
    "High",
  ]);
  expect(payload.meta.retrievalMode).toBe("local");
  expect(payload.meta.geminiMode).toBe("fallback");
  expect(JSON.stringify(payload)).not.toMatch(/score|confidence/i);
});

// ─── Panel UX + intro tests ───────────────────────────────────────────────────

test("command bar shows pull status only once after reports are loaded", async ({
  page,
}) => {
  await page.goto("/command");
  await enableDemoSources(page);
  await pullLatestReports(page);

  const barText = (await page.getByTestId("command-bar").textContent()) ?? "";
  const matches = barText.match(/Live operations data pulled/gi) ?? [];
  expect(matches.length).toBe(1);
  await expect(page.getByTestId("pull-status")).toHaveCount(0);
});

test("Ask Sentinel panel shows friendly intro status message on open", async ({ page }) => {
  await page.goto("/command");
  await openSentinelPanel(page);

  const statusText = await page.getByTestId("sentinel-panel").textContent() ?? "";
  expect(statusText).toMatch(/Hi, I'm Sentinel/i);
  expect(statusText).toMatch(/what happened/i);
  expect(statusText).not.toMatch(/happy to help/i);
});

test("Ask Sentinel orb is visible and panel stays inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/command");
  await openSentinelPanel(page);

  await expect(page.getByTestId("sentinel-orb")).toBeVisible();
  const box = await page.getByTestId("sentinel-panel").boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(1024);
});

test("Ask Sentinel does not show the old giant voice debug button", async ({ page }) => {
  await page.goto("/command");
  await openSentinelPanel(page);

  await expect(page.getByTestId("sentinel-orb")).toBeVisible();
  await expect(page.locator(".sentinel-orb-panel button.w-full")).toHaveCount(0);
  await expect(page.getByText("Type instead")).toHaveCount(0);
});

test("Ask Sentinel auto-starts listening after intro without Push to talk", async ({
  page,
}) => {
  await installMockSpeechSynthesis(page);
  await installDeferredMockSpeechRecognition(page, "can you hear me");
  await page.goto("/command");
  await openSentinelPanel(page);

  await waitForSentinelListening(page);
  await expect(page.getByTestId("sentinel-state")).toContainText(/listening/i);
});

test("interrupt while Sentinel is speaking cancels speech and starts listening", async ({
  page,
}) => {
  await installMockSpeechSynthesis(page, { fireOnEnd: false });
  await installDeferredMockSpeechRecognition(page, "what happened");
  await page.goto("/command");
  await openSentinelPanel(page);

  await expect(page.getByTestId("sentinel-state")).toContainText(/speaking/i, {
    timeout: 5_000,
  });
  await page.getByTestId("sentinel-orb").click();
  await waitForSentinelListening(page);
});

test("casual yes does not approve when no Sentinel action is pending", async ({ page }) => {
  await installMockSpeechSynthesis(page);
  await installMockSpeechRecognition(page, "yes");
  await page.goto("/command");
  await openSentinelPanel(page);
  await page.waitForTimeout(1_000);

  await expect(page.getByTestId("sentinel-apply-action")).toHaveCount(0);
  await expect(page.getByTestId("sentinel-state")).not.toContainText(/applying/i);
});

test("thank-you voice phrase does not call incident analysis API", async ({ page }) => {
  let sentinelApiCalls = 0;
  await page.route("**/api/sentinel", async (route) => {
    sentinelApiCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ answer: "fallback", incidentPackages: [], meta: {} }),
    });
  });

  await installMockSpeechSynthesis(page);
  await installMockSpeechRecognition(page, "thank you");
  await page.goto("/command");
  await openSentinelPanel(page);
  await page.waitForTimeout(1_000);

  expect(sentinelApiCalls).toBe(0);
  await expect(page.getByTestId("sentinel-panel")).toContainText(/welcome/i);
});

test("command center uses one unified top bar", async ({ page }) => {
  await page.goto("/command");

  await expect(page.getByTestId("command-bar")).toHaveCount(1);
  await expect(page.getByTestId("intake-context-bar")).toHaveCount(1);
  await expect(page.getByTestId("pull-latest-reports")).toBeVisible();
  await expect(page.getByTestId("sentinel-control")).toBeVisible();
});

test("queue card titles use normal word wrapping classes", async ({ page }) => {
  await page.goto("/command");

  const title = page.locator('[data-incident-id="incident-section-112"] h3');
  await expect(title).toBeVisible();
  const className = await title.getAttribute("class");
  expect(className).toContain("text-wrap:wrap");
  expect(className).not.toMatch(/break-words/);
});

test("venue ACTIVE label is visible for default queue incidents", async ({ page }) => {
  await page.goto("/command");

  for (const id of ["incident-section-112", "incident-gate-b", "incident-elevator-4"]) {
    await page.locator(`[data-incident-id="${id}"]`).click();
    await expect(page.getByTestId("venue-context-schematic").getByText("ACTIVE")).toBeVisible();
  }
});

test("Ask Sentinel panel does not show Type instead or visible typed input", async ({ page }) => {
  await page.goto("/command");
  await openSentinelPanel(page);

  await expect(page.getByText("Type instead")).toHaveCount(0);
  // The input is sr-only (in DOM, may be technically visible to Playwright at 1px but not to users)
  await expect(page.getByTestId("sentinel-question-input")).toBeAttached();
  // Confirm it is not part of the interactive voice panel (sr-only, aria-hidden)
  await expect(page.getByTestId("sentinel-question-input")).toHaveAttribute("aria-hidden", "true");
});

test("Ask Sentinel keeps compact exchange history for follow-up questions", async ({
  page,
}) => {
  await page.goto("/command");
  await openSentinelPanel(page);

  await askSentinel(page, "What should I do first?");
  await expect(page.getByTestId("sentinel-exchange-history")).toBeVisible();
  await expect(page.getByTestId("sentinel-exchange-pair")).toHaveCount(1);
  await expect(page.getByTestId("sentinel-exchange-history")).toContainText(/You:/i);
  await expect(page.getByTestId("sentinel-exchange-history")).toContainText(/Sentinel:/i);

  await askSentinel(page, "Who is assigned to this incident?");
  await expect(page.getByTestId("sentinel-exchange-pair")).toHaveCount(2);

  const panelWidth = (await page.getByTestId("sentinel-panel").boundingBox())?.width ?? 0;
  expect(panelWidth).toBeGreaterThan(0);
  expect(panelWidth).toBeLessThanOrEqual(224);
});

test("Ask Sentinel sr-only input is fillable by Playwright for automated tests", async ({ page }) => {
  await page.goto("/command");
  await openSentinelPanel(page);

  const input = page.getByTestId("sentinel-question-input");
  await input.fill("test question");
  await expect(input).toHaveValue("test question");
});

// ─── Landing preview tab tests ────────────────────────────────────────────────

test("landing dispatch preview tabs show correct counts: ALL(4), SECURITY(1), FACILITIES(3)", async ({ page }) => {
  await page.goto("/");
  const panel = page.getByTestId("landing-queue-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByText("ALL (4)")).toBeVisible();
  await expect(panel.getByText("SECURITY (1)")).toBeVisible();
  await expect(panel.getByText("FACILITIES (3)")).toBeVisible();
});

test("landing SECURITY tab filters to 1 row", async ({ page }) => {
  await page.goto("/");
  const panel = page.getByTestId("landing-queue-panel");
  await expect(panel).toBeVisible();
  await panel.getByText("SECURITY (1)").click();

  // Only Gate B row should remain
  const rows = panel.locator("table tbody tr");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Gate B");
});

test("landing FACILITIES tab filters to 3 rows", async ({ page }) => {
  await page.goto("/");
  const panel = page.getByTestId("landing-queue-panel");
  await panel.getByText("FACILITIES (3)").click();

  const rows = panel.locator("table tbody tr");
  await expect(rows).toHaveCount(3);
});

test("landing search filters rows by incident name", async ({ page }) => {
  await page.goto("/");
  const panel = page.getByTestId("landing-queue-panel");
  const searchInput = panel.locator("input[type='text']");
  await searchInput.fill("Elevator");

  const rows = panel.locator("table tbody tr");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Elevator");
});

test("landing search with no match shows empty state", async ({ page }) => {
  await page.goto("/");
  const panel = page.getByTestId("landing-queue-panel");
  const searchInput = panel.locator("input[type='text']");
  await searchInput.fill("xyznosuchevent");

  await expect(panel.locator("table tbody")).toContainText("No incidents match this filter.");
});
