import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarDays, ChevronRight, Maximize2, Video } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useTeam } from '@/hooks/useTeam';
import { downloadICS } from '@/lib/ics';
import {
  supabase,
  type DbLeaderboard,
  type DbMeeting,
  type DbMeetingUpdate,
  type DbPitch,
  type DbPoll,
  type DbSprint,
  type DbSprintTask,
  type DbTaskProgress,
} from '@/lib/supabase';
import {
  GrowthIcon,
  MegaphoneIcon,
  StopwatchIcon,
  TrophyIcon,
} from '@/components/icons/StartupIcons';

const OUR_TEAM = 'Team Breakers';

type DashboardData = {
  meeting: DbMeeting | null;
  sprint: DbSprint | null;
  tasks: DbSprintTask[];
  progress: DbTaskProgress[];
  latestPitchByUser: Record<string, DbPitch>;
  meetingUpdates: DbMeetingUpdate[];
  poll: DbPoll | null;
  leaderboard: DbLeaderboard[];
};

function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    (async () => {
      const now = new Date();

      const { data: meet } = await supabase
        .from('meetings')
        .select('*')
        .gte('scheduled_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1);
      const meeting = ((meet as DbMeeting[]) || [])[0] ?? null;

      const { data: sprintData } = await supabase
        .from('sprints')
        .select('*')
        .eq('is_current', true)
        .maybeSingle();
      let sprint = (sprintData as DbSprint) || null;
      if (!sprint) {
        const { data: any } = await supabase
          .from('sprints')
          .select('*')
          .order('week_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        sprint = (any as DbSprint) || null;
      }

      let tasks: DbSprintTask[] = [];
      let progress: DbTaskProgress[] = [];
      if (sprint) {
        const { data: t } = await supabase
          .from('sprint_tasks')
          .select('*')
          .eq('sprint_id', sprint.id);
        tasks = (t as DbSprintTask[]) || [];
        const ids = tasks.map((x) => x.id);
        if (ids.length) {
          const { data: p } = await supabase.from('task_progress').select('*').in('task_id', ids);
          progress = (p as DbTaskProgress[]) || [];
        }
      }

      const { data: allPitches } = await supabase
        .from('pitches')
        .select('*')
        .order('version', { ascending: false });
      const byUser: Record<string, DbPitch> = {};
      for (const p of (allPitches as DbPitch[]) || []) {
        if (!byUser[p.user_id] || byUser[p.user_id].version < p.version) byUser[p.user_id] = p;
      }

      let updates: DbMeetingUpdate[] = [];
      if (meeting) {
        const { data: u } = await supabase
          .from('meeting_updates')
          .select('*')
          .eq('meeting_id', meeting.id);
        updates = (u as DbMeetingUpdate[]) || [];
      }

      const { data: openPolls } = await supabase
        .from('polls')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1);
      const poll = ((openPolls as DbPoll[]) || [])[0] ?? null;

      const { data: lb } = await supabase
        .from('fi_leaderboard')
        .select('*')
        .order('recorded_at', { ascending: false });

      setData({
        meeting,
        sprint,
        tasks,
        progress,
        latestPitchByUser: byUser,
        meetingUpdates: updates,
        poll,
        leaderboard: (lb as DbLeaderboard[]) || [],
      });
    })();
  }, []);

  return data;
}

