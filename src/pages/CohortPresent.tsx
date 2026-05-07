import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Link2 } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { useTeam } from '@/hooks/useTeam';
import {
  supabase,
  type DbCohortRating,
  type DbMeeting,
  type DbMeetingNotes,
  type DbMeetingUpdate,
  type DbPitch,
  type DbPitchFeedback,
  type DbSprint,
  type DbSprintCompletion,
  type DbSprintTask,
  type DbTaskProgress,
  type DbTeamVision,
} from '@/lib/supabase';
import {
  computeStandings,
  latestSnapshotDate,
  rowsForDate,
} from '@/lib/standings';
import { avg, formatScore, safeFormat } from '@/lib/utils';

const OUR_TEAM = 'Breakers Team';

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-border rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted font-medium mb-1">
        {label}
      </div>
      <div className="text-sm whitespace-pre-line line-clamp-6">{value}</div>
    </div>
  );
}

type AttendanceRow = { meeting_id: string; user_id: string; status: 'present' | 'absent' | 'late' };

type Bundle = {
  vision: DbTeamVision | null;
  sprint: DbSprint | null;
  tasks: DbSprintTask[];
  progress: DbTaskProgress[];
  cohort: DbCohortRating[];
  pitches: DbPitch[];
  feedbacks: DbPitchFeedback[];
  updates: DbMeetingUpdate[];
  recentMeetings: DbMeeting[];
  notesByMeeting: Record<string, DbMeetingNotes>;
  attendanceByMeeting: Record<string, AttendanceRow[]>;
  sprintCompletions: DbSprintCompletion[];
};

