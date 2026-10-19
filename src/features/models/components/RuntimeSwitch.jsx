import { RUNTIMES } from '@/features/models/runtimes';
import { useT } from '@/i18n/context';
import { cn } from '@/lib/utils';

// The runtime names themselves — WebGPU, Endpoint — stay as they are: one is a
// web standard and the other is what the field is called everywhere else.
export function RuntimeSwitch({ value, onChange }) {
  const t = useT();

  return (
    <div
      role="radiogroup"
      aria-label={t('runtime.label')}
      className="bg-accent flex rounded-full p-1 text-xs"
    >
      {RUNTIMES.map((runtime) => {
        const selected = runtime.id === value;
        return (
          <button
            key={runtime.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(runtime.id)}
            className={cn(
              'flex-1 rounded-full py-1 text-center',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              selected ? 'bg-card text-foreground font-semibold' : 'text-muted-foreground',
            )}
          >
            {runtime.label}
          </button>
        );
      })}
    </div>
  );
}
