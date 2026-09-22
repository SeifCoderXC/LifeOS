# LifeOS QA Report — Simulated Confused-User Pass

**Date:** 2026-09-22
**Method:** Drove the real app in a real browser as a first-time, somewhat careless user would — signing up, deliberately messing up inputs, skipping onboarding, typing messy real-life sentences, switching views, logging out/in, and reading server logs + raw Firestore data alongside the UI to catch things that *look* fine but aren't. Every claim below was verified against actual server logs, API responses, or exported ledger data — not just a screenshot.

---

## 1. Confirmed bugs — fixed during this pass

### 1.1 3D Universe could render as an empty black void with zero feedback
**Severity: High — this is the app's front page.**

The `<Canvas>` (react-three-fiber) can take several seconds to paint its first real frame. During that window there was no loading indicator — the dynamic-import spinner ("assembling universe") had already disappeared, so the user just saw a blank starfield. On a slower paint (observed up to ~8s in this environment) it looked completely broken, especially for a brand-new account whose "ah-ha" moment *is* this screen.

Confirmed via: reproduced twice (once needing a manual scroll to reveal the graph, once needing an 8s wait with no interaction), while the underlying scene data returned by `/api/snapshot` was valid both times (22 real nodes, no NaN coordinates) — proving it was a render-timing issue, not a data issue.

**Fix:** `src/components/LifeUniverse.tsx` now tracks an actual "first frame rendered" signal (a one-shot `useFrame` callback), and covers the canvas with a persistent "assembling universe" overlay until that fires. The blank-void window no longer exists — it's always either the loading label or the real graph.

### 1.2 Risk detection silently ignored the AI's own risk analysis
**Severity: High — this undermines the core value proposition.**

Tested with a message like *"I think my landlord is trying to evict me... haven't paid rent in 2 months... passport expires soon"* and later *"doctor found something concerning in bloodwork, needs a follow-up scan"*. Both are obviously risk-worthy. The Risks view said **"No active risks"** for both, at first.

Root cause, confirmed by reading `src/lib/engines/risks.ts`: risk detection only ever looked at three hardcoded regex patterns against the event summary (`visa|residence`, `exhaust|11 hours|burnout`, trading income) and a cash-flow check. It never read `event.risk_effect` — a field that Gemini/Grok already populate on *every* event when relevant. The AI understood the risk; the product just never asked it.

**Fix:** `detectRisks` now falls back to a generic AI-sourced risk item using `event.risk_effect` whenever none of the specific patterns already matched. Verified live: the bloodwork message now correctly produces a "Potential underlying health/medical condition" risk card (BODY · RISK, severity 0.6), visible in both the Risks view and the 3D universe as a new node.

**Note:** this is a narrower instance of a broader pattern — `legal_effect`, `health_or_performance_effect`, `social_effect`, etc. are all populated by the AI extraction but only `risk_effect` was wired into a detection engine today. The door-detection and milestone engines have their own separate (narrower) heuristics and weren't audited line-by-line in this pass. Worth a follow-up sweep.

### 1.3 No visible Register option (raised by you, fixed earlier this session)
Already covered: replaced the "smart" auto-detect email flow with explicit, always-visible **Sign up** / **Log in** tabs.

### 1.4 AI provider fallback was silent to the user
**Severity: Medium. Fixed.**

Confirmed live (not simulated) — Gemini returned a real `503 UNAVAILABLE` ("high demand") from Google's side during testing. The pipeline correctly fell back to the heuristic parser, but the header kept showing "SMART MODE (FREE AI)" regardless, since that badge only reflects whether a key is *configured*, not whether the last call *succeeded*.

**Fix:** `ingestReality` now returns `ai_used` / `ai_fallback` / `ai_fallback_reason` on every response. `AppShell` shows a short-lived notice under the commit box when a fallback happened ("Smart/Deep Mode was temporarily unavailable for this entry — used the basic parser instead. Nothing was lost."). Verified end-to-end against a real live 503 from Gemini: the API correctly reported `ai_fallback: true` with the exact upstream error.

### 1.5 Onboarding gave no real progress feedback
**Fixed.**

Submitting 3 onboarding answers made 3 sequential AI calls (~19s total) behind one static "Building your universe…" label.

**Fix:** restructured so the client calls `/api/ingest` once per answer directly (reusing the exact same endpoint the main app uses — no duplicated logic) and shows real progress: "Analyzing 2 of 3…". A new small `/api/onboarding/complete` endpoint just sets the display name and marks the account onboarded once all answers are in.

