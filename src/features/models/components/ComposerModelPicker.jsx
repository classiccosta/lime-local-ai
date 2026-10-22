import { Spinner } from '@/components/Spinner';
import { ModelPicker } from '@/features/models/components/ModelPicker';
import { useComposerModels } from '@/features/models/composerModels';
import { shortLabel } from '@/features/models/labels';
import { useT } from '@/i18n/context';
import { focusRing } from '@/lib/focusRing';
import { menuContent } from '@/lib/menu';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useState } from 'react';

// A popover rather than a menu: the rows carry their own download and delete
// buttons, which a menu item cannot hold, and this way the composer renders the
// very ModelPicker the settings dialog does — one implementation, not two that
// drift. Picking a model closes it; downloading or deleting leaves it open, so
// the spinner and the outcome stay in view.
export function ComposerModelPicker() {
  const t = useT();
  const context = useComposerModels();
  const [open, setOpen] = useState(false);
  if (!context) return null;

  const { picker, selectedModel, restoring } = context;

  // Until the catalogue has arrived and cached models are back on the GPU,
  // there is no trigger at all — only a status. A list that is still filling in
  // would offer rows that move or vanish under the pointer, and a pick made then
  // could be overruled by the restore a moment later.
  if (picker.loading || restoring) {
    return (
      <span
        role="status"
        className="text-muted-foreground/60 flex items-center gap-1.5 px-2 text-xs"
      >
        <Spinner />
        {t('model.restoring')}
      </span>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={t('model.label')}
        className={cn(
          'text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors',
          focusRing,
        )}
      >
        <span className="max-w-40 truncate">
          {selectedModel ? shortLabel(selectedModel) : t('composer.choose')}
        </span>
        <ChevronDown aria-hidden="true" className="size-3.5 shrink-0" />
      </Popover.Trigger>
      <Popover.Portal>
        {/* Downward by preference, aligned to the trigger's right edge. Radix
            flips it upward on its own when the composer leaves no room below,
            which near the foot of the window is most of the time. */}
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            menuContent,
            'flex max-h-80 w-72 max-w-[calc(100vw-1rem)] flex-col gap-1 overflow-y-auto text-xs outline-none',
          )}
        >
          <ModelPicker
            {...picker}
            inComposer
            onOpenSettings={() => {
              setOpen(false);
              context.onOpenSettings();
            }}
            onPick={(id) => {
              picker.onPick(id);
              setOpen(false);
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
