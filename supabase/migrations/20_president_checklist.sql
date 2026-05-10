-- =============================================================
-- FI Teamspace — Part 20: per-sprint President checklist
--
-- Turns the static "President responsibilities" card on the dashboard
-- into actionable, persistent checkboxes scoped to the current sprint.
-- The 7 item codes come from PRESIDENT_RESPONSIBILITIES in the app.
-- =============================================================

create table if not exists public.president_checklist (
  sprint_id uuid not null references public.sprints(id) on delete cascade,
  item_code text not null,
  done boolean not null default false,
  done_at timestamptz,
  done_by uuid references public.profiles(user_id) on update cascade on delete set null,
  primary key (sprint_id, item_code)
);

alter table public.president_checklist enable row level security;

drop policy if exists pc_select on public.president_checklist;
drop policy if exists pc_write on public.president_checklist;

-- Anyone authenticated can see how the checklist looks for transparency.
create policy pc_select on public.president_checklist
  for select using (auth.uid() is not null);

-- Only the team president can tick items; done_by must be themselves.
create policy pc_write on public.president_checklist
  for all
  using (public.is_president(auth.uid()))
  with check (public.is_president(auth.uid()) and done_by = auth.uid());
