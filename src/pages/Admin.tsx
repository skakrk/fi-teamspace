import { useEffect, useState } from 'react';
import { Crown, Trash2, Plus, Shield } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import {
  supabase,
  type DbProfile,
  type DbTeamContact,
} from '@/lib/supabase';
import { notifyError } from '@/lib/notify';
import { isAdmin } from '@/lib/admin';

const OUR_TEAM = 'Breakers Team';

export function Admin() {
  const { user } = useAuth();
  const { profiles, loading } = useTeam();
  const [contacts, setContacts] = useState<DbTeamContact[]>([]);
  const [contactDraft, setContactDraft] = useState({
    member_name: '',
    phone: '',
    linkedin: '',
    telegram: '',
  });

  async function reloadContacts() {
    const { data } = await supabase
      .from('team_contacts')
      .select('*')
      .eq('team_name', OUR_TEAM)
      .order('sort_order');
    setContacts((data as DbTeamContact[]) || []);
  }

  useEffect(() => {
    reloadContacts();
  }, []);

  if (!isAdmin(user)) {
    return (
      <Card>
        <CardBody className="text-center py-8">
          <Shield size={32} className="mx-auto text-muted mb-2" />
          <div className="font-semibold">Admin only</div>
          <div className="text-sm text-muted mt-1">
            This page is reserved for the system administrator.
          </div>
        </CardBody>
      </Card>
    );
  }

  async function setPresident(profile: DbProfile, makePresident: boolean) {
    if (makePresident) {
      // Unset all others first
      const { error: unsetErr } = await supabase
        .from('profiles')
        .update({ is_president: false })
        .neq('user_id', profile.user_id);
      if (unsetErr) return notifyError('Could not clear previous president', unsetErr);
    }
    const { error } = await supabase
      .from('profiles')
      .update({ is_president: makePresident })
      .eq('user_id', profile.user_id);
    if (error) return notifyError('Could not update president flag', error);
    window.location.reload();
  }

  async function deleteProfile(profile: DbProfile) {
    if (
      !confirm(
        `Delete profile for ${profile.full_name || profile.email}?\n\n` +
          'Removes the user from this app (team list, ratings, pitches, etc). ' +
          'The auth account stays — to fully revoke login, delete it from the Supabase Auth dashboard.',
      )
    )
      return;
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', profile.user_id);
    if (error) return notifyError('Could not delete profile', error);
    window.location.reload();
  }

  async function addContact() {
    if (!contactDraft.member_name.trim()) return;
    const { error } = await supabase.from('team_contacts').insert({
      team_name: OUR_TEAM,
      member_name: contactDraft.member_name.trim(),
      phone: contactDraft.phone.trim() || null,
      linkedin: contactDraft.linkedin.trim() || null,
      telegram: contactDraft.telegram.trim() || null,
      sort_order: contacts.length + 1,
    });
    if (error) return notifyError('Could not add contact', error);
    setContactDraft({ member_name: '', phone: '', linkedin: '', telegram: '' });
    await reloadContacts();
  }

  async function deleteContact(c: DbTeamContact) {
    if (!confirm(`Remove ${c.member_name} from contacts?`)) return;
    const { error } = await supabase.from('team_contacts').delete().eq('id', c.id);
    if (error) return notifyError('Could not delete contact', error);
    await reloadContacts();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1 flex items-center gap-2">
          <Shield className="text-primary-dark" size={22} /> Admin
        </h1>
        <p className="muted text-sm mt-1">
          Visible only to {user?.email}. Use carefully.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered users ({profiles.length})</CardTitle>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="text-sm text-muted">Loading…</div>
          ) : (
            <div className="divide-y divide-border">
              {profiles.map((p) => (
                <div
                  key={p.user_id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 flex-wrap"
                >
                  <Avatar name={p.full_name || '?'} src={p.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">
                        {p.full_name || 'Unnamed'}
                      </span>
                      {p.is_president && (
                        <Badge tone="primary">
                          <Crown size={11} /> President
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted truncate">{p.email}</div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {p.is_president ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPresident(p, false)}
                      >
                        Remove president
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPresident(p, true)}
                      >
                        <Crown size={14} /> Make president
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteProfile(p)}
                      title="Delete profile"
                    >
                      <Trash2 size={14} className="text-bad" />
                    </Button>
                  </div>
                </div>
              ))}
              {!profiles.length && (
                <div className="text-sm text-muted">No registered users yet.</div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team contacts (pre-seeded directory)</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 bg-bg rounded-lg px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.member_name}</div>
                  {c.phone && <div className="text-xs text-muted">{c.phone}</div>}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteContact(c)}
                  title="Remove"
                >
                  <Trash2 size={14} className="text-bad" />
                </Button>
              </div>
            ))}
            {!contacts.length && (
              <div className="text-sm text-muted col-span-full">No contacts.</div>
            )}
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="font-medium text-sm">Add contact</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={contactDraft.member_name}
                  onChange={(e) =>
                    setContactDraft((s) => ({ ...s, member_name: e.target.value }))
                  }
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label>Phone (international)</Label>
                <Input
                  value={contactDraft.phone}
                  onChange={(e) =>
                    setContactDraft((s) => ({ ...s, phone: e.target.value }))
                  }
                  placeholder="+38…"
                />
              </div>
              <div>
                <Label>LinkedIn (optional)</Label>
                <Input
                  value={contactDraft.linkedin}
                  onChange={(e) =>
                    setContactDraft((s) => ({ ...s, linkedin: e.target.value }))
                  }
                  placeholder="username or full URL"
                />
              </div>
              <div>
                <Label>Telegram (optional)</Label>
                <Input
                  value={contactDraft.telegram}
                  onChange={(e) =>
                    setContactDraft((s) => ({ ...s, telegram: e.target.value }))
                  }
                  placeholder="@handle"
                />
              </div>
            </div>
            <Button onClick={addContact} disabled={!contactDraft.member_name.trim()}>
              <Plus size={14} /> Add contact
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardBody className="text-sm text-muted space-y-2">
          <div>
            • Deleting a profile here removes them from the app (team list,
            ratings, pitches, votes, etc.) but the underlying auth account stays.
            To fully revoke login access, delete the user in{' '}
            <strong>Supabase Dashboard → Authentication → Users</strong>.
          </div>
          <div>
            • Inviting new founders: send them the app URL — they sign up via
            the regular login screen. Or, pre-add them to the directory above
            so the WhatsApp button appears immediately.
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
