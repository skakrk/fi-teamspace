import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { safeFormat, safeDistance } from '@/lib/utils';
import { Download, ChevronRight, Maximize2, Minus, TrendingDown, TrendingUp, Video } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useTeam } from '@/hooks/useTeam';
import { downloadICS } from '@/lib/ics';
import {
  supabase,
  type DbCohortRating,
  type DbMeeting,
  type DbMeetingUpdate,
  type DbPitch,
  type DbPoll,
  type DbSprint,
  type DbSprintTask,
  type DbTaskProgress,
} from '@/lib/supabase';
import {
  computeStandings,
  latestSnapshotDate,
  rowsForDate,
} from '@/lib/standings';
import { LayoutDashboard, Megaphone, CalendarClock, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PRESIDENT_RESPONSIBILITIES } from '@/components/shared/PresidentRole';

const OUR_TEAM = 'Breakers Team';

type DashboardData = {
  meeting: DbMeeting | null;
  sprint: DbSprint | null;
  tasks: DbSprintTask[];
  progress: DbTaskProgress[];
  allPitches: DbPitch[];
  latestPitchByUser: Record<string, DbPitch>;
  meetingUpdates: DbMeetingUpdate[];
  poll: DbPoll | null;
  cohort: DbCohortRating[];
};

type QueryResult = { data: unknown; error: unknown };
type Thenable = { then(resolve: (r: QueryResult) => void, reject?: (e: unknown) => void): unknown };

