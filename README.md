# LifeOS

**Talk to it like a diary. Get back a structured picture of your life — and one clear thing to do next.**

## What this is

Most people's lives are scattered across notes apps, half-remembered conversations, and habit trackers that guilt more than they help. You write things down, but none of it ever adds up to a picture of what's actually going on — or what to do about it.

LifeOS is the opposite. You dump reality in your own words — messy, unfiltered, no schema to learn — and it:

1. **Preserves what you actually said**, verbatim, forever (history is append-only; nothing gets silently rewritten, including by the AI).
2. **Splits it into real events** and classifies how sure it can be about each one — a claim isn't a fact, a hope isn't a plan, an event type isn't a habit checkbox.
3. **Derives your state from evidence**, not from what you type into a mood slider. Every number is traceable to the events behind it.
4. **Finds the doors, risks, and second-order effects** hiding in what you wrote — a landlord dispute isn't just a "legal" event, it's also a career risk and a mobility constraint, and LifeOS says so.
5. **Renders it as a navigable 3D universe** — proximity is relation, size is weight, brightness is confidence.
6. **Tells you the one thing worth doing next**, ranked by impact and leverage — not a streak to protect.

Operating loop: **REALITY → STATE → WORLD → OPTIONS → DECISION → ACTION → REALITY**

## Who it's for

Anyone whose life has too many moving pieces to hold in their head — job search, relocation, visa/legal status, a side income stream, health, relationships — and who is tired of tools that either demand rigid daily input (habit trackers) or produce nothing but a wall of unsorted notes (journaling apps). If you've ever forgotten your own progress — the internship lead from three weeks ago, the risk you flagged and never followed up on — this is built for exactly that gap.

## Speak like a human

```
learned 10 Lithuanian words today
got 0.5 kg lean muscle
made 120 euro from trading
found an internship in Barcelona but they want B2 Spanish
worked 11 hours, exhausted, but saved 50 euro
I finally fixed my CV and someone from a tech company replied
I think my visa situation is getting difficult
```

Ctrl+Enter commits. `/` focuses the input. That's the entire interface.

## Product tiers

- **Instant Mode** (fallback) — local heuristic parser, zero configuration, zero cost, always available.
- **Smart Mode** (free, on by default once configured) — Google Gemini does real AI-powered extraction for every single user, free of charge on Gemini's free tier.
- **Deep Mode** (invite-only) — Grok does higher-quality extraction and can run live web research (visas, internships, language requirements, salaries). Gated and metered per account so it can't run up an API bill.

## Accounts & data

Every visitor gets their own account (email + password, bcrypt-hashed, never stored in plain text) and a private, isolated ledger. Data lives in **Firebase (Firestore)**, so it works identically on a laptop or a fleet of serverless instances. Every account can export their full ledger as JSON or permanently delete their account and all data, self-serve, no support ticket required.

## Views

Command · Changed · Timeline · Universe · Doors · Risks · Milestones · Finance · Legal · Career · Body · Learning · Data health

---

## Getting started

### 1. Set up Firebase (one-time)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project (the free Spark plan is fine).
2. Open **Build → Firestore Database** and click **Create database** (production mode; region doesn't matter much for local dev).
3. Open **Project settings** (gear icon) → **Service accounts** → **Generate new private key**. This downloads a JSON file — keep it secret, never commit it.
4. From that JSON, copy three values into `.env.local`: `project_id` → `FIREBASE_PROJECT_ID`, `client_email` → `FIREBASE_CLIENT_EMAIL`, `private_key` → `FIREBASE_PRIVATE_KEY` (paste exactly as-is, `\n` sequences and all, wrapped in quotes).

### 2. Get a free Gemini key (optional but recommended)

Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — no billing account required — and set `GEMINI_API_KEY`. Without it, every user falls back to the local heuristic parser (Instant Mode) instead of real AI extraction (Smart Mode).

### 3. Run it

```bash
cp .env.example .env.local
# fill in FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
# add GEMINI_API_KEY so everyone gets real AI extraction
# put your own email in OWNER_EMAIL so *you* get Deep Mode locally
# add XAI_API_KEY if you want Deep Mode to actually call Grok (https://console.x.ai)
npm install
npm run dev
```

Open [http://localhost:3100](http://localhost:3100), sign up with an email + password. No email deliverability to configure, no link to click.

### First-run onboarding

New accounts land in a short five-question intro (name, a one-line life snapshot, body/energy, money, career, anything urgent) instead of a blank text box. Each answer runs through the same extraction pipeline as any other entry, so by the time someone reaches the main app their universe, priorities, and data-health score are already populated from their own words.

---

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · `@react-three/fiber` / three.js for the 3D universe · Firebase Admin SDK (Firestore) · Google Gemini + xAI Grok for extraction · bcrypt for password hashing.

## Going from "runs on my machine" to actually public

1. **Add Firestore security rules** appropriate for production, and put the deployed environment's Firebase credentials in your host's environment variables (never in the repo).
2. **Set `RESEND_API_KEY`** so password-reset emails actually get delivered (the flow itself — request, reset page, auto-login — is fully built; without this key it just prints the link to the server console).
3. **Move Grok calls behind proper metering/alerting** if you widen `DEEP_MODE_ALLOWLIST` beyond a handful of people — the built-in monthly counter is a safety net, not a billing system.
4. **Watch the 1 MiB Firestore document limit** — each user's ledger is one document. Fine at normal usage; the fast-follow if a power user ever hits it is splitting `events` into their own subcollection.
5. **Add a privacy policy / ToS page** — this product ingests unusually personal data (health, finances, legal claims); say plainly what happens to it.

See `QA_REPORT.md` for the most recent full simulated-user QA pass and what it found.
