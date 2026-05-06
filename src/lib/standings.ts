import type { DbCohortRating, TeamStanding } from './supabase';

export function computeStandings(rows: DbCohortRating[]): TeamStanding[] {
  const byTeam = new Map<string, DbCohortRating[]>();
  for (const r of rows) {
    if (!byTeam.has(r.team_name)) byTeam.set(r.team_name, []);
    byTeam.get(r.team_name)!.push(r);
  }
  const standings: Omit<TeamStanding, 'rank'>[] = [];
  for (const [team_name, members] of byTeam) {
    const numeric = members
      .map((m) => (m.score == null ? null : Number(m.score)))
      .filter((s): s is number => typeof s === 'number');
    const avg = numeric.length ? numeric.reduce((a, b) => a + b, 0) / numeric.length : null;
    standings.push({
      team_name,
      members: members.slice().sort((a, b) => a.sort_order - b.sort_order),
      avg_score: avg == null ? null : Math.round(avg * 10) / 10,
    });
  }
  // Sort: teams with score desc, then nulls last
  standings.sort((a, b) => {
    if (a.avg_score == null && b.avg_score == null) return a.team_name.localeCompare(b.team_name);
    if (a.avg_score == null) return 1;
    if (b.avg_score == null) return -1;
    return b.avg_score - a.avg_score;
  });
  return standings.map((s, i) => ({ ...s, rank: i + 1 }));
}

export function latestSnapshotDate(rows: DbCohortRating[]): string | null {
  const dates = Array.from(new Set(rows.map((r) => r.recorded_at))).sort();
  return dates[dates.length - 1] ?? null;
}

export function rowsForDate(rows: DbCohortRating[], date: string): DbCohortRating[] {
  return rows.filter((r) => r.recorded_at === date);
}

export function ourTeamHistory(rows: DbCohortRating[], teamName: string) {
  const dates = Array.from(new Set(rows.map((r) => r.recorded_at))).sort();
  return dates.map((d) => {
    const teamRows = rows.filter((r) => r.recorded_at === d && r.team_name === teamName);
    const numeric = teamRows
      .map((m) => (m.score == null ? null : Number(m.score)))
      .filter((s): s is number => typeof s === 'number');
    const avg = numeric.length ? numeric.reduce((a, b) => a + b, 0) / numeric.length : null;
    return { date: d, score: avg == null ? null : Math.round(avg * 10) / 10 };
  });
}
