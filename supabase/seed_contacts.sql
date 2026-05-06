-- Breakers Team contacts (phones the team has shared).
-- Run after 07_team_contacts.sql. Idempotent.

insert into public.team_contacts (team_name, member_name, phone, sort_order) values
  ('Breakers Team', 'Sandra Ehigiator',    '+40745908980',  1),
  ('Breakers Team', 'Alena Ivanova',       '+35797438313',  2),
  ('Breakers Team', 'Konstantin Skavitin', '+38268109018',  3),
  ('Breakers Team', 'Kujtim Krasniqi',     '+38345554300',  4),
  ('Breakers Team', 'Vladimir Kaverin',    '+436769212032', 5),
  ('Breakers Team', 'Kseniya Kultysheva',  '+381616064115', 6)
on conflict (team_name, member_name) do update set
  phone = excluded.phone,
  sort_order = excluded.sort_order;
