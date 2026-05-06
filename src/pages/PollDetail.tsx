import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import {
  supabase,
  type DbPoll,
  type DbPollOption,
  type DbVote,
} from '@/lib/supabase';
import { PresidentRoleCard } from '@/components/shared/PresidentRole';
import { notifyError } from '@/lib/notify';

export function PollDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profiles } = useTeam();
  const [poll, setPoll] = useState<DbPoll | null>(null);
  const [options, setOptions] = useState<DbPollOption[]>([]);
  const [votes, setVotes] = useState<DbVote[]>([]);
  const [picked, setPicked] = useState<string | null>(null);

  async function reload() {
    if (!id) return;
    const { data: p } = await supabase.from('polls').select('*').eq('id', id).maybeSingle();
    setPoll((p as DbPoll) || null);
    const { data: o } = await supabase
      .from('poll_options')
      .select('*')
      .eq('poll_id', id)
      .order('sort_order');
    setOptions((o as DbPollOption[]) || []);
    const { data: v } = await supabase.from('votes').select('*').eq('poll_id', id);
    setVotes((v as DbVote[]) || []);
  }
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const myVote = votes.find((v) => v.user_id === user?.id);
  const totalVotes = votes.length;
  const isClosed =
    poll?.status === 'closed' ||
    (poll?.deadline && new Date(poll.deadline).getTime() < Date.now());
  const showResults = !!myVote || !!isClosed;

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of options) map[o.id] = 0;
    for (const v of votes) map[v.option_id] = (map[v.option_id] ?? 0) + 1;
    return map;
  }, [options, votes]);

  async function vote() {
    if (!user || !id || !picked) return;
    if (myVote) {
      await supabase
        .from('votes')
        .delete()
        .eq('poll_id', id)
        .eq('user_id', user.id);
    }
    await supabase.from('votes').insert({ poll_id: id, option_id: picked, user_id: user.id });
    setPicked(null);
    await reload();
  }

  async function close() {
    if (!id) return;
    await supabase.from('polls').update({ status: 'closed' }).eq('id', id);
    await reload();
  }

  async function declarePresident(optionLabel: string) {
    const winner = profiles.find((p) => p.full_name === optionLabel);
    if (!winner) return;
    await supabase.from('profiles').update({ is_president: false }).neq('user_id', winner.user_id);
    await supabase.from('profiles').update({ is_president: true }).eq('user_id', winner.user_id);
    alert(`${optionLabel} is now the President.`);
  }

  async function deletePoll() {
    if (!id || !poll) return;
    if (!confirm(`Delete poll "${poll.title}" permanently? All votes will be lost.`)) return;
    const { error } = await supabase.from('polls').delete().eq('id', id);
    if (error) {
      notifyError('Could not delete poll', error);
      return;
    }
    navigate('/polls');
  }

  if (!poll) return <div className="text-muted text-sm">Loading…</div>;

  const winner = options
    .slice()
    .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))[0];

  const isPresidentElection = poll.title.toLowerCase().includes('president');

  return (
    <div className="space-y-6 max-w-2xl">
      <Link to="/polls" className="text-sm text-muted hover:text-ink">
        ← Back to polls
      </Link>

      {isPresidentElection && <PresidentRoleCard />}

      <Card>
        <CardHeader>
          <div className="flex items-start gap-2 flex-wrap">
            <CardTitle>{poll.title}</CardTitle>
            <div className="ml-auto flex gap-2 flex-wrap items-center">
              <Badge tone={isClosed ? 'neutral' : 'ok'}>
                {isClosed ? 'closed' : 'open'}
              </Badge>
              {poll.is_anonymous && <Badge tone="neutral">Anonymous</Badge>}
              {user?.id === poll.created_by && (
                <Button size="sm" variant="ghost" onClick={deletePoll} title="Delete poll">
                  <Trash2 size={14} className="text-bad" />
                </Button>
              )}
            </div>
          </div>
          {poll.description && (
            <p className="text-sm text-muted mt-2 whitespace-pre-line">{poll.description}</p>
          )}
          {poll.deadline && (
            <p className="text-xs text-muted mt-1">
              Deadline: {format(new Date(poll.deadline), 'PPP HH:mm')}
            </p>
          )}
        </CardHeader>
        <CardBody className="space-y-3">
          {options.map((o) => {
            const c = counts[o.id] ?? 0;
            const pct = totalVotes ? Math.round((c / totalVotes) * 100) : 0;
            const mine = myVote?.option_id === o.id;
            if (showResults) {
              return (
                <div key={o.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium">
                      {o.label} {mine && <span className="text-primary-dark text-xs">· your vote</span>}
                    </div>
                    <div className="text-muted text-xs">
                      {c} vote{c === 1 ? '' : 's'} · {pct}%
                    </div>
                  </div>
                  <div className="h-2 bg-bg rounded-full overflow-hidden">
                    <div
                      className={mine ? 'h-full bg-primary' : 'h-full bg-primary-dark/60'}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            }
            return (
              <label
                key={o.id}
                className={
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ' +
                  (picked === o.id
                    ? 'border-primary bg-bubble/40'
                    : 'border-border hover:border-primary/40')
                }
              >
                <input
                  type="radio"
                  name="opt"
                  checked={picked === o.id}
                  onChange={() => setPicked(o.id)}
                />
                <div className="text-sm font-medium">{o.label}</div>
              </label>
            );
          })}

          {!showResults && (
            <Button onClick={vote} disabled={!picked}>
              Submit vote
            </Button>
          )}

          {showResults && !isClosed && user?.id === poll.created_by && (
            <Button variant="outline" onClick={close}>
              Close poll
            </Button>
          )}

          {isClosed && winner && poll.title.toLowerCase().includes('president') && (
            <div className="border-t border-border pt-4">
              <div className="text-sm text-muted mb-2">
                Winner: <strong className="text-ink">{winner.label}</strong>
              </div>
              {user?.id === poll.created_by && (
                <Button onClick={() => declarePresident(winner.label)}>
                  Declare President
                </Button>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="text-sm text-muted">
        {totalVotes} of {profiles.length} voted
      </div>
    </div>
  );
}
