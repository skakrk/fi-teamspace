import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { notifyError } from '@/lib/notify';

// FI Deliverables URL pattern is `https://fi.co/enrolled/assignments/<slug>`
// where the slug is the sprint name lowercased, with `&` and other punctuation
// stripped, spaces collapsed to hyphens, then suffixed with the cohort
// identifier. Hardcoded to CEE 2026 since this app is built for that team.
const FI_COHORT_SUFFIX = 'central-eastern-europe-2026';

export function fiAssignmentUrl(sprintName: string | null | undefined): string | null {
  if (!sprintName) return null;
  const slug = sprintName
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  if (!slug) return null;
  return `https://fi.co/enrolled/assignments/${slug}-${FI_COHORT_SUFFIX}`;
}

export function defaultWaSyncTemplate(
  sprintName: string | null | undefined,
  presidentName: string | null | undefined,
) {
  const title = sprintName ? sprintName : 'this week';
  const signature = (presidentName && presidentName.trim()) || 'President';
  const url = fiAssignmentUrl(sprintName);
  const pitchLine = url
    ? `🎤 Was your Feedback Pitch ready this session, and marked Ready in Deliverables ${url}?`
    : '🎤 Was your Feedback Pitch ready this session, and marked Ready in Deliverables?';
  return [
    `Hi team! Quick sync about ${title} before I share our sprint results with the Local Director:`,
    '',
    pitchLine,
    '⏱️ Any feedback on pitch timing this week?',
    '🚧 Wins, concerns or blockers I should flag to the Director?',
    '',
    'Drop a quick reply so I can roll it into the report. Thanks!',
    signature,
  ].join('\n');
}

export function WhatsAppSyncDialog({
  open,
  onOpenChange,
  whatsappUrl,
  sprintName,
  presidentName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  whatsappUrl: string;
  sprintName: string | null | undefined;
  presidentName: string | null | undefined;
}) {
  const [text, setText] = useState(() => defaultWaSyncTemplate(sprintName, presidentName));
  const [copied, setCopied] = useState(false);

  // Refresh template when the dialog opens for a different sprint or
  // president, but don't blow away mid-edit text on every prop change.
  useEffect(() => {
    if (open) setText(defaultWaSyncTemplate(sprintName, presidentName));
  }, [open, sprintName, presidentName]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      notifyError('Could not copy to clipboard', err);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Sync with team via WhatsApp"
      description="Group chats can't auto-fill text. Copy the message, then open the group and paste."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCopy} variant={copied ? 'secondary' : 'primary'}>
            {copied ? (
              <>
                <Check size={14} /> Copied
              </>
            ) : (
              <>
                <Copy size={14} /> Copy text
              </>
            )}
          </Button>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">
              <WhatsAppIcon width={14} height={14} /> Open WhatsApp group
              <ExternalLink size={12} />
            </Button>
          </a>
        </>
      }
    >
      <div className="space-y-3">
        <Textarea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Edit the message before sending…"
        />
      </div>
    </Dialog>
  );
}