export function CohortPresent() {
  const { profiles } = useTeam();
  const [data, setData] = useState<Bundle | null>(null);
  const [copied, setCopied] = useState(false);
  const [cohortSessions, setCohortSessions] = useState<DbMeeting[]>([]);
  const [cohortIdx, setCohortIdx] = useState(0); // 0 = newest

  // Load cohort sessions list (sorted newest first) and pick a sensible default.
  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from('meetings')
        .select('*')
        .eq('kind', 'cohort_session')
        .order('scheduled_at', { ascending: false });
      const list = (rows as DbMeeting[]) || [];
      setCohortSessions(list);
      if (list.length) {
        const nowIso = new Date().toISOString();
        // Default: most recent past session, otherwise the oldest upcoming one.
        const pastIdx = list.findIndex((m) => m.scheduled_at <= nowIso);
        setCohortIdx(pastIdx === -1 ? list.length - 1 : pastIdx);
      }
    })();
  }, []);

  const selectedCohort = cohortSessions[cohortIdx] ?? null;
  const hasNewer = cohortIdx > 0;
  const hasOlder = cohortIdx < cohortSessions.length - 1;

  async function copyShareLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        window.prompt('Copy this link:', url);
      }
      document.body.removeChild(ta);
    }
  }

  useEffect(() => {
    (async () => {
      const [
        { data: vision },
        { data: sprintCur },
        { data: sprintAny },
        { data: cohort },
        { data: pitches },
        { data: feedbacks },
      ] = await Promise.all([
        supabase.from('team_vision').select('*').eq('id', 1).maybeSingle(),
        supabase.from('sprints').select('*').eq('is_current', true).limit(1),
        supabase.from('sprints').select('*').order('week_number', { ascending: false }).limit(1),
        supabase.from('cohort_ratings').select('*').order('recorded_at', { ascending: false }),
        supabase.from('pitches').select('*').order('version', { ascending: false }),
        supabase.from('pitch_feedback').select('*'),
      ]);
      const sprint = ((sprintCur as DbSprint[]) || [])[0] ?? ((sprintAny as DbSprint[]) || [])[0] ?? null;
      let tasks: DbSprintTask[] = [];
      let progress: DbTaskProgress[] = [];
      let updates: DbMeetingUpdate[] = [];
      if (sprint) {
        const { data: t } = await supabase.from('sprint_tasks').select('*').eq('sprint_id', sprint.id);
        tasks = (t as DbSprintTask[]) || [];
        if (tasks.length) {
          const { data: p } = await supabase
            .from('task_progress')
            .select('*')
            .in('task_id', tasks.map((x) => x.id));
          progress = (p as DbTaskProgress[]) || [];
        }
      }
      // Recent past Working Group meetings — for the report section.
      // Cohort sessions are surfaced separately via the session selector.
      const nowIso = new Date().toISOString();
      const { data: meets } = await supabase
        .from('meetings')
        .select('*')
        .eq('kind', 'working_group')
        .lte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: false })
        .limit(5);
      const recentMeetings = (meets as DbMeeting[]) || [];
      const meetingIds = recentMeetings.map((x) => x.id);

      const notesByMeeting: Record<string, DbMeetingNotes> = {};
      const attendanceByMeeting: Record<string, AttendanceRow[]> = {};

      if (meetingIds.length) {
        const [{ data: notesRows }, { data: attRows }] = await Promise.all([
          supabase.from('meeting_notes').select('*').in('meeting_id', meetingIds),
          supabase.from('meeting_attendance').select('*').in('meeting_id', meetingIds),
        ]);
        for (const n of (notesRows as DbMeetingNotes[]) || []) {
          notesByMeeting[n.meeting_id] = n;
        }
        for (const a of (attRows as AttendanceRow[]) || []) {
          (attendanceByMeeting[a.meeting_id] ||= []).push(a);
        }
        // Round-robin from latest past meeting (used by Wins-this-week section)
        const lastMeeting = recentMeetings[0];
        if (lastMeeting) {
          const { data: u } = await supabase
            .from('meeting_updates')
            .select('*')
            .eq('meeting_id', lastMeeting.id);
          updates = (u as DbMeetingUpdate[]) || [];
        }
      }

      // Sprint completions (per founder, current sprint)
      let sprintCompletions: DbSprintCompletion[] = [];
      if (sprint) {
        const { data: c } = await supabase
          .from('sprint_completions')
          .select('*')
          .eq('sprint_id', sprint.id);
        sprintCompletions = (c as DbSprintCompletion[]) || [];
      }

      setData({
        vision: (vision as DbTeamVision) || null,
        sprint,
        tasks,
        progress,
        cohort: (cohort as DbCohortRating[]) || [],
        pitches: (pitches as DbPitch[]) || [],
        feedbacks: (feedbacks as DbPitchFeedback[]) || [],
        updates,
        recentMeetings,
        notesByMeeting,
        attendanceByMeeting,
        sprintCompletions,
      });
    })();
  }, []);

  // Latest pitch per founder
  const latestPitchByUser = useMemo(() => {
    const m: Record<string, DbPitch> = {};
    for (const p of data?.pitches ?? []) {
      if (!m[p.user_id] || m[p.user_id].version < p.version) m[p.user_id] = p;
    }
    return m;
  }, [data?.pitches]);

  // Top success across team this week
  const topSuccesses = useMemo(() => {
    return (data?.updates ?? [])
      .filter((u) => !!u.success)
      .map((u) => {
        const profile = profiles.find((p) => p.user_id === u.user_id);
        return { name: profile?.full_name ?? 'A founder', text: u.success! };
      });
  }, [data?.updates, profiles]);

  if (!data) return <div className="min-h-screen grid place-items-center">Loading…</div>;

  const {
    vision,
    sprint,
    tasks,
    progress,
    cohort,
    recentMeetings,
    notesByMeeting,
    attendanceByMeeting,
    sprintCompletions,
  } = data;

  const sprintStats = (() => {
    if (!tasks.length || !profiles.length) return { pct: 0, done: 0, total: 0 };
    const total = tasks.length * profiles.length;
    const done = progress.filter((p) => p.status === 'done').length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  })();

  const latestDate = latestSnapshotDate(cohort);
  const standings = latestDate ? computeStandings(rowsForDate(cohort, latestDate)) : [];
  const ourStanding = standings.find((s) => s.team_name === OUR_TEAM);

  // Project list (one-liners)
  const projects = profiles
    .filter((p) => p.project_name || p.project_description)
    .map((p) => ({
      name: p.full_name,
      avatar: p.avatar_url,
      project: p.project_name,
      pitch: p.project_description,
    }));

  return (
    <div className="min-h-screen bg-white text-ink p-6 sm:p-8 lg:p-14 relative">
      <button
        onClick={copyShareLink}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-medium text-ink hover:bg-bg transition-colors shadow-sm z-10"
        aria-label="Copy share link"
      >
        {copied ? (
          <>
            <Check size={14} className="text-ok" /> Link copied
          </>
        ) : (
          <>
            <Link2 size={14} /> Copy share link
          </>
        )}
      </button>
      <div className="max-w-6xl mx-auto space-y-12">
        {/* === HERO === */}
        <div className="text-center pb-6 border-b border-border">
          <div className="text-sm uppercase tracking-[0.2em] text-muted">
            Founder Institute · CEE Spring 2026
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-deep mt-2">Breakers Team</h1>
          {vision?.mission && (
            <p className="text-xl text-ink/80 mt-6 max-w-3xl mx-auto leading-relaxed">
              {vision.mission}
            </p>
          )}
          {ourStanding && (
            <div className="inline-flex items-center gap-3 bg-bubble/40 px-5 py-2 rounded-full mt-6">
              <span className="text-sm text-muted">Currently</span>
              <span className="font-bold text-primary-deep text-lg">
                #{ourStanding.rank} of {standings.length}
              </span>
              <span className="text-sm text-muted">·</span>
              <span className="font-mono font-bold">
                {ourStanding.avg_score == null ? '—' : ourStanding.avg_score.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* === COHORT SESSION SELECTOR === */}
        {cohortSessions.length > 0 && selectedCohort && (() => {
          const isUpcoming = new Date(selectedCohort.scheduled_at) > new Date();
          const sessionNumber = cohortSessions.length - cohortIdx;
          return (
            <section className="bg-bubble/30 border border-primary/15 rounded-2xl p-5 sm:p-6">
              <div className="flex items-stretch gap-3">
                <button
                  type="button"
                  onClick={() => hasOlder && setCohortIdx((i) => i + 1)}
                  disabled={!hasOlder}
                  className="shrink-0 w-10 sm:w-12 grid place-items-center rounded-xl bg-white border border-border text-ink hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous cohort session"
                  title="Previous cohort session"
                >
                  <ChevronLeft size={22} />
                </button>
                <div className="flex-1 min-w-0 text-center">
                  <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted">
                    Cohort session {sessionNumber} of {cohortSessions.length}
                    {isUpcoming ? ' · upcoming' : ''}
                  </div>
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold mt-1 break-words">
                    {selectedCohort.title}
                  </div>
                  <div className="text-sm text-muted mt-1">
                    {safeFormat(selectedCohort.scheduled_at, 'EEEE, MMMM d, yyyy · HH:mm')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => hasNewer && setCohortIdx((i) => i - 1)}
                  disabled={!hasNewer}
                  className="shrink-0 w-10 sm:w-12 grid place-items-center rounded-xl bg-white border border-border text-ink hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next cohort session"
                  title="Next cohort session"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
              {selectedCohort.agenda && (
                <div className="mt-4 sm:mt-5 text-sm text-ink/80 whitespace-pre-line max-w-2xl mx-auto bg-white/60 rounded-xl p-4">
                  {selectedCohort.agenda}
                </div>
              )}
              {selectedCohort.meet_url && isUpcoming && (
                <div className="text-center mt-4">
                  <a
                    href={selectedCohort.meet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark"
                  >
                    Join meeting
                  </a>
                </div>
              )}
            </section>
          );
        })()}

        {/* === WHAT WE'RE WORKING ON (top) === */}
        <section>
          <div className="text-xs uppercase tracking-wider text-muted mb-4">
            What we're working on
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-bg rounded-2xl p-6">
              {sprint ? (
                <>
                  <div className="text-xs uppercase tracking-wider text-muted">
                    Week {sprint.week_number} sprint
                  </div>
                  <div className="text-3xl font-bold mt-1">{sprint.name}</div>
                  {sprint.description && (
                    <div className="text-base text-muted mt-2">{sprint.description}</div>
                  )}
                  <div className="text-sm text-muted mt-3">
                    {safeFormat(sprint.start_date, 'MMM d')} –{' '}
                    {safeFormat(sprint.end_date, 'MMM d')}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted">No active sprint.</div>
              )}
            </div>
            <div className="bg-primary text-white rounded-2xl p-6 text-center">
              <div className="text-xs uppercase tracking-wider opacity-90 mb-2">
                Founders completed
              </div>
              <div className="text-5xl sm:text-6xl lg:text-7xl font-bold">
                {sprintCompletions.length}
                <span className="text-xl sm:text-2xl opacity-70">/ {profiles.length}</span>
              </div>
              <div className="text-sm opacity-90 mt-1">marked this sprint done</div>
              <div className="h-2 mt-4 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{
                    width: `${
                      profiles.length
                        ? Math.round((sprintCompletions.length / profiles.length) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              {tasks.length > 0 && (
                <div className="text-[11px] opacity-80 mt-3 pt-3 border-t border-white/20">
                  Task board: {sprintStats.done}/{sprintStats.total} cells
                </div>
              )}
            </div>
          </div>
        </section>

        {/* === WORKING GROUP RESULTS === */}
        <section>
          <div className="text-xs uppercase tracking-wider text-muted mb-4">
            Working group results &amp; reports
          </div>
          {recentMeetings.length === 0 ? (
            <div className="bg-bg rounded-2xl p-6 text-sm text-muted">
              No past meetings yet — once a Working Group session has happened, the President's
              minutes and team activity will appear here.
            </div>
          ) : (
            <div className="space-y-5">
              {recentMeetings.slice(0, 3).map((mt) => {
                const notes = notesByMeeting[mt.id];
                const att = attendanceByMeeting[mt.id] ?? [];
                const present = att.filter((a) => a.status === 'present').length;
                const late = att.filter((a) => a.status === 'late').length;
                const absent = att.filter((a) => a.status === 'absent').length;
                return (
                  <div
                    key={mt.id}
                    className="bg-bg rounded-2xl p-5 border border-border"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-3 pb-3 border-b border-border">
                      <div>
                        <div className="font-bold text-lg">{mt.title}</div>
                        <div className="text-sm text-muted">
                          {safeFormat(mt.scheduled_at, 'EEEE, MMMM d · HH:mm')}
                        </div>
                      </div>
                      <div className="text-xs flex items-center gap-2 flex-wrap">
                        <span className="bg-ok/10 text-ok px-2 py-1 rounded">
                          ✓ {present} present
                        </span>
                        {late > 0 && (
                          <span className="bg-warn/10 text-warn px-2 py-1 rounded">
                            ⏱ {late} late
                          </span>
                        )}
                        {absent > 0 && (
                          <span className="bg-bad/10 text-bad px-2 py-1 rounded">
                            ✕ {absent} absent
                          </span>
                        )}
                      </div>
                    </div>

                    {!notes && (
                      <div className="text-sm text-muted italic">
                        No minutes posted yet by the President.
                      </div>
                    )}

                    {notes && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {notes.discussion_points && (
                          <ReportField
                            label="Successes & challenges + discussion"
                            value={notes.discussion_points}
                          />
                        )}
                        {notes.sprint_questions && (
                          <ReportField
                            label="High-level Sprint questions"
                            value={notes.sprint_questions}
                          />
                        )}
                        {notes.next_meeting_review && (
                          <ReportField
                            label="To review next meeting"
                            value={notes.next_meeting_review}
                          />
                        )}
                        {notes.content && (
                          <ReportField label="Additional notes" value={notes.content} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {recentMeetings.length > 3 && (
                <div className="text-xs text-muted text-center">
                  Showing the 3 most recent meetings of {recentMeetings.length} total.
                </div>
              )}
            </div>
          )}
        </section>

        {/* === WINS THIS WEEK === */}
        {topSuccesses.length > 0 && (
          <section>
            <div className="text-xs uppercase tracking-wider text-muted mb-4">Wins this week</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topSuccesses.map((s, i) => (
                <Card key={i} className="bg-bubble/30 border-primary/20">
                  <CardBody>
                    <div className="text-ok font-bold text-sm mb-1">✓ {s.name}</div>
                    <div className="text-base">{s.text}</div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* === PITCH HIGHLIGHTS === */}
        <section>
          <div className="text-xs uppercase tracking-wider text-muted mb-4">Feedback Pitches</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {profiles.map((p) => {
              const pitch = latestPitchByUser[p.user_id];
              const fb = pitch
                ? data.feedbacks.filter((f) => f.pitch_id === pitch.id)
                : [];
              const clarity = avg(fb.map((f) => f.score_clarity));
              const persuasive = avg(fb.map((f) => f.score_persuasive));
              return (
                <div key={p.user_id} className="bg-bg rounded-xl p-4 text-center">
                  <Avatar
                    name={p.full_name || '?'}
                    src={p.avatar_url}
                    size="lg"
                    className="mx-auto mb-2"
                  />
                  <div className="font-semibold">{(p.full_name || '?').split(' ')[0]}</div>
                  <div className="text-xs text-muted">
                    {pitch ? `v${pitch.version}` : 'no pitch'}
                  </div>
                  {pitch && (
                    <div className="text-xs text-muted mt-1">
                      Clarity {formatScore(clarity)} · Persuasive {formatScore(persuasive)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* === ASKS === */}
        <section>
          <div className="text-xs uppercase tracking-wider text-muted mb-4">How you can help</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles
              .filter((p) => p.need_help_with)
              .map((p) => (
                <div key={p.user_id} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar name={p.full_name || '?'} src={p.avatar_url} size="sm" />
                    <div className="font-semibold">{p.full_name}</div>
                  </div>
                  <div className="text-sm">{p.need_help_with}</div>
                </div>
              ))}
            {!profiles.some((p) => p.need_help_with) && (
              <div className="text-sm text-muted col-span-full">
                No specific asks yet — fill in "What I need help with" in your profile.
              </div>
            )}
          </div>
        </section>

        {/* === FOUNDERS & PROJECTS (now at the bottom) === */}
        <section>
          <div className="text-xs uppercase tracking-wider text-muted mb-4">Who we are</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {profiles.map((p) => {
              const proj = projects.find((x) => x.name === p.full_name);
              return (
                <div key={p.user_id} className="flex gap-4 bg-bg rounded-2xl p-5">
                  <Avatar name={p.full_name || '?'} src={p.avatar_url} size="xl" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg">{p.full_name}</div>
                    {proj?.project && (
                      <div className="text-sm font-medium text-primary-deep mt-0.5">
                        {proj.project}
                      </div>
                    )}
                    {proj?.pitch && (
                      <div className="text-sm text-muted mt-1 line-clamp-3">{proj.pitch}</div>
                    )}
                    {!proj?.pitch && !proj?.project && (
                      <div className="text-sm text-muted italic mt-1">Project TBA</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* === FOOTER === */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <div className="text-xs text-muted italic">
            Thanks to Adeo Ressi · OpenClaw AI Productivity Bootcamp
          </div>
          <Link to="/" className="text-sm text-muted hover:text-ink">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
