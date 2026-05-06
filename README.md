# FI Teamspace — Breakers Team

Mini CRM for a Founder Institute Working Group. Profiles, weekly meetings, sprint board, structured pitch feedback, polls (incl. President election), and a dashboard for course presentations.

**Stack:** React + Vite + TypeScript + TailwindCSS · Supabase (Postgres + Auth) · GitHub Pages.

---

## Quick start

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (free tier is enough).
2. In the SQL Editor, paste and run the contents of [`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql).
3. Optionally run [`supabase/seed.sql`](supabase/seed.sql) to populate a starter sprint and a sample leaderboard snapshot.
4. In **Project Settings → API**, copy the `URL` and the `anon public` key.
5. (Optional but recommended for a small team) In **Authentication → Providers → Email**, disable "Confirm email" so teammates can sign up without inbox confirmation, and disable open signups once everyone's in.

### 2. Run locally

```bash
pnpm install
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
pnpm dev
```

Open `http://localhost:5173/fi-teamspace/`. Sign up with email + password → you'll be redirected to fill in your profile.

### 3. Deploy to GitHub Pages

1. Push the repo to `github.com/<your-username>/fi-teamspace` (the path matters — `vite.config.ts` uses `base: '/fi-teamspace/'`).
2. In **Settings → Pages**, set Source = **GitHub Actions**.
3. In **Settings → Secrets and variables → Actions**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Push to `main`. The included workflow `.github/workflows/deploy.yml` will build and publish to `https://<your-username>.github.io/fi-teamspace/`.

> If your repo is named differently, update `base` in `vite.config.ts` to match.

---

## Features

- **Profiles** — about me, project, skills, what I can help with, what I need help with, contacts, social. (`/profile`, `/team`)
- **Pitches ⭐** — weekly Feedback Pitch with versioning, structured 4-field feedback (Works / Unclear / Suggestion / Score), Clarity & Persuasiveness scores, pitch timer. (`/pitches`)
- **Meetings** — schedule with Google Meet URL, agenda template baked in, "Add to Calendar" (.ics) download, attendance, per-founder Success / Challenge / Learning, meeting minutes, pitch timings, recording & transcript links + AI summary (paste from tl;dv / Tactiq / Otter — see Meeting Detail). (`/meetings`)
- **Sprints** — founders × tasks board. Click your cell to cycle status (Not started → In progress → Done → Blocked). (`/sprints`)
- **Polls** — create polls, vote, see results after voting/deadline. President Election preset auto-populates the team as options and lets you flip the `is_president` flag in one click. (`/polls`)
- **Leaderboard** — record FI standings each week; chart shows our score over time. (`/leaderboard`)
- **Dashboard** — overall snapshot + Pitch readiness for next session + Present Mode (`/dashboard/present`) for screen sharing on FI calls.

---

## Project structure

```
fi_teamspace/
├── .github/workflows/deploy.yml
├── supabase/
│   ├── migrations/0001_initial_schema.sql
│   └── seed.sql
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── lib/        (supabase client, ICS, utils)
│   ├── hooks/      (useAuth, useTeam)
│   ├── components/ (ui primitives, layout, icons, shared)
│   ├── pages/      (Dashboard, Team, Pitches, Meetings, Sprints, Polls, Leaderboard …)
│   └── styles/globals.css
├── public/favicon.svg
├── index.html
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## Trust model & security

This app is intended for a small Working Group (5–8 founders). Row-Level Security in Supabase enforces:

- All authenticated members can **read** all team data.
- Members can only **write** their own personal records (profile, votes, pitches, task progress, meeting updates, pitch feedback).
- Shared records (meetings, sprints, polls, leaderboard, team vision, meeting minutes) are writable by any authenticated member.

This is the right balance for a high-trust 5-person team. For a stricter model later, gate shared writes behind an `is_president` SQL function.

---

## License

MIT.