async function safeQuery<T>(label: string, fn: () => Thenable): Promise<T[]> {
  try {
    const result = await (fn() as unknown as Promise<QueryResult>);
    if (result?.error) {
      // eslint-disable-next-line no-console
      console.warn(`[dashboard:${label}]`, result.error);
      return [];
    }
    return (result?.data as T[]) || [];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[dashboard:${label}] threw`, err);
    return [];
  }
}

function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const nowIso = now.toISOString();

      // Fire all independent queries in parallel; isolate failures so one bad
      // table can't block the whole dashboard.
      const [
        upcomingMeetings,
        pastMeetings,
        currentSprintRows,
        anySprintRows,
        allPitches,
        openPolls,
        cohortRows,
      ] = await Promise.all([
        // Next upcoming Working Group meeting.
        safeQuery<DbMeeting>('meetings/upcoming', () =>
          supabase
            .from('meetings')
            .select('*')
            .eq('kind', 'working_group')
            .gte('scheduled_at', nowIso)
            .order('scheduled_at', { ascending: true })
            .limit(1),
        ),
        // Most recent past Working Group meeting (so reflections filled after
        // the meeting still show up on the dashboard).
        safeQuery<DbMeeting>('meetings/past', () =>
          supabase
            .from('meetings')
            .select('*')
            .eq('kind', 'working_group')
            .lt('scheduled_at', nowIso)
            .order('scheduled_at', { ascending: false })
            .limit(1),
        ),
        safeQuery<DbSprint>('sprints/current', () =>
          supabase.from('sprints').select('*').eq('is_current', true).limit(1),
        ),
        safeQuery<DbSprint>('sprints/any', () =>
          supabase
            .from('sprints')
            .select('*')
            .order('week_number', { ascending: false })
            .limit(1),
        ),
        safeQuery<DbPitch>('pitches', () =>
          supabase.from('pitches').select('*').order('version', { ascending: false }),
        ),
        safeQuery<DbPoll>('polls', () =>
          supabase
            .from('polls')
            .select('*')
            .eq('status', 'open')
            .order('created_at', { ascending: false })
            .limit(1),
        ),
        safeQuery<DbCohortRating>('cohort_ratings', () =>
          supabase.from('cohort_ratings').select('*').order('recorded_at', { ascending: false }),
        ),
      ]);

      // Pick the meeting most relevant for this week's reflections.
      // Prefer a recent past meeting (within 7 days) so post-meeting reflections
      // keep showing until the next session approaches; otherwise fall back to
      // the next upcoming meeting (or whichever is non-null).
      const upcoming = upcomingMeetings[0] ?? null;
      const past = pastMeetings[0] ?? null;
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      const pastIsRecent =
        past && now.getTime() - new Date(past.scheduled_at).getTime() <= SEVEN_DAYS;
      const meeting = pastIsRecent ? past : upcoming ?? past;
      const sprint = currentSprintRows[0] ?? anySprintRows[0] ?? null;

      let tasks: DbSprintTask[] = [];
      let progress: DbTaskProgress[] = [];
      if (sprint) {
        tasks = await safeQuery<DbSprintTask>('sprint_tasks', () =>
          supabase.from('sprint_tasks').select('*').eq('sprint_id', sprint.id),
        );
        const ids = tasks.map((x) => x.id);
        if (ids.length) {
          progress = await safeQuery<DbTaskProgress>('task_progress', () =>
            supabase.from('task_progress').select('*').in('task_id', ids),
          );
        }
      }

      const byUser: Record<string, DbPitch> = {};
      for (const p of allPitches) {
        if (!byUser[p.user_id] || byUser[p.user_id].version < p.version) byUser[p.user_id] = p;
      }

      let updates: DbMeetingUpdate[] = [];
      if (meeting) {
        updates = await safeQuery<DbMeetingUpdate>('meeting_updates', () =>
          supabase.from('meeting_updates').select('*').eq('meeting_id', meeting.id),
        );
      }

      setData({
        meeting,
        sprint,
        tasks,
        progress,
        allPitches,
        latestPitchByUser: byUser,
        meetingUpdates: updates,
        poll: openPolls[0] ?? null,
        cohort: cohortRows,
      });
    })();
  }, []);

  return data;
}

function LeaderboardBanner({ rows }: { rows: DbCohortRating[] }) {
  const latestDate = latestSnapshotDate(rows);
  const standings = latestDate ? computeStandings(rowsForDate(rows, latestDate)) : [];
  const ourStanding = standings.find((s) => s.team_name === OUR_TEAM) ?? null;
  const totalFounders = standings.reduce((sum, s) => sum + s.members.length, 0);
  const totalRated = standings.reduce(
    (sum, s) => sum + s.members.filter((m) => m.score != null).length,
    0,
  );
  const allDates = Array.from(new Set(rows.map((r) => r.recorded_at))).sort();
  const previousDate = allDates.length >= 2 ? allDates[allDates.length - 2] : null;
  const previousStandings = previousDate
    ? computeStandings(rowsForDate(rows, previousDate))
    : [];
  const trend = (() => {
    const cur = ourStanding;
    const prev = previousStandings.find((s) => s.team_name === OUR_TEAM);
    if (!cur || !prev) return null as 'up' | 'down' | 'flat' | null;
    if (cur.rank < prev.rank) return 'up' as const;
    if (cur.rank > prev.rank) return 'down' as const;
    return 'flat' as const;
  })();

  if (!latestDate || !ourStanding) {
    return (
      <Card>
        <CardBody className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted">No leaderboard snapshot yet.</div>
          <Link to="/leaderboard">
            <Button variant="outline" size="sm">
              Open leaderboard <ChevronRight size={14} />
            </Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Link to="/leaderboard" className="block group">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white p-5 sm:p-6 shadow-xl shadow-primary/20 relative overflow-hidden transition-shadow group-hover:shadow-2xl">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_top_right,white_0%,transparent_60%)]" />
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-5 sm:gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Our position</div>
            <div className="text-4xl sm:text-5xl font-bold mt-1 leading-none">
              #{ourStanding.rank}
              <span className="text-xl opacity-60 ml-1">/ {standings.length}</span>
            </div>
            {trend && (
              <div className="text-xs mt-2 inline-flex items-center gap-1 opacity-90">
                {trend === 'up' && (
                  <>
                    <TrendingUp size={12} /> moved up vs last snapshot
                  </>
                )}
                {trend === 'down' && (
                  <>
                    <TrendingDown size={12} /> moved down vs last snapshot
                  </>
                )}
                {trend === 'flat' && (
                  <>
                    <Minus size={12} /> same as last snapshot
                  </>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Score</div>
            <div className="text-4xl sm:text-5xl font-bold mt-1 leading-none font-mono">
              {ourStanding.avg_score == null ? '—' : ourStanding.avg_score.toFixed(1)}
            </div>
            <div className="text-xs opacity-70 mt-2">goal: top 2 · 2.0+</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Founders</div>
            <div className="text-4xl sm:text-5xl font-bold mt-1 leading-none">
              {totalRated}
              <span className="text-xl opacity-60">/ {totalFounders}</span>
            </div>
            <div className="text-xs opacity-70 mt-2">rated cohort-wide</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Snapshot</div>
            <div className="text-base font-semibold mt-2">
              {safeFormat(latestDate, 'MMM d, yyyy')}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function Dashboard() {
  const data = useDashboardData();
  const { profiles } = useTeam();
  const { user } = useAuth();

  const tasks = data?.tasks ?? [];
  const progress = data?.progress ?? [];

  const myProfile = profiles.find((p) => p.user_id === user?.id);
  const iAmPresident = !!myProfile?.is_president;

  const sprintStats = useMemo(() => {
    if (!tasks.length || !profiles.length) return { done: 0, total: 0, pct: 0 };
    const total = tasks.length * profiles.length;
    const done = progress.filter((p) => p.status === 'done').length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [tasks, progress, profiles]);

  if (!data) return <div className="text-muted text-sm">Loading…</div>;

  const { meeting, sprint, latestPitchByUser, meetingUpdates, poll, cohort } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="h1 flex items-center gap-2">
            <LayoutDashboard className="text-primary-dark" size={22} /> Dashboard
          </h1>
          <p className="muted text-sm mt-1">Breakers Team · FI Core Program (CEE, Spring 2026)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/dashboard/present">
            <Button variant="outline" size="sm" className="sm:h-10 sm:px-4">
              <Maximize2 size={16} /> Working Group mode
            </Button>
          </Link>
          <Link to="/dashboard/cohort">
            <Button size="sm" className="sm:h-10 sm:px-4">
              <Maximize2 size={16} /> Cohort session mode
            </Button>
          </Link>
        </div>
      </div>

      <LeaderboardBanner rows={cohort} />

      {myProfile && (() => {
        const missing: string[] = [];
        if (!myProfile.project_name) missing.push('project name');
        if (!myProfile.project_description) missing.push('project description');
        if (!myProfile.linkedin) missing.push('LinkedIn');
        if (!myProfile.phone) missing.push('phone');
        if (!myProfile.about_me) missing.push('about me');
        if (missing.length === 0) return null;
        return (
          <Card className="border-amber-200 bg-amber-50">
            <CardBody className="flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink">Complete your profile</div>
                <div className="text-sm text-muted mt-1">
                  Teammates can see better who you are and how to reach you when these are filled in:{' '}
                  <span className="text-ink">{missing.join(', ')}</span>.
                </div>
              </div>
              <Link to="/profile">
                <Button>Fill in profile →</Button>
              </Link>
            </CardBody>
          </Card>
        );
      })()}

      {iAmPresident && (
        <Card className="border-primary/40 bg-bubble/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown size={18} className="text-primary-deep" /> President checklist — your accountability
            </CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-xs text-muted mb-3">
              You're the President of this Working Group. Per FI guide, your responsibilities for every session:
            </p>
            <ul className="space-y-2 text-sm">
              {PRESIDENT_RESPONSIBILITIES.map((r, i) => (
                <li key={r.code} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-white grid place-items-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{r.label}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="text-primary-dark" size={20} /> Pitch readiness for next session
            </CardTitle>
          </CardHeader>
          <CardBody>
            {!profiles.length ? (
              <div className="text-sm text-muted">No founders yet.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {profiles.map((p) => {
                  const pitch = latestPitchByUser[p.user_id];
                  const ready = pitch?.status === 'ready' || pitch?.status === 'reviewed';
                  return (
                    <Link
                      key={p.user_id}
                      to={`/pitches/${p.user_id}`}
                      className="flex flex-col items-center text-center gap-1 p-3 rounded-lg border border-border hover:border-primary/40"
                    >
                      <div className="relative">
                        <Avatar name={p.full_name || '?'} src={p.avatar_url} size="lg" />
                        <span
                          className={
                            'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ' +
                            (ready ? 'bg-ok' : 'bg-bg border-border')
                          }
                        />
                      </div>
                      <div className="text-xs font-medium truncate w-full">
                        {(p.full_name || 'Unnamed').split(' ')[0]}
                      </div>
                      <div className="text-[10px] text-muted">
                        {pitch ? `v${pitch.version}` : 'no pitch'}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="text-primary-dark" size={20} /> Next meeting
            </CardTitle>
          </CardHeader>
          <CardBody>
            {!meeting ? (
              <div className="text-sm text-muted">No upcoming meeting.</div>
            ) : (
              <div className="space-y-2">
                <div className="font-semibold">{meeting.title}</div>
                <div className="text-sm text-muted">
                  {safeFormat(meeting.scheduled_at, 'EEE, MMM d · HH:mm')}
                </div>
                <div className="text-xs text-muted">
                  in {safeDistance(meeting.scheduled_at)}
                </div>
                <div className="flex gap-2 pt-2 flex-wrap">
                  {meeting.meet_url && (
                    <a href={meeting.meet_url} target="_blank" rel="noreferrer">
                      <Button size="sm">
                        <Video size={14} /> Join
                      </Button>
                    </a>
                  )}
                  <Button size="sm" variant="outline" onClick={() => downloadICS(meeting)}>
                    <Download size={14} /> Calendar
                  </Button>
                  <Link to={`/meetings/${meeting.id}`}>
                    <Button size="sm" variant="ghost">
                      Open
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>This week's sprint</CardTitle>
          </CardHeader>
          <CardBody>
            {!sprint ? (
              <div className="text-sm text-muted">No sprint set.</div>
            ) : (
              <div className="space-y-3">
                <div className="font-semibold">{sprint.name}</div>
                <div className="text-xs text-muted">
                  {safeFormat(sprint.start_date, 'MMM d')} –{' '}
                  {safeFormat(sprint.end_date, 'MMM d')}
                </div>
                <div className="h-2 bg-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${sprintStats.pct}%` }}
                  />
                </div>
                <div className="text-xs text-muted">
                  {sprintStats.done}/{sprintStats.total} cells done · {sprintStats.pct}%
                </div>
                <Link to="/sprints" className="text-sm text-primary-dark hover:underline">
                  Open board →
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open poll</CardTitle>
          </CardHeader>
          <CardBody>
            {!poll ? (
              <div className="text-sm text-muted">No active polls.</div>
            ) : (
              <div className="space-y-2">
                <Badge tone="ok">open</Badge>
                <div className="font-semibold">{poll.title}</div>
                {poll.description && (
                  <div className="text-sm text-muted line-clamp-2">{poll.description}</div>
                )}
                <Link to={`/polls/${poll.id}`} className="text-sm text-primary-dark hover:underline">
                  Vote →
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick links</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            <Link to="/profile" className="block text-sm text-primary-dark hover:underline">
              → Edit my profile
            </Link>
            <Link to="/team" className="block text-sm text-primary-dark hover:underline">
              → Team directory
            </Link>
            <Link to="/pitches" className="block text-sm text-primary-dark hover:underline">
              → All pitches
            </Link>
            <Link to="/meetings" className="block text-sm text-primary-dark hover:underline">
              → Meetings
            </Link>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Round-robin from latest meeting</CardTitle>
        </CardHeader>
        <CardBody>
          {!profiles.length ? (
            <div className="text-sm text-muted">No founders.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {profiles.map((p) => {
                const u = meetingUpdates.find((x) => x.user_id === p.user_id);
                return (
                  <div key={p.user_id} className="bg-bg rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar name={p.full_name} src={p.avatar_url} size="sm" />
                      <div className="text-sm font-medium">{p.full_name || 'Unnamed'}</div>
                    </div>
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="text-ok font-medium">✓</span>{' '}
                        {u?.success || <span className="text-muted">—</span>}
                      </div>
                      <div>
                        <span className="text-warn font-medium">!</span>{' '}
                        {u?.challenge || <span className="text-muted">—</span>}
                      </div>
                      <div>
                        <span className="text-primary-deep font-medium">★</span>{' '}
                        {u?.learning || <span className="text-muted">—</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// =============================================================
// Present Mode — fullscreen view for screen sharing on FI calls
// =============================================================

// FI Working Group standard agenda (per fi.co working_group)
const AGENDA = [
  { time: '~5 min',     label: 'Welcome' },
  { time: '~10 min',    label: 'Review previous challenges' },
  { time: '~30–60 min', label: 'Round-robin: 1 success + 1 challenge per founder' },
  { time: '~30 min',    label: 'Sprint deliverables review' },
  { time: '~15–30 min', label: 'Open networking' },
  { time: 'Closing',    label: 'President posts Meeting Minutes' },
];

export function DashboardPresent() {
  const data = useDashboardData();
  const { profiles } = useTeam();

  // Local sprint selector — defaults to current
  const [allSprints, setAllSprints] = useState<DbSprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<DbSprintTask[]>([]);
  const [selectedProgress, setSelectedProgress] = useState<DbTaskProgress[]>([]);
  const [selectedCompletions, setSelectedCompletions] = useState<{ user_id: string }[]>([]);
  const [weekUpdates, setWeekUpdates] = useState<DbMeetingUpdate[]>([]);

  useEffect(() => {
    (async () => {
      const { data: sps } = await supabase
        .from('sprints')
        .select('*')
        .order('week_number', { ascending: true });
      const list = (sps as DbSprint[]) || [];
      setAllSprints(list);
      if (!selectedSprintId) {
        const cur = list.find((s) => s.is_current) ?? list[list.length - 1] ?? null;
        if (cur) setSelectedSprintId(cur.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedSprintId) {
        setSelectedTasks([]);
        setSelectedProgress([]);
        setSelectedCompletions([]);
        setWeekUpdates([]);
        return;
      }
      const sprint = allSprints.find((s) => s.id === selectedSprintId);
      const [{ data: t }, { data: c }, weekMeetingRows] = await Promise.all([
        supabase.from('sprint_tasks').select('*').eq('sprint_id', selectedSprintId),
        supabase.from('sprint_completions').select('user_id').eq('sprint_id', selectedSprintId),
        sprint
          ? supabase
              .from('meetings')
              .select('id')
              .eq('kind', 'working_group')
              .gte('scheduled_at', `${sprint.start_date}T00:00:00.000Z`)
              .lte('scheduled_at', `${sprint.end_date}T23:59:59.999Z`)
              .order('scheduled_at', { ascending: false })
          : Promise.resolve({ data: [] as { id: string }[] } as { data: { id: string }[] }),
      ]);
      const taskList = (t as DbSprintTask[]) || [];
      setSelectedTasks(taskList);
      if (taskList.length) {
        const { data: p } = await supabase
          .from('task_progress')
          .select('*')
          .in('task_id', taskList.map((x) => x.id));
        setSelectedProgress((p as DbTaskProgress[]) || []);
      } else {
        setSelectedProgress([]);
      }
      setSelectedCompletions((c as { user_id: string }[]) || []);

      // Pull reflections from any Working Group meeting that fell inside the
      // selected sprint week, so the "This week's reflections" panel matches
      // whichever week the presenter has opened.
      const meetingIds = ((weekMeetingRows.data as { id: string }[] | null) || []).map(
        (m) => m.id,
      );
      if (meetingIds.length) {
        const { data: u } = await supabase
          .from('meeting_updates')
          .select('*')
          .in('meeting_id', meetingIds);
        setWeekUpdates((u as DbMeetingUpdate[]) || []);
      } else {
        setWeekUpdates([]);
      }
    })();
  }, [selectedSprintId, allSprints]);

  if (!data) return <div className="min-h-screen grid place-items-center">Loading…</div>;

  const { allPitches, cohort } = data;
  const sprint = allSprints.find((s) => s.id === selectedSprintId) ?? null;
  const tasks = selectedTasks;
  const progress = selectedProgress;

  // Latest pitch per founder restricted to the selected sprint week.
  const latestPitchByUser: Record<string, DbPitch> = {};
  for (const p of allPitches) {
    if (selectedSprintId && p.sprint_id !== selectedSprintId) continue;
    if (!latestPitchByUser[p.user_id] || latestPitchByUser[p.user_id].version < p.version) {
      latestPitchByUser[p.user_id] = p;
    }
  }

  const latestDate = latestSnapshotDate(cohort);
  const standings = latestDate ? computeStandings(rowsForDate(cohort, latestDate)) : [];

  const sprintStats = (() => {
    if (!tasks.length || !profiles.length) return { pct: 0, done: 0, total: 0 };
    const total = tasks.length * profiles.length;
    const done = progress.filter((p) => p.status === 'done').length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  })();

  // Roll multiple meeting_updates for the same founder in the same week
  // (e.g. two WG meetings in one sprint) into one merged record by preferring
  // the most-filled / latest values per field.
  const updatesByUser = new Map<string, DbMeetingUpdate>();
  for (const u of weekUpdates) {
    const existing = updatesByUser.get(u.user_id);
    if (!existing) {
      updatesByUser.set(u.user_id, u);
      continue;
    }
    updatesByUser.set(u.user_id, {
      ...existing,
      success: u.success ?? existing.success,
      challenge: u.challenge ?? existing.challenge,
      learning: u.learning ?? existing.learning,
      updated_at:
        new Date(u.updated_at) > new Date(existing.updated_at)
          ? u.updated_at
          : existing.updated_at,
    });
  }
  const founderUpdates = profiles.map((p) => ({
    profile: p,
    update: updatesByUser.get(p.user_id),
  }));
  const filledCount = founderUpdates.filter(
    (f) => f.update && (f.update.success || f.update.challenge || f.update.learning),
  ).length;

  const president = profiles.find((p) => p.is_president) ?? null;

  return (
    <div className="min-h-screen bg-white text-ink p-8 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* === HEADER === */}
        <div className="flex items-start justify-between border-b border-border pb-6 flex-wrap gap-4">
          <div>
            <div className="text-sm uppercase tracking-wider text-muted">
              Working Group · FI Core Program · CEE, Spring 2026
            </div>
            <h1 className="text-4xl font-bold text-primary-deep">Breakers Team</h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted">{safeFormat(new Date(), 'EEEE, MMMM d, yyyy')}</div>
            {president && (
              <div className="text-xs text-muted mt-1">
                President: {president.full_name}
              </div>
            )}
          </div>
        </div>

        {/* === WEEK SELECTOR === */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs uppercase tracking-wider text-muted">Showing</span>
          <div className="flex flex-wrap gap-1.5">
            {allSprints.map((s) => {
              const active = s.id === selectedSprintId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSprintId(s.id)}
                  className={
                    'px-3 h-9 rounded-lg text-sm font-medium border transition-colors ' +
                    (active
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-muted border-border hover:text-ink')
                  }
                  title={s.name}
                >
                  {s.week_number === 0 ? 'W0 · Onboarding' : `W${s.week_number}`}
                  {s.is_current && !active && (
                    <span className="ml-1 text-primary opacity-80">●</span>
                  )}
                </button>
              );
            })}
          </div>
          {sprint && (
            <div className="ml-auto text-sm">
              <span className="text-muted">Currently:</span>{' '}
              <span className="font-semibold">{sprint.name}</span>
              <span className="text-xs text-muted ml-2">
                {safeFormat(sprint.start_date, 'MMM d')} – {safeFormat(sprint.end_date, 'MMM d')}
              </span>
            </div>
          )}
        </div>

        {/* === SPRINT DELIVERABLES (right under "Currently") === */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-bg rounded-2xl p-6">
              <div className="text-xs uppercase tracking-wider text-muted mb-2">
                Sprint deliverables
              </div>
              {sprint ? (
                <>
                  <div className="text-2xl font-semibold">
                    Week {sprint.week_number} · {sprint.name}
                  </div>
                  {sprint.description && (
                    <div className="text-sm text-muted mt-1">{sprint.description}</div>
                  )}
                  <div className="text-xs text-muted mt-2">
                    {safeFormat(sprint.start_date, 'MMM d')} –{' '}
                    {safeFormat(sprint.end_date, 'MMM d')}
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted">No active sprint.</div>
              )}
            </div>
            <div className="bg-bubble/40 rounded-2xl p-6 text-center">
              <div className="text-xs uppercase tracking-wider text-muted mb-2">
                Founders completed
              </div>
              <div className="text-6xl font-bold text-primary-deep">
                {selectedCompletions.length}
                <span className="text-2xl text-muted">/ {profiles.length}</span>
              </div>
              <div className="text-sm text-muted mt-1">marked this sprint done</div>
              <div className="h-3 mt-4 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${
                      profiles.length
                        ? Math.round((selectedCompletions.length / profiles.length) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              {tasks.length > 0 && (
                <div className="text-[11px] text-muted mt-3 pt-3 border-t border-border/40">
                  Task board: <strong>{sprintStats.done}</strong> of{' '}
                  <strong>{sprintStats.total}</strong> cells done
                </div>
              )}
            </div>
          </div>
        </section>

        {/* === AGENDA === */}
        <section>
          <div className="text-xs uppercase tracking-wider text-muted mb-3">Today's agenda</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {AGENDA.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-bg rounded-xl px-4 py-3"
              >
                <div className="w-7 h-7 rounded-full bg-primary text-white grid place-items-center text-sm font-bold">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{a.label}</div>
                  <div className="text-xs text-muted">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* === 2. ROUND-ROBIN — primary block === */}
        {sprint && sprint.week_number >= 2 && (
        <section>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted">
                Round-robin · 1 success / 1 challenge / 1 learning
              </div>
              <h2 className="text-2xl font-semibold">This week's reflections</h2>
            </div>
            <div className="text-sm text-muted">
              {filledCount}/{profiles.length} founders submitted
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {founderUpdates.map(({ profile: p, update: u }) => {
              const empty = !u || (!u.success && !u.challenge && !u.learning);
              return (
                <div
                  key={p.user_id}
                  className={
                    'rounded-xl p-4 ' +
                    (empty ? 'bg-bg/60 border border-dashed border-border' : 'bg-bg')
                  }
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar name={p.full_name || '?'} src={p.avatar_url} size="sm" />
                    <div className="font-semibold">{p.full_name}</div>
                    {p.is_president && (
                      <span className="ml-1 text-[10px] uppercase tracking-wider text-primary-deep bg-bubble px-1.5 py-0.5 rounded">
                        President
                      </span>
                    )}
                  </div>
                  {empty ? (
                    <div className="text-sm text-muted italic">No reflections yet.</div>
                  ) : (
                    <div className="space-y-1.5 text-sm">
                      {u?.success && (
                        <div>
                          <span className="text-ok font-bold">✓ Success:</span> {u.success}
                        </div>
                      )}
                      {u?.challenge && (
                        <div>
                          <span className="text-warn font-bold">! Challenge:</span> {u.challenge}
                        </div>
                      )}
                      {u?.learning && (
                        <div>
                          <span className="text-primary-deep font-bold">★ Learning:</span>{' '}
                          {u.learning}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        )}

        {/* === 4. PITCH READINESS === */}
        {sprint && sprint.week_number >= 2 && (
        <section>
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted">
                Feedback Pitch readiness
              </div>
              <h2 className="text-2xl font-semibold">Pitches for this session</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {profiles.map((p) => {
              const pitch = latestPitchByUser[p.user_id];
              const ready = pitch?.status === 'ready' || pitch?.status === 'reviewed';
              return (
                <div key={p.user_id} className="text-center">
                  <div className="relative inline-block">
                    <Avatar
                      name={p.full_name || '?'}
                      src={p.avatar_url}
                      size="xl"
                      className="mx-auto"
                    />
                    <span
                      className={
                        'absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white grid place-items-center text-[10px] font-bold ' +
                        (ready ? 'bg-ok text-white' : 'bg-bg border-border text-muted')
                      }
                    >
                      {ready ? '✓' : '·'}
                    </span>
                  </div>
                  <div className="font-semibold mt-2 truncate">
                    {(p.full_name || 'Unnamed').split(' ')[0]}
                  </div>
                  <div className="text-sm">
                    {pitch ? `v${pitch.version}` : 'no pitch'} ·{' '}
                    <span className={ready ? 'text-ok font-medium' : 'text-muted'}>
                      {ready ? 'Ready' : 'Draft'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        )}

        {/* === 5. LEADERBOARD (background context, last) === */}
        {sprint && sprint.week_number >= 2 && (
        <section className="pt-4 border-t border-border">
          <div className="text-xs uppercase tracking-wider text-muted mb-3">
            FI Cohort Leaderboard · context
          </div>
          <div className="bg-bg rounded-2xl p-4 space-y-1.5">
            {standings.map((s) => {
              const ours = s.team_name === OUR_TEAM;
              return (
                <div
                  key={s.team_name}
                  className={
                    'flex items-center gap-3 p-2.5 rounded-lg ' +
                    (ours ? 'bg-primary text-white' : 'bg-white')
                  }
                >
                  <div className="text-lg font-bold w-7">{s.rank}</div>
                  <div className="flex-1 font-medium">{s.team_name}</div>
                  {ours && (
                    <span className="text-xs uppercase tracking-wider opacity-90">Us</span>
                  )}
                  <div className="font-mono text-lg font-bold">
                    {s.avg_score == null ? '—' : s.avg_score.toFixed(1)}
                  </div>
                </div>
              );
            })}
            {!standings.length && (
              <div className="text-sm text-muted">No leaderboard data yet.</div>
            )}
          </div>
        </section>
        )}

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
