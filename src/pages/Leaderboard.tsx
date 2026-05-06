import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { supabase, type DbLeaderboard } from '@/lib/supabase';
import { TrophyIcon } from '@/components/icons/StartupIcons';

const OUR_TEAM = 'Team Breakers';

export function Leaderboard() {
  const [rows, setRows] = useState<DbLeaderboard[]>([]);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [drafts, setDrafts] = useState<{ team: string; score: string; rank: string }[]>([
    { team: 'Team Хамелеонов', score: '', rank: '' },
    { team: 'Team Альф', score: '', rank: '' },
    { team: 'Team Breakers', score: '', rank: '' },
    { team: 'Team Бластеров', score: '', rank: '' },
    { team: 'Team Капитанов', score: '', rank: '' },
  ]);

  async function reload() {
    const { data } = await supabase
      .from('fi_leaderboard')
      .select('*')
      .order('recorded_at', { ascending: false });
    setRows((data as DbLeaderboard[]) || []);
  }
  useEffect(() => {
    reload();
  }, []);

  const dates = Array.from(new Set(rows.map((r) => r.recorded_at))).sort();
  const ourSeries = dates.map((d) => {
    const r = rows.find((x) => x.recorded_at === d && x.team_name === OUR_TEAM);
    return { date: format(new Date(d), 'MMM d'), score: r ? Number(r.score) : null };
  });
  const latest = rows.filter((r) => r.recorded_at === dates[dates.length - 1]);
  const sortedLatest = [...latest].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  async function save() {
    const recorded_at = date;
    const inserts = drafts
      .filter((d) => d.team && d.score)
      .map((d) => ({
        recorded_at,
        team_name: d.team,
        score: Number(d.score),
        rank: d.rank ? Number(d.rank) : null,
      }));
    if (!inserts.length) return;
    await supabase.from('fi_leaderboard').delete().eq('recorded_at', recorded_at);
    await supabase.from('fi_leaderboard').insert(inserts);
    setOpen(false);
    await reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="h1 flex items-center gap-2">
            <TrophyIcon className="text-primary-dark" /> FI Leaderboard
          </h1>
          <p className="muted text-sm mt-1">
            Track our team's standing across cohort weeks. Update after each FI rating refresh.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Record snapshot</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest standings</CardTitle>
        </CardHeader>
        <CardBody>
          {sortedLatest.length === 0 && (
            <div className="text-muted text-sm">No snapshots yet.</div>
          )}
          <div className="space-y-2">
            {sortedLatest.map((r) => {
              const ours = r.team_name === OUR_TEAM;
              return (
                <div
                  key={r.id}
                  className={
                    'flex items-center gap-3 p-3 rounded-lg border ' +
                    (ours ? 'bg-bubble border-primary/30' : 'bg-white border-border')
                  }
                >
                  <div className="w-8 h-8 rounded-full bg-bg grid place-items-center font-bold text-sm">
                    {r.rank ?? '?'}
                  </div>
                  <div className="flex-1 font-medium">{r.team_name}</div>
                  {ours && <Badge tone="primary">Us</Badge>}
                  <div className="font-mono text-sm">{Number(r.score).toFixed(1)}</div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Our score over time</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={ourSeries}>
                <CartesianGrid stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#128C7E"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#25D366' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Record leaderboard snapshot"
        description="Enter all five team scores from FI."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_80px_60px] gap-2 text-xs text-muted">
              <div>Team</div>
              <div>Score</div>
              <div>Rank</div>
            </div>
            {drafts.map((d, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_60px] gap-2">
                <Input
                  value={d.team}
                  onChange={(e) => {
                    const next = [...drafts];
                    next[i] = { ...next[i], team: e.target.value };
                    setDrafts(next);
                  }}
                />
                <Input
                  type="number"
                  step="0.1"
                  value={d.score}
                  onChange={(e) => {
                    const next = [...drafts];
                    next[i] = { ...next[i], score: e.target.value };
                    setDrafts(next);
                  }}
                />
                <Input
                  type="number"
                  value={d.rank}
                  onChange={(e) => {
                    const next = [...drafts];
                    next[i] = { ...next[i], rank: e.target.value };
                    setDrafts(next);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
