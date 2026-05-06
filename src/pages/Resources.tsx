import { useEffect, useState } from 'react';
import { ExternalLink, Plus } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { supabase, type DbResource } from '@/lib/supabase';
import { BookOpenCheck } from 'lucide-react';
import { notifyError } from '@/lib/notify';

const CATEGORIES = [
  { code: 'event',       label: 'FI Event' },
  { code: 'opportunity', label: 'Opportunity' },
  { code: 'article',     label: 'Article' },
  { code: 'tool',        label: 'Tool' },
  { code: 'other',       label: 'Other' },
];

function tone(cat: string): 'primary' | 'ok' | 'warn' | 'default' | 'neutral' {
  if (cat === 'event') return 'primary';
  if (cat === 'opportunity') return 'ok';
  if (cat === 'article') return 'default';
  if (cat === 'tool') return 'warn';
  return 'neutral';
}

export function Resources() {
  const { user } = useAuth();
  const { profiles } = useTeam();
  const [items, setItems] = useState<DbResource[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    url: '',
    body: '',
    category: 'event',
    event_date: '',
  });
  const [saving, setSaving] = useState(false);

  async function reload() {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });
    setItems((data as DbResource[]) || []);
  }
  useEffect(() => {
    reload();
  }, []);

  async function create() {
    if (!user || !draft.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('resources').insert({
      posted_by: user.id,
      title: draft.title.trim(),
      url: draft.url.trim() || null,
      body: draft.body.trim() || null,
      category: draft.category,
      event_date: draft.category === 'event' && draft.event_date ? draft.event_date : null,
    });
    setSaving(false);
    if (error) {
      notifyError('Could not post resource', error);
      return;
    }
    setOpen(false);
    setDraft({ title: '', url: '', body: '', category: 'event', event_date: '' });
    await reload();
  }

  const visible = filter === 'all' ? items : items.filter((r) => r.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="h1 flex items-center gap-2">
            <BookOpenCheck className="text-primary-dark" size={22} /> Resources
          </h1>
          <p className="muted text-sm mt-1">
            Share FI events, opportunities, articles, and tools with the team.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> Share something
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        {[{ code: 'all', label: 'All' }, ...CATEGORIES].map((c) => (
          <button
            key={c.code}
            onClick={() => setFilter(c.code)}
            className={
              'px-3 h-8 rounded-lg text-sm font-medium border ' +
              (filter === c.code
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-muted border-border hover:text-ink')
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map((r) => {
          const poster = profiles.find((p) => p.user_id === r.posted_by);
          const cat = CATEGORIES.find((c) => c.code === r.category);
          return (
            <Card key={r.id} className="hover:shadow-pop transition-shadow">
              <CardBody className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {cat && <Badge tone={tone(r.category)}>{cat.label}</Badge>}
                  {r.event_date && (
                    <Badge tone="neutral">
                      {format(new Date(r.event_date), 'MMM d, yyyy')}
                    </Badge>
                  )}
                </div>
                <div className="font-semibold text-ink">
                  {r.url ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-primary-dark inline-flex items-center gap-1"
                    >
                      {r.title} <ExternalLink size={14} />
                    </a>
                  ) : (
                    r.title
                  )}
                </div>
                {r.body && <div className="text-sm text-muted whitespace-pre-line">{r.body}</div>}
                <div className="flex items-center gap-2 pt-2 border-t border-border text-xs text-muted">
                  <Avatar name={poster?.full_name || '?'} src={poster?.avatar_url} size="sm" />
                  <span>{poster?.full_name || 'Someone'}</span>
                  <span className="ml-auto" title={format(new Date(r.created_at), 'PPp')}>
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>
              </CardBody>
            </Card>
          );
        })}
        {!visible.length && (
          <div className="text-sm text-muted col-span-full">
            Nothing here yet. Be the first to share something useful.
          </div>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Share with the team"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saving || !draft.title.trim()}>
              {saving ? 'Saving…' : 'Post'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Category</Label>
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setDraft({ ...draft, category: c.code })}
                  className={
                    'px-3 h-8 rounded-md text-sm border ' +
                    (draft.category === c.code
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-muted border-border hover:text-ink')
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Title</Label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="FI Demo Day, useful PMF article…"
            />
          </div>
          <div>
            <Label>Link (optional)</Label>
            <Input
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              placeholder="https://…"
            />
          </div>
          {draft.category === 'event' && (
            <div>
              <Label>Event date</Label>
              <Input
                type="date"
                value={draft.event_date}
                onChange={(e) => setDraft({ ...draft, event_date: e.target.value })}
              />
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              placeholder="What's interesting about this and why the team should care."
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
