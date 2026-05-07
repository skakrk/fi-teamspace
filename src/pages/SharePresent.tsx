import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Lock, Video } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Logo } from '@/components/shared/Logo';
import { supabase, type DbCohortRating, type DbMeeting, type DbMeetingNotes, type DbMeetingUpdate, type DbPitch, type DbPitchFeedback, type DbProfile, type DbSprint, type DbSprintCompletion, type DbTeamVision } from '@/lib/supabase';
import { computeStandings, latestSnapshotDate, rowsForDate } from '@/lib/standings';
import { avg, formatScore, safeFormat } from '@/lib/utils';

const OUR_TEAM = 'Breakers Team';

type AttendanceRow = { meeting_id: string; user_id: string; status: 'present' | 'absent' | 'late' };

type SharePayload = {
  share: { token: string; kind: string; sprint_id: string | null; expires_at: string | null };
  sprint: DbSprint | null;
  allSprints: DbSprint[];
  vision: DbTeamVision | null;
  cohort: DbCohortRating[];
  profiles: DbProfile[];
  pitches: DbPitch[];
  feedbacks: DbPitchFeedback[];
  cohortSessions: DbMeeting[];
  workingGroups: DbMeeting[];
  notes: DbMeetingNotes[];
  attendance: AttendanceRow[];
  updates: DbMeetingUpdate[];
  sprintCompletions: DbSprintCompletion[];
};

export function SharePresent() {
  const { token } = useParams<{ token: string }>();
  const [pin, setPin] = useState('');
  const [data, setData] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    if (!token || pin.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const { data: payload, error: fnError } = await supabase.functions.invoke<SharePayload>(
        'present-share-view',
        { body: { token, pin } },
      );
      if (fnError) {
        // The edge function returns a structured { error } body for non-2xx.
        type WithCtx = { context?: { json?: () => Promise<{ error?: string }> } };
        let msg = fnError.message || 'Could not load shared view';
        const fe = fnError as unknown as WithCtx;
        try {
          const j = await fe.context?.json?.();
          if (j?.error) msg = j.error;
        } catch {
          /* keep msg */
        }
        setError(msg);
        return;
      }
      if (!payload) {
        setError('Empty response');
        return;
      }
      setData(payload);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg p-6">
        <div className="text-sm text-muted">Bad share link.</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg p-6">
        <form
          onSubmit={verify}
          className="w-full max-w-sm bg-surface border border-border rounded-xl shadow-card p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <Logo size="lg" />
            <div>
              <h1 className="text-lg font-semibold leading-none">Breakers Team</h1>
              <p className="text-xs text-muted mt-1">Cohort Session · Shared view</p>
            </div>
          </div>
          <div className="text-sm text-muted">
            <Lock size={14} className="inline -mt-0.5 mr-1" />
            This link is PIN-protected. Enter the 6-digit PIN you received.
          </div>
          <div>
            <Label>PIN</Label>
            <Input
              type="text"
              inputMode="numeric"
              autoFocus
              value={pin}
              maxLength={6}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              className="font-mono text-lg tracking-[0.4em] text-center"
            />
          </div>
          {error && <div className="text-sm text-bad">{error}</div>}
          <Button type="submit" disabled={loading || pin.length !== 6} className="w-full">
            {loading ? 'Verifying…' : 'Open shared view'}
          </Button>
          <div className="text-[11px] text-muted text-center">
            The link owner can revoke this at any time.
          </div>
        </form>
      </div>
    );
  }

  return <SharedView payload={data} />;
}

