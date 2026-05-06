-- =============================================================
-- FI Teamspace — Part 2 of 3: signup trigger
-- Run after 01_tables.sql
-- =============================================================

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $func$
begin
  insert into public.profiles (user_id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
  on conflict (user_id) do nothing;
  return new;
end
$func$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
