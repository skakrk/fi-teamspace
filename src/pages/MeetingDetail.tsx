import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarDays, Video } from 'lucide-react';
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
  type DbMeetingUpdate,
} from '@/lib/supabase';
import { downloadICS } from '@/lib/ics';

type AttendanceStatus = 'present' | 'absent' | 'late';
type AttendanceRow = { meeting_id: string; user_id: string; status: AttendanceStatus };

export function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { profiles } = useTeam();
  const [m, setM] = useState<DbMeeting | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [updates, setUpdates] = useState<DbMeetingUpdate[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [timings, setTimings] = useState<Record<string, number>>({}); // user_id → seconds

  async function reload() {
    if (!id) return;
    const { data: meet } = await supabase.from('meetings').select('*').eq('id', id).maybeSingle();
    setM((meet as DbMeeting) || null);
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
    setNotes((nts as { content: string } | null)?.content ?? '');
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
    await supabase.from('meeting_notes').upsert(
      {
        meeting_id: id,
        content: notes,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'meeting_id' },
    );
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
            <Button variant="outline" onClick={() => downloadICS(m)}>
              <CalendarDays size={16} /> Calendar
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
        <CardHeader><CardTitle>Attendance</CardTitle></CardHeader>
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
                        onClick={() => setAttFor(p.user_id, s)}
                        className={
                          'px-2 h-7 rounded-md text-xs font-medium border transition-colors ' +
                          (cur === s
                            ? s === 'present'
                              ? 'bg-ok text-white border-ok'
                              : s === 'late'
                              ? 'bg-warn text-white border-warn'
                              : 'bg-bad text-white border-bad'
                            : 'bg-white border-border text-muted hover:text-ink')
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
        <CardHeader><CardTitle>Pitch timings</CardTitle></CardHeader>
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
                onSave={(sec) => saveTiming(p.user_id, sec)}
              />
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meeting minutes (President)</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <Textarea
            rows={10}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Attendance, key discussion points, action items, sprint review notes…"
          />
          <div className="flex justify-end">
            <Button onClick={saveNotes}>Save minutes</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function PitchTimingRow({
  name,
  avatar,
  value,
  onSave,
}: {
  name: string;
  avatar: string | null;
  value: number | undefined;
  onSave: (sec: number) => void;
}) {
  const [draft, setDraft] = useState<string>(value != null ? String(value) : '');
  useEffect(() => {
    setDraft(value != null ? String(value) : '');
  }, [value]);
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
