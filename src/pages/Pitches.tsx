import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useTeam } from '@/hooks/useTeam';
import { supabase, type DbPitch, type DbPitchFeedback, type PitchStatus } from '@/lib/supabase';
import { avg, formatScore } from '@/lib/utils';
import { BookOpen, Megaphone } from 'lucide-react';

type LatestByUser = Record<
  string,
  { pitch: DbPitch; feedbackCount: number; clarity: number | null; persuasive: number | null }
>;

function statusBadge(s: PitchStatus) {
  if (s === 'ready') return <Badge tone="ok">Ready for review</Badge>;
  if (s === 'reviewed') return <Badge tone="primary">Reviewed</Badge>;
  return <Badge tone="neutral">Draft</Badge>;
}

function HotseatGuide() {
  return (
    <details className="bg-surface border border-border rounded-xl shadow-card group">
      <summary className="cursor-pointer p-5 flex items-center gap-3 list-none [&::-webkit-details-marker]:hidden">
        <div className="w-10 h-10 rounded-lg bg-bubble text-primary-deep grid place-items-center shrink-0">
          <BookOpen size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-ink">Hotseat Guide</div>
          <div className="text-xs text-muted mt-0.5">
            Format, rating rules, and tips for Feedback Pitches. Click to expand.
          </div>
        </div>
        <span className="text-xs text-muted group-open:hidden">Open</span>
        <span className="text-xs text-muted hidden group-open:inline">Close</span>
      </summary>

      <div className="px-5 pb-5 space-y-5 text-sm leading-relaxed text-ink/90">
        <div className="bg-bubble/30 border border-primary/15 rounded-lg p-3 text-sm">
          <strong>Format:</strong> rapid-fire pitches in 1, 3 and 5-minute formats to Mentors and
          Local Leaders. Feedback is prioritised over Q&amp;A. Ratings are 1–5 with{' '}
          <strong>no &lsquo;3&rsquo;</strong> allowed — average ratings give no actionable signal.
          All Co-Founders pitch (yes, even technical ones); slightly different versions per
          person maximise feedback. If a Co-Founder scores below a &lsquo;2&rsquo;, the whole
          team may be assigned an Epic Sprint.
        </div>

        <section>
          <h3 className="font-semibold text-base mb-2">Overview</h3>
          <p className="text-muted mb-2">
            Hotseats start with 1-minute pitches without a deck, transition to 3-minute pitches
            with a deck, and finish with 5-minute deck pitches. You're rated 1–5 and also
            receive verbal feedback. Founder Institute does not allow &lsquo;3&rsquo; as a
            rating — an &lsquo;average&rsquo; rating gives no actionable feedback.
          </p>
          <p className="text-muted mb-2">
            Hotseats focus on receiving feedback rather than a traditional Q&amp;A session.
            Expect tough, blunt and sometimes conflicting feedback on your pitch.
          </p>
          <p className="text-muted">
            You will not pitch every week, but always have your pitch ready — a Director can
            call on you at any session.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-base mb-2">When you have Co-Founders</h3>
          <p className="text-muted">
            All Co-Founders are expected to pitch during Hotseats and Review Sessions —
            including technical Co-Founders. You may all give the same pitch, but it's
            recommended each give slightly different versions to maximise feedback. If a
            Co-Founder doesn't get a minimum &lsquo;2&rsquo;, the whole team may be assigned
            an Epic Sprint.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-base mb-2">1-Minute Hotseat preparation</h3>
          <p className="text-muted mb-2">
            Your first pitch is the 1-minute Hotseat — no deck. Convey your business idea and
            business model succinctly. A minute goes by very quickly: idea-stage Founders tend
            to ramble and generalise; technical Founders try to cram in too much science and
            still leave the audience confused.
          </p>
          <p className="text-muted mb-2">
            <strong>One-sentence pitch:</strong> start with the Madlibs format at{' '}
            <a
              href="https://fi.co/madlibs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-dark hover:underline"
            >
              fi.co/madlibs
            </a>
            . It works equally well for idea-stage companies and companies with early revenue.
            Clarifying problem, audience, and money model in one sentence is harder than it
            sounds — iterate, get feedback, iterate.
          </p>
          <p className="text-muted">
            <strong>Rating feedback:</strong> don't be discouraged by a 1 or 2 on your first
            few Hotseats. Listen to the feedback, iterate, and practise — that matters more
            than the rating right now.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-base mb-2">Top recommendations &amp; tips</h3>
          <ul className="space-y-2 list-none">
            {[
              ['Be yourself.', 'Project your personality — most new startups reflect their Founders.'],
              ['Be confident.', 'Stand tall, project confidence, minimise fidgeting and pacing.'],
              ['Speak clearly.', 'Slowly, audibly, and articulate your name and your business name.'],
              [
                "Don't read.",
                'Never read from notes, phone or laptop. If you believe in your idea, you can explain it without notes.',
              ],
              [
                "Don't use superlatives.",
                'No "first / fastest / best / revolutionary / huge". Avoid adjectives and buzzwords. Use simple, plain explanations.',
              ],
              [
                'Introduce yourself.',
                'Briefly cover your background — especially if it relates to the business you\'re presenting.',
              ],
              [
                'Describe your customer.',
                'Frame the opportunity from the customer\'s perspective: who buys, why they need it, how many of them exist.',
              ],
              [
                'Use data.',
                'A few select data points showing you understand the market — published research plus original Customer Development insights.',
              ],
              [
                'Be brief.',
                'End before time is up rather than cramming. Concise points read as organised and efficient.',
              ],
              [
                'End strong.',
                'Close with an ask — advisor, intro, team member, funding. Repeat company name and tagline so it sticks.',
              ],
            ].map(([head, body]) => (
              <li key={head} className="flex gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span className="text-muted">
                  <strong className="text-ink">{head}</strong> {body}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-xs text-muted">
          See the FI Pitching Guidelines support guide for additional tips on pitching.
        </p>
      </div>
    </details>
  );
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

      <HotseatGuide />

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
