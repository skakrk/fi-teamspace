import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anon);

export const supabase = createClient(
  url || 'https://example.supabase.co',
  anon || 'public-anon-key-placeholder',
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  },
);

export type DbProfile = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  about_me: string | null;
  project_name: string | null;
  project_description: string | null;
  skills: string | null;
  can_help_with: string | null;
  need_help_with: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  twitter: string | null;
  telegram: string | null;
  website: string | null;
  is_president: boolean;
  created_at: string;
  updated_at: string;
};

export type DbSprint = {
  id: string;
  name: string;
  week_number: number;
  start_date: string;
  end_date: string;
  description: string | null;
  is_current: boolean;
  created_at: string;
};

export type DbSprintTask = {
  id: string;
  sprint_id: string;
  title: string;
  description: string | null;
  sort_order: number;
};

export type TaskStatus = 'not_started' | 'in_progress' | 'done' | 'blocked';

export type DbTaskProgress = {
  task_id: string;
  user_id: string;
  status: TaskStatus;
  notes: string | null;
  updated_at: string;
};

export type DbMeeting = {
  id: string;
  title: string;
  scheduled_at: string;
  duration_min: number;
  meet_url: string | null;
  agenda: string | null;
  status: 'upcoming' | 'past' | 'cancelled';
  sprint_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type DbMeetingUpdate = {
  meeting_id: string;
  user_id: string;
  success: string | null;
  challenge: string | null;
  learning: string | null;
  updated_at: string;
};

export type PitchStatus = 'draft' | 'ready' | 'reviewed';

export type DbPitch = {
  id: string;
  user_id: string;
  version: number;
  text_md: string;
  target_duration_sec: number;
  video_url: string | null;
  deck_url: string | null;
  status: PitchStatus;
  meeting_id: string | null;
  created_at: string;
};

export type DbPitchFeedback = {
  id: string;
  pitch_id: string;
  reviewer_id: string;
  what_works: string | null;
  what_unclear: string | null;
  suggestion: string | null;
  score_clarity: number | null;
  score_persuasive: number | null;
  created_at: string;
};

export type DbPoll = {
  id: string;
  title: string;
  description: string | null;
  type: 'single' | 'multiple';
  is_anonymous: boolean;
  deadline: string | null;
  status: 'open' | 'closed';
  created_by: string | null;
  created_at: string;
};

export type DbPollOption = {
  id: string;
  poll_id: string;
  label: string;
  sort_order: number;
};

export type DbVote = {
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
};

export type DbLeaderboard = {
  id: string;
  recorded_at: string;
  team_name: string;
  score: number;
  rank: number | null;
};

export type DbTeamVision = {
  id: number;
  vision: string | null;
  mission: string | null;
  updated_by: string | null;
  updated_at: string;
};