function SharedView({ payload }: { payload: SharePayload }) {
  const {
    sprint,
    vision,
    cohort,
    profiles,
    pitches,
    feedbacks,
    cohortSessions,
    workingGroups,
    notes,
    attendance,
    updates,
    sprintCompletions,
    share,
  } = payload;

  const notesByMeeting = useMemo(() => {
    const m: Record<string, DbMeetingNotes> = {};
    for (const n of notes) m[n.meeting_id] = n;
    return m;
  }, [notes]);
  const attendanceByMeeting = useMemo(() => {
    const m: Record<string, AttendanceRow[]> = {};
    for (const a of attendance) (m[a.meeting_id] ||= []).push(a);
    return m;
  }, [attendance]);

  const cohortSession = sprint
    ? cohortSessions.find((m) => {
        const d = m.scheduled_at.slice(0, 10);
        return d >= sprint.start_date && d <= sprint.end_date;
      }) ?? null
    : null;

  const weekWorkingGroups = sprint
    ? workingGroups.filter((m) => {
        const d = m.scheduled_at.slice(0, 10);
        return d >= sprint.start_date && d <= sprint.end_date;
      })
    : [];

  const lastWeekMeeting = weekWorkingGroups[0] ?? null;
  const weekUpdates = lastWeekMeeting
    ? updates.filter((u) => u.meeting_id === lastWeekMeeting.id)
    : [];

  const latestPitchByUser = useMemo(() => {
    const m: Record<string, DbPitch> = {};
    for (const p of pitches) {
      if (sprint?.id && p.sprint_id !== sprint.id) continue;
      if (!m[p.user_id] || m[p.user_id].version < p.version) m[p.user_id] = p;
    }
    return m;
  }, [pitches, sprint?.id]);

  const snapshotDate = (() => {
    if (!sprint) return latestSnapshotDate(cohort);
    const dates = Array.from(new Set(cohort.map((r) => r.recorded_at))).sort();
    const inRange = dates.filter((d) => d >= sprint.start_date && d <= sprint.end_date);
    if (inRange.length) return inRange[inRange.length - 1];
    const onOrBefore = dates.filter((d) => d <= sprint.end_date);
    if (onOrBefore.length) return onOrBefore[onOrBefore.length - 1];
    return latestSnapshotDate(cohort);
  })();
  const standings = snapshotDate ? computeStandings(rowsForDate(cohort, snapshotDate)) : [];
  const ourStanding = standings.find((s) => s.team_name === OUR_TEAM);

  const projects = profiles
    .filter((p) => p.project_name || p.project_description)
    .map((p) => ({
      name: p.full_name,
      project: p.project_name,
      pitch: p.project_description,
    }));

  const topSuccesses = weekUpdates
    .filter((u) => !!u.success)
    .map((u) => {
      const profile = profiles.find((p) => p.user_id === u.user_id);
      return { name: profile?.full_name ?? 'A founder', text: u.success! };
    });

  const showWeeklyContent = sprint && sprint.week_number >= 2;

  return (
    <div className="min-h-screen bg-white text-ink p-6 sm:p-8 lg:p-14">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-medium text-muted shadow-sm">
        <Lock size={12} /> Shared read-only view
      </div>
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center pb-6 border-b border-border">
          <div className="text-sm uppercase tracking-[0.2em] text-muted">
            Founder Institute · CEE Spring 2026
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-deep mt-2">
            Breakers Team
          </h1>
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

        {sprint && (
          <div className="text-sm text-center text-muted">
            Showing <strong className="text-ink">{sprint.name}</strong> · W{sprint.week_number} ·{' '}
            {safeFormat(sprint.start_date, 'MMM d')} – {safeFormat(sprint.end_date, 'MMM d')}
          </div>
        )}

        {cohortSession && (() => {
          const isUpcoming = new Date(cohortSession.scheduled_at) > new Date();
          return (
            <section className="bg-bubble/30 border border-primary/15 rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-muted">
                    Cohort session for this week{isUpcoming ? ' · upcoming' : ''}
                  </div>
                  <div className="text-xl sm:text-2xl font-bold mt-1 break-words">
                    {cohortSession.title}
                  </div>
                  <div className="text-sm text-muted mt-1">
                    {safeFormat(cohortSession.scheduled_at, 'EEEE, MMMM d, yyyy · HH:mm')}
                  </div>
                </div>
                {cohortSession.meet_url && (
                  <a
                    href={cohortSession.meet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark shrink-0"
                  >
                    <Video size={16} /> Join Zoom
                  </a>
                )}
              </div>
            </section>
          );
        })()}

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
            </div>
          </div>
        </section>

        {showWeeklyContent && weekWorkingGroups.length > 0 && (
          <section>
            <div className="text-xs uppercase tracking-wider text-muted mb-4">
              Working group results &amp; reports
            </div>
            <div className="space-y-5">
              {weekWorkingGroups.slice(0, 3).map((mt) => {
                const meetingNotes = notesByMeeting[mt.id];
                const att = attendanceByMeeting[mt.id] ?? [];
                const present = att.filter((a) => a.status === 'present').length;
                return (
                  <div key={mt.id} className="bg-bg rounded-2xl p-5 border border-border">
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-3 pb-3 border-b border-border">
                      <div>
                        <div className="font-bold text-lg">{mt.title}</div>
                        <div className="text-sm text-muted">
                          {safeFormat(mt.scheduled_at, 'EEEE, MMMM d · HH:mm')}
                        </div>
                      </div>
                      <span className="bg-ok/10 text-ok px-2 py-1 rounded text-xs">
                        ✓ {present} present
                      </span>
                    </div>
                    {meetingNotes?.discussion_points ? (
                      <div className="text-sm whitespace-pre-line line-clamp-6">
                        {meetingNotes.discussion_points}
                      </div>
                    ) : (
                      <div className="text-sm text-muted italic">
                        No minutes posted yet by the President.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {showWeeklyContent && topSuccesses.length > 0 && (
          <section>
            <div className="text-xs uppercase tracking-wider text-muted mb-4">Wins this week</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topSuccesses.map((s, i) => (
                <div
                  key={i}
                  className="bg-bubble/30 border border-primary/20 rounded-xl p-4"
                >
                  <div className="text-ok font-bold text-sm mb-1">✓ {s.name}</div>
                  <div className="text-base">{s.text}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {showWeeklyContent && (
          <section>
            <div className="text-xs uppercase tracking-wider text-muted mb-4">Feedback Pitches</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {profiles.map((p) => {
                const pitch = latestPitchByUser[p.user_id];
                const fb = pitch ? feedbacks.filter((f) => f.pitch_id === pitch.id) : [];
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
        )}

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
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-between pt-6 border-t border-border">
          <div className="text-xs text-muted italic">
            Shared via Best Teamspace
            {share.expires_at && (
              <> · expires {safeFormat(share.expires_at, 'MMM d, yyyy')}</>
            )}
          </div>
          <Link to="/login" className="text-sm text-muted hover:text-ink">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
