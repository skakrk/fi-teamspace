# Best Teamspace — Breakers Team

Mini CRM for a Founder Institute Working Group. Profiles, weekly meetings, sprint board, structured pitch feedback, polls (incl. President election), and a dashboard for course presentations.

## Quick start

1. Create a Supabase project and run [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql) in the SQL Editor.
2. `cp .env.example .env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from **Project Settings → API**.
3. `pnpm install && pnpm dev` → open `http://localhost:5173/fi-teamspace/`.

For GitHub Pages deployment, add the same env vars as repo Secrets — the workflow at `.github/workflows/deploy.yml` does the rest.

## Features

- **Profiles & Team** — about, skills, project, contacts, social.
- **Pitches** — Feedback Pitch with versioning and structured peer feedback.
- **Meetings** — schedule with .ics export, agendas, minutes, recording links.
- **Sprints** — founders × tasks board with status cycling.
- **Polls** — voting with a President Election preset.
- **Leaderboard** — weekly FI standings with a score-over-time chart.
- **Dashboard** — overview + Present Mode for FI calls.

In-app: user guide at `/guide`, password-storage explanation at `/security`.

## License

MIT.