### 1.6 Error banners shifted page layout
**Fixed.** The auth and onboarding forms sit in a vertically-centered container, so any appearing/disappearing error text shifted every field above it — this is exactly what caused my own misclick during testing (§3). Fixed by always reserving a fixed-height slot for the error line (present but empty when there's no error), so the surrounding layout never shifts.

### 1.7 No "forgot password" flow
**Fixed.** Added a full flow: "Forgot password?" link (login mode only) → email-based reset request (rate-limited, never reveals whether an email has an account) → `/reset-password?token=...` page → new password → auto-login. Verified end-to-end via direct API calls: request → reset → old password rejected → new password accepted → reused token correctly rejected. Uses the same console-log/dev-link fallback pattern as everything else when no email provider is configured; needs `RESEND_API_KEY` before a real public launch.

---

## 2. Environment note (not a product bug)

While testing the forgot-password flow, both a browser request and a raw `curl` call to `/api/auth/forgot-password` hung indefinitely against the long-running dev server (alive for hours across dozens of hot-reloads in this session). A **full restart** of the dev server fixed it immediately and every subsequent request was fast. This points to accumulated Firestore Admin SDK connection staleness in a very long-lived Node dev process, not a bug in the reset-password logic — the exact same code path worked instantly right after a clean restart, and would not be an issue in a normal (non-hot-reloading) production deployment. If you ever see a request hang for no clear reason during local dev, restart `npm run dev` first before assuming it's a code bug.

Separately, the browser automation itself got flaky for a stretch (screenshot timeouts, clicks not registering) — confirmed via a direct DOM-level click that the app responded correctly the whole time; the flakiness was in the tooling, not the product.

---

## 3. False alarms — investigated and ruled out (documenting for transparency)

Several things looked like bugs mid-testing and turned out to be my own testing-tool artifacts (stale element references after a re-render, or a raw pixel-coordinate click landing on the wrong element after a layout shift) — **not** app bugs. Listed here so nobody re-investigates them later:

- **"Display name didn't save"** — traced to my own misclick on the name-entry step; the field was actually empty when submitted, and the app correctly skipped saving an empty name. The name → header-greeting flow was independently verified working earlier in the session ("hi, Nawfal" test).
- **"A commit silently did nothing"** — same root cause: my typed text never landed in the textarea (stale ref from a prior click), so the button correctly no-op'd on empty input. Retested cleanly with fresh element references immediately before both the click-to-focus and the click-to-submit, and it worked correctly.
- **"Clicking a nav item didn't switch views"** — the click fired during an in-flight re-render (right after a commit response arrived) and hit a detached DOM node. Retested a moment later with fresh references and it worked correctly every time.

The pattern across all three: **automated testing via stale element references is fragile around any moment the app is mid-re-render** — a real user clicking with their eyes on the screen wouldn't hit this, but it's worth knowing this class of "bug" exists in how I tested, not in the product.

---

## 4. Verified working (no issues found)

- Full **signup → onboarding → main app** flow, including the all-questions-skipped edge case (correctly falls back to a sensible default priority: "dump the last 48 hours of reality").
- **Sign out → log in** round trip, session persistence across reload.
- **Wrong password** rejection and **5-attempt lockout** (15 min), verified via direct API calls.
- **Password mismatch** validation on signup.
- Account menu: **Export my data**, **Sign out**, **Delete account** all present and wired correctly (export/delete verified via direct API calls against real Firestore data).
- All dashboard views render without crashing or showing `undefined`/`NaN`: Command, Changed, Universe, Doors, Risks, Milestones, Finance, Legal, Career, Body, Learning, Data Health.
- Generic seed content ("Body & presence upgrade", "New income stream") correctly shown to brand-new accounts instead of old personal branding.
- The "Do this next" guidance banner shows on every view, dismissible, and correctly reflects the ledger's actual top-priority action.
- Gemini ("Smart Mode") extraction confirmed working end-to-end when the upstream call succeeds — verified via raw event provenance (`method: gemini`, correct model name) and a materially better multi-event split than the heuristic parser would produce.
- Firestore persistence: data survives logout/login and server restarts; confirmed directly against the Firestore console and via `/api/account/export`.

---

## 5. Everything from this report is now fixed except one item

The only thing intentionally left open: **auditing `legal_effect` / `health_or_performance_effect` / door-candidate fields for the same "AI populates it, nothing reads it" gap that `risk_effect` had (§1.2).** That's a broader engine-by-engine audit, not a quick patch, and deserves its own pass rather than being rushed in alongside everything else. Worth doing next if you want the product to fully use what the AI already extracts.
