import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { notifyError } from '@/lib/notify';

export function defaultWaSyncTemplate(sprintName: string | null | undefined) {
  const title = sprintName ? sprintName : 'this week';
  return [
    `Hey team — quick sync before our next Working Group session (${title}):`,
    '',
    '🎤 Is your Feedback Pitch ready and marked Ready in Best Teamspace?',
    '⏱️ Any concerns about pitch timing this week?',
    '🚧 Anything blocking you that we should discuss / escalate?',
    '',
    'Drop a quick reply so I can prep — thanks!',
    '— President',
  ].join('\n');
}

export function WhatsAppSyncDialog({
  open,
  onOpenChange,
  whatsappUrl,
  sprintName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  whatsappUrl: string;
  sprintName: string | null | undefined;
}) {
  const [text, setText] = useState(() => defaultWaSyncTemplate(sprintName));
  const [copied, setCopied] = useState(false);

  // Refresh template when the dialog opens for a different sprint, but
  // don't blow away mid-edit text on every prop change.
  useEffect(() => {
    if (open) setText(defaultWaSyncTemplate(sprintName));
  }, [open, sprintName]);

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
