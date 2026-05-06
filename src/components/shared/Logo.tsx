import { cn } from '@/lib/utils';

const sizes = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12',
  '2xl': 'w-32 h-32',
} as const;

export function Logo({
  size = 'lg',
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt="Best Teamspace"
      className={cn('rounded-lg object-cover', sizes[size], className)}
    />
  );
}
