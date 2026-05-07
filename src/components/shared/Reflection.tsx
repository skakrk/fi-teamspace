import { CheckCircle2, Lightbulb, Mountain, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ReflectionKind = 'success' | 'challenge' | 'learning';

const KINDS: Record<
  ReflectionKind,
  { Icon: LucideIcon; label: string; color: string }
> = {
  success: { Icon: CheckCircle2, label: 'Success', color: 'text-ok' },
  challenge: { Icon: Mountain, label: 'Challenge', color: 'text-warn' },
  learning: { Icon: Lightbulb, label: 'Learning', color: 'text-primary-deep' },
};

/**
 * Just the colored SVG icon for one of success / challenge / learning.
 * Use when you only want the visual marker (e.g. compact rows where the
 * value already implies the kind).
 */
export function ReflectionIcon({
  kind,
  size = 16,
  className,
}: {
  kind: ReflectionKind;
  size?: number;
  className?: string;
}) {
  const { Icon, color } = KINDS[kind];
  return <Icon size={size} className={cn(color, 'shrink-0', className)} />;
}

/**
 * Inline label "Icon Success:" used as a prefix before the founder's text.
 * Renders an inline-flex span so it sits on the same line as the value.
 */
export function ReflectionLabel({
  kind,
  size = 14,
  bold = true,
  className,
}: {
  kind: ReflectionKind;
  size?: number;
  bold?: boolean;
  className?: string;
}) {
  const { Icon, label, color } = KINDS[kind];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 align-middle',
        color,
        bold ? 'font-bold' : 'font-medium',
        className,
      )}
    >
      <Icon size={size} className="shrink-0" />
      {label}:
    </span>
  );
}
