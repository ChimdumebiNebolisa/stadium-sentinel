# Stadium Sentinel — Legacy Fallback Recording Checklist

> **Legacy local fallback demo.** This script documents the completed Pass 1 local recording flow. It remains valid for offline rehearsal and CI-style walkthroughs. For the current Cloud Run real-demo path, use [`docs/real-demo-script.md`](real-demo-script.md). Do not delete this checklist; it preserves the recording snapshot concept.

Use this script for a **typed-Sentinel-only** screen recording. No voice layer, live ingestion, venue orientation, Elastic, or backend credentials are required.

**Branch:** current demo branch or `main` after default-branch cleanup
**Last hardened:** 3.5.1 (`a6317ae`) · **Last polished:** 3.5.2 (`64173a6`)

---

## Before you record

### 1. Fresh browser state

Open DevTools → **Application** → clear **localStorage** and **sessionStorage** for the app origin, or run this in the console on any app page:

```js
[
  "stadium-sentinel-demo-sources-connected",
  "stadium-sentinel-demo-incidents",
  "stadium-sentinel-demo-pull-history",
  "stadium-sentinel-radio-transcript",
  "stadium-sentinel-intake-complete",
].forEach((key) => {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
});
location.reload();
```

### 2. Production build (recommended for recording)

```bash
npm run build
npm start
```

Open `http://localhost:3000`. Production mode hides the Next.js dev overlay.

**Alternative (rehearsal only):** `npm run dev` — acceptable for practice, but hide or crop the dev indicator before a final take.

### 3. Viewport and window

- **Resolution:** 1920×1080 or 1440×900 (landscape).
- **Zoom:** 100%. Do not browser-zoom above 100%.
- **Drawer:** Leave collapsed until the drawer section of this script.
- **Tabs:** Close unrelated browser tabs; disable notifications.

### 4. Pre-flight verification (optional, ~2 min)

```bash
npm test
npm run test:e2e
```

All tests should pass before a final recording take.

---

## Story in one sentence (opening narration)

> Messy stadium reports and radio lines land in one command file — Sentinel splits them into prioritized incidents, tracks response progress, and answers operator questions from the live command state.

---

## Exact click path (~8–12 minutes)

### A. Intake — connect demo sources

| Step | Action | What the viewer should see |
|------|--------|----------------------------|
| A1 | Go to `/` (landing) | Hero + **Run intake demo** CTA |
| A2 | Click **Run intake demo** | `/demo/intake` — *Simulated intake demo* |
| A3 | Click **Connect demo sources** | Four sources sequence to **Connected** (Guest Services, Security Desk Notes, Facilities Tickets, Radio Log Transcript) |
| A4 | Click **Open command center** | `/command` — dispatch queue + active workspace |

**Say:** “We start by connecting simulated ops sources — no live CRM or ticketing system.”

---

### B. Command center — pull latest reports

| Step | Action | What the viewer should see |
|------|--------|----------------------------|
| B1 | Confirm **Pull latest reports** is enabled | Intake context bar shows demo sources synced |
| B2 | Click **Pull latest reports** | Status: `Latest demo reports pulled.` |
| B3 | Point at **What changed?** summary (if shown) | New/changed incidents from the demo batch |
| B4 | Glance at **Dispatch queue** | 3–5 incidents, top entry is highest **priority** (Immediate first) |

**Say:** “Pull loads a fresh demo batch into the dispatch queue — same flow we’d use after intake in operations.”

**Do not** click Pull more than twice in one take (third pull within 60s shows a rate-limit message).

---

### C. Radio transcript — standard preset (matched reports)

| Step | Action | What the viewer should see |
|------|--------|----------------------------|
| C1 | Click **Add radio transcript** | Panel opens |
| C2 | Click **Standard ops preset** | Three lines fill the textarea |
| C3 | Click **Extract reports** | Summary line + chips, e.g. `3 matched in queue` |
| C4 | Read the summary aloud | `Radio transcript processed. 3 reports matched in the current queue.` |
| C5 | Confirm **queue count unchanged** | Standard preset matches existing incidents — no duplicates added |

**Say:** “Radio log intake recognizes lines already in the queue — matched, not duplicated.”

---

### D. Select top incident — act in the workspace

| Step | Action | What the viewer should see |
|------|--------|----------------------------|
| D1 | Click the **#1 incident** in the dispatch queue (Immediate — Section 112 assist) | Active incident workspace updates |
| D2 | Scan **Response checklist** (A) | Acknowledge → Dispatch → Resolve steps with status badges |
| D3 | Scan **Team assignment** (B) | Primary team + ETA |
| D4 | Scan **Dispatch note** | One-line staff-ready wording + **Copy** |
| D5 | Scan **Response timeline** (C) | Intake → Acknowledged → Team assigned → Dispatched → Resolved |
| D6 | Optionally click **Dispatch Guest Services** (primary action) | Button shows **Dispatch logged**; timeline advances |

**Say:** “The workspace is for acting and tracking progress — not for reading full evidence files.”

**Do not** open **Process report** in the Report drawer during the main take (that path refreshes the whole board from pasted text).

---

### E. Drawer — inspect evidence, log, report

