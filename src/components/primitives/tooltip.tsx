'use client';

/** shadcn-style Tooltip on Radix, themed with the xeno glass look. */
import type { ReactNode } from 'react';
import { Tooltip as T } from 'radix-ui';
import { cn } from '@/lib/utils';

export const TooltipProvider = T.Provider;

export function Tooltip({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <T.Root delayDuration={250}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          sideOffset={8}
          className={cn(
            'z-[90] rounded-full border border-[var(--xeno-a)]/30 bg-black/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--xeno-a)] backdrop-blur-md',
            className,
          )}
        >
          {label}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
