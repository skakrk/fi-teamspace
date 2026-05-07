-- =============================================================
-- Public read-only shares for present-mode views (cohort/working-group).
-- The page is gated by a PIN: client stores sha256(pin) as pin_hash,
-- the present-share-view edge function (uses service role) verifies
-- both token + PIN before returning sanitised JSON. Anonymous reads
-- of this table are NOT allowed.
-- =============================================================

create table if not exists public.present_shares (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  pin_hash text not null,
  kind text not null check (kind in ('cohort_present', 'working_group_present')),
  sprint_id uuid references public.sprints(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

create index if not exists present_shares_token_idx on public.present_shares(token);

alter table public.present_shares enable row level security;

drop policy if exists present_shares_owner_select on public.present_shares;
drop policy if exists present_shares_owner_modify on public.present_shares;

create policy present_shares_owner_select on public.present_shares
  for select using (auth.uid() = created_by);

create policy present_shares_owner_modify on public.present_shares
  for all using (auth.uid() = created_by) with check (auth.uid() = created_by);
