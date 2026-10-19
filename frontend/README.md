# Pitchground frontend

Next.js App Router, TypeScript, Tailwind CSS and Framer Motion. The original homepage and cream/serif theme are preserved.

## Run

```bash
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` to the backend origin (normally `http://localhost:8000`). Start the backend before signing in or practicing. Groq and other secret credentials belong only in `backend/.env`.

## Product flows

- `/login`, `/signup`, `/auth/callback`: backend-verified authentication; protected routes restore learner identity through `/auth/me`.
- `/interview`: topic input, generated question, recorded baseline/pressure/retry, measured comparisons and generated coaching.
- `/impromptu`: generated question, preparation timer, recorded speech and a timeline from word timestamps.
- `/debate`: generated proposition/counters, recorded opening/rebuttal/closing, audio-only camera fallback and server reports.
- `/language-diagnostic`: two recordings of the same generated question with separate language hints.
- `/recovery-training`: recorded interruption timestamp and measured post-interruption recovery.
- `/dashboard`, `/profile`: verified stored measurements, progress, comparable-history trends and five-mode practice history.

`services/` calls the authenticated backend; production has no mock-data directory. `lib/signalMapper.ts` preserves missing measurements as unavailable. Error/retry and empty-data boxes reuse existing styles. Analysis retries reuse the same uploaded take.

## Checks

```bash
npx tsc --noEmit
npm run build
```

See [the improvement checklist](../docs/IMPROVEMENT_CHECKLIST.md) and [Groq setup](../docs/GROQ_SETUP.md). Real microphone/camera, multilingual filler recall and Google consent flows still require browser validation. Existing lint findings are tracked separately; a successful build is not proof of real-world model accuracy.
