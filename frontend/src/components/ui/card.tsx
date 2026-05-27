import { PropsWithChildren } from 'react';
import { cn } from '../../lib/utils';

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border/80 bg-card/70 p-5 shadow-glass backdrop-blur-md',
        className
      )}
    >
      {children}
    </section>
  );
}
