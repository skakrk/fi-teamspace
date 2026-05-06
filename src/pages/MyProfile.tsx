import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { supabase, type DbProfile } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { notifyError } from '@/lib/notify';
import { uploadImage } from '@/lib/storage';

export function MyProfile() {
  const { user } = useAuth();
  const [p, setP] = useState<DbProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'avatar' | 'logo' | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        notifyError('Loading profile failed', error);
        return;
      }
      if (data) {
        setP(data as DbProfile);
        return;
      }
      // Profile missing (signup trigger may not have run) — create on the fly
      const { data: created, error: insErr } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          full_name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || '',
          email: user.email,
        })
        .select()
        .single();
      if (insErr) {
        notifyError('Could not initialize profile', insErr);
      } else if (created) {
        setP(created as DbProfile);
      }
    })();
  }, [user]);

  if (!p) return <div className="text-muted text-sm">Loading your profile…</div>;

  function set<K extends keyof DbProfile>(key: K, val: DbProfile[K]) {
    setP((prev) => (prev ? { ...prev, [key]: val } : prev));
  }

  async function handleUpload(
    bucket: 'avatars' | 'project-logos',
    file: File,
    field: 'avatar_url' | 'project_logo_url',
  ) {
    if (!user) return;
    setUploading(bucket === 'avatars' ? 'avatar' : 'logo');
    const result = await uploadImage(bucket, user.id, file);
    setUploading(null);
    if ('error' in result) {
      notifyError('Upload failed', result.error);
      return;
    }
    set(field, result.url);
    // Persist immediately so the user doesn't lose the upload
    await supabase
      .from('profiles')
      .update({ [field]: result.url, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
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
        project_logo_url: p.project_logo_url,
        project_website: p.project_website,
        project_linkedin: p.project_linkedin,
        project_twitter: p.project_twitter,
        project_instagram: p.project_instagram,
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
    if (error) {
      notifyError('Save failed', error);
    } else {
      setSavedAt(new Date().toLocaleTimeString());
    }
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
            <div className="flex-1 space-y-2">
              <Label>Avatar</Label>
              <div className="flex gap-2 flex-wrap">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload('avatars', f, 'avatar_url');
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploading === 'avatar'}
                >
                  <Upload size={14} />
                  {uploading === 'avatar' ? 'Uploading…' : 'Upload image'}
                </Button>
                {p.avatar_url && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => set('avatar_url', null)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <Input
                value={p.avatar_url || ''}
                onChange={(e) => set('avatar_url', e.target.value)}
                placeholder="…or paste an image URL"
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
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-xl border border-border bg-bg overflow-hidden grid place-items-center flex-shrink-0">
              {p.project_logo_url ? (
                <img
                  src={p.project_logo_url}
                  alt="Project logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-muted text-center px-2">No logo</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Label>Project logo</Label>
              <div className="flex gap-2 flex-wrap">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload('project-logos', f, 'project_logo_url');
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploading === 'logo'}
                >
                  <Upload size={14} />
                  {uploading === 'logo' ? 'Uploading…' : 'Upload logo'}
                </Button>
                {p.project_logo_url && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => set('project_logo_url', null)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <Input
                value={p.project_logo_url || ''}
                onChange={(e) => set('project_logo_url', e.target.value)}
                placeholder="…or paste a logo image URL"
              />
            </div>
          </div>

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
          <div>
            <Label>Website</Label>
            <Input
              value={p.project_website || ''}
              onChange={(e) => set('project_website', e.target.value)}
              placeholder="https://yourcompany.com"
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Project LinkedIn</Label>
              <Input
                value={p.project_linkedin || ''}
                onChange={(e) => set('project_linkedin', e.target.value)}
                placeholder="company-handle or full URL"
              />
            </div>
            <div>
              <Label>Project X / Twitter</Label>
              <Input
                value={p.project_twitter || ''}
                onChange={(e) => set('project_twitter', e.target.value)}
                placeholder="@yourcompany"
              />
            </div>
            <div>
              <Label>Project Instagram</Label>
              <Input
                value={p.project_instagram || ''}
                onChange={(e) => set('project_instagram', e.target.value)}
                placeholder="@yourcompany"
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
