import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, MessageCircle, Pencil, Plus, Trash2, Users, Video } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@/components/ui/Tabs';
import { supabase, type DbMeeting, type MeetingKind } from '@/lib/supabase';
import { downloadICS } from '@/lib/ics';
import { notifyError } from '@/lib/notify';
import { useAuth } from '@/hooks/useAuth';

function kindLabel(k: MeetingKind) {
  return k === 'cohort_session' ? 'Cohort Session' : 'Working Group';
}

function isMeetingPast(m: DbMeeting): boolean {
  const startMs = new Date(m.scheduled_at).getTime();
  const endMs = startMs + (m.duration_min || 0) * 60 * 1000;
  return Number.isFinite(endMs) && endMs < Date.now();
}

function buildMeetingShareText(m: DbMeeting): string {
  const dt = new Date(m.scheduled_at);
  const lines: string[] = [];
  lines.push(`📅 ${m.title}`);
  lines.push(`${kindLabel(m.kind)}`);
  lines.push('');
  lines.push(`🕒 ${format(dt, 'EEEE, MMMM d · HH:mm')} (${m.duration_min} min)`);
  if (m.meet_url) {
    lines.push(`🔗 ${m.meet_url}`);
  }
  if (m.agenda) {
    lines.push('');
    lines.push('Agenda:');
    lines.push(m.agenda);
  }
  return lines.join('\n');
}

