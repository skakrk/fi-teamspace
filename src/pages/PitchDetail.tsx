import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, Square, RotateCw, Trash2 } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FieldHint, Input, Label, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useTeam';
import {
  supabase,
  type DbPitch,
  type DbPitchFeedback,
  type DbSprint,
  type PitchStatus,
} from '@/lib/supabase';
import { avg, extractYouTubeId, formatScore } from '@/lib/utils';
import { notifyError } from '@/lib/notify';

function ScoreInput({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={
              'w-8 h-8 rounded-md border text-sm font-medium transition-colors ' +
              (value === n
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-muted border-border hover:border-primary')
            }
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

const TIMER_PRESETS = [
  { label: '60 sec', value: 60 },
  { label: '3 min',  value: 180 },
  { label: '5 min',  value: 300 },
];

function formatTime(secs: number): string {
  const s = Math.floor(secs % 60);
  const m = Math.floor(secs / 60);
  if (m === 0) return `${s.toString().padStart(2, '0')}s`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PitchTimer({
  initialTarget,
  onSave,
  initial,
}: {
  initialTarget: number;
  initial?: number;
  onSave: (sec: number) => void;
}) {
  const [target, setTarget] = useState(initialTarget);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(initial ?? 0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (startRef.current != null) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  function start() {
    startRef.current = Date.now() - elapsed * 1000;
    setRunning(true);
  }
  function stop() {
    setRunning(false);
    onSave(elapsed);
  }
  function reset() {
    setRunning(false);
    setElapsed(0);
    startRef.current = null;
  }
  function pickTarget(v: number) {
    setTarget(v);
    reset();
  }

  const remaining = target - elapsed;
  const over = remaining < 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Target:</span>
        {TIMER_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => pickTarget(p.value)}
            className={
              'px-2.5 h-7 rounded-md text-xs font-medium border transition-colors ' +
              (target === p.value
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-muted border-border hover:text-ink')
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="font-mono text-3xl tabular-nums leading-none">
          <span className={over ? 'text-bad' : 'text-ink'}>
            {formatTime(Math.abs(remaining))}
          </span>
          <span className="text-xs text-muted ml-2">{over ? 'over' : 'left'}</span>
        </div>
        {!running ? (
          <Button size="sm" onClick={start} title="Start">
            <Play size={14} /> Start
          </Button>
        ) : (
          <Button size="sm" variant="danger" onClick={stop} title="Stop">
            <Square size={14} /> Stop
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={reset}>
          <RotateCw size={14} /> Reset
        </Button>
        <span className="text-xs text-muted ml-auto">Elapsed: {formatTime(elapsed)}</span>
      </div>
    </div>
  );
}

export function PitchDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { profile } = useProfile(userId);
  const isOwner = user?.id === userId;

  const [pitches, setPitches] = useState<DbPitch[]>([]);
  const [feedbacks, setFeedbacks] = useState<DbPitchFeedback[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = pitches.find((p) => p.id === activeId) || null;

  // sprints for picking which week a new pitch belongs to
  const [sprints, setSprints] = useState<DbSprint[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSprintId, setCreateSprintId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // edit form for owner on active pitch
  const [draft, setDraft] = useState<Partial<DbPitch>>({});

  // feedback form for reviewers
  const [fb, setFb] = useState<Partial<DbPitchFeedback>>({});

  async function reload() {
    if (!userId) return;
    const { data: ps } = await supabase
      .from('pitches')
      .select('*')
      .eq('user_id', userId)
      .order('version', { ascending: false });
    const list = (ps as DbPitch[]) || [];
    setPitches(list);
    if (!activeId && list.length) setActiveId(list[0].id);
    if (list.length) {
      const ids = list.map((p) => p.id);
      const { data: fbs } = await supabase.from('pitch_feedback').select('*').in('pitch_id', ids);
      setFeedbacks((fbs as DbPitchFeedback[]) || []);
    } else {
      setFeedbacks([]);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('sprints')
        .select('*')
        .order('week_number', { ascending: true });
      setSprints((data as DbSprint[]) || []);
    })();
  }, []);

  useEffect(() => {
    if (active) {
      setDraft({
        text_md: active.text_md,
        target_duration_sec: active.target_duration_sec,
        video_url: active.video_url,
        deck_url: active.deck_url,
        status: active.status,
      });
      const mine = feedbacks.find((f) => f.pitch_id === active.id && f.reviewer_id === user?.id);
      setFb(
        mine ?? {
          pitch_id: active.id,
          what_works: '',
          what_unclear: '',
          suggestion: '',
          score_clarity: null,
          score_persuasive: null,
        },
      );
    }
  }, [activeId, active, feedbacks, user?.id]);

  const fbForActive = useMemo(
    () => (active ? feedbacks.filter((f) => f.pitch_id === active.id) : []),
    [feedbacks, active],
  );
  const clarityAvg = avg(fbForActive.map((f) => f.score_clarity));
  const persuasiveAvg = avg(fbForActive.map((f) => f.score_persuasive));

  function openCreateDialog() {
    // Default the picker to the current sprint, falling back to the seed pitch's
    // sprint or the latest available sprint.
    const seed = pitches[0];
    const cur = sprints.find((s) => s.is_current);
    const fallback = cur?.id ?? seed?.sprint_id ?? sprints[sprints.length - 1]?.id ?? null;
    setCreateSprintId(fallback);
    setCreateOpen(true);
  }

  async function createNewVersion() {
    if (!user || !userId) return;
    setCreating(true);
    const nextVersion = (pitches[0]?.version ?? 0) + 1;
    const seed = pitches[0];
    const { data, error } = await supabase
      .from('pitches')
      .insert({
        user_id: userId,
        version: nextVersion,
        text_md: seed?.text_md ?? '',
        target_duration_sec: seed?.target_duration_sec ?? 60,
        video_url: seed?.video_url ?? null,
        deck_url: seed?.deck_url ?? null,
        status: 'draft' as PitchStatus,
        sprint_id: createSprintId,
      })
      .select()
      .maybeSingle();
    setCreating(false);
    if (error) {
      notifyError('Could not create pitch', error);
      return;
    }
    setCreateOpen(false);
    if (data) {
      await reload();
      setActiveId((data as DbPitch).id);
    }
  }

  async function deleteVersion(p: DbPitch) {
    if (!user || p.user_id !== user.id) return;
    const fbCount = feedbacks.filter((f) => f.pitch_id === p.id).length;
    const msg =
      `Delete pitch v${p.version}?` +
      (fbCount ? `\n\nThis will also remove ${fbCount} feedback ${fbCount === 1 ? 'entry' : 'entries'}.` : '');
    if (!confirm(msg)) return;
    const { error } = await supabase.from('pitches').delete().eq('id', p.id);
    if (error) return notifyError('Could not delete pitch', error);
    // If we just deleted the active version, switch to the next one (newest first)
    if (activeId === p.id) {
      const remaining = pitches.filter((x) => x.id !== p.id);
      setActiveId(remaining[0]?.id ?? null);
    }
    await reload();
  }

  async function savePitch() {
    if (!active) return;
    await supabase
      .from('pitches')
      .update({
        text_md: draft.text_md ?? '',
        target_duration_sec: draft.target_duration_sec ?? 60,
        video_url: draft.video_url || null,
        deck_url: draft.deck_url || null,
        status: (draft.status as PitchStatus) || 'draft',
      })
      .eq('id', active.id);
    await reload();
  }

  async function saveFeedback() {
    if (!active || !user) return;
    await supabase.from('pitch_feedback').upsert(
      {
        pitch_id: active.id,
        reviewer_id: user.id,
        what_works: fb.what_works ?? null,
        what_unclear: fb.what_unclear ?? null,
        suggestion: fb.suggestion ?? null,
        score_clarity: fb.score_clarity ?? null,
        score_persuasive: fb.score_persuasive ?? null,
      },
      { onConflict: 'pitch_id,reviewer_id' },
    );
    await reload();
  }

  if (!profile) return <div className="text-muted text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      <Link to="/pitches" className="text-sm text-muted hover:text-ink">
        ← Back to pitches
      </Link>

      <div className="flex items-center gap-4">
        <Avatar name={profile.full_name} src={profile.avatar_url} size="lg" />
        <div>
          <h1 className="h1">{profile.full_name}</h1>
          <p className="muted text-sm">{profile.project_name}</p>
        </div>
      </div>

      {/* Versions sidebar + active version */}
      <div className="grid lg:grid-cols-[200px_1fr] gap-6">
        <div>
          <div className="text-xs uppercase font-medium text-muted mb-2">Versions</div>
          <div className="space-y-1">
            {pitches.map((p) => (
              <div
                key={p.id}
                className={
                  'w-full px-3 py-2 rounded-lg border text-sm transition-colors flex items-center gap-2 ' +
                  (activeId === p.id
                    ? 'bg-bubble border-primary text-primary-deep'
                    : 'bg-white border-border hover:border-primary/40')
                }
              >
                <button
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  className="flex-1 text-left"
                >
                  <div className="font-medium">v{p.version}</div>
                  <div className="text-xs text-muted capitalize">{p.status.replace('_', ' ')}</div>
                  {(() => {
                    const sp = sprints.find((s) => s.id === p.sprint_id);
                    return sp ? (
                      <div className="text-[10px] text-muted mt-0.5">
                        W{sp.week_number} · {sp.name}
                      </div>
                    ) : null;
                  })()}
                </button>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => deleteVersion(p)}
                    title={`Delete v${p.version}`}
                    className="p-1 rounded hover:bg-red-50 text-muted hover:text-bad transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {!pitches.length && <div className="text-sm text-muted">No versions yet.</div>}
          </div>
          {isOwner && (
            <Button size="sm" className="w-full mt-3" onClick={openCreateDialog}>
              + New version
            </Button>
          )}
        </div>

        <div className="space-y-6">
          {!active && (
            <Card>
              <CardBody className="text-sm text-muted">
                {isOwner
                  ? 'Click "New version" to draft your first pitch.'
                  : 'No pitch versions yet.'}
              </CardBody>
            </Card>
          )}

          {active && (
            <>
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>Pitch v{active.version}</CardTitle>
                    {active.status === 'ready' && <Badge tone="ok">Ready for review</Badge>}
                    {active.status === 'reviewed' && <Badge tone="primary">Reviewed</Badge>}
                    {active.status === 'draft' && <Badge tone="neutral">Draft</Badge>}
                  </div>
                  <div className="text-xs text-muted">
                    {fbForActive.length} feedback{fbForActive.length === 1 ? '' : 's'}
                    {clarityAvg != null && (
                      <> · Clarity {formatScore(clarityAvg)} · Persuasive {formatScore(persuasiveAvg)}</>
                    )}
                  </div>
                </CardHeader>
                <CardBody className="space-y-4">
                  {isOwner ? (
                    <>
                      <div>
                        <Label>Pitch (markdown)</Label>
                        <Textarea
                          rows={8}
                          value={draft.text_md ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, text_md: e.target.value }))}
                          placeholder="Hi, I'm building [project]. We solve [problem] for [target]…"
                        />
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <Label>Target duration (sec)</Label>
                          <Input
                            type="number"
                            value={draft.target_duration_sec ?? 60}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, target_duration_sec: Number(e.target.value) }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Video URL (YouTube unlisted)</Label>
                          <Input
                            value={draft.video_url ?? ''}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, video_url: e.target.value }))
                            }
                            placeholder="https://youtu.be/…"
                          />
                          <FieldHint>
                            Upload to YouTube and set <strong>Visibility: Unlisted</strong> — only people with the link can watch.
                          </FieldHint>
                        </div>
                        <div>
                          <Label>Deck URL</Label>
                          <Input
                            value={draft.deck_url ?? ''}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, deck_url: e.target.value }))
                            }
                            placeholder="https://docs.google.com/presentation/…"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <select
                          value={(draft.status as string) ?? 'draft'}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, status: e.target.value as PitchStatus }))
                          }
                          className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
                        >
                          <option value="draft">Draft</option>
                          <option value="ready">Ready for review</option>
                          <option value="reviewed">Reviewed</option>
                        </select>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={savePitch}>Save</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="prose prose-sm max-w-none whitespace-pre-line">
                        {active.text_md || <span className="text-muted">— empty —</span>}
                      </div>
                      {active.video_url && extractYouTubeId(active.video_url) && (
                        <div className="aspect-video w-full rounded-lg overflow-hidden border border-border">
                          <iframe
                            src={`https://www.youtube.com/embed/${extractYouTubeId(active.video_url)}`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Pitch video"
                          />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm">
                        {active.video_url && (
                          <a
                            className="text-primary-dark hover:underline"
                            href={active.video_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            ▶ Open in YouTube
                          </a>
                        )}
                        {active.deck_url && (
                          <a
                            className="text-primary-dark hover:underline"
                            href={active.deck_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            📑 Open deck
                          </a>
                        )}
                        <span className="text-muted">Target: {active.target_duration_sec}s</span>
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader><CardTitle>Pitch timer (practice)</CardTitle></CardHeader>
                <CardBody>
                  <PitchTimer
                    initialTarget={active.target_duration_sec}
                    onSave={() => {
                      /* practice only; meeting timer in MeetingDetail */
                    }}
                  />
                  <p className="text-xs text-muted mt-2">
                    Use during practice. Recorded timings (per meeting) live on the meeting page.
                  </p>
                </CardBody>
              </Card>

              {!isOwner && (
                <Card>
                  <CardHeader><CardTitle>Your feedback</CardTitle></CardHeader>
                  <CardBody className="space-y-4">
                    <div>
                      <Label>👍 What works</Label>
                      <Textarea
                        rows={2}
                        value={fb.what_works ?? ''}
                        onChange={(e) => setFb((s) => ({ ...s, what_works: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>🤔 What's unclear</Label>
                      <Textarea
                        rows={2}
                        value={fb.what_unclear ?? ''}
                        onChange={(e) => setFb((s) => ({ ...s, what_unclear: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>💡 Suggestion</Label>
                      <Textarea
                        rows={2}
                        value={fb.suggestion ?? ''}
                        onChange={(e) => setFb((s) => ({ ...s, suggestion: e.target.value }))}
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <ScoreInput
                        label="Clarity (1–5)"
                        value={fb.score_clarity ?? null}
                        onChange={(n) => setFb((s) => ({ ...s, score_clarity: n }))}
                      />
                      <ScoreInput
                        label="Persuasiveness (1–5)"
                        value={fb.score_persuasive ?? null}
                        onChange={(n) => setFb((s) => ({ ...s, score_persuasive: n }))}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={saveFeedback}>Save feedback</Button>
                    </div>
                  </CardBody>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Team feedback ({fbForActive.length})</CardTitle>
                </CardHeader>
                <CardBody className="space-y-4">
                  {!fbForActive.length && (
                    <div className="text-sm text-muted">No feedback yet.</div>
                  )}
                  {fbForActive.map((f) => (
                    <FeedbackRow key={f.id} fb={f} />
                  ))}
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New pitch version"
        description="Pick the week this pitch belongs to."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={creating || !createSprintId} onClick={createNewVersion}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Week</Label>
            <select
              value={createSprintId ?? ''}
              onChange={(e) => setCreateSprintId(e.target.value || null)}
              className="w-full rounded-lg border border-border bg-white text-ink px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary h-10"
            >
              <option value="" disabled>
                Select a week…
              </option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  W{s.week_number} · {s.name}
                  {s.is_current ? ' (current)' : ''}
                </option>
              ))}
            </select>
            <FieldHint>
              Versions show up in Working Group and Cohort Session views for the week
              they belong to.
            </FieldHint>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function FeedbackRow({ fb }: { fb: DbPitchFeedback }) {
  const { profile } = useProfile(fb.reviewer_id);
  return (
    <div className="border-b border-border pb-4 last:border-0 last:pb-0">
      <div className="flex items-center gap-2 mb-2">
        <Avatar name={profile?.full_name || '?'} src={profile?.avatar_url} size="sm" />
        <div className="text-sm font-medium">{profile?.full_name || 'Reviewer'}</div>
        <div className="text-xs text-muted ml-auto">
          C {formatScore(fb.score_clarity, 0)} · P {formatScore(fb.score_persuasive, 0)}
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div className="bg-bubble/40 rounded-lg p-3">
          <div className="text-xs text-muted mb-1">👍 Works</div>
          <div>{fb.what_works || <span className="text-muted">—</span>}</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <div className="text-xs text-muted mb-1">🤔 Unclear</div>
          <div>{fb.what_unclear || <span className="text-muted">—</span>}</div>
        </div>
        <div className="bg-bg rounded-lg p-3">
          <div className="text-xs text-muted mb-1">💡 Suggestion</div>
          <div>{fb.suggestion || <span className="text-muted">—</span>}</div>
        </div>
      </div>
    </div>
  );
}
