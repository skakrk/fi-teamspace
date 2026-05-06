import { cn, initials } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<Size, string> = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string | null;
  size?: Size;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover bg-bg', sizes[size], className)}
      />
    );
  }
  return (
    <div
      className={cn(
        'rounded-full bg-bubble text-primary-deep font-semibold flex items-center justify-center select-none',
        sizes[size],
        className,
      )}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}
