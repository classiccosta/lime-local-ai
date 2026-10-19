import { cn } from '@/lib/utils';

// The product mark: a terminal prompt, set in the mono face at the size of the
// text it sits beside.
export function Mark({ className }) {
  return (
    <span aria-hidden="true" className={cn('text-primary font-mono select-none', className)}>
      &gt;_
    </span>
  );
}
