import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Check, Circle, Link2, PencilLine, ShieldCheck, UserPlus } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Label } from '@/components/ui/Input';
import { useTeam } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import {
  supabase,
  type DbMeeting,
  type DbMeetingUpdate,
  type DbPitch,
  type DbProfile,
  type DbSprint,
  type DbTaskProgress,
} from '@/lib/supabase';
import { canProxy, isOwnerFilled, isProxyFilled } from '@/lib/presidentMode';
import { notifyError } from '@/lib/notify';

type Status = 'self' | 'proxy' | 'empty';

function StatusIcon({ s }: { s: Status }) {
  if (s === 'self') return <Check size={14} className="text-ok" />;
  if (s === 'proxy') return <PencilLine size={14} className="text-warn" />;
  return <Circle size={14} className="text-muted" />;
}

function statusOf(record: { user_id: string; filled_by: string | null } | null | undefined): Status {
  if (!record) return 'empty';
  if (isOwnerFilled(record)) return 'self';
  if (isProxyFilled(record)) return 'proxy';
  return 'empty';
}

function StatusCell({
  s,
  href,
  proxyAllowed,
  label,
}: {
  s: Status;
  href: string;
  proxyAllowed: boolean;
  label: string;
}) {
  const inner = (
    <span className="inline-flex items-center gap-1.5">
      <StatusIcon s={s} />
      <span className="text-xs">
        {s === 'self' ? 'self' : s === 'proxy' ? 'proxy' : 'empty'}
      </span>
    </span>
  );
  if (s === 'self') {
    return (
      <span title={`${label} — owner-filled`} className="opacity-80">
        {inner}
      </span>
    );
  }
  return (
    <Link
      to={href}
      title={proxyAllowed ? `${label} — fill on behalf` : `${label} — open`}
      className="inline-flex items-center gap-1.5 hover:underline text-ink"
    >
      {inner}
    </Link>
  );
}

