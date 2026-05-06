import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Download, Users, Video, ExternalLink, Mic, FileText, Trash2 } from 'lucide-react';
import { notifyError } from '@/lib/notify';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useTeam } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import {
  supabase,
  type DbMeeting,
  type DbMeetingNotes,
  type DbMeetingUpdate,
} from '@/lib/supabase';
import { downloadICS } from '@/lib/ics';

type AttendanceStatus = 'present' | 'absent' | 'late';
type AttendanceRow = { meeting_id: string; user_id: string; status: AttendanceStatus };

export function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profiles } = useTeam();
  const [m, setM] = useState<DbMeeting | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [updates, setUpdates] = useState<DbMeetingUpdate[]>([]);
  const [notes, setNotes] = useState({
    content: '',
    discussion_points: '',
    sprint_questions: '',
    next_meeting_review: '',
  });
  const [minutesView, setMinutesView] = useState(false);
  const [timings, setTimings] = useState<Record<string, number>>({}); // user_id → seconds
  const [recordingDraft, setRecordingDraft] = useState({
    recording_url: '',
    transcript_url: '',
    transcript_text: '',
    summary: '',
  });
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const president = profiles.find((p) => p.is_president) ?? null;
  const iAmPresident = !!user && president?.user_id === user.id;

  async function reload() {
    if (!id) return;
    const { data: meet } = await supabase.from('meetings').select('*').eq('id', id).maybeSingle();
    const meetingRow = (meet as DbMeeting) || null;
    setM(meetingRow);
    if (meetingRow) {
      setRecordingDraft({
        recording_url: meetingRow.recording_url ?? '',
        transcript_url: meetingRow.transcript_url ?? '',
        transcript_text: meetingRow.transcript_text ?? '',
        summary: meetingRow.summary ?? '',
      });
    }
    const { data: att } = await supabase
      .from('meeting_attendance')
      .select('*')
      .eq('meeting_id', id);
    setAttendance((att as AttendanceRow[]) || []);
    const { data: upd } = await supabase
      .from('meeting_updates')
      .select('*')
      .eq('meeting_id', id);
    setUpdates((upd as DbMeetingUpdate[]) || []);
    const { data: nts } = await supabase
      .from('meeting_notes')
      .select('*')
      .eq('meeting_id', id)
      .maybeSingle();
    const n = nts as DbMeetingNotes | null;
    setNotes({
      content: n?.content ?? '',
      discussion_points: n?.discussion_points ?? '',
      sprint_questions: n?.sprint_questions ?? '',
      next_meeting_review: n?.next_meeting_review ?? '',
    });
    const { data: tms } = await supabase
      .from('pitch_timings')
      .select('*')
      .eq('meeting_id', id);
    const map: Record<string, number> = {};
    for (const t of (tms as { user_id: string; duration_sec: number }[]) || []) {
      map[t.user_id] = t.duration_sec;
    }
    setTimings(map);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!m) return <div className="text-muted text-sm">Loading…</div>;

  const dt = new Date(m.scheduled_at);

  async function setAttFor(userId: string, status: AttendanceStatus) {
    if (!id) return;
    await supabase
      .from('meeting_attendance')
      .upsert({ meeting_id: id, user_id: userId, status }, { onConflict: 'meeting_id,user_id' });
    await reload();
  }

  async function saveUpdateMine(field: 'success' | 'challenge' | 'learning', value: string) {
    if (!user || !id) return;
    const existing = updates.find((u) => u.user_id === user.id);
    const next = { success: '', challenge: '', learning: '', ...existing, [field]: value };
    await supabase.from('meeting_updates').upsert(
      {
        meeting_id: id,
        user_id: user.id,
        success: next.success,
        challenge: next.challenge,
        learning: next.learning,
      },
      { onConflict: 'meeting_id,user_id' },
    );
    await reload();
  }

  async function saveNotes() {
    if (!id) return;
    const { error } = await supabase.from('meeting_notes').upsert(
      {
        meeting_id: id,
        content: notes.content || null,
        discussion_points: notes.discussion_points || null,
        sprint_questions: notes.sprint_questions || null,
        next_meeting_review: notes.next_meeting_review || null,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'meeting_id' },
    );
    if (error) notifyError('Could not save minutes', error);
  }

  async function saveRecording() {
    if (!id) return;
    const { error } = await supabase
      .from('meetings')
      .update({
        recording_url: recordingDraft.recording_url.trim() || null,
        transcript_url: recordingDraft.transcript_url.trim() || null,
        transcript_text: recordingDraft.transcript_text.trim() || null,
        summary: recordingDraft.summary.trim() || null,
      })
      .eq('id', id);
    if (error) return notifyError('Could not save recording info', error);
    await reload();
  }

  async function deleteMeeting() {
    if (!id || !m) return;
    if (
      !confirm(
        `Delete meeting "${m.title}" permanently?\n\n` +
          'This also removes attendance, round-robin updates, minutes, ' +
          'pitch timings and recording info linked to this meeting.',
      )
    )
      return;
    const { error } = await supabase.from('meetings').delete().eq('id', id);
    if (error) return notifyError('Could not delete meeting', error);
    navigate('/meetings');
  }

  async function saveTiming(userId: string, sec: number) {
    if (!id) return;
    await supabase.from('pitch_timings').upsert(
      { meeting_id: id, user_id: userId, duration_sec: sec },
      { onConflict: 'meeting_id,user_id' },
    );
    await reload();
  }

  const myUpdate = updates.find((u) => u.user_id === user?.id);

  return (
    <div className="space-y-6">
      <Link to="/meetings" className="text-sm text-muted hover:text-ink">
        ← Back to meetings
      </Link>

      <Card>
        <CardBody className="flex flex-col md:flex-row gap-4 md:items-center">
          <div className="w-16 h-16 bg-bubble rounded-xl grid place-items-center text-primary-deep">
            <div className="text-center">
              <div className="text-xs uppercase font-medium">{format(dt, 'MMM')}</div>
              <div className="text-xl font-bold leading-none">{format(dt, 'd')}</div>
            </div>
          </div>
          <div className="flex-1">
            <h1 className="h1">{m.title}</h1>
            <div className="text-sm text-muted">
              {format(dt, 'EEEE · HH:mm')} · {m.duration_min} min
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge tone={m.status === 'upcoming' ? 'ok' : 'neutral'}>{m.status}</Badge>
              <Badge tone={m.kind === 'cohort_session' ? 'warn' : 'default'}>
                {m.kind === 'cohort_session' ? <Users size={11} /> : null}
                {m.kind === 'cohort_session' ? 'Cohort Session' : 'Working Group'}
              </Badge>
              {president && (
                <Badge tone="primary">
                  President: {president.full_name}
                  {iAmPresident && ' (you)'}
                </Badge>
              )}
              {!president && (
                <Badge tone="warn">No President elected — start an election in /polls</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {m.meet_url && (
              <a href={m.meet_url} target="_blank" rel="noreferrer">
                <Button>
                  <Video size={16} /> Join Meet
                </Button>
              </a>
            )}
            <Button variant="outline" onClick={() => downloadICS(m)} title="Download .ics file">
              <Download size={16} /> Calendar
            </Button>
            <Button variant="ghost" onClick={deleteMeeting} title="Delete meeting">
              <Trash2 size={16} className="text-bad" />
            </Button>
          </div>
        </CardBody>
      </Card>

      {m.agenda && (
        <Card>
          <CardHeader><CardTitle>Agenda</CardTitle></CardHeader>
          <CardBody>
            <div className="text-sm whitespace-pre-line">{m.agenda}</div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Attendance</CardTitle>
          {!iAmPresident && (
            <span className="text-xs text-muted italic">
              Read-only — only the President{president ? ` (${president.full_name})` : ''} can edit
            </span>
          )}
        </CardHeader>
        <CardBody>
          <div className="divide-y divide-border">
            {profiles.map((p) => {
              const cur = attendance.find((a) => a.user_id === p.user_id)?.status;
              return (
                <div
                  key={p.user_id}
                  className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <Avatar name={p.full_name || '?'} src={p.avatar_url} size="sm" />
                  <div className="flex-1 text-sm">{p.full_name || 'Unnamed'}</div>
                  <div className="flex gap-1">
                    {(['present', 'late', 'absent'] as AttendanceStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => iAmPresident && setAttFor(p.user_id, s)}
                        disabled={!iAmPresident}
                        className={
                          'px-2 h-7 rounded-md text-xs font-medium border transition-colors ' +
                          (cur === s
                            ? s === 'present'
                              ? 'bg-ok text-white border-ok'
                              : s === 'late'
                              ? 'bg-warn text-white border-warn'
                              : 'bg-bad text-white border-bad'
                            : 'bg-white border-border text-muted ' +
                              (iAmPresident ? 'hover:text-ink' : 'opacity-50 cursor-not-allowed'))
                        }
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {!profiles.length && <div className="text-sm text-muted">No founders.</div>}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Round-robin: 1 success / 1 challenge / 1 learning</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <Label>Your success this week</Label>
            <Textarea
              rows={2}
              defaultValue={myUpdate?.success ?? ''}
              onBlur={(e) => saveUpdateMine('success', e.target.value)}
            />
          </div>
          <div>
            <Label>Your challenge</Label>
            <Textarea
              rows={2}
              defaultValue={myUpdate?.challenge ?? ''}
              onBlur={(e) => saveUpdateMine('challenge', e.target.value)}
            />
          </div>
          <div>
            <Label>Your learning</Label>
            <Textarea
              rows={2}
              defaultValue={myUpdate?.learning ?? ''}
              onBlur={(e) => saveUpdateMine('learning', e.target.value)}
            />
          </div>
          <div className="text-xs text-muted">Saved automatically when you click outside.</div>

          <div className="border-t border-border pt-4 mt-4 space-y-3">
            <div className="text-sm font-medium">Team submissions</div>
            {profiles.map((p) => {
              const u = updates.find((x) => x.user_id === p.user_id);
              if (!u || (!u.success && !u.challenge && !u.learning)) return null;
              return (
                <div key={p.user_id} className="bg-bg rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar name={p.full_name} src={p.avatar_url} size="sm" />
                    <div className="text-sm font-medium">{p.full_name}</div>
                  </div>
                  <div className="text-sm space-y-1">
                    {u.success && (
                      <div>
                        <span className="text-ok font-medium">✓ Success:</span> {u.success}
                      </div>
                    )}
                    {u.challenge && (
                      <div>
                        <span className="text-warn font-medium">! Challenge:</span> {u.challenge}
                      </div>
                    )}
                    {u.learning && (
                      <div>
                        <span className="text-primary-deep font-medium">★ Learning:</span>{' '}
                        {u.learning}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Pitch timings</CardTitle>
          {!iAmPresident && (
            <span className="text-xs text-muted italic">
              Read-only — only the President{president ? ` (${president.full_name})` : ''} can edit
            </span>
          )}
        </CardHeader>
        <CardBody>
          <div className="text-xs text-muted mb-3">
            President records each founder's pitch length during the meeting.
          </div>
          <div className="divide-y divide-border">
            {profiles.map((p) => (
              <PitchTimingRow
                key={p.user_id}
                name={p.full_name}
                avatar={p.avatar_url}
                value={timings[p.user_id]}
                disabled={!iAmPresident}
                onSave={(sec) => saveTiming(p.user_id, sec)}
              />
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic size={18} className="text-primary-dark" /> Recording &amp; transcript
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="bg-bubble/30 border border-primary/20 rounded-lg p-3 text-xs text-ink/80 leading-relaxed">
            Use the link fields if you have a share-URL, or paste raw transcript text into the textarea — works from any source.
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Recording URL</Label>
              <Input
                value={recordingDraft.recording_url}
                onChange={(e) =>
                  setRecordingDraft((s) => ({ ...s, recording_url: e.target.value }))
                }
                placeholder="https://tldv.io/share/…"
              />
            </div>
            <div>
              <Label>Transcript URL</Label>
              <Input
                value={recordingDraft.transcript_url}
                onChange={(e) =>
                  setRecordingDraft((s) => ({ ...s, transcript_url: e.target.value }))
                }
                placeholder="https://tactiq.io/transcript/…"
              />
            </div>
          </div>
          <div>
            <Label>Transcript text (paste here if you have no share link)</Label>
            <Textarea
              rows={6}
              value={recordingDraft.transcript_text}
              onChange={(e) =>
                setRecordingDraft((s) => ({ ...s, transcript_text: e.target.value }))
              }
              placeholder="Paste the full transcript from Tactiq, Meet captions copy, Otter export, or a .txt file."
            />
            {recordingDraft.transcript_text && (
              <div className="text-xs text-muted mt-1">
                {recordingDraft.transcript_text.length.toLocaleString()} characters ·{' '}
                {recordingDraft.transcript_text.split(/\s+/).filter(Boolean).length.toLocaleString()} words
              </div>
            )}
          </div>
          <div>
            <Label>AI summary / key takeaways</Label>
            <Textarea
              rows={4}
              value={recordingDraft.summary}
              onChange={(e) =>
                setRecordingDraft((s) => ({ ...s, summary: e.target.value }))
              }
              placeholder="Paste the AI-generated summary from tl;dv / Otter, or write key takeaways manually."
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {m.recording_url && (
                <a
                  href={m.recording_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary-dark hover:underline"
                >
                  <Video size={14} /> Open recording <ExternalLink size={12} />
                </a>
              )}
              {m.transcript_url && (
                <a
                  href={m.transcript_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary-dark hover:underline"
                >
                  <FileText size={14} /> Open transcript <ExternalLink size={12} />
                </a>
              )}
              {m.transcript_text && (
                <button
                  type="button"
                  onClick={() => setTranscriptOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-sm text-primary-dark hover:underline"
                >
                  <FileText size={14} />
                  {transcriptOpen ? 'Hide transcript text' : 'Read transcript text'}
                </button>
              )}
            </div>
            <Button onClick={saveRecording}>Save</Button>
          </div>

          {m.transcript_text && transcriptOpen && (
            <div className="bg-bg rounded-lg border border-border p-4 max-h-96 overflow-auto whitespace-pre-line text-sm leading-relaxed">
              {m.transcript_text}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle>Meeting Minutes (President)</CardTitle>
          <div className="flex gap-2 items-center">
            {!iAmPresident && (
              <span className="text-xs text-muted italic">
                Read-only — only the President{president ? ` (${president.full_name})` : ''} can edit
              </span>
            )}
            {iAmPresident && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMinutesView((v) => !v)}
              >
                {minutesView ? 'Edit' : 'Preview'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="bg-bubble/30 border border-primary/20 rounded-lg p-3 text-xs text-ink/80 leading-relaxed">
            FI Meeting Minutes must include: <strong>(1)</strong> Attendance, <strong>(2)</strong> New successes &amp; challenges with high-level discussion points, <strong>(3)</strong> High-level questions about the Sprint, <strong>(4)</strong> Items to review next meeting. Sections 1 &amp; 2 are auto-derived from Attendance and Round-robin above; the President fills in the rest.
          </div>

          {(!iAmPresident || minutesView) ? (
            <MeetingMinutesView
              meeting={m}
              attendance={attendance}
              updates={updates}
              profiles={profiles}
              notes={notes}
            />
          ) : (
            <>
              <Section
                title="1. Attendance"
                helper="Auto-summary from the Attendance section above."
              >
                <AttendanceSummary attendance={attendance} profiles={profiles} />
              </Section>

              <Section
                title="2. New successes & challenges"
                helper="Auto-summary from the Round-robin above. Add the discussion points you heard."
              >
                <RoundRobinSummary updates={updates} profiles={profiles} />
                <Label className="mt-3">High-level discussion points</Label>
                <Textarea
                  rows={4}
                  value={notes.discussion_points}
                  onChange={(e) =>
                    setNotes((n) => ({ ...n, discussion_points: e.target.value }))
                  }
                  placeholder="What came up in discussion — themes, debates, decisions, advice given…"
                />
              </Section>

              <Section
                title="3. High-level questions regarding the Sprint"
                helper="Things the team is unclear on, blockers, questions for mentors / Local Director."
              >
                <Textarea
                  rows={4}
                  value={notes.sprint_questions}
                  onChange={(e) =>
                    setNotes((n) => ({ ...n, sprint_questions: e.target.value }))
                  }
                  placeholder="• Q1…&#10;• Q2…"
                />
              </Section>

              <Section
                title="4. Items to review at the next meeting"
                helper="Open challenges to revisit, action items, anything to keep on the radar."
              >
                <Textarea
                  rows={4}
                  value={notes.next_meeting_review}
                  onChange={(e) =>
                    setNotes((n) => ({ ...n, next_meeting_review: e.target.value }))
                  }
                  placeholder="• Follow up on…&#10;• Revisit decision about…"
                />
              </Section>

              <details className="text-sm">
                <summary className="cursor-pointer text-muted hover:text-ink">
                  Additional notes (optional, free-form)
                </summary>
                <Textarea
                  rows={4}
                  className="mt-2"
                  value={notes.content}
                  onChange={(e) => setNotes((n) => ({ ...n, content: e.target.value }))}
                  placeholder="Anything else you want recorded that doesn't fit above."
                />
              </details>

              <div className="flex justify-end">
                <Button onClick={saveNotes}>Save minutes</Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Section({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-semibold text-ink">{title}</div>
      {helper && <div className="text-xs text-muted mt-0.5 mb-2">{helper}</div>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function AttendanceSummary({
  attendance,
  profiles,
}: {
  attendance: AttendanceRow[];
  profiles: Array<{ user_id: string; full_name: string | null; avatar_url: string | null }>;
}) {
  const present = attendance.filter((a) => a.status === 'present').length;
  const late = attendance.filter((a) => a.status === 'late').length;
  const absent = attendance.filter((a) => a.status === 'absent').length;
  const total = profiles.length;
  return (
    <div className="bg-bg rounded-lg p-3 text-sm">
      <div>
        Present <strong>{present}</strong> · Late <strong>{late}</strong> · Absent{' '}
        <strong>{absent}</strong> · Total <strong>{total}</strong>
      </div>
      <div className="text-xs text-muted mt-1.5 space-y-0.5">
        {profiles.map((p) => {
          const a = attendance.find((x) => x.user_id === p.user_id);
          return (
            <div key={p.user_id}>
              · {p.full_name || 'Unnamed'} —{' '}
              <span className="font-medium">{a?.status ?? 'not marked'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoundRobinSummary({
  updates,
  profiles,
}: {
  updates: DbMeetingUpdate[];
  profiles: Array<{ user_id: string; full_name: string | null; avatar_url: string | null }>;
}) {
  const filled = profiles.filter((p) => {
    const u = updates.find((x) => x.user_id === p.user_id);
    return u && (u.success || u.challenge || u.learning);
  });
  if (!filled.length) {
    return (
      <div className="text-xs text-muted italic">No round-robin entries yet for this meeting.</div>
    );
  }
  return (
    <div className="bg-bg rounded-lg p-3 space-y-2 text-sm">
      {filled.map((p) => {
        const u = updates.find((x) => x.user_id === p.user_id)!;
        return (
          <div key={p.user_id}>
            <div className="font-medium">{p.full_name}</div>
            <div className="space-y-0.5 text-xs">
              {u.success && (
                <div>
                  <span className="text-ok font-medium">✓</span> {u.success}
                </div>
              )}
              {u.challenge && (
                <div>
                  <span className="text-warn font-medium">!</span> {u.challenge}
                </div>
              )}
              {u.learning && (
                <div>
                  <span className="text-primary-deep font-medium">★</span> {u.learning}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Read-only "official minutes" view for share/print/PDF
function MeetingMinutesView({
  meeting,
  attendance,
  updates,
  profiles,
  notes,
}: {
  meeting: DbMeeting;
  attendance: AttendanceRow[];
  updates: DbMeetingUpdate[];
  profiles: Array<{ user_id: string; full_name: string | null; avatar_url: string | null }>;
  notes: { content: string; discussion_points: string; sprint_questions: string; next_meeting_review: string };
}) {
  return (
    <div className="bg-white border border-border rounded-lg p-6 space-y-5 print:border-0 print:shadow-none">
      <div className="border-b border-border pb-3">
        <div className="text-xs uppercase tracking-wider text-muted">
          Working Group · Meeting Minutes
        </div>
        <div className="text-xl font-semibold mt-1">{meeting.title}</div>
        <div className="text-sm text-muted">
          {format(new Date(meeting.scheduled_at), 'EEEE, MMMM d, yyyy · HH:mm')}
        </div>
      </div>

      <div>
        <div className="font-semibold mb-1">1. Attendance</div>
        <AttendanceSummary attendance={attendance} profiles={profiles} />
      </div>

      <div>
        <div className="font-semibold mb-1">2. New successes &amp; challenges</div>
        <RoundRobinSummary updates={updates} profiles={profiles} />
        {notes.discussion_points && (
          <div className="mt-2">
            <div className="text-xs uppercase tracking-wider text-muted mb-1">
              High-level discussion points
            </div>
            <div className="text-sm whitespace-pre-line">{notes.discussion_points}</div>
          </div>
        )}
      </div>

      <div>
        <div className="font-semibold mb-1">3. High-level questions regarding the Sprint</div>
        <div className="text-sm whitespace-pre-line">
          {notes.sprint_questions || <span className="text-muted italic">— none recorded —</span>}
        </div>
      </div>

      <div>
        <div className="font-semibold mb-1">4. Items to review at the next meeting</div>
        <div className="text-sm whitespace-pre-line">
          {notes.next_meeting_review || <span className="text-muted italic">— none recorded —</span>}
        </div>
      </div>

      {notes.content && (
        <div>
          <div className="font-semibold mb-1">Additional notes</div>
          <div className="text-sm whitespace-pre-line">{notes.content}</div>
        </div>
      )}
    </div>
  );
}

function PitchTimingRow({
  name,
  avatar,
  value,
  onSave,
  disabled,
}: {
  name: string;
  avatar: string | null;
  value: number | undefined;
  onSave: (sec: number) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string>(value != null ? String(value) : '');
  useEffect(() => {
    setDraft(value != null ? String(value) : '');
  }, [value]);
  if (disabled) {
    return (
      <div className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
        <Avatar name={name || '?'} src={avatar} size="sm" />
        <div className="flex-1 text-sm">{name || 'Unnamed'}</div>
        <div className="text-sm font-mono text-muted">
          {value != null ? `${value} sec` : '—'}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
      <Avatar name={name || '?'} src={avatar} size="sm" />
      <div className="flex-1 text-sm">{name || 'Unnamed'}</div>
      <Input
        type="number"
        className="w-24"
        value={draft}
        placeholder="sec"
        onChange={(e) => setDraft(e.target.value)}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          const n = Number(draft);
          if (!Number.isNaN(n) && n >= 0) onSave(n);
        }}
      >
        Save
      </Button>
    </div>
  );
}
