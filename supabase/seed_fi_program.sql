-- =============================================================
-- FI Teamspace — Program seed
-- 14 sprints (CEE Spring 2026 schedule) + 8 graduation milestones.
-- Idempotent: re-running upserts the same rows.
-- Run after 05_features.sql.
-- =============================================================

-- Clean previous placeholder sprints if any (safe; cascades to tasks).
-- Comment out if you have meaningful task progress to keep.
delete from public.sprints where week_number between 0 and 14 and name like 'Sprint %';

-- 14 FI sprints. Times: 17:00–19:00 CEST. start_date = the session date.
insert into public.sprints (name, week_number, start_date, end_date, description, is_current) values
  ('Accelerator Kickoff',         1,  '2026-05-04', '2026-05-10', 'Kick off the program. Set expectations, meet your cohort.',          (current_date between '2026-05-04' and '2026-05-10')),
  ('Vision & Mission',            2,  '2026-05-05', '2026-05-11', 'Articulate why your company exists and what change it drives.',     (current_date between '2026-05-05' and '2026-05-11')),
  ('Customer Development',        3,  '2026-05-12', '2026-05-18', 'Identify target customers, run problem interviews.',                (current_date between '2026-05-12' and '2026-05-18')),
  ('Revenue & Business Models',   4,  '2026-05-19', '2026-05-25', 'Define how the company makes money and at what unit economics.',    (current_date between '2026-05-19' and '2026-05-25')),
  ('Pitch Mastery',               5,  '2026-05-26', '2026-06-01', 'Refine the Feedback Pitch and Strategic Pitches.',                  (current_date between '2026-05-26' and '2026-06-01')),
  ('Mentor Idea Review',          6,  '2026-06-02', '2026-06-08', 'Mentors review the idea; pivot or commit.',                         (current_date between '2026-06-02' and '2026-06-08')),
  ('Legal & Equity',              7,  '2026-06-09', '2026-06-15', 'Incorporation, cap table basics, founder agreements.',              (current_date between '2026-06-09' and '2026-06-15')),
  ('Go-to-Market & Scale',        8,  '2026-06-16', '2026-06-22', 'Distribution channels, growth loops, scaling levers.',              (current_date between '2026-06-16' and '2026-06-22')),
  ('Product Development',         9,  '2026-06-23', '2026-06-29', 'Roadmap, MVP scope, product-market fit signals. (Incorporation deadline: Jun 23)', (current_date between '2026-06-23' and '2026-06-29')),
  ('Investor Progress Review',   10,  '2026-06-30', '2026-07-06', 'Progress audit by investors; sharpen the story.',                   (current_date between '2026-06-30' and '2026-07-06')),
  ('Co-Founders & Team',         11,  '2026-07-07', '2026-07-13', 'Hiring, equity splits, team-building.',                             (current_date between '2026-07-07' and '2026-07-13')),
  ('Growth',                     12,  '2026-07-14', '2026-07-20', 'Growth experiments, north-star metrics.',                           (current_date between '2026-07-14' and '2026-07-20')),
  ('Funding',                    13,  '2026-07-21', '2026-07-27', 'Fundraising strategy, pitch deck, investor outreach.',              (current_date between '2026-07-21' and '2026-07-27')),
  ('Graduation',                 14,  '2026-07-28', '2026-07-28', 'Demo day. Equity Collective sign-off. Onward.',                     (current_date >= '2026-07-28'));

-- Graduation milestones (FI Core requirements)
insert into public.course_milestones (code, title, description, sort_order) values
  ('attend_feedback',     'Attend feedback sessions',                  'Show up to weekly mentor feedback sessions.',                              1),
  ('sprints_on_time',     'Complete sprints on time',                  'Submit sprint deliverables every week with quality.',                      2),
  ('attend_working_group','Attend Working Group meetings',             'Participate in your Working Group every week.',                            3),
  ('pitch_ratings',       'Satisfactory pitch ratings',                 'Maintain solid Feedback Pitch and Strategic Pitch ratings.',               4),
  ('mentor_feedback',     'Positive mentor & Local Director reviews',   'Earn positive progress feedback from mentors and Local Directors.',        5),
  ('incorporate',         'Register your company',                      'Incorporate by Jun 23, 2026 (CEE Spring 2026 deadline).',                  6),
  ('equity_collective',   'Join the Equity Collective',                 'Join the Equity Collective by Jun 23, 2026.',                              7),
  ('graduate',            'Graduate the program',                       'Complete the program with all of the above by Jul 28, 2026.',              8)
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order;
