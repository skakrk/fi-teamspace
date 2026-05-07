-- =============================================================
-- Align CEE Spring 2026 sprint dates with the official FI schedule.
-- Sprints run Tuesday → next Tuesday (the next session day).
-- Accelerator Kickoff is the 1-day kickoff event (May 4 → May 5).
-- Idempotent: re-running just rewrites the same dates.
-- =============================================================

update public.sprints set start_date = '2026-04-27', end_date = '2026-05-04', is_current = false where week_number = 0;
update public.sprints set start_date = '2026-05-04', end_date = '2026-05-05', is_current = (current_date = '2026-05-04')                                                  where week_number = 1;
update public.sprints set start_date = '2026-05-05', end_date = '2026-05-12', is_current = (current_date between '2026-05-05' and '2026-05-11')                            where week_number = 2;
update public.sprints set start_date = '2026-05-12', end_date = '2026-05-19', is_current = (current_date between '2026-05-12' and '2026-05-18')                            where week_number = 3;
update public.sprints set start_date = '2026-05-19', end_date = '2026-05-26', is_current = (current_date between '2026-05-19' and '2026-05-25')                            where week_number = 4;
update public.sprints set start_date = '2026-05-26', end_date = '2026-06-02', is_current = (current_date between '2026-05-26' and '2026-06-01')                            where week_number = 5;
update public.sprints set start_date = '2026-06-02', end_date = '2026-06-09', is_current = (current_date between '2026-06-02' and '2026-06-08')                            where week_number = 6;
update public.sprints set start_date = '2026-06-09', end_date = '2026-06-16', is_current = (current_date between '2026-06-09' and '2026-06-15')                            where week_number = 7;
update public.sprints set start_date = '2026-06-16', end_date = '2026-06-23', is_current = (current_date between '2026-06-16' and '2026-06-22')                            where week_number = 8;
update public.sprints set start_date = '2026-06-23', end_date = '2026-06-30', is_current = (current_date between '2026-06-23' and '2026-06-29')                            where week_number = 9;
update public.sprints set start_date = '2026-06-30', end_date = '2026-07-07', is_current = (current_date between '2026-06-30' and '2026-07-06')                            where week_number = 10;
update public.sprints set start_date = '2026-07-07', end_date = '2026-07-14', is_current = (current_date between '2026-07-07' and '2026-07-13')                            where week_number = 11;
update public.sprints set start_date = '2026-07-14', end_date = '2026-07-21', is_current = (current_date between '2026-07-14' and '2026-07-20')                            where week_number = 12;
update public.sprints set start_date = '2026-07-21', end_date = '2026-07-28', is_current = (current_date between '2026-07-21' and '2026-07-27')                            where week_number = 13;
update public.sprints set start_date = '2026-07-28', end_date = '2026-07-28', is_current = (current_date >= '2026-07-28')                                                   where week_number = 14;
