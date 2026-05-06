import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-surface border border-border rounded-xl shadow-card', className)}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 border-b border-border', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <h3 className={cn('text-base font-semibold text-ink', className)} {...rest} />;
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-3 border-t border-border bg-bg/50 rounded-b-xl', className)} {...rest} />;
}
