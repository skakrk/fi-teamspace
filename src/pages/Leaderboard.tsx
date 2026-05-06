import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Medal,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
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
import { supabase, type DbCohortRating } from '@/lib/supabase';
import {
  computeStandings,
  latestSnapshotDate,
  ourTeamHistory,
  rowsForDate,
} from '@/lib/standings';

export const OUR_TEAM = 'Breakers Team';

// Score → color band. FI scores roughly span 0–5.
function scoreColor(score: number | null) {
  if (score == null) return { bg: 'bg-bg', text: 'text-muted', ring: '' };
  if (score >= 2.5) return { bg: 'bg-ok/10', text: 'text-ok', ring: 'ring-ok/20' };
  if (score >= 1.5) return { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-300/30' };
  return { bg: 'bg-bad/10', text: 'text-bad', ring: 'ring-bad/20' };
}

// Medal styles for top 3
function rankStyle(rank: number, ours: boolean) {
  if (ours) {
    return {
      pill: 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30',
      icon: null as React.ReactNode,
    };
  }
  if (rank === 1) {
    return {
      pill: 'bg-gradient-to-br from-amber-300 to-amber-500 text-white',
      icon: <Medal size={16} />,
    };
  }
  if (rank === 2) {
    return {
      pill: 'bg-gradient-to-br from-slate-300 to-slate-400 text-white',
      icon: <Medal size={16} />,
    };
  }
  if (rank === 3) {
    return {
      pill: 'bg-gradient-to-br from-orange-300 to-orange-500 text-white',
      icon: <Medal size={16} />,
    };
  }
  return {
    pill: 'bg-bg text-ink',
    icon: null as React.ReactNode,
  };
}

export function Leaderboard() {
  const [rows, setRows] = useState<DbCohortRating[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [snapshotDate, setSnapshotDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [OUR_TEAM]: true });

  async function reload() {
    const { data } = await supabase
      .from('cohort_ratings')
      .select('*')
      .order('recorded_at', { ascending: false })
      .order('sort_order', { ascending: true });
    setRows((data as DbCohortRating[]) || []);
  }

  useEffect(() => {
    reload();
  }, []);

  const latest = latestSnapshotDate(rows);
  const standings = useMemo(
    () => (latest ? computeStandings(rowsForDate(rows, latest)) : []),
    [rows, latest],
  );
  const history = useMemo(() => ourTeamHistory(rows, OUR_TEAM), [rows]);
  const previousDate = useMemo(() => {
    const dates = Array.from(new Set(rows.map((r) => r.recorded_at))).sort();
    return dates.length >= 2 ? dates[dates.length - 2] : null;
  }, [rows]);
  const previousStandings = useMemo(
    () => (previousDate ? computeStandings(rowsForDate(rows, previousDate)) : []),
    [rows, previousDate],
  );

  const ourStanding = standings.find((s) => s.team_name === OUR_TEAM);
  const totalFounders = standings.reduce((sum, s) => sum + s.members.length, 0);
  const totalRated = standings.reduce(
    (sum, s) => sum + s.members.filter((m) => m.score != null).length,
    0,
  );

  function trendFor(team: string): 'up' | 'down' | 'flat' | null {
    const cur = standings.find((s) => s.team_name === team);
    const prev = previousStandings.find((s) => s.team_name === team);
    if (!cur || !prev) return null;
    if (cur.rank < prev.rank) return 'up';
    if (cur.rank > prev.rank) return 'down';
    return 'flat';
  }

  function openEditor(forDate?: string) {
    const targetDate = forDate ?? format(new Date(), 'yyyy-MM-dd');
    setSnapshotDate(targetDate);
    const sourceDate = rows.some((r) => r.recorded_at === targetDate) ? targetDate : latest;
    const source = sourceDate ? rowsForDate(rows, sourceDate) : [];
    const map: Record<string, string> = {};
    for (const r of source) {
      const key = `${r.team_name}|${r.member_name}`;
      map[key] = r.score == null ? '' : String(r.score);
    }
    setDrafts(map);
    setEditOpen(true);
  }

  async function save() {
    if (!latest) return;
    const template = rowsForDate(rows, latest);
    const inserts = template.map((t) => {
      const key = `${t.team_name}|${t.member_name}`;
      const raw = drafts[key];
      const score = raw && raw.trim() !== '' ? Number(raw) : null;
      return {
        recorded_at: snapshotDate,
        team_name: t.team_name,
        member_name: t.member_name,
        score,
        sort_order: t.sort_order,
      };
    });
    await supabase.from('cohort_ratings').delete().eq('recorded_at', snapshotDate);
    if (inserts.length) await supabase.from('cohort_ratings').insert(inserts);
    setEditOpen(false);
    await reload();
  }

  return (
    <div className="space-y-6">
      {/* === HEADER === */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="h1 flex items-center gap-2">
            <Trophy className="text-primary-dark" size={22} /> FI Leaderboard
          </h1>
          <p className="muted text-sm mt-1">
            Team score = average of rated founders (members marked N/A are excluded).
          </p>
        </div>
        <Button onClick={() => openEditor()}>+ New snapshot</Button>
      </div>

      {!latest && (
        <Card>
          <CardBody className="text-sm text-muted">
            No snapshots yet. Click "New snapshot" to record the first one.
          </CardBody>
        </Card>
      )}

      {/* === HERO STATS BANNER === */}
      {latest && ourStanding && (
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white p-6 shadow-xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_top_right,white_0%,transparent_60%)]" />
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Our position</div>
              <div className="text-5xl font-bold mt-1 leading-none">
                #{ourStanding.rank}
                <span className="text-xl opacity-60 ml-1">/ {standings.length}</span>
              </div>
              {(() => {
                const trend = trendFor(OUR_TEAM);
                if (!trend) return null;
                return (
                  <div className="text-xs mt-2 inline-flex items-center gap-1 opacity-90">
                    {trend === 'up' && (
                      <>
                        <TrendingUp size={12} /> moved up vs last snapshot
                      </>
                    )}
                    {trend === 'down' && (
                      <>
                        <TrendingDown size={12} /> moved down vs last snapshot
                      </>
                    )}
                    {trend === 'flat' && (
                      <>
                        <Minus size={12} /> same as last snapshot
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Score</div>
              <div className="text-5xl font-bold mt-1 leading-none font-mono">
                {ourStanding.avg_score == null ? '—' : ourStanding.avg_score.toFixed(1)}
              </div>
              <div className="text-xs opacity-70 mt-2">goal: top 2 · 2.0+</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Founders</div>
              <div className="text-5xl font-bold mt-1 leading-none">
                {totalRated}
                <span className="text-xl opacity-60">/ {totalFounders}</span>
              </div>
              <div className="text-xs opacity-70 mt-2">rated cohort-wide</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Snapshot</div>
              <div className="text-base font-semibold mt-2">
                {format(new Date(latest), 'MMM d, yyyy')}
              </div>
              <button
                onClick={() => openEditor(latest)}
                className="text-xs underline opacity-80 hover:opacity-100 mt-1"
              >
                Edit this snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === STANDINGS === */}
      {latest && (
        <Card>
          <CardHeader>
            <CardTitle>Standings</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2.5">
            {standings.map((t) => {
              const ours = t.team_name === OUR_TEAM;
              const open = expanded[t.team_name] ?? false;
              const trend = trendFor(t.team_name);
              const rs = rankStyle(t.rank, ours);
              const sc = scoreColor(t.avg_score);
              return (
                <div
                  key={t.team_name}
                  className={
                    'rounded-xl border transition-all bg-white ' +
                    (ours
                      ? 'border-primary/40 shadow-md shadow-primary/5'
                      : 'border-border hover:shadow-card')
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((s) => ({ ...s, [t.team_name]: !open }))
                    }
                    className="flex items-center gap-3 p-3.5 w-full text-left"
                  >
                    <span className="text-muted">
                      {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                    <div
                      className={
                        'w-11 h-11 rounded-full grid place-items-center font-bold ' +
                        rs.pill
                      }
                    >
                      {rs.icon ? rs.icon : t.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base">{t.team_name}</span>
                        {ours && <Badge tone="primary">Us</Badge>}
                        {trend === 'up' && (
                          <span className="text-ok inline-flex items-center gap-0.5 text-xs">
                            <TrendingUp size={12} />
                          </span>
                        )}
                        {trend === 'down' && (
                          <span className="text-bad inline-flex items-center gap-0.5 text-xs">
                            <TrendingDown size={12} />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {t.members.length} founder{t.members.length === 1 ? '' : 's'} ·{' '}
                        {t.members.filter((m) => m.score != null).length} rated
                      </div>
                    </div>
                    <div
                      className={
                        'flex items-baseline gap-1 px-3 py-1.5 rounded-lg font-mono ' +
                        sc.bg +
                        ' ' +
                        sc.text
                      }
                    >
                      <span className="text-2xl font-bold">
                        {t.avg_score == null ? '—' : t.avg_score.toFixed(1)}
                      </span>
                    </div>
                  </button>

                  {open && (
                    <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                      {t.members.map((m) => {
                        const memSc = scoreColor(m.score);
                        return (
                          <div
                            key={m.id}
                            className={
                              'flex items-center justify-between rounded-lg px-3 py-2 border transition-colors ' +
                              (m.score == null
                                ? 'bg-bg/40 border-border/40'
                                : 'bg-white border-border/60 hover:border-primary/40')
                            }
                          >
                            <span className="truncate text-ink">{m.member_name}</span>
                            <span
                              className={
                                'font-mono font-semibold tabular-nums px-2 py-0.5 rounded ' +
                                memSc.bg +
                                ' ' +
                                memSc.text
                              }
                            >
                              {m.score == null ? 'N/A' : Number(m.score).toFixed(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      {/* === HISTORY CHART === */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Breakers score history</CardTitle>
          </CardHeader>
          <CardBody>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <AreaChart
                  data={history.map((h) => ({
                    date: format(new Date(h.date), 'MMM d'),
                    score: h.score,
                  }))}
                  margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#25D366" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#25D366" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f1f5f4" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 5]}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#128C7E"
                    strokeWidth={2.5}
                    fill="url(#scoreGradient)"
                    dot={{ r: 4, fill: '#25D366', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#25D366', strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      )}

      <Dialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Snapshot scores"
        description="Enter each founder's current FI rating. Leave blank for N/A."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-auto pr-1">
          <div>
            <Label>Snapshot date</Label>
            <Input
              type="date"
              value={snapshotDate}
              onChange={(e) => setSnapshotDate(e.target.value)}
            />
          </div>
          {!latest && (
            <div className="text-sm text-muted">
              No template yet — please run the seed first to populate the team list.
            </div>
          )}
          {latest && (
            <SnapshotEditorRows
              templateRows={rowsForDate(rows, latest)}
              drafts={drafts}
              setDrafts={setDrafts}
            />
          )}
        </div>
      </Dialog>
    </div>
  );
}

function SnapshotEditorRows({
  templateRows,
  drafts,
  setDrafts,
}: {
  templateRows: DbCohortRating[];
  drafts: Record<string, string>;
  setDrafts: (next: Record<string, string>) => void;
}) {
  const byTeam = templateRows.reduce<Record<string, DbCohortRating[]>>((acc, r) => {
    (acc[r.team_name] ??= []).push(r);
    return acc;
  }, {});
  return (
    <>
      {Object.entries(byTeam).map(([team, members]) => (
        <div key={team} className="space-y-1.5">
          <div className="text-sm font-semibold flex items-center gap-2">
            {team}
            {team === OUR_TEAM && <Badge tone="primary">Us</Badge>}
          </div>
          <div className="space-y-1.5">
            {members
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((m) => {
                const key = `${m.team_name}|${m.member_name}`;
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className="flex-1 text-sm">{m.member_name}</div>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="N/A"
                      className="w-24"
                      value={drafts[key] ?? ''}
                      onChange={(e) => setDrafts({ ...drafts, [key]: e.target.value })}
                    />
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </>
  );
}
