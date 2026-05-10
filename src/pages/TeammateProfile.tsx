import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { supabase, type DbProfile } from '@/lib/supabase';
import { canProxy, isProxyFilled } from '@/lib/presidentMode';
import { ProxyBadge } from '@/components/shared/ProxyBadge';
import { notifyError } from '@/lib/notify';
import { ShieldCheck } from 'lucide-react';

// President-only proxy form for filling in a teammate's project / collaboration
// fields. For real (registered) teammates, personal contact fields stay
// owner-only. Placeholder profiles allow editing name + email too — they have
// no real owner yet, and the email is what the auto-claim trigger matches on.
const PROXIED_FIELDS = [
  'about_me',
  'project_name',
  'project_description',
  'project_website',
  'project_linkedin',
  'project_twitter',
  'project_instagram',
  'skills',
  'can_help_with',
  'need_help_with',
] as const satisfies ReadonlyArray<keyof DbProfile>;
const PLACEHOLDER_EXTRA_FIELDS = ['full_name', 'email'] as const satisfies ReadonlyArray<
  keyof DbProfile
>;

export function TeammateProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { profiles } = useTeam();
  const myProfile = profiles.find((p) => p.user_id === user?.id);
  const iAmPresident = !!myProfile?.is_president;

  const [target, setTarget] = useState<DbProfile | null>(null);
  const [draft, setDraft] = useState<Partial<DbProfile>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      const t = (data as DbProfile) || null;
      setTarget(t);
      if (t) {
        const d: Partial<DbProfile> = {};
        for (const f of PROXIED_FIELDS) d[f] = t[f] as never;
        if (t.is_placeholder) {
          for (const f of PLACEHOLDER_EXTRA_FIELDS) d[f] = t[f] as never;
        }
        setDraft(d);
      }
    })();
  }, [userId]);

  if (!user) return null;
  if (!iAmPresident) return <Navigate to="/" replace />;
  if (userId === user.id) return <Navigate to="/profile" replace />;
  if (!target) return <div className="text-sm text-muted">Loading…</div>;
  if (!canProxy(target)) {
    return (
      <div className="space-y-4">
        <Link to="/president" className="text-sm text-muted hover:text-ink">
          ← Back to Teammates
        </Link>
        <Card>
          <CardBody>
            <div className="font-medium">{target.full_name || 'Teammate'} fills their own profile.</div>
            <div className="text-sm text-muted mt-1">
              President proxy is disabled for this teammate. They can update their profile in{' '}
              <Link to={`/team/${target.user_id}`} className="text-primary-dark hover:underline">
                their profile page
              </Link>
              .
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  function set<K extends keyof DbProfile>(key: K, val: DbProfile[K]) {
    setDraft((prev) => ({ ...prev, [key]: val }));
  }

  async function save() {
    if (!target || !user) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      filled_by: user.id,
      updated_at: new Date().toISOString(),
    };
    for (const f of PROXIED_FIELDS) payload[f] = draft[f] ?? null;
    if (target.is_placeholder) {
      // Placeholder: also accept name/email — full_name must stay non-null per
      // schema, fall back to existing value or empty string.
      payload.full_name = (draft.full_name as string | undefined) ?? target.full_name ?? '';
      payload.email = (draft.email as string | null | undefined) ?? target.email ?? null;
    }
    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('user_id', target.user_id);
    setSaving(false);
    if (error) {
      notifyError('Save failed', error);
      return;
    }
    setSavedAt(new Date().toLocaleTimeString());
  }

  const fillerName = isProxyFilled(target)
    ? profiles.find((x) => x.user_id === target.filled_by)?.full_name ?? null
    : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/president" className="text-sm text-muted hover:text-ink">
        ← Back to Teammates
      </Link>

      <div className="flex items-center gap-3">
        <Avatar name={target.full_name || '?'} src={target.avatar_url} size="lg" />
        <div className="flex-1">
          <h1 className="h1">{target.full_name || 'Unnamed'}</h1>
          <div className="text-sm text-muted flex items-center gap-2 flex-wrap">
            <Badge tone="warn">
              <ShieldCheck size={11} /> Proxy mode
            </Badge>
            {target.is_placeholder && <Badge tone="warn">placeholder</Badge>}
            {target.is_dropped_out && <Badge tone="bad">dropped out</Badge>}
            {fillerName && <ProxyBadge fillerName={fillerName} />}
            <span>
              {target.is_placeholder
                ? 'Editing on their behalf until they sign up.'
                : 'Editing project / bio fields on their behalf.'}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const next = !target.is_dropped_out;
            if (
              next &&
              !confirm(`Mark "${target.full_name || 'this teammate'}" as dropped out of the cohort?`)
            ) {
              return;
            }
            const { data, error } = await supabase
              .from('profiles')
              .update({
                is_dropped_out: next,
                dropped_out_at: next ? new Date().toISOString() : null,
                filled_by: user.id,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', target.user_id)
              .select()
              .maybeSingle();
            if (error) return notifyError('Could not update teammate status', error);
            if (data) setTarget(data as DbProfile);
          }}
        >
          {target.is_dropped_out ? 'Mark active' : 'Drop out…'}
        </Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-ink/90">
        {target.is_placeholder ? (
          <>
            <strong>Placeholder card.</strong> When someone signs up with the email below, this
            card auto-claims into their account and all the data you've filled here transfers
            over.
          </>
        ) : (
          <>
            Personal fields (name, phone, LinkedIn, email, telegram, twitter, website) are{' '}
            <strong>not editable here</strong> — those belong to the teammate. As soon as they
            edit anything in their own profile, this slot becomes read-only for the President.
          </>
        )}
      </div>

      {target.is_placeholder && (
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <Label>Full name</Label>
              <Input
                value={(draft.full_name as string | undefined) ?? ''}
                onChange={(e) => set('full_name', e.target.value)}
                placeholder="Jane Founder"
              />
            </div>
            <div>
              <Label>Email (auto-claim key)</Label>
              <Input
                type="email"
                value={(draft.email as string | null | undefined) ?? ''}
                onChange={(e) => set('email', e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>About them</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <Label>About</Label>
            <Textarea
              rows={3}
              value={draft.about_me ?? ''}
              onChange={(e) => set('about_me', e.target.value)}
              placeholder="Background, experience, what they bring to the team."
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Their project</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <Label>Project name</Label>
            <Input
              value={draft.project_name ?? ''}
              onChange={(e) => set('project_name', e.target.value)}
            />
          </div>
          <div>
            <Label>Project description</Label>
            <Textarea
              rows={3}
              value={draft.project_description ?? ''}
              onChange={(e) => set('project_description', e.target.value)}
              placeholder="Problem, solution, target customer."
            />
          </div>
          <div>
            <Label>Website</Label>
            <Input
              value={draft.project_website ?? ''}
              onChange={(e) => set('project_website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Project LinkedIn</Label>
              <Input
                value={draft.project_linkedin ?? ''}
                onChange={(e) => set('project_linkedin', e.target.value)}
              />
            </div>
            <div>
              <Label>Project X / Twitter</Label>
              <Input
                value={draft.project_twitter ?? ''}
                onChange={(e) => set('project_twitter', e.target.value)}
              />
            </div>
            <div>
              <Label>Project Instagram</Label>
              <Input
                value={draft.project_instagram ?? ''}
                onChange={(e) => set('project_instagram', e.target.value)}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills &amp; collaboration</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <Label>What they know &amp; can do</Label>
            <Textarea
              rows={2}
              value={draft.skills ?? ''}
              onChange={(e) => set('skills', e.target.value)}
            />
          </div>
          <div>
            <Label>What they can help with</Label>
            <Textarea
              rows={2}
              value={draft.can_help_with ?? ''}
              onChange={(e) => set('can_help_with', e.target.value)}
            />
          </div>
          <div>
            <Label>What they need help with</Label>
            <Textarea
              rows={2}
              value={draft.need_help_with ?? ''}
              onChange={(e) => set('need_help_with', e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save on behalf'}
        </Button>
        {savedAt && <span className="text-sm text-primary-deep">Saved at {savedAt}</span>}
      </div>
    </div>
  );
}
