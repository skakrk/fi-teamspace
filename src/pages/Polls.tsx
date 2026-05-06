import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { supabase, type DbPoll } from '@/lib/supabase';
import { Vote } from 'lucide-react';
import { notifyError } from '@/lib/notify';

export function Polls() {
  const { user } = useAuth();
  const { profiles } = useTeam();
  const [polls, setPolls] = useState<DbPoll[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    is_anonymous: false,
    deadline: '',
    options: ['', ''],
  });

  async function reload() {
    const { data } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
    setPolls((data as DbPoll[]) || []);
  }
  useEffect(() => {
    reload();
  }, []);

  async function create() {
    if (!user) {
      notifyError('Not signed in', 'Please sign in again.');
      return;
    }
    if (!draft.title.trim()) {
      notifyError('Title required', 'Enter a poll title.');
      return;
    }
    const labels = draft.options.map((o) => o.trim()).filter(Boolean);
    if (labels.length < 2) {
      notifyError('Not enough options', 'Add at least 2 options.');
      return;
    }
    const { data: poll, error } = await supabase
      .from('polls')
      .insert({
        title: draft.title,
        description: draft.description || null,
        is_anonymous: draft.is_anonymous,
        deadline: draft.deadline ? new Date(draft.deadline).toISOString() : null,
        type: 'single',
        status: 'open',
        created_by: user.id,
      })
      .select()
      .maybeSingle();
    if (error || !poll) {
      notifyError('Could not create poll', error ?? 'Unknown error');
      return;
    }
    const rows = labels.map((label, i) => ({
      poll_id: (poll as DbPoll).id,
      label,
      sort_order: i + 1,
    }));
    const { error: optErr } = await supabase.from('poll_options').insert(rows);
    if (optErr) {
      notifyError('Poll created but options failed', optErr);
    }
    setOpen(false);
    setDraft({ title: '', description: '', is_anonymous: false, deadline: '', options: ['', ''] });
    await reload();
  }

  function presetPresident() {
    setDraft({
      title: 'President Election',
      description:
        'Vote for the next President of the Working Group. The President provides accountability and structure to the WG meetings — similar to a Board Chair.\n\n' +
        'President\'s responsibilities (per FI guide):\n' +
        '1. Ensure all teammates have Feedback Pitches ready before every session.\n' +
        '2. Keep time for teammates\' Feedback Pitches so everyone gets mentor feedback.\n' +
        '3. Record and post the Working Group Meeting Minutes.\n' +
        '4. Record Attendance.\n' +
        '5. Act as timekeeper during the meetings.\n' +
        '6. Moderate the meeting — keep founders focused and guide discussion.\n' +
        '7. Identify founder performance issues and report them to the Local Director.\n\n' +
        'Where possible, pick someone who has not been President before.',
      is_anonymous: true,
      deadline: '',
      options: profiles.map((p) => p.full_name || 'Unnamed'),
    });
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="h1 flex items-center gap-2">
            <Vote className="text-primary-dark" size={22} /> Polls
          </h1>
          <p className="muted text-sm mt-1">Decisions, elections, and quick votes.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={presetPresident} disabled={!profiles.length}>
            ⭐ Start President Election
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> New poll
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {polls.map((p) => (
          <Link key={p.id} to={`/polls/${p.id}`}>
            <Card className="hover:shadow-pop transition-shadow">
              <CardBody className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone={p.status === 'open' ? 'ok' : 'neutral'}>{p.status}</Badge>
                  {p.is_anonymous && <Badge tone="neutral">Anonymous</Badge>}
                </div>
                <div className="font-semibold">{p.title}</div>
                {p.description && (
                  <div className="text-sm text-muted line-clamp-2">{p.description}</div>
                )}
                {p.deadline && (
                  <div className="text-xs text-muted">
                    Deadline: {format(new Date(p.deadline), 'MMM d, HH:mm')}
                  </div>
                )}
              </CardBody>
            </Card>
          </Link>
        ))}
        {!polls.length && <div className="text-muted text-sm">No polls yet.</div>}
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="New poll"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create}>Create</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Deadline (optional)</Label>
              <Input
                type="datetime-local"
                value={draft.deadline}
                onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-2">
              <input
                id="anon"
                type="checkbox"
                checked={draft.is_anonymous}
                onChange={(e) => setDraft({ ...draft, is_anonymous: e.target.checked })}
              />
              <label htmlFor="anon" className="text-sm">
                Anonymous results
              </label>
            </div>
          </div>
          <div>
            <Label>Options</Label>
            <div className="space-y-2">
              {draft.options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const next = [...draft.options];
                      next[i] = e.target.value;
                      setDraft({ ...draft, options: next });
                    }}
                    placeholder={`Option ${i + 1}`}
                  />
                  {draft.options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          options: draft.options.filter((_, j) => j !== i),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDraft({ ...draft, options: [...draft.options, ''] })}
              >
                <Plus size={14} /> Add option
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
