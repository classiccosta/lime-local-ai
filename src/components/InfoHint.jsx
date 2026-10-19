import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsTouch } from '@/lib/useMediaQuery';
import { Popover } from 'radix-ui';

/**
 * A hint that arrives on hover where there is a pointer, and on tap where there
 * is not.
 *
 * Radix tooltips are hover-and-focus by design and do not open on touch, which
 * is correct behaviour and useless here: the hints these wrap are the only
 * explanation their control has. A popover is the same bubble with a different
 * trigger, so the two share content and styling and differ only in what opens
 * them.
 */
export function InfoHint({ label, content, side = 'left', className, children }) {
  const touch = useIsTouch();

  if (touch) {
    return (
      <Popover.Root>
        <Popover.Trigger type="button" aria-label={label} className={className}>
          {children}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side={side}
            sideOffset={6}
            collisionPadding={12}
            className="bg-foreground text-background data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 z-50 flex max-w-[min(20rem,calc(100vw-1.5rem))] flex-col items-start gap-1.5 rounded-md px-3 py-2 text-xs leading-normal"
          >
            {content}
            <Popover.Arrow className="fill-foreground size-2.5" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger type="button" aria-label={label} className={className}>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} className="flex-col items-start gap-1.5 leading-normal">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
