import { Link } from 'react-router-dom';
import { Linkedin, Mail, Phone, MessageCircle, Twitter, Globe } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import type { DbProfile } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { whatsappLink } from '@/lib/utils';

export function ProfileCard({
  profile,
  fallbackPhone,
}: {
  profile: DbProfile;
  /** Phone from team_contacts table when profile.phone is empty (e.g. teammate seeded but hasn't filled their profile yet) */
  fallbackPhone?: string | null;
}) {
  const effectivePhone = profile.phone || fallbackPhone || null;
  const wa = whatsappLink(effectivePhone);
  const tgUrl = profile.telegram
    ? profile.telegram.startsWith('http')
      ? profile.telegram
      : `https://t.me/${profile.telegram.replace('@', '')}`
    : null;
  const liUrl = profile.linkedin
    ? profile.linkedin.startsWith('http')
      ? profile.linkedin
      : `https://linkedin.com/in/${profile.linkedin}`
    : null;
  const twUrl = profile.twitter
    ? profile.twitter.startsWith('http')
      ? profile.twitter
      : `https://x.com/${profile.twitter.replace('@', '')}`
    : null;
  const wsUrl = profile.website
    ? profile.website.startsWith('http')
      ? profile.website
      : `https://${profile.website}`
    : null;

  return (
    <Card className="hover:shadow-pop transition-shadow">
      <CardBody className="flex flex-col items-center text-center gap-3">
        <Avatar name={profile.full_name || '?'} src={profile.avatar_url} size="xl" />
        <div>
          <div className="font-semibold text-ink leading-tight">
            {profile.full_name || 'Unnamed'}
          </div>
          {profile.project_name && (
            <div className="text-sm text-muted mt-0.5">{profile.project_name}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {profile.is_president && <Badge tone="primary">President</Badge>}
          {profile.is_placeholder && (
            <Badge tone="warn" title="Placeholder card — auto-claimed when this email signs up">
              placeholder
            </Badge>
          )}
        </div>
        {effectivePhone && (
          <div className="text-sm text-muted flex items-center gap-1">
            <Phone size={13} /> {effectivePhone}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-lg bg-[#25D366] text-white grid place-items-center hover:bg-[#128C7E]"
              title={`WhatsApp ${effectivePhone}`}
            >
              <WhatsAppIcon />
            </a>
          )}
          {profile.email && (
            <a
              href={`mailto:${profile.email}`}
              className="w-9 h-9 rounded-lg border border-border grid place-items-center text-muted hover:text-primary-deep hover:bg-bubble"
              title="Email"
            >
              <Mail size={16} />
            </a>
          )}
          {tgUrl && (
            <a
              href={tgUrl}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-lg border border-border grid place-items-center text-muted hover:text-primary-deep hover:bg-bubble"
              title="Telegram"
            >
              <MessageCircle size={16} />
            </a>
          )}
          {liUrl && (
            <a
              href={liUrl}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-lg border border-border grid place-items-center text-muted hover:text-primary-deep hover:bg-bubble"
              title="LinkedIn"
            >
              <Linkedin size={16} />
            </a>
          )}
          {twUrl && (
            <a
              href={twUrl}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-lg border border-border grid place-items-center text-muted hover:text-primary-deep hover:bg-bubble"
              title="X / Twitter"
            >
              <Twitter size={16} />
            </a>
          )}
          {wsUrl && (
            <a
              href={wsUrl}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-lg border border-border grid place-items-center text-muted hover:text-primary-deep hover:bg-bubble"
              title="Website"
            >
              <Globe size={16} />
            </a>
          )}
        </div>
        <Link
          to={`/team/${profile.user_id}`}
          className="mt-2 text-sm font-medium text-primary-dark hover:text-primary-deep"
        >
          View profile →
        </Link>
      </CardBody>
    </Card>
  );
}
