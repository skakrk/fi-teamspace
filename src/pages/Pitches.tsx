import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useTeam } from '@/hooks/useTeam';
import { supabase, type DbPitch, type DbPitchFeedback, type PitchStatus } from '@/lib/supabase';
import { avg, formatScore } from '@/lib/utils';
import { Megaphone } from 'lucide-react';

type LatestByUser = Record<
  string,
  { pitch: DbPitch; feedbackCount: number; clarity: number | null; persuasive: number | null }
>;

function statusBadge(s: PitchStatus) {
  if (s === 'ready') return <Badge tone="ok">Ready for review</Badge>;
  if (s === 'reviewed') return <Badge tone="primary">Reviewed</Badge>;
  return <Badge tone="neutral">Draft</Badge>;
}

export function Pitches() {
  const { profiles } = useTeam();
  const [latest, setLatest] = useState<LatestByUser>({});

  useEffect(() => {
    (async () => {
      const { data: pitches } = await supabase
        .from('pitches')
        .select('*')
        .order('version', { ascending: false });
      const all = (pitches as DbPitch[]) || [];
      const byUser: Record<string, DbPitch> = {};
      for (const p of all) {
        if (!byUser[p.user_id] || byUser[p.user_id].version < p.version) {
          byUser[p.user_id] = p;
        }
      }
      const ids = Object.values(byUser).map((p) => p.id);
      let feedbacks: DbPitchFeedback[] = [];
      if (ids.length) {
        const { data: fbs } = await supabase
          .from('pitch_feedback')
          .select('*')
          .in('pitch_id', ids);
        feedbacks = (fbs as DbPitchFeedback[]) || [];
      }
      const map: LatestByUser = {};
      for (const userId of Object.keys(byUser)) {
        const pitch = byUser[userId];
        const fb = feedbacks.filter((f) => f.pitch_id === pitch.id);
        map[userId] = {
          pitch,
          feedbackCount: fb.length,
          clarity: avg(fb.map((f) => f.score_clarity)),
          persuasive: avg(fb.map((f) => f.score_persuasive)),
        };
      }
      setLatest(map);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="h1 flex items-center gap-2">
            <Megaphone className="text-primary-dark" size={22} /> Pitches
          </h1>
          <p className="muted text-sm mt-1">
            Each founder iterates a Feedback Pitch weekly. Team gives structured feedback. Open one to review or update.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profiles.map((p) => {
          const l = latest[p.user_id];
          const v = l?.pitch.version ?? null;
          return (
            <Link key={p.user_id} to={`/pitches/${p.user_id}`}>
              <Card className="hover:shadow-pop transition-shadow">
                <CardBody className="flex gap-4 items-start">
                  <Avatar name={p.full_name || '?'} src={p.avatar_url} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink truncate">
                      {p.full_name || 'Unnamed'}
                      {v != null && (
                        <span className="ml-2 text-xs font-normal text-muted">v{v}</span>
                      )}
                    </div>
                    {p.project_name && (
                      <div className="text-xs text-muted truncate">{p.project_name}</div>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {l ? statusBadge(l.pitch.status) : <Badge tone="neutral">No pitch yet</Badge>}
                      {l && (
                        <Badge tone="neutral">
                          {l.feedbackCount} feedback{l.feedbackCount === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </div>
                    {l && (l.clarity != null || l.persuasive != null) && (
                      <div className="text-xs text-muted mt-2">
                        Clarity {formatScore(l.clarity)} · Persuasive {formatScore(l.persuasive)}
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </Link>
          );
        })}
        {!profiles.length && <div className="text-muted text-sm">No founders yet.</div>}
      </div>
    </div>
  );
}
