import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { supabase, type DbProfile } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';

export function MyProfile() {
  const { user } = useAuth();
  const [p, setP] = useState<DbProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setP((data as DbProfile) || null);
    })();
  }, [user]);

  if (!p) return <div className="text-muted text-sm">Loading…</div>;

  function set<K extends keyof DbProfile>(key: K, val: DbProfile[K]) {
    setP((prev) => (prev ? { ...prev, [key]: val } : prev));
  }

  async function save() {
    if (!p) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        about_me: p.about_me,
        project_name: p.project_name,
        project_description: p.project_description,
        skills: p.skills,
        can_help_with: p.can_help_with,
        need_help_with: p.need_help_with,
        email: p.email,
        phone: p.phone,
        linkedin: p.linkedin,
        twitter: p.twitter,
        telegram: p.telegram,
        website: p.website,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', p.user_id);
    setSaving(false);
    if (!error) setSavedAt(new Date().toLocaleTimeString());
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="h1">My Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>About me</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar name={p.full_name || '?'} src={p.avatar_url} size="xl" />
            <div className="flex-1">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input
                id="avatar"
                value={p.avatar_url || ''}
                onChange={(e) => set('avatar_url', e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
          <div>
            <Label>Full name</Label>
            <Input value={p.full_name || ''} onChange={(e) => set('full_name', e.target.value)} />
          </div>
          <div>
            <Label>About me</Label>
            <Textarea
              rows={3}
              value={p.about_me || ''}
              onChange={(e) => set('about_me', e.target.value)}
              placeholder="Background, experience, what you bring to the team."
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About my project</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <Label>Project name</Label>
            <Input
              value={p.project_name || ''}
              onChange={(e) => set('project_name', e.target.value)}
            />
          </div>
          <div>
            <Label>Project description</Label>
            <Textarea
              rows={3}
              value={p.project_description || ''}
              onChange={(e) => set('project_description', e.target.value)}
              placeholder="Problem, solution, target customer."
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills &amp; collaboration</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <Label>What I know and can do</Label>
            <Textarea
              rows={2}
              value={p.skills || ''}
              onChange={(e) => set('skills', e.target.value)}
              placeholder="Marketing, fundraising, Python, design…"
            />
          </div>
          <div>
            <Label>What I can help with</Label>
            <Textarea
              rows={2}
              value={p.can_help_with || ''}
              onChange={(e) => set('can_help_with', e.target.value)}
            />
          </div>
          <div>
            <Label>What I need help with</Label>
            <Textarea
              rows={2}
              value={p.need_help_with || ''}
              onChange={(e) => set('need_help_with', e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacts &amp; social</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input value={p.email || ''} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={p.phone || ''} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div>
              <Label>LinkedIn</Label>
              <Input
                value={p.linkedin || ''}
                onChange={(e) => set('linkedin', e.target.value)}
                placeholder="username or full URL"
              />
            </div>
            <div>
              <Label>Telegram</Label>
              <Input
                value={p.telegram || ''}
                onChange={(e) => set('telegram', e.target.value)}
                placeholder="@handle"
              />
            </div>
            <div>
              <Label>Twitter / X</Label>
              <Input value={p.twitter || ''} onChange={(e) => set('twitter', e.target.value)} />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={p.website || ''} onChange={(e) => set('website', e.target.value)} />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
        {savedAt && <span className="text-sm text-primary-deep">Saved at {savedAt}</span>}
      </div>
    </div>
  );
}