function shareToWhatsApp(m: DbMeeting) {
  const text = buildMeetingShareText(m);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function MeetingItem({
  m,
  onEdit,
  onDelete,
}: {
  m: DbMeeting;
  onEdit: (m: DbMeeting) => void;
  onDelete: (m: DbMeeting) => void;
}) {
  const dt = new Date(m.scheduled_at);
  const isCohort = m.kind === 'cohort_session';
  return (
    <Card className="hover:shadow-pop transition-shadow">
      <CardBody className="flex flex-col sm:flex-row gap-4 items-start">
        <div
          className={
            'w-14 h-14 rounded-xl grid place-items-center flex-shrink-0 ' +
            (isCohort
              ? 'bg-amber-100 text-amber-700'
              : 'bg-bubble text-primary-deep')
          }
        >
          <div className="text-center">
            <div className="text-[10px] uppercase font-medium">{format(dt, 'MMM')}</div>
            <div className="text-lg font-bold leading-none">{format(dt, 'd')}</div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/meetings/${m.id}`} className="font-semibold text-ink hover:text-primary-dark">
              {m.title}
            </Link>
            <Badge tone={isCohort ? 'warn' : 'default'}>
              {isCohort ? <Users size={11} /> : null}
              {kindLabel(m.kind)}
            </Badge>
          </div>
          <div className="text-sm text-muted">
            {format(dt, 'EEE · HH:mm')} · {m.duration_min} min
          </div>
          {m.agenda && (
            <div className="text-sm mt-2 text-muted line-clamp-2 whitespace-pre-line">
              {m.agenda}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={isMeetingPast(m) ? 'neutral' : 'ok'}>
            {isMeetingPast(m) ? 'past' : 'upcoming'}
          </Badge>
          <div className="flex gap-2 flex-wrap justify-end">
            {m.meet_url && (
              <a href={m.meet_url} target="_blank" rel="noreferrer">
                <Button size="sm" variant="primary">
                  <Video size={14} /> Join
                </Button>
              </a>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadICS(m)}
              title="Download .ics file"
            >
              <Download size={14} /> Calendar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => shareToWhatsApp(m)}
              title="Share to WhatsApp"
            >
              <MessageCircle size={14} className="text-[#25D366]" /> WhatsApp
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(m)}
              title="Edit meeting"
            >
              <Pencil size={14} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(m)}
              title="Delete meeting"
            >
              <Trash2 size={14} className="text-bad" />
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

const WG_AGENDA =
  'Welcome (5 min)\nReview previous challenges (10 min)\nRound: 1 success / 1 challenge per founder (45 min)\nSprint deliverables (30 min)\nOpen networking (20 min)\nClosing';

export function Meetings() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<DbMeeting[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{
    kind: MeetingKind;
    title: string;
    date: string;
    time: string;
    duration_min: number;
    meet_url: string;
    agenda: string;
  }>({
    kind: 'working_group',
    title: 'Working Group #',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '18:00',
    duration_min: 120,
    meet_url: '',
    agenda: WG_AGENDA,
  });
  const [cohortOpen, setCohortOpen] = useState(false);
  const [cohortDraft, setCohortDraft] = useState<{
    title: string;
    date: string;
    time: string;
    meet_url: string;
  }>({
    title: 'Cohort Session: ',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '17:00',
    meet_url: '',
  });
  // When set, the corresponding dialog is in edit mode and saves run UPDATE.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function reload() {
    const { data } = await supabase.from('meetings').select('*').order('scheduled_at', {
      ascending: false,
    });
    setMeetings((data as DbMeeting[]) || []);
  }
  useEffect(() => {
    reload();
  }, []);

  const now = Date.now();
  const upcoming = meetings.filter((m) => new Date(m.scheduled_at).getTime() >= now - 60 * 60 * 1000);
  const past = meetings.filter((m) => new Date(m.scheduled_at).getTime() < now - 60 * 60 * 1000);

  async function saveWorkingGroup() {
    setSaving(true);
    const scheduled_at = new Date(`${draft.date}T${draft.time}:00`).toISOString();
    const payload = {
      title: draft.title,
      scheduled_at,
      duration_min: draft.duration_min,
      meet_url: draft.meet_url || null,
      agenda: draft.agenda || null,
      kind: draft.kind,
    };
    const { error } = editingId
      ? await supabase.from('meetings').update(payload).eq('id', editingId)
      : await supabase.from('meetings').insert({
          ...payload,
          status: 'upcoming',
          created_by: user?.id ?? null,
        });
    setSaving(false);
    if (error) {
      notifyError(editingId ? 'Could not update meeting' : 'Could not create meeting', error);
      return;
    }
    setOpen(false);
    setEditingId(null);
    await reload();
  }

  async function saveCohortSession() {
    setSaving(true);
    const scheduled_at = new Date(`${cohortDraft.date}T${cohortDraft.time}:00`).toISOString();
    const payload = {
      title: cohortDraft.title,
      scheduled_at,
      duration_min: 90,
      meet_url: cohortDraft.meet_url.trim() || null,
      agenda: null,
      kind: 'cohort_session' as const,
    };
    const { error } = editingId
      ? await supabase.from('meetings').update(payload).eq('id', editingId)
      : await supabase.from('meetings').insert({
          ...payload,
          status: 'upcoming',
          created_by: user?.id ?? null,
        });
    setSaving(false);
    if (error) {
      notifyError(
        editingId ? 'Could not update cohort session' : 'Could not create cohort session',
        error,
      );
      return;
    }
    setCohortOpen(false);
    setEditingId(null);
    await reload();
  }

  function startEdit(m: DbMeeting) {
    const dt = new Date(m.scheduled_at);
    const date = format(dt, 'yyyy-MM-dd');
    const time = format(dt, 'HH:mm');
    setEditingId(m.id);
    if (m.kind === 'cohort_session') {
      setCohortDraft({ title: m.title, date, time, meet_url: m.meet_url ?? '' });
      setCohortOpen(true);
    } else {
      setDraft({
        kind: m.kind,
        title: m.title,
        date,
        time,
        duration_min: m.duration_min,
        meet_url: m.meet_url ?? '',
        agenda: m.agenda ?? '',
      });
      setOpen(true);
    }
  }

  async function deleteMeeting(m: DbMeeting) {
    if (
      !confirm(
        `Delete meeting "${m.title}" permanently?\n\n` +
          'This also removes attendance, round-robin updates, minutes, ' +
          'pitch timings and recording info linked to this meeting.',
      )
    )
      return;
    const { error } = await supabase.from('meetings').delete().eq('id', m.id);
    if (error) {
      notifyError('Could not delete meeting', error);
      return;
    }
    await reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="h1">Meetings</h1>
          <p className="muted text-sm mt-1">Working Group sessions, agendas and minutes.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setCohortOpen(true)}>
            <Users size={16} /> Cohort session
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> New meeting
          </Button>
        </div>
      </div>

      <TabsRoot defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.map((m) => (
            <MeetingItem key={m.id} m={m} onEdit={startEdit} onDelete={deleteMeeting} />
          ))}
          {!upcoming.length && <div className="text-muted text-sm">No upcoming meetings.</div>}
        </TabsContent>
        <TabsContent value="past" className="mt-4 space-y-3">
          {past.map((m) => (
            <MeetingItem key={m.id} m={m} onEdit={startEdit} onDelete={deleteMeeting} />
          ))}
          {!past.length && <div className="text-muted text-sm">No past meetings yet.</div>}
        </TabsContent>
      </TabsRoot>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditingId(null);
        }}
        title={editingId ? 'Edit meeting' : 'New meeting'}
        description="Schedule a Working Group session."
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
            <Button disabled={saving} onClick={saveWorkingGroup}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Time</Label>
              <Input
                type="time"
                value={draft.time}
                onChange={(e) => setDraft({ ...draft, time: e.target.value })}
              />
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={draft.duration_min}
                onChange={(e) =>
                  setDraft({ ...draft, duration_min: Number(e.target.value || 0) })
                }
              />
            </div>
          </div>
          <div>
            <Label>Google Meet URL</Label>
            <Input
              value={draft.meet_url}
              onChange={(e) => setDraft({ ...draft, meet_url: e.target.value })}
              placeholder="https://meet.google.com/abc-def-ghi"
            />
          </div>
          <div>
            <Label>Agenda</Label>
            <Textarea
              rows={6}
              value={draft.agenda}
              onChange={(e) => setDraft({ ...draft, agenda: e.target.value })}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        open={cohortOpen}
        onOpenChange={(v) => {
          setCohortOpen(v);
          if (!v) setEditingId(null);
        }}
        title={editingId ? 'Edit cohort session' : 'New cohort session'}
        description="Founder Institute cohort session — we don't run it, just record when it happens."
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setCohortOpen(false);
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
            <Button disabled={saving} onClick={saveCohortSession}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={cohortDraft.title}
              onChange={(e) => setCohortDraft({ ...cohortDraft, title: e.target.value })}
              placeholder="Cohort Session: topic"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={cohortDraft.date}
                onChange={(e) => setCohortDraft({ ...cohortDraft, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Time</Label>
              <Input
                type="time"
                value={cohortDraft.time}
                onChange={(e) => setCohortDraft({ ...cohortDraft, time: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Zoom link</Label>
            <Input
              value={cohortDraft.meet_url}
              onChange={(e) => setCohortDraft({ ...cohortDraft, meet_url: e.target.value })}
              placeholder="https://zoom.us/j/…"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
