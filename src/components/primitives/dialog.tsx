'use client';

/**
 * shadcn-style Dialog on Radix: focus trap, Esc/outside-click close and
 * aria wiring, wrapped in a xeno glass panel. Render it while open; closing
 * calls `onClose`.
 */
import type { ReactNode } from 'react';
import { Dialog as D } from 'radix-ui';
import { cn } from '@/lib/utils';

export function Dialog({
  title,
  onClose,
  children,
  className,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <D.Root open onOpenChange={(o) => !o && onClose()}>
      <D.Portal>
        <D.Overlay className="xeno-fade fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" />
        <D.Content
          aria-describedby={undefined}
          className={cn(
            'xeno-glass fixed left-1/2 top-[12vh] z-[71] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden focus:outline-none',
            className,
          )}
        >
          <D.Title className="sr-only">{title}</D.Title>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
