import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Linkedin, Globe, Mail, Phone, MessageCircle, Twitter, Send } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useProfile, useTeam } from '@/hooks/useTeam';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { supabase, type DbProjectFeedback, type DbTeamContact } from '@/lib/supabase';
import { notifyError } from '@/lib/notify';
import { whatsappLink } from '@/lib/utils';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="text-sm whitespace-pre-line mt-0.5">{value}</div>
    </div>
  );
}

function Social({
  icon: Icon,
  href,
  children,
}: {
  icon: typeof Linkedin;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-primary-deep hover:underline"
    >
      <Icon size={14} /> {children}
    </a>
  );
}

export function ProfileDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const { profile, loading } = useProfile(userId);
  const [contact, setContact] = useState<DbTeamContact | null>(null);
  const isMine = user?.id === userId;

  useEffect(() => {
    (async () => {
      if (!profile?.full_name) return;
      const { data } = await supabase
        .from('team_contacts')
        .select('*')
        .ilike('member_name', profile.full_name)
        .maybeSingle();
      setContact((data as DbTeamContact) || null);
    })();
  }, [profile?.full_name]);

  if (loading) return <div className="text-muted text-sm">Loading…</div>;
  if (!profile) return <div className="text-muted text-sm">Profile not found.</div>;

  const effectivePhone = profile.phone || contact?.phone || null;
  const wa = whatsappLink(effectivePhone);
  const linkedin = profile.linkedin?.startsWith('http')
    ? profile.linkedin
    : profile.linkedin
    ? `https://linkedin.com/in/${profile.linkedin}`
    : null;
  const telegram = profile.telegram?.startsWith('http')
    ? profile.telegram
    : profile.telegram
    ? `https://t.me/${profile.telegram.replace('@', '')}`
    : null;
  const twitter = profile.twitter?.startsWith('http')
    ? profile.twitter
    : profile.twitter
    ? `https://x.com/${profile.twitter.replace('@', '')}`
    : null;
  const website = profile.website?.startsWith('http')
    ? profile.website
    : profile.website
    ? `https://${profile.website}`
    : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/team" className="text-sm text-muted hover:text-ink">
        ← Back to team
      </Link>

      <Card>
        <CardBody className="flex flex-col md:flex-row gap-5 items-start">
          <Avatar name={profile.full_name} src={profile.avatar_url} size="xl" />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="h1">{profile.full_name || 'Unnamed'}</h1>
              {profile.is_president && <Badge tone="primary">President</Badge>}
            </div>
            {profile.project_name && (
              <div className="text-base mt-1">{profile.project_name}</div>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-muted">
              {profile.email && (
                <Social icon={Mail} href={`mailto:${profile.email}`}>
                  {profile.email}
                </Social>
              )}
              {effectivePhone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={14} /> {effectivePhone}
                </span>
              )}
              {linkedin && <Social icon={Linkedin} href={linkedin}>LinkedIn</Social>}
              {telegram && <Social icon={MessageCircle} href={telegram}>Telegram</Social>}
              {twitter && <Social icon={Twitter} href={twitter}>X</Social>}
              {website && <Social icon={Globe} href={website}>Website</Social>}
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer">
                  <Button size="sm" className="bg-[#25D366] hover:bg-[#128C7E]">
                    <WhatsAppIcon /> Message on WhatsApp
                  </Button>
                </a>
              )}
              <Link to={`/pitches/${profile.user_id}`}>
                <Button variant="outline" size="sm">View pitch →</Button>
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>

      {isMine &&
        !profile.about_me &&
        !profile.project_name &&
        !profile.skills &&
        !profile.linkedin && (
          <Card className="border-amber-200 bg-amber-50">
            <CardBody className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold">Your profile is empty</div>
                <div className="text-sm text-muted">
                  Add about, project, skills, social links, avatar, etc. so teammates know who you are.
                </div>
              </div>
              <Link to="/profile">
                <Button>Fill in profile →</Button>
              </Link>
            </CardBody>
          </Card>
        )}

      {profile.about_me && (
        <Card>
          <CardHeader><CardTitle>About</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <Field label="About me" value={profile.about_me} />
          </CardBody>
        </Card>
      )}

      {(profile.project_name ||
        profile.project_description ||
        profile.project_logo_url ||
        profile.project_website ||
        profile.project_linkedin ||
        profile.project_twitter ||
        profile.project_instagram) && (
        <Card>
          <CardHeader>
            <CardTitle>Project</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-start gap-4 flex-wrap">
              {profile.project_logo_url && (
                <img
                  src={profile.project_logo_url}
                  alt={profile.project_name || 'Project logo'}
                  className="w-20 h-20 rounded-xl border border-border object-contain bg-bg"
                />
              )}
              <div className="flex-1 min-w-0">
                {profile.project_name && (
                  <div className="text-lg font-semibold text-ink">{profile.project_name}</div>
                )}
                {profile.project_description && (
                  <div className="text-sm whitespace-pre-line mt-1">
                    {profile.project_description}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {profile.project_website && (
                <Social
                  icon={Globe}
                  href={
                    profile.project_website.startsWith('http')
                      ? profile.project_website
                      : `https://${profile.project_website}`
                  }
                >
                  Website
                </Social>
              )}
              {profile.project_linkedin && (
                <Social
                  icon={Linkedin}
                  href={
                    profile.project_linkedin.startsWith('http')
                      ? profile.project_linkedin
                      : `https://linkedin.com/company/${profile.project_linkedin}`
                  }
                >
                  Project LinkedIn
                </Social>
              )}
              {profile.project_twitter && (
                <Social
                  icon={Twitter}
                  href={
                    profile.project_twitter.startsWith('http')
                      ? profile.project_twitter
                      : `https://x.com/${profile.project_twitter.replace('@', '')}`
                  }
                >
                  Project X
                </Social>
              )}
              {profile.project_instagram && (
                <Social
                  icon={Globe}
                  href={
                    profile.project_instagram.startsWith('http')
                      ? profile.project_instagram
                      : `https://instagram.com/${profile.project_instagram.replace('@', '')}`
                  }
                >
                  Project Instagram
                </Social>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {(profile.skills || profile.can_help_with || profile.need_help_with) && (
        <Card>
          <CardHeader><CardTitle>Skills &amp; collaboration</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            <Field label="What I know and can do" value={profile.skills} />
            <Field label="What I can help with" value={profile.can_help_with} />
            <Field label="What I need help with" value={profile.need_help_with} />
          </CardBody>
        </Card>
      )}

      <ProjectFeedbackBlock founderId={profile.user_id} founderName={profile.full_name} />
    </div>
  );
}

const FEEDBACK_CATEGORIES = [
  { code: 'general',     label: 'General' },
  { code: 'positioning', label: 'Positioning' },
  { code: 'product',     label: 'Product' },
  { code: 'gtm',         label: 'Go-to-market' },
  { code: 'fundraising', label: 'Fundraising' },
  { code: 'team',        label: 'Team' },
];

function ProjectFeedbackBlock({
  founderId,
  founderName,
}: {
  founderId: string;
  founderName: string;
}) {
  const { user } = useAuth();
  const { profiles } = useTeam();
  const [items, setItems] = useState<DbProjectFeedback[]>([]);
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [saving, setSaving] = useState(false);

  async function reload() {
    const { data } = await supabase
      .from('project_feedback')
      .select('*')
      .eq('founder_id', founderId)
      .order('created_at', { ascending: false });
    setItems((data as DbProjectFeedback[]) || []);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [founderId]);

  async function submit() {
    if (!user || !body.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('project_feedback').insert({
      founder_id: founderId,
      reviewer_id: user.id,
      body: body.trim(),
      category,
    });
    setSaving(false);
    if (error) {
      notifyError('Could not save feedback', error);
      return;
    }
    setBody('');
    setCategory('general');
    await reload();
  }

  const isMine = user?.id === founderId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project feedback{isMine ? ' (yours to read)' : ''}</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {!isMine && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {FEEDBACK_CATEGORIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCategory(c.code)}
                  className={
                    'px-2.5 h-7 rounded-md text-xs font-medium border ' +
                    (category === c.code
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-muted border-border hover:text-ink')
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>
            <Textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Leave feedback on ${founderName.split(' ')[0]}'s project…`}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={submit} disabled={saving || !body.trim()}>
                <Send size={14} /> {saving ? 'Saving…' : 'Post feedback'}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {items.map((f) => {
            const reviewer = profiles.find((p) => p.user_id === f.reviewer_id);
            const cat = FEEDBACK_CATEGORIES.find((c) => c.code === f.category);
            return (
              <div key={f.id} className="bg-bg rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar
                    name={reviewer?.full_name || '?'}
                    src={reviewer?.avatar_url}
                    size="sm"
                  />
                  <div className="text-sm font-medium">{reviewer?.full_name || 'Reviewer'}</div>
                  {cat && <Badge tone="neutral">{cat.label}</Badge>}
                  <div
                    className="text-xs text-muted ml-auto"
                    title={format(new Date(f.created_at), 'PPp')}
                  >
                    {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                  </div>
                </div>
                <div className="text-sm whitespace-pre-line">{f.body}</div>
              </div>
            );
          })}
          {!items.length && (
            <div className="text-sm text-muted">
              No feedback yet.{!isMine && ' Be the first to leave one!'}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
