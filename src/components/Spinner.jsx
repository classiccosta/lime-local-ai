import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Decorative: whatever is spinning says so in its own text or label.
export function Spinner({ className }) {
  return (
    <Loader2
      aria-hidden="true"
      className={cn('size-3.5 animate-spin motion-reduce:animate-none', className)}
    />
  );
}