| Step | Action | What the viewer should see |
|------|--------|----------------------------|
| E1 | Click **Pull up incident files** (drawer handle) | Drawer expands |
| E2 | **Evidence** tab (default) | Priority rationale + operational evidence (+ radio log excerpt after transcript extract) |
| E3 | **Incident log** tab | Full incident log entries for the selected incident |
| E4 | **Report** tab | Report draft headline + markdown draft + demo memory panel |

**Say:** “Evidence, the full log, and the report draft live in the drawer — one story, different lenses.”

---

### F. Sentinel — typed Q&A only (no microphone)

| Step | Action | What the viewer should see |
|------|--------|----------------------------|
| F1 | In the workspace, click **Ask Sentinel** | Compact Q&A panel opens |
| F2 | Type each question below (or click a suggested pill, then **Ask**) | Answer appears under the input |

#### Required Sentinel questions (ask in this order after transcript extract)

| # | Type this question | Purpose on camera |
|---|-------------------|-------------------|
| 1 | `What did the radio log add?` | Explains matched vs added transcript results |
| 2 | `Which report needs action first?` | Points to top queue priority |
| 3 | `What should I ask the radio operator?` | Follow-up prompts for ops radio |
| 4 | `What stage is this incident?` | Response timeline progress |
| 5 | `What evidence supports this?` | Drawer-aligned evidence summary |
| 6 | `Draft a radio update.` | Dispatch-ready radio wording |

#### Optional extras (if time allows)

| Question | When to use |
|----------|-------------|
| `What should I do first?` | Before transcript extract — selected incident focus |
| `Why this priority?` | After selecting an incident |
| `What changed?` | Immediately after **Pull latest reports** |

**Say:** “Sentinel reads the current command state — typed questions only, no separate agent backend in the demo path.”

---

### G. Optional beat — restroom preset (added report)

Skip this in a short take. Use it if you want to show **added** vs **matched**.

| Step | Action | What the viewer should see |
|------|--------|----------------------------|
| G1 | **Add radio transcript** → **Restroom outage line** → **Extract reports** | Summary mentions a new report added + `1 new report added` chip |
| G2 | Note new card in queue | Restroom out of order (Moderate) |
| G3 | **Pull latest reports** again | Queue refreshes; stale restroom log lines drop from the incident log if that incident leaves the batch |

---

## What not to show

| Avoid | Why |
|-------|-----|
| Next.js dev overlay / React debug tools | Breaks the ops-command-center feel |
| **Process report** button (Report drawer) | Resets the board via `/api/agent` — off-script |
| Third **Pull latest reports** within 60 seconds | Rate-limit message is correct but distracting on camera |
| Voice / push-to-talk (Pass 2) | Not in the official recording path |
| Elastic, MCP, or `.env.local` credentials | Post-demo ingestion — not required |
| Venue map / seat map UI | Must not appear (product guardrail) |
| Words: Critical, Low, severity, confidence, score | Use **priority**: Immediate, High, Moderate, Monitor |

---

## Fallback narration (if UI glitches mid-take)

Read these lines and continue — do not restart unless the queue is empty.

1. **Intake:** “Demo sources connected — Guest Services, Security, Facilities, and Radio Log.”
2. **Pull:** “Latest demo reports pulled into the dispatch queue; highest priority incident leads the board.”
3. **Transcript:** “Standard radio preset matched three existing reports — no duplicate incidents added.”
4. **Workspace:** “Operations acts in the workspace: checklist, team, dispatch note, and response timeline.”
5. **Drawer:** “Full evidence, incident log, and report draft are in the drawer tabs.”
6. **Sentinel:** “Sentinel answers from command state — what the radio log added, what needs action first, operator follow-ups, response stage, evidence, and a draft radio update.”

If Sentinel fails to open, say: “Sentinel Q&A is typed-only over the active incident — rehearsed answers are in this checklist, questions F1–F6.”

---

## Post-recording checklist

- [ ] Fresh storage was cleared before the take
- [ ] Intake → connect → command path completed
- [ ] Pull latest reports succeeded once
- [ ] Standard transcript preset showed **matched**, not duplicate adds
- [ ] Workspace: checklist, team, dispatch note, response timeline visible
- [ ] Drawer: Evidence, Incident log, Report each opened once
- [ ] All six required Sentinel questions typed and answered
- [ ] No forbidden wording on screen
- [ ] No dev overlay in the final export

---

## Quick reference — UI labels (current build)

| Surface | Label / test id |
|---------|-----------------|
| Intake connect | `Connect demo sources` |
| Open command | `Open command center` |
| Pull | `Pull latest reports` |
| Transcript toggle | `Add radio transcript` |
| Standard preset | `Standard ops preset` |
| Extract | `Extract reports` |
| Summary | `transcript-extract-summary` |
| Sentinel | `Ask Sentinel` |
| Drawer handle | `Pull up incident files` |
| Drawer tabs | Evidence · Staff Update · Incident log · Report |

---

## Related commits (Pass 1)

| Subpass | Commit | Message |
|---------|--------|---------|
| 3.5.1 | `a6317ae` | harden demo flow state handling |
| 3.5.2 | `64173a6` | polish command demo layout |
| 3.5.3 | *(this doc)* | add demo recording checklist |
| 3.5.4 | *(pending)* | lock demo recording snapshot |
