-- =============================================================
-- FI Teamspace — Part 6: Restore table-level grants
-- After `drop schema public cascade` we lost the default Supabase
-- grants on public.*. RLS handles row-level access, but Postgres
-- still requires table-level GRANTs for the role to read/write.
-- =============================================================

-- Schema usage
grant usage on schema public to anon, authenticated, service_role;

-- Existing tables: full CRUD for authenticated (RLS still gates rows)
grant select, insert, update, delete on all tables    in schema public to authenticated;
grant usage, select                  on all sequences in schema public to authenticated;
grant execute                        on all functions in schema public to authenticated;

-- Read-only for anon (we don't really expose anything to anon, but Supabase
-- internally connects with this role for unauthed clients)
grant select on all tables    in schema public to anon;
grant usage, select on all sequences in schema public to anon;

-- Service role gets everything (bypasses RLS, used by Edge Functions / Admin)
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Future tables: same defaults so we don't have to re-run this
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
alter default privileges in schema public
  grant execute on functions to authenticated;

alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant usage, select on sequences to anon;

alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
alter default privileges in schema public
  grant all on functions to service_role;
