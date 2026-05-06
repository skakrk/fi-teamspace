import { useParams, Link } from 'react-router-dom';
import { Linkedin, Globe, Mail, Phone, MessageCircle, Twitter } from 'lucide-react';
import { useProfile } from '@/hooks/useTeam';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

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
  const { profile, loading } = useProfile(userId);

  if (loading) return <div className="text-muted text-sm">Loading…</div>;
  if (!profile) return <div className="text-muted text-sm">Profile not found.</div>;

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
              {profile.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={14} /> {profile.phone}
                </span>
              )}
              {linkedin && <Social icon={Linkedin} href={linkedin}>LinkedIn</Social>}
              {telegram && <Social icon={MessageCircle} href={telegram}>Telegram</Social>}
              {profile.twitter && (
                <Social icon={Twitter} href={profile.twitter}>X</Social>
              )}
              {profile.website && (
                <Social icon={Globe} href={profile.website}>Website</Social>
              )}
            </div>
            <div className="mt-4">
              <Link to={`/pitches/${profile.user_id}`}>
                <Button variant="outline" size="sm">View pitch →</Button>
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>About</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <Field label="About me" value={profile.about_me} />
          <Field label="Project description" value={profile.project_description} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Skills &amp; collaboration</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <Field label="What I know and can do" value={profile.skills} />
          <Field label="What I can help with" value={profile.can_help_with} />
          <Field label="What I need help with" value={profile.need_help_with} />
        </CardBody>
      </Card>
    </div>
  );
}