function LeaderboardBanner({ rows }: { rows: DbLeaderboard[] }) {
  const dates = Array.from(new Set(rows.map((r) => r.recorded_at))).sort();
  const ourSeries = dates.map((d) => {
    const r = rows.find((x) => x.recorded_at === d && x.team_name === OUR_TEAM);
    return { date: format(new Date(d), 'MMM d'), score: r ? Number(r.score) : null };
  });
  const latestDate = dates[dates.length - 1];
  const ours = rows.find((r) => r.recorded_at === latestDate && r.team_name === OUR_TEAM);
  const total = rows.filter((r) => r.recorded_at === latestDate).length;

  return (
    <Card>
      <CardBody className="flex flex-col md:flex-row items-stretch gap-4">
        <div className="flex-1 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-bubble text-primary-deep grid place-items-center">
            <TrophyIcon width={22} height={22} />
          </div>
          <div>
            <div className="text-xs text-muted">FI Standing</div>
            <div className="text-2xl font-semibold">
              {ours ? <>#{ours.rank ?? '?'} of {total}</> : 'No data yet'}
            </div>
            {ours && (
              <div className="text-sm text-muted">
                Score <span className="font-mono">{Number(ours.score).toFixed(1)}</span> · goal: top 2
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-[100px]">
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={ourSeries} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#f1f1f1" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} hide={ourSeries.length < 2} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} width={20} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#128C7E"
                strokeWidth={2}
                dot={{ r: 3, fill: '#25D366' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex md:flex-col gap-2 justify-end items-end">
          <Link to="/leaderboard">
            <Button variant="outline" size="sm">
              Open <ChevronRight size={14} />
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

export function Dashboard() {
  const data = useDashboardData();
  const { profiles } = useTeam();

  if (!data) return <div className="text-muted text-sm">Loading…</div>;

  const { meeting, sprint, tasks, progress, latestPitchByUser, meetingUpdates, poll, leaderboard } =
    data;

  const sprintStats = useMemo(() => {
    if (!tasks.length || !profiles.length) return { done: 0, total: 0, pct: 0 };
    const total = tasks.length * profiles.length;
    const done = progress.filter((p) => p.status === 'done').length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [tasks, progress, profiles]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="h1 flex items-center gap-2">
            <GrowthIcon className="text-primary-dark" /> Dashboard
          </h1>
          <p className="muted text-sm mt-1">Team Breakers · FI Core Program (CEE, Spring 2026)</p>
        </div>
        <Link to="/dashboard/present">
          <Button variant="outline">
            <Maximize2 size={16} /> Present mode
          </Button>
        </Link>
      </div>

      <LeaderboardBanner rows={leaderboard} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MegaphoneIcon className="text-primary-dark" /> Pitch readiness for next session
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
              <StopwatchIcon className="text-primary-dark" /> Next meeting
            </CardTitle>
          </CardHeader>
          <CardBody>
            {!meeting ? (
              <div className="text-sm text-muted">No upcoming meeting.</div>
            ) : (
              <div className="space-y-2">
                <div className="font-semibold">{meeting.title}</div>
                <div className="text-sm text-muted">
                  {format(new Date(meeting.scheduled_at), 'EEE, MMM d · HH:mm')}
                </div>
                <div className="text-xs text-muted">
                  in {formatDistanceToNow(new Date(meeting.scheduled_at))}
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
                    <CalendarDays size={14} /> Calendar
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
                  {format(new Date(sprint.start_date), 'MMM d')} –{' '}
                  {format(new Date(sprint.end_date), 'MMM d')}
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

export function DashboardPresent() {
  const data = useDashboardData();
  const { profiles } = useTeam();

  if (!data) return <div className="min-h-screen grid place-items-center">Loading…</div>;

  const { sprint, tasks, progress, latestPitchByUser, meetingUpdates, leaderboard } = data;

  const dates = Array.from(new Set(leaderboard.map((r) => r.recorded_at))).sort();
  const latestDate = dates[dates.length - 1];
  const sortedLatest = leaderboard
    .filter((r) => r.recorded_at === latestDate)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  const sprintStats = (() => {
    if (!tasks.length || !profiles.length) return { pct: 0, done: 0, total: 0 };
    const total = tasks.length * profiles.length;
    const done = progress.filter((p) => p.status === 'done').length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  })();

  return (
    <div className="min-h-screen bg-white text-ink p-8 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-border pb-6">
          <div>
            <div className="text-sm uppercase tracking-wider text-muted">Working Group · FI Core Program · CEE, Spring 2026</div>
            <h1 className="text-4xl font-bold text-primary-deep">Team Breakers</h1>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted">{format(new Date(), 'EEEE, MMMM d, yyyy')}</div>
            {sprint && <div className="text-lg font-semibold mt-1">{sprint.name}</div>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-bubble/40 rounded-2xl p-6">
            <div className="text-xs uppercase tracking-wider text-muted mb-2">FI Leaderboard</div>
            <div className="space-y-2">
              {sortedLatest.map((r) => {
                const ours = r.team_name === OUR_TEAM;
                return (
                  <div
                    key={r.id}
                    className={
                      'flex items-center gap-4 p-3 rounded-xl ' +
                      (ours ? 'bg-primary text-white' : 'bg-white')
                    }
                  >
                    <div className="text-2xl font-bold w-8">{r.rank}</div>
                    <div className="flex-1 text-lg font-medium">{r.team_name}</div>
                    <div className="font-mono text-2xl font-bold">{Number(r.score).toFixed(1)}</div>
                  </div>
                );
              })}
              {!sortedLatest.length && <div className="text-muted">No leaderboard data yet.</div>}
            </div>
          </div>
          <div className="bg-bg rounded-2xl p-6">
            <div className="text-xs uppercase tracking-wider text-muted mb-2">Sprint progress</div>
            <div className="text-6xl font-bold text-primary-deep">{sprintStats.pct}%</div>
            <div className="text-sm text-muted mt-1">
              {sprintStats.done} of {sprintStats.total} cells done
            </div>
            <div className="h-3 mt-4 bg-white rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${sprintStats.pct}%` }} />
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-3">Pitches</div>
          <div className="grid grid-cols-5 gap-4">
            {profiles.map((p) => {
              const pitch = latestPitchByUser[p.user_id];
              const ready = pitch?.status === 'ready' || pitch?.status === 'reviewed';
              return (
                <div key={p.user_id} className="text-center">
                  <Avatar name={p.full_name || '?'} src={p.avatar_url} size="xl" className="mx-auto" />
                  <div className="font-semibold mt-2">
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
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-3">This week — round robin</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.map((p) => {
              const u = meetingUpdates.find((x) => x.user_id === p.user_id);
              if (!u || (!u.success && !u.challenge && !u.learning)) return null;
              return (
                <div key={p.user_id} className="bg-bg rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar name={p.full_name} src={p.avatar_url} size="sm" />
                    <div className="font-semibold">{p.full_name}</div>
                  </div>
                  <div className="space-y-1 text-sm">
                    {u.success && <div><span className="text-ok font-bold">✓ Success:</span> {u.success}</div>}
                    {u.challenge && <div><span className="text-warn font-bold">! Challenge:</span> {u.challenge}</div>}
                    {u.learning && <div><span className="text-primary-deep font-bold">★ Learning:</span> {u.learning}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center pt-6 border-t border-border">
          <Link to="/" className="text-sm text-muted hover:text-ink">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
