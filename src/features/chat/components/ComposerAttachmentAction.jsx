import { ComposerAddAttachment } from '@/components/assistant-ui/attachment';
import { InfoHint } from '@/components/InfoHint';
import { supportsFileInput } from '@/features/models/capabilities';
import { useComposerModels } from '@/features/models/composerModels';
import { useT } from '@/i18n/context';
import { focusRing } from '@/lib/focusRing';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

/**
 * The composer's attachment button, gated on what the selected model can be
 * sent.
 *
 * Marked `aria-disabled` rather than `disabled`: the button variant sets
 * `disabled:pointer-events-none`, which would take the tooltip with it — and
 * the tooltip is the whole explanation. It reads as unavailable, ignores the
 * click, and still answers on hover.
 */
export function ComposerAttachmentAction() {
  const t = useT();
  const context = useComposerModels();

  const selected = context?.models?.find((model) => model.id === context.selectedModelId);
  if (supportsFileInput(selected)) return <ComposerAddAttachment />;

  // The message is the whole point of the control, so it has to be reachable
  // without a pointer: a tooltip alone would leave a phone with a dimmed button
  // that does nothing and explains nothing.
  return (
    <InfoHint
      label={t('composer.attachmentsUnavailable')}
      side="top"
      content={t('composer.textOnly')}
      className={cn(
        'text-muted-foreground/60 hover:text-muted-foreground grid size-7 place-items-center rounded-full transition-colors',
        focusRing,
      )}
    >
      <Plus aria-hidden="true" className="size-4" />
    </InfoHint>
  );
}
