# Call Intelligence

Every customer call transcribed, classified, scored against the company's call framework, and turned into coaching an owner can act on.
n**Live demo:** https://pestlaunch-calls.vercel.app (no login)

**This is a portfolio demo.** The company (Northwind Pest Co.), reps, customers and calls are fictional. The recordings are synthetic voices, and every call was scored by the app's real analysis pipeline. No login needed. Your changes (assign, mark done, delete, upload) are saved only in your browser, and **Reset demo** in the profile menu starts over.

## What it does

- **Owner overview:** what is costing money this period, booking rate, cancels saved, average score, revenue still on the table, where calls break down step by step, this week's coaching focus, a team ranking, missed steps by rep, and a to-do queue.
- **Call detail:** audio player with a waveform and markers where steps were hit, a transcript synced to playback (click any line to jump), the scorecard with the exact words that earned or missed each step, and coaching with "say this instead" lines.
- **Calls log:** filter by type, rep, outcome, score and date, saved views, bulk assign, CSV export, keyboard navigation (J and K to move, X to select).
- **Reps:** each rep's trend, pillar gaps against the team, most-missed steps and a 1-on-1 plan.
- **Upload:** drop in any audio file to watch the pipeline run (upload, transcribe, classify and score). In the demo the file never leaves your browser, and the call is scored with one of the sample recordings.
- **Command palette and shortcuts:** Cmd+K searches calls, reps and actions. Press ? for the full list.

## Why the scores can be trusted

The model judges each step, but **code owns the score**:

1. Every passed step must quote the transcript. The quote is checked against the actual lines (at least 70% word overlap across a 3-line window). If the words aren't there, the step gets no credit, and the UI says why.
2. Only the rep's own words can earn credit. Phone audio is mono, so speech-to-text often merges both voices into one line. A cheap first pass marks where the voice changes and code cuts the line there, never dropping or inventing words.
3. Scorecard rules are applied in code: objection steps are auto-passed when there was no objection, and the Gold / Green / Below cutoffs are fixed per scorecard.

## How it works in production

```
Browser ──signed upload──▶ private object storage
   └─▶ /api/calls/:id/process
          1. Deepgram nova-3, diarized utterances
          2. Turn split at speaker changes (Rep / Customer)
          3. Pass 1, facts: type, outcome, details, objections
          4. Pass 2, scoring: only the scorecard for that call type, plus coaching
          5. Code: evidence check, scorecard math, grade
       ──▶ Postgres (jsonb transcript + analysis)
```

The public demo swaps storage and Postgres for `src/data/calls.json` and a per-visitor cookie (`src/lib/db.ts`), so it runs with no keys, no database and no cost.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind 4 with CSS-variable tokens, Radix primitives, Motion, Recharts, cmdk, Sonner. Deepgram for speech-to-text and the demo voices, Groq (or Claude when `ANTHROPIC_API_KEY` is set) for analysis. Vitest unit tests and Playwright smoke tests with axe accessibility checks.

Design system: [docs/DESIGN.md](docs/DESIGN.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # unit tests
npm run test:e2e     # Playwright + axe (start the dev server first)
```

### Regenerate the demo data

`scripts/generate-demo.mts` writes each fictional call from a short brief, voices it with two synthetic speakers, and scores it with the same `analyze()` the app uses. It needs `GROQ_API_KEY` and `DEEPGRAM_API_KEY` in `.env.local`.

```bash
npx tsx --env-file=.env.local scripts/generate-demo.mts
```
