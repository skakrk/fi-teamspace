import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea, Label } from '@/components/ui/Input';
import { ProfileCard } from '@/components/shared/ProfileCard';
import { useTeam } from '@/hooks/useTeam';
import { supabase, type DbLeaderboard, type DbTeamVision } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { TrophyIcon } from '@/components/icons/StartupIcons';

const OUR_TEAM_NAME = 'Team Breakers';

export function Team() {
  const { profiles, loading } = useTeam();
  const [vision, setVision] = useState<DbTeamVision | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftV, setDraftV] = useState('');
  const [draftM, setDraftM] = useState('');
  const [board, setBoard] = useState<DbLeaderboard[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('team_vision').select('*').eq('id', 1).maybeSingle();
      setVision((data as DbTeamVision) || null);
      setDraftV(data?.vision || '');
      setDraftM(data?.mission || '');
    })();
    (async () => {
      const { data } = await supabase
        .from('fi_leaderboard')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(20);
      const rows = (data as DbLeaderboard[]) || [];
      const latestDate = rows[0]?.recorded_at;
      setBoard(rows.filter((r) => r.recorded_at === latestDate));
    })();
  }, []);

  const ourRow = board.find((b) => b.team_name === OUR_TEAM_NAME);

  async function saveVision() {
    const { data } = await supabase
      .from('team_vision')
      .update({ vision: draftV, mission: draftM, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .maybeSingle();
    setVision((data as DbTeamVision) || vision);
    setEditing(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="h1">Team Breakers</h1>
          <p className="muted text-sm mt-1">FI Core Program · CEE, Spring 2026 · Working Group</p>
        </div>
        {ourRow && (
          <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-bubble text-primary-deep grid place-items-center">
              <TrophyIcon width={18} height={18} />
            </div>
            <div>
              <div className="text-xs text-muted">Current FI Standing</div>
              <div className="font-semibold text-ink">
                #{ourRow.rank} · score {Number(ourRow.score).toFixed(1)}
              </div>
            </div>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Vision &amp; Mission</CardTitle>
          {!editing ? (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveVision}>
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardBody>
          {editing ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Vision</Label>
                <Textarea value={draftV} onChange={(e) => setDraftV(e.target.value)} rows={4} />
              </div>
              <div>
                <Label>Mission</Label>
                <Textarea value={draftM} onChange={(e) => setDraftM(e.target.value)} rows={4} />
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted mb-1">Vision</div>
                <div className="text-sm whitespace-pre-line">
                  {vision?.vision || <span className="text-muted">— not set yet —</span>}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted mb-1">Mission</div>
                <div className="text-sm whitespace-pre-line">
                  {vision?.mission || <span className="text-muted">— not set yet —</span>}
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="h2">Founders</h2>
          <Badge tone="neutral">{profiles.length}</Badge>
        </div>
        {loading ? (
          <div className="text-muted text-sm">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((p) => (
              <ProfileCard key={p.user_id} profile={p} />
            ))}
            {!profiles.length && (
              <div className="text-muted text-sm col-span-full">
                No founders yet. Invite teammates to sign up.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
