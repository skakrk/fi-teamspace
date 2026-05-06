import { Link } from 'react-router-dom';
import { Linkedin, Mail, Phone, MessageCircle } from 'lucide-react';
import type { DbProfile } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';

export function ProfileCard({ profile }: { profile: DbProfile }) {
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
        {profile.is_president && <Badge tone="primary">President</Badge>}
        {profile.phone && (
          <div className="text-sm text-muted flex items-center gap-1">
            <Phone size={13} /> {profile.phone}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          {profile.email && (
            <a
              href={`mailto:${profile.email}`}
              className="w-9 h-9 rounded-lg border border-border grid place-items-center text-muted hover:text-primary-deep hover:bg-bubble"
              title="Email"
            >
              <Mail size={16} />
            </a>
          )}
          {profile.telegram && (
            <a
              href={profile.telegram.startsWith('http') ? profile.telegram : `https://t.me/${profile.telegram.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-lg border border-border grid place-items-center text-muted hover:text-primary-deep hover:bg-bubble"
              title="Telegram"
            >
              <MessageCircle size={16} />
            </a>
          )}
          {profile.linkedin && (
            <a
              href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-lg border border-border grid place-items-center text-muted hover:text-primary-deep hover:bg-bubble"
              title="LinkedIn"
            >
              <Linkedin size={16} />
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
