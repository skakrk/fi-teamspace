import * as RD from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <RD.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] bg-surface rounded-xl shadow-pop border border-border max-h-[90vh] overflow-auto',
            widths[size],
          )}
        >
          <div className="flex items-start justify-between p-5 border-b border-border">
            <div>
              <RD.Title className="text-lg font-semibold text-ink">{title}</RD.Title>
              {description && (
                <RD.Description className="text-sm text-muted mt-1">{description}</RD.Description>
              )}
            </div>
            <RD.Close className="text-muted hover:text-ink transition-colors p-1 -m-1">
              <X size={18} />
            </RD.Close>
          </div>
          <div className="p-5">{children}</div>
          {footer && <div className="px-5 py-3 border-t border-border bg-bg/50 rounded-b-xl flex justify-end gap-2">{footer}</div>}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
