import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Label } from '@/components/ui/Input';
import { ProfileCard } from '@/components/shared/ProfileCard';
import { useTeam } from '@/hooks/useTeam';
import {
  supabase,
  type DbCohortRating,
  type DbSprint,
  type DbSprintCompletion,
  type DbTeamContact,
  type DbTeamVision,
} from '@/lib/supabase';
import { computeStandings, latestSnapshotDate, rowsForDate } from '@/lib/standings';
import { whatsappLink } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { Linkedin, MessageCircle } from 'lucide-react';
import { PresidentRoleCard } from '@/components/shared/PresidentRole';
import { Badge } from '@/components/ui/Badge';
import { Trophy } from 'lucide-react';

const OUR_TEAM_NAME = 'Breakers Team';

export function Team() {
  const { profiles, loading } = useTeam();
  const [vision, setVision] = useState<DbTeamVision | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftV, setDraftV] = useState('');
  const [draftM, setDraftM] = useState('');
  const [draftWa, setDraftWa] = useState('');
  const [cohort, setCohort] = useState<DbCohortRating[]>([]);
  const [contacts, setContacts] = useState<DbTeamContact[]>([]);
  const [electionPoll, setElectionPoll] = useState<{ id: string; created_at: string } | null>(null);
  const [sprints, setSprints] = useState<DbSprint[]>([]);
  const [completions, setCompletions] = useState<DbSprintCompletion[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('team_vision').select('*').eq('id', 1).maybeSingle();
      setVision((data as DbTeamVision) || null);
      setDraftV(data?.vision || '');
      setDraftM(data?.mission || '');
      setDraftWa(data?.whatsapp_group_url || '');
    })();
    (async () => {
      const { data } = await supabase
        .from('cohort_ratings')
        .select('*')
        .order('recorded_at', { ascending: false });
      setCohort((data as DbCohortRating[]) || []);
    })();
    (async () => {
      const { data } = await supabase
        .from('team_contacts')
        .select('*')
        .eq('team_name', OUR_TEAM_NAME)
        .order('sort_order');
      setContacts((data as DbTeamContact[]) || []);
    })();
    (async () => {
      // Latest president election poll (used to deep-link from the President card)
      const { data } = await supabase
        .from('polls')
        .select('id, created_at')
        .ilike('title', '%president%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setElectionPoll(data as { id: string; created_at: string });
    })();
    (async () => {
      const { data: sps } = await supabase
        .from('sprints')
        .select('*')
        .order('week_number', { ascending: true });
      setSprints((sps as DbSprint[]) || []);
      const { data: cs } = await supabase.from('sprint_completions').select('*');
      setCompletions((cs as DbSprintCompletion[]) || []);
    })();
  }, []);

  const latestDate = latestSnapshotDate(cohort);
  const standings = latestDate ? computeStandings(rowsForDate(cohort, latestDate)) : [];
  const ourRow = standings.find((s) => s.team_name === OUR_TEAM_NAME);
  const totalTeams = standings.length;

  async function saveVision() {
    const { data } = await supabase
      .from('team_vision')
      .update({
        vision: draftV,
        mission: draftM,
        whatsapp_group_url: draftWa.trim() || null,
        updated_at: new Date().toISOString(),
      })
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
          <h1 className="h1">Breakers Team</h1>
          <p className="muted text-sm mt-1">FI Core Program · CEE, Spring 2026 · Working Group</p>
        </div>
        {ourRow && (
          <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-bubble text-primary-deep grid place-items-center">
              <Trophy size={18} />
            </div>
            <div>
              <div className="text-xs text-muted">Current FI Standing</div>
              <div className="font-semibold text-ink">
                #{ourRow.rank} of {totalTeams} ·{' '}
                {ourRow.avg_score == null ? '—' : ourRow.avg_score.toFixed(1)}
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
            <div className="space-y-4">
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
              <div>
                <Label>WhatsApp group invite link</Label>
                <Input
                  value={draftWa}
                  onChange={(e) => setDraftWa(e.target.value)}
                  placeholder="https://chat.whatsapp.com/…"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
              <div>
                <div className="text-xs text-muted mb-1">WhatsApp group</div>
                {vision?.whatsapp_group_url ? (
                  <a
                    href={vision.whatsapp_group_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-sm font-medium hover:bg-[#128C7E]"
                  >
                    <WhatsAppIcon /> Open WhatsApp group
                  </a>
                ) : (
                  <span className="text-sm text-muted">— add your group invite link —</span>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <PresidentRoleCard
        president={profiles.find((p) => p.is_president) ?? null}
        electionPollId={electionPoll?.id ?? null}
        electionDate={electionPoll?.created_at ?? null}
      />

      <SprintStatsCard
        profiles={profiles}
        sprints={sprints}
        completions={completions}
        contactsTotal={contacts.length}
      />

      {contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp directory</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-xs text-muted mb-3">
              All teammates' contacts, including those who haven't joined this app yet.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {contacts.map((c) => {
                const wa = whatsappLink(c.phone);
                const registered = profiles.find(
                  (p) => (p.full_name || '').toLowerCase().trim() === c.member_name.toLowerCase().trim(),
                );
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 bg-white border border-border rounded-lg p-3"
                  >
                    <Avatar name={c.member_name} src={registered?.avatar_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{c.member_name}</div>
                      {c.phone && (
                        <div className="text-xs text-muted">{c.phone}</div>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="w-9 h-9 rounded-lg bg-[#25D366] text-white grid place-items-center hover:bg-[#128C7E]"
                          title={`WhatsApp ${c.phone}`}
                        >
                          <WhatsAppIcon />
                        </a>
                      )}
                      {c.telegram && (
                        <a
                          href={
                            c.telegram.startsWith('http')
                              ? c.telegram
                              : `https://t.me/${c.telegram.replace('@', '')}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="w-9 h-9 rounded-lg border border-border text-muted hover:text-primary-deep hover:bg-bubble grid place-items-center"
                          title="Telegram"
                        >
                          <MessageCircle size={16} />
                        </a>
                      )}
                      {c.linkedin && (
                        <a
                          href={
                            c.linkedin.startsWith('http')
                              ? c.linkedin
                              : `https://linkedin.com/in/${c.linkedin}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="w-9 h-9 rounded-lg border border-border text-muted hover:text-primary-deep hover:bg-bubble grid place-items-center"
                          title="LinkedIn"
                        >
                          <Linkedin size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="h2">Founders</h2>
          <Badge tone="neutral">{profiles.length}</Badge>
        </div>
        {loading ? (
          <div className="text-muted text-sm">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((p) => {
              const contact = contacts.find(
                (c) =>
                  (p.full_name || '').toLowerCase().trim() ===
                  c.member_name.toLowerCase().trim(),
              );
              return (
                <ProfileCard
                  key={p.user_id}
                  profile={p}
                  fallbackPhone={contact?.phone}
                />
              );
            })}
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

function SprintStatsCard({
  profiles,
  sprints,
  completions,
  contactsTotal,
}: {
  profiles: Array<{ user_id: string; full_name: string | null; avatar_url: string | null }>;
  sprints: DbSprint[];
  completions: DbSprintCompletion[];
  contactsTotal: number;
}) {
  const totalSprints = sprints.length;
  const startedSprints = sprints.filter(
    (s) => new Date(s.start_date).getTime() <= Date.now(),
  ).length;
  const doneByUser = new Map<string, number>();
  for (const c of completions) {
    doneByUser.set(c.user_id, (doneByUser.get(c.user_id) ?? 0) + 1);
  }
  const totalCompletionsThisTeam = profiles.reduce(
    (sum, p) => sum + (doneByUser.get(p.user_id) ?? 0),
    0,
  );
  const possibleSlots = profiles.length * startedSprints;
  const teamPct = possibleSlots
    ? Math.round((totalCompletionsThisTeam / possibleSlots) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team &amp; sprint stats</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-bg rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted">Members</div>
            <div className="text-2xl font-bold mt-1">{profiles.length}</div>
            <div className="text-xs text-muted mt-0.5">
              {profiles.length} signed in · {Math.max(0, contactsTotal - profiles.length)} pending
            </div>
          </div>
          <div className="bg-bg rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted">
              Sprints in program
            </div>
            <div className="text-2xl font-bold mt-1">{totalSprints}</div>
            <div className="text-xs text-muted mt-0.5">{startedSprints} started so far</div>
          </div>
          <div className="bg-bg rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted">
              Team completion
            </div>
            <div className="text-2xl font-bold mt-1">{teamPct}%</div>
            <div className="text-xs text-muted mt-0.5">
              {totalCompletionsThisTeam}/{possibleSlots} cells
            </div>
          </div>
          <div className="bg-bg rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted">
              Founders fully on track
            </div>
            <div className="text-2xl font-bold mt-1">
              {
                profiles.filter(
                  (p) => (doneByUser.get(p.user_id) ?? 0) >= startedSprints && startedSprints > 0,
                ).length
              }
              <span className="text-base text-muted ml-1">/ {profiles.length}</span>
            </div>
            <div className="text-xs text-muted mt-0.5">all started sprints completed</div>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-2">
            Per-founder progress
          </div>
          <div className="space-y-2">
            {profiles.map((p) => {
              const done = doneByUser.get(p.user_id) ?? 0;
              const pct = startedSprints
                ? Math.round((done / startedSprints) * 100)
                : 0;
              return (
                <div
                  key={p.user_id}
                  className="flex items-center gap-3 bg-white border border-border rounded-lg px-3 py-2"
                >
                  <div className="flex-1 min-w-0 truncate text-sm">
                    {p.full_name || 'Unnamed'}
                  </div>
                  <div className="flex-1 max-w-[200px]">
                    <div className="h-2 bg-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs font-mono text-muted w-16 text-right">
                    {done}/{startedSprints}
                  </div>
                </div>
              );
            })}
            {!profiles.length && (
              <div className="text-sm text-muted">No registered founders yet.</div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
