import { useState } from 'react';
import { Crown, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { safeFormat } from '@/lib/utils';
import type { DbProfile } from '@/lib/supabase';

export const PRESIDENT_RESPONSIBILITIES = [
  {
    code: 'pitches_ready',
    label: 'Ensure all teammates have Feedback Pitches ready before every session',
  },
  {
    code: 'pitch_timing',
    label: 'Keep time for teammates\' Feedback Pitches so everyone gets mentor feedback in the allotted slot',
  },
  {
    code: 'minutes',
    label: 'Record and post the Working Group Meeting Minutes',
  },
  {
    code: 'attendance',
    label: 'Record Attendance',
  },
  {
    code: 'timekeeper',
    label: 'Act as timekeeper during the Working Group meetings',
  },
  {
    code: 'moderate',
    label: 'Moderate the meeting — keep founders focused and guide discussion',
  },
  {
    code: 'escalate',
    label: 'Identify founder performance issues and report them to the Local Director',
  },
] as const;

export const PRESIDENT_INTRO =
  "The President provides accountability and structure to the Working Group meetings. " +
  "Similar to a Board Chair, the President is responsible for the success of the Working Group. " +
  "Re-elected each time a new Working Group is created — and where possible, someone who hasn't held the role yet.";

export function PresidentRoleCard({
  president,
  electionPollId,
  electionDate,
  defaultExpanded = false,
}: {
  president?: DbProfile | null;
  electionPollId?: string | null;
  electionDate?: string | null;
  defaultExpanded?: boolean;
} = {}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Crown size={18} className="text-primary-dark" /> President role &amp; responsibilities
        </CardTitle>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-muted hover:text-ink inline-flex items-center gap-1"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {expanded ? 'Hide details' : 'Show details'}
        </button>
      </CardHeader>
      <CardBody className="space-y-4">
        {president ? (
          <div className="bg-bubble/40 border border-primary/30 rounded-lg p-4 flex items-center gap-4 flex-wrap">
            <Avatar
              name={president.full_name || '?'}
              src={president.avatar_url}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted">
                Current President
              </div>
              <div className="text-lg font-semibold text-ink">
                {president.full_name}
              </div>
              {electionDate && (
                <div className="text-xs text-muted mt-0.5">
                  Elected {safeFormat(electionDate, 'PPP')}
                </div>
              )}
            </div>
            {electionPollId && (
              <Link
                to={`/polls/${electionPollId}`}
                className="inline-flex items-center gap-1.5 text-sm text-primary-dark hover:underline"
              >
                View election <ExternalLink size={12} />
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <span className="font-medium">No President elected yet.</span>{' '}
            <Link to="/polls" className="text-primary-dark hover:underline">
              Start an election →
            </Link>
          </div>
        )}

        {expanded && (
          <>
            <p className="text-sm text-muted leading-relaxed">{PRESIDENT_INTRO}</p>
            <ul className="space-y-2">
              {PRESIDENT_RESPONSIBILITIES.map((r, i) => (
                <li key={r.code} className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-bubble text-primary-deep grid place-items-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm">{r.label}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardBody>
    </Card>
  );
}