export function President() {
  const { user } = useAuth();
  const { profiles, loading: profilesLoading, setProfiles } = useTeam();
  const myProfile = profiles.find((p) => p.user_id === user?.id);
  const iAmPresident = !!myProfile?.is_president;

  const [pitches, setPitches] = useState<DbPitch[]>([]);
  const [lastMeeting, setLastMeeting] = useState<DbMeeting | null>(null);
  const [reflections, setReflections] = useState<DbMeetingUpdate[]>([]);
  const [currentSprint, setCurrentSprint] = useState<DbSprint | null>(null);
  const [progress, setProgress] = useState<DbTaskProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-teammate (placeholder) dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState({ full_name: '', email: '' });
  const [adding, setAdding] = useState(false);

  // Manual-merge dialog
  const [mergeFor, setMergeFor] = useState<DbProfile | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string>('');
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!iAmPresident) return;
    (async () => {
      const { data: ps } = await supabase
        .from('pitches')
        .select('*')
        .order('version', { ascending: false });
      setPitches((ps as DbPitch[]) || []);

      const nowIso = new Date().toISOString();
      const { data: lm } = await supabase
        .from('meetings')
        .select('*')
        .eq('kind', 'working_group')
        .lte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const meeting = (lm as DbMeeting) || null;
      setLastMeeting(meeting);
      if (meeting) {
        const { data: ref } = await supabase
          .from('meeting_updates')
          .select('*')
          .eq('meeting_id', meeting.id);
        setReflections((ref as DbMeetingUpdate[]) || []);
      }

      const { data: sp } = await supabase
        .from('sprints')
        .select('*')
        .eq('is_current', true)
        .order('week_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      const sprint = (sp as DbSprint) || null;
      setCurrentSprint(sprint);
      if (sprint) {
        const { data: tasks } = await supabase
          .from('sprint_tasks')
          .select('id')
          .eq('sprint_id', sprint.id);
        const taskIds = ((tasks as { id: string }[]) || []).map((t) => t.id);
        if (taskIds.length) {
          const { data: prg } = await supabase
            .from('task_progress')
            .select('*')
            .in('task_id', taskIds);
          setProgress((prg as DbTaskProgress[]) || []);
        }
      }
      setLoading(false);
    })();
  }, [iAmPresident]);

  const latestPitchByUser = useMemo(() => {
    const map: Record<string, DbPitch> = {};
    for (const p of pitches) {
      if (!map[p.user_id] || map[p.user_id].version < p.version) {
        map[p.user_id] = p;
      }
    }
    return map;
  }, [pitches]);

  function sprintStatusFor(userId: string): {
    s: Status;
    record: { user_id: string; filled_by: string | null } | null;
  } {
    const mine = progress.filter((p) => p.user_id === userId && p.status !== 'not_started');
    if (!mine.length) return { s: 'empty', record: null };
    const ownerFilled = mine.find((p) => p.filled_by === userId);
    if (ownerFilled) return { s: 'self', record: ownerFilled };
    return { s: 'proxy', record: mine[0] };
  }

  async function createPlaceholder() {
    if (!user) return;
    const fullName = addDraft.full_name.trim();
    const email = addDraft.email.trim();
    if (!fullName) return;
    if (!email) return;
    setAdding(true);
    const newId = crypto.randomUUID();
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: newId,
        full_name: fullName,
        email,
        is_placeholder: true,
        filled_by: user.id,
      })
      .select()
      .maybeSingle();
    setAdding(false);
    if (error) {
      notifyError('Could not add teammate', error);
      return;
    }
    if (data) {
      const created = data as DbProfile;
      setProfiles((prev) => [...prev, created].sort((a, b) =>
        (a.full_name || '').localeCompare(b.full_name || ''),
      ));
    }
    setAddOpen(false);
    setAddDraft({ full_name: '', email: '' });
  }

  async function performMerge() {
    if (!mergeFor || !mergeTarget) return;
    setMerging(true);
    const { error } = await supabase.rpc('merge_placeholder_into_user', {
      placeholder_user_id: mergeFor.user_id,
      target_user_id: mergeTarget,
    });
    setMerging(false);
    if (error) {
      notifyError('Merge failed', error);
      return;
    }
    setProfiles((prev) => prev.filter((p) => p.user_id !== mergeFor.user_id));
    setMergeFor(null);
    setMergeTarget('');
  }

  if (!user) return null;
  if (profilesLoading) {
    return <div className="text-sm text-muted">Loading…</div>;
  }
  if (!iAmPresident) {
    return <Navigate to="/" replace />;
  }

  const teammates = profiles.filter((p) => p.user_id !== user.id);
  function holesFor(p: DbProfile): number {
    let h = 0;
    if (statusOf(p) !== 'self') h++;
    const pitch = latestPitchByUser[p.user_id] ?? null;
    if (statusOf(pitch) !== 'self') h++;
    const ref = reflections.find((r) => r.user_id === p.user_id) ?? null;
    if (statusOf(ref) !== 'self') h++;
    if (sprintStatusFor(p.user_id).s !== 'self') h++;
    return h;
  }
  const sorted = [...teammates].sort((a, b) => holesFor(b) - holesFor(a));

  // For manual merge: choose any non-placeholder profile that isn't the
  // placeholder itself.
  const realTargets = profiles.filter((p) => !p.is_placeholder && p.user_id !== mergeFor?.user_id);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="h1 flex items-center gap-2">
            <ShieldCheck className="text-primary-dark" size={22} /> Teammates
          </h1>
          <p className="muted text-sm mt-1">
            Where each teammate stands across profile, pitch, last reflection and current sprint.
            <strong className="text-ink"> Self</strong> = they filled it themselves (read-only).{' '}
            <strong className="text-ink">Proxy</strong> = filled on their behalf.{' '}
            <strong className="text-ink">Empty</strong> = nothing yet — fill in for them to keep
            the team's metrics honest.
          </p>
          <p className="text-xs text-muted mt-1">
            Last working-group meeting:{' '}
            <strong>{lastMeeting?.title ?? '—'}</strong> · Current sprint:{' '}
            <strong>{currentSprint ? `W${currentSprint.week_number} · ${currentSprint.name}` : '—'}</strong>
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus size={16} /> Add teammate
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teammates ({sorted.length})</CardTitle>
        </CardHeader>
        <CardBody className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs text-muted">
                <th className="text-left font-medium px-2 py-2">Teammate</th>
                <th className="text-left font-medium px-2 py-2">Profile</th>
                <th className="text-left font-medium px-2 py-2">Pitch</th>
                <th className="text-left font-medium px-2 py-2">Reflection</th>
                <th className="text-left font-medium px-2 py-2">Sprint</th>
                <th className="text-left font-medium px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const profileStatus = statusOf(p);
                const pitch = latestPitchByUser[p.user_id] ?? null;
                const pitchStatus = statusOf(pitch);
                const ref = reflections.find((r) => r.user_id === p.user_id) ?? null;
                const refStatus = statusOf(ref);
                const sprint = sprintStatusFor(p.user_id);
                const proxyProfile = canProxy(p);
                const proxyPitch = canProxy(pitch);
                const proxyRef = canProxy(ref);
                const proxySprint = canProxy(sprint.record);
                return (
                  <tr key={p.user_id} className="border-t border-border">
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={p.full_name || '?'} src={p.avatar_url} size="sm" />
                        <Link
                          to={p.is_placeholder ? `/president/profile/${p.user_id}` : `/team/${p.user_id}`}
                          className="font-medium hover:underline truncate"
                        >
                          {p.full_name || 'Unnamed'}
                        </Link>
                        {p.is_placeholder && (
                          <Badge tone="warn" title="Placeholder — auto-claimed when this email signs up">
                            placeholder
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <StatusCell
                        s={profileStatus}
                        href={proxyProfile ? `/president/profile/${p.user_id}` : `/team/${p.user_id}`}
                        proxyAllowed={proxyProfile}
                        label="Profile"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <StatusCell
                        s={pitchStatus}
                        href={`/pitches/${p.user_id}`}
                        proxyAllowed={proxyPitch}
                        label="Pitch"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <StatusCell
                        s={refStatus}
                        href={lastMeeting ? `/meetings/${lastMeeting.id}` : '/meetings'}
                        proxyAllowed={proxyRef && !!lastMeeting}
                        label="Reflection"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <StatusCell
                        s={sprint.s}
                        href="/sprints"
                        proxyAllowed={proxySprint}
                        label="Sprint"
                      />
                    </td>
                    <td className="px-2 py-2">
                      {p.is_placeholder && (
                        <button
                          type="button"
                          onClick={() => {
                            setMergeFor(p);
                            setMergeTarget('');
                          }}
                          className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
                          title="Manually link to an existing real account"
                        >
                          <Link2 size={12} /> Merge…
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!sorted.length && !loading && (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center text-muted text-sm">
                    No teammates.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Dialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add teammate"
        description="Create a placeholder card for a founder who hasn't signed up yet. When they register with the same email, all their data will auto-transfer."
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createPlaceholder} disabled={adding || !addDraft.full_name.trim() || !addDraft.email.trim()}>
              {adding ? 'Adding…' : 'Add teammate'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input
              value={addDraft.full_name}
              onChange={(e) => setAddDraft((s) => ({ ...s, full_name: e.target.value }))}
              placeholder="Jane Founder"
              autoFocus
            />
          </div>
          <div>
            <Label>Email (for auto-claim on signup)</Label>
            <Input
              type="email"
              value={addDraft.email}
              onChange={(e) => setAddDraft((s) => ({ ...s, email: e.target.value }))}
              placeholder="jane@example.com"
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!mergeFor}
        onOpenChange={(o) => {
          if (!o) {
            setMergeFor(null);
            setMergeTarget('');
          }
        }}
        title={mergeFor ? `Merge "${mergeFor.full_name || 'Placeholder'}" into…` : ''}
        description="Use this when the placeholder's email didn't match the registered email. All data on the placeholder will be moved into the chosen real account, and the placeholder will be deleted."
        footer={
          <>
            <Button variant="outline" onClick={() => setMergeFor(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={performMerge}
              disabled={merging || !mergeTarget}
            >
              {merging ? 'Merging…' : 'Merge'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Target account</Label>
            <select
              value={mergeTarget}
              onChange={(e) => setMergeTarget(e.target.value)}
              className="w-full rounded-lg border border-border bg-white text-ink px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary h-10"
            >
              <option value="" disabled>
                Choose a real teammate…
              </option>
              {realTargets.map((t) => (
                <option key={t.user_id} value={t.user_id}>
                  {t.full_name || 'Unnamed'} {t.email ? `· ${t.email}` : ''}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted">
            On conflicting rows (same meeting/sprint/version) the target's row is kept. This action
            cannot be undone.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
