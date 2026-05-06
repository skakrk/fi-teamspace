import * as RT from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const TabsRoot = RT.Root;

export function TabsList({ className, ...rest }: React.ComponentProps<typeof RT.List>) {
  return (
    <RT.List
      className={cn('inline-flex bg-bg border border-border rounded-lg p-1 gap-1', className)}
      {...rest}
    />
  );
}

export function TabsTrigger({ className, ...rest }: React.ComponentProps<typeof RT.Trigger>) {
  return (
    <RT.Trigger
      className={cn(
        'px-3 h-8 text-sm font-medium rounded-md text-muted hover:text-ink data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-card',
        className,
      )}
      {...rest}
    />
  );
}

export const TabsContent = RT.Content;
