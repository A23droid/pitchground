# Pitchground — Adaptive Communication Training

Frontend for Pitchground. Next.js (App Router), TypeScript, Tailwind CSS v4, and Framer Motion.
Interview transcripts are mocked until STT lives on the FastAPI backend.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. For Google sign-in, also start `backend/` on port 8000.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Start on the dashboard, click **Start training**, and run the full
loop: baseline → pressure round → diagnosis → targeted challenge → failure replay → retry →
improvement → updated dashboard.

## Structure

```
app/                 routes: dashboard (/), /start, /interview, /profile
components/
  ui/                Button, Card, Badge, Progress — small primitives
  shared/             Nav, Logo, FlowSignature (signature visual), OptionGrid, DeltaRow
  dashboard/          dashboard-only sections
  interview/          the full interview flow + its screens
  profile/            learner profile sections
mock/                deterministic mock data (learner, sessions, scenarios, questions, analysis, transcripts)
services/            thin async service layer the UI calls — mirrors the future FastAPI routes
                     in the PRD (POST /sessions, POST /attempts/{id}/analyze, etc). Swap the
                     bodies of these functions for real fetch() calls later; no UI changes needed.
lib/types.ts         shared domain types
```

## Design

Self-contained cream/serif theme (Fraunces display + Inter body), inspired by the supplied
reference screenshot: warm paper background, pill buttons, dark pill badges, soft elevation.
The signature visual (`components/shared/FlowSignature.tsx`) is a hand-built SVG that morphs a
jagged "rambling" waveform into a clean Definition → Reason → Example path — the product's core
thesis, drawn.

Fonts are self-hosted via `@fontsource/*` so builds don't depend on reaching Google Fonts.

## New in this pass

- **Landing page** (`/`) — public marketing page inspired by wisprflow.ai: looping
  scribble text behind the headline, a diagonal marquee ribbon, an animated waveform
  pill, a philosophy loop stepper (Observe → Compare → Diagnose → Remember → Target →
  Recreate → Retry → Measure → Learn), a multimodal-signals grid, and a knowledge-vs-
  English-articulation teaser.
- **Auth** — `/login` and `/signup` (mock, localStorage-backed via `lib/auth.ts`).
  All app routes now live under `app/(app)/` behind `RequireAuth`, which redirects to
  `/login` if no session exists.
- **Language diagnostic flow** (`/language-diagnostic`) — comfortable-language attempt
  vs. English attempt, side-by-side comparison, PRD §11–15.
- **Recovery training flow** (`/recovery-training`) — AI interrupts mid-answer, measures
  recovery time/verdict, PRD §25.
- **Diagnosis confidence** — `FailureDiagnosis` now carries `confidence` + `occurrences`,
  shown on the diagnosis screen, PRD §20.
- **Communication graph** — simple animated node graph on the profile page, PRD §28.
- Dashboard gained a "Training modes" quick-launch row linking to all three flows.
