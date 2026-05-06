-- =============================================================
-- FI Teamspace — Part 7: team contacts directory
-- For teammates who haven't signed up yet but whose phone we know.
-- Shown on /team alongside actual profiles. WhatsApp links from phone.
-- =============================================================

create table if not exists public.team_contacts (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  member_name text not null,
  phone text,
  email text,
  linkedin text,
  telegram text,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (team_name, member_name)
);

alter table public.team_contacts enable row level security;

drop policy if exists tc_select on public.team_contacts;
drop policy if exists tc_write  on public.team_contacts;
create policy tc_select on public.team_contacts for select using (auth.uid() is not null);
create policy tc_write  on public.team_contacts for all
  using (auth.uid() is not null) with check (auth.uid() is not null);
