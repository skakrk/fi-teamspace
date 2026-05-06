import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'primary' | 'warn' | 'ok' | 'bad' | 'neutral';

const tones: Record<Tone, string> = {
  default: 'bg-bubble text-primary-deep',
  primary: 'bg-primary text-white',
  warn: 'bg-amber-100 text-amber-700',
  ok: 'bg-green-100 text-green-700',
  bad: 'bg-red-100 text-red-700',
  neutral: 'bg-bg text-muted border border-border',
};

export function Badge({
  tone = 'default',
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
