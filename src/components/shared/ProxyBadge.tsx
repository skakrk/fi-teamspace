import { PencilLine } from 'lucide-react';

export function ProxyBadge({
  fillerName,
  className = '',
}: {
  fillerName: string | null;
  className?: string;
}) {
  return (
    <span
      className={
        'inline-flex items-center gap-1 text-[11px] text-muted italic ' + className
      }
      title="Filled on behalf by the President"
    >
      <PencilLine size={11} />
      {fillerName ? `filled by ${fillerName}` : 'filled on behalf'}
    </span>
  );
}
