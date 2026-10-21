'use client';
import { ComposerAttachments, UserMessageAttachments } from '@/components/assistant-ui/attachment';
import { File } from '@/components/assistant-ui/file';
import { ThreadFollowupSuggestions } from '@/components/assistant-ui/follow-up-suggestions';
import { Image } from '@/components/assistant-ui/image';
import { MarkdownText } from '@/components/assistant-ui/markdown-text';
import {
  Reasoning,
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from '@/components/assistant-ui/reasoning';
import { ToolFallback } from '@/components/assistant-ui/tool-fallback';
import {
  ToolGroupContent,
  ToolGroupRoot,
  ToolGroupTrigger,
} from '@/components/assistant-ui/tool-group';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { Mark } from '@/components/Mark';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ComposerAttachmentAction } from '@/features/chat/components/ComposerAttachmentAction';
import { ComposerModelPicker } from '@/features/models/components/ComposerModelPicker';
import { useT } from '@/i18n/context';
import { followBottom } from '@/lib/followBottom';
import { keepBottomOnResize } from '@/lib/keepBottomOnResize';
import { cn } from '@/lib/utils';
import {
  ActionBarPrimitive,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  groupPartByType,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  useAuiState,
} from '@assistant-ui/react';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BrainIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  MicIcon,
  SquareIcon,
} from 'lucide-react';
import { createContext, useContext } from 'react';

const EMPTY_COMPONENTS = {};

const ThreadComponentsContext = createContext(EMPTY_COMPONENTS);

// Startup exposes a loading placeholder thread; treat it as a new chat so
// the composer mounts centered. Loads after startup keep the docked layout.
const isNewChatView = (s) =>
  s.thread.messages.length === 0 && (!s.thread.isLoading || s.threads.isLoading);

// A switched thread that is still fetching its history: skeleton, not welcome.
const isHistoryLoadingView = (s) =>
  s.thread.messages.length === 0 &&
  s.thread.isLoading &&
  !s.thread.isDisabled &&
  !s.threads.isLoading;

const ThreadHistorySkeleton = () => (
  <div
    data-slot="aui_thread-history-skeleton"
    role="status"
    className="animate-in fade-in fill-mode-both flex flex-col gap-y-6 [animation-delay:150ms] animation-duration-[200ms]"
  >
    <span className="sr-only">Loading conversation</span>
    <Skeleton className="ml-auto h-9 w-2/5 rounded-xl motion-reduce:animate-none" />
    <div className="flex flex-col gap-y-2">
      <Skeleton className="h-4 w-11/12 motion-reduce:animate-none" />
      <Skeleton className="h-4 w-4/5 motion-reduce:animate-none" />
      <Skeleton className="h-4 w-3/5 motion-reduce:animate-none" />
    </div>
    <Skeleton className="ml-auto h-9 w-1/3 rounded-xl motion-reduce:animate-none" />
    <div className="flex flex-col gap-y-2">
      <Skeleton className="h-4 w-10/12 motion-reduce:animate-none" />
      <Skeleton className="h-4 w-2/3 motion-reduce:animate-none" />
    </div>
  </div>
);

export const Thread = ({ components = EMPTY_COMPONENTS }) => {
  const isEmpty = useAuiState(isNewChatView);

  return (
    <ThreadComponentsContext.Provider value={components}>
      <ThreadRoot isEmpty={isEmpty} />
    </ThreadComponentsContext.Provider>
  );
};

// No autofocus on touch screens. iOS will not raise the keyboard for it, so
// the field ends up focused with no keyboard — and the tap that then opens it
// is not treated as a fresh focus, which is the one that let Safari pan the
// page. On a desktop autofocus is just where typing begins.
const COARSE_POINTER =
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

// The keyboard opening must not move the chat (keepBottomOnResize), and a
// streaming reply is followed down while its end is in view (followBottom).
const threadViewportRef = (node) => {
  const cleanups = [keepBottomOnResize(node), followBottom(node)];
  return () => cleanups.forEach((cleanup) => cleanup?.());
};

const ThreadRoot = ({ isEmpty }) => {
  const { Welcome = ThreadWelcome } = useContext(ThreadComponentsContext);

  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root bg-background @container flex h-full flex-col text-base leading-[1.6]"
      style={{
        ['--thread-max-width']: '44rem',
        ['--composer-bg']: 'var(--color-card)',
        ['--composer-radius']: '1.25rem',
        ['--composer-padding']: '8px',
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="bottom"
        // Following the reply is ours, not assistant-ui's; see followBottom.
        autoScroll={false}
        ref={threadViewportRef}
        data-slot="aui_thread-viewport"
        className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
      >
        <div
          className={cn(
            // pt-22 clears the desktop header, which floats over the thread. The
            // mobile header is in the flow above it, so there the padding is
            // only breathing room — and kept small, since with the keyboard up
            // every pixel of a phone's height is spoken for.
            'mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4 pt-4 md:pt-22',
            // Centred on a new chat only from `md` up. On a phone the composer
            // sits at the foot, where the thumb is and where it rises with the
            // keyboard; the welcome line centres itself in the space above.
            isEmpty && 'md:justify-center',
          )}
        >
          <AuiIf condition={isNewChatView}>
            <Welcome />
          </AuiIf>
          <AuiIf condition={isHistoryLoadingView}>
            <ThreadHistorySkeleton />
          </AuiIf>

          <div data-slot="aui_message-group" className="mb-14 flex flex-col gap-y-5 empty:hidden">
            <ThreadPrimitive.Messages>{() => <ThreadMessage />}</ThreadPrimitive.Messages>
          </div>

          <ThreadPrimitive.ViewportFooter
            // Slides only on the way down; see useKeyboardInset for why.
            data-keyboard-follow="close"
            className={cn(
              // The safe-area term keeps the composer off the iPhone home
              // indicator; 1rem is still the floor everywhere else.
              'aui-thread-viewport-footer bg-background flex flex-col gap-0 overflow-visible pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-6',
              !isEmpty && 'sticky bottom-0 mt-auto rounded-t-(--composer-radius)',
            )}
          >
            <ThreadScrollToBottom />
            <ThreadFollowupSuggestions />
            <Composer />
            <AuiIf condition={(s) => isNewChatView(s) && s.composer.isEmpty}>
              <ThreadSuggestions />
            </AuiIf>
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage = () => {
  const { AssistantMessage: AssistantMessageComponent = AssistantMessage } =
    useContext(ThreadComponentsContext);
  const role = useAuiState((s) => s.message.role);
  if (role === 'user') return <UserMessage />;
  return <AssistantMessageComponent />;
};

const ThreadScrollToBottom = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome = () => {
  const t = useT();

  return (
    // On a phone it centres in the space above the composer; with the keyboard
    // up that space is small, and centring left a gap that read as the line
    // floating loose. So the bottom margin turns fixed (20px) while the top
    // stays auto, and the line drops down onto the composer.
    <div
      data-keyboard-follow
      className="aui-thread-welcome-root mb-6 flex flex-col items-center px-4 text-center max-md:my-auto max-md:in-data-[keyboard=open]:mb-5"
    >
      {/* One size on the wrapper, everything inside it in `em`, so the mark,
          the line and the cursor scale together as one lockup.

          `clamp` rather than a breakpoint: the line has to clear the narrowest
          phone and the longest translation, and a fixed mobile size that fits
          English can still wrap in another language. It grows with the viewport
          and stops at the 24px the design asks for. */}
      <div className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both flex items-center gap-[0.4em] text-[clamp(1.05rem,5vw,1.5rem)] duration-200">
        <Mark className="text-[0.85em]" />
        <h1 className="aui-thread-welcome-message-inner text-[1em] font-semibold whitespace-nowrap">
          {t('thread.welcome')}
        </h1>
        <span
          aria-hidden="true"
          className="bg-primary animate-blink inline-block h-[0.8em] w-[0.42em] motion-reduce:animate-none"
        />
      </div>
    </div>
  );
};

const ThreadSuggestions = () => {
  return (
    <div className="aui-thread-welcome-suggestions flex w-full flex-wrap items-center justify-center gap-2 px-4">
      <ThreadPrimitive.Suggestions>{() => <ThreadSuggestionItem />}</ThreadPrimitive.Suggestions>
    </div>
  );
};

const ThreadSuggestionItem = () => {
  return (
    <div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200">
      <SuggestionPrimitive.Trigger send asChild>
        <Button
          variant="ghost"
          className="aui-thread-welcome-suggestion text-foreground hover:bg-muted border-border/60 h-auto gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap transition-colors"
        >
          <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1" />
          <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 empty:hidden" />
        </Button>
      </SuggestionPrimitive.Trigger>
    </div>
  );
};

const Composer = () => {
  const t = useT();

  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <ComposerPrimitive.AttachmentDropzone asChild>
        <div
          data-slot="aui_composer-shell"
          className="border-border/60 data-[dragging=true]:border-ring focus-within:border-border dark:border-muted-foreground/15 dark:focus-within:border-muted-foreground/30 flex w-full cursor-text flex-col gap-2 rounded-(--composer-radius) border bg-(--composer-bg) p-(--composer-padding) transition-[border-color] data-[dragging=true]:border-dashed data-[dragging=true]:bg-[color-mix(in_oklab,var(--color-accent)_50%,var(--color-background))]"
        >
          <ComposerAttachments />
          <ComposerPrimitive.Input
            placeholder={t('thread.placeholder')}
            className="aui-composer-input caret-primary placeholder:text-muted-foreground/60 max-h-48 min-h-9 w-full resize-none bg-transparent px-2.5 py-1 text-base leading-6 outline-none"
            rows={1}
            autoFocus={!COARSE_POINTER}
            enterKeyHint="send"
            aria-label="Message input"
          />
          <ComposerAction />
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

const ComposerAction = () => {
  return (
    <div className="aui-composer-action-wrapper relative flex items-center justify-between">
      <ComposerAttachmentAction />
      <div className="flex items-center gap-1.5">
        {/* Which model the next message goes to, at the point of writing it —
            the settings panel is behind a toggle and often shut. Sits with the
            send controls, since it decides where sending goes. */}
        <ComposerModelPicker />
        <AuiIf condition={(s) => s.thread.capabilities.dictation}>
          <AuiIf condition={(s) => s.composer.dictation == null}>
            <ComposerPrimitive.Dictate asChild>
              <TooltipIconButton
                tooltip="Voice input"
                side="bottom"
                type="button"
                variant="ghost"
                size="icon"
                className="aui-composer-dictate text-muted-foreground hover:text-foreground size-7 rounded-full"
                aria-label="Start voice input"
              >
                <MicIcon className="aui-composer-dictate-icon size-4" />
              </TooltipIconButton>
            </ComposerPrimitive.Dictate>
          </AuiIf>
          <AuiIf condition={(s) => s.composer.dictation != null}>
            <ComposerPrimitive.StopDictation asChild>
              <TooltipIconButton
                tooltip="Stop dictation"
                side="bottom"
                type="button"
                variant="ghost"
                size="icon"
                className="aui-composer-stop-dictation text-destructive size-7 rounded-full"
                aria-label="Stop voice input"
              >
                <SquareIcon className="aui-composer-stop-dictation-icon size-3.5 animate-pulse fill-current" />
              </TooltipIconButton>
            </ComposerPrimitive.StopDictation>
          </AuiIf>
        </AuiIf>
        <AuiIf condition={(s) => !s.thread.isRunning}>
          <ComposerPrimitive.Send asChild>
            <TooltipIconButton
              tooltip="Send message"
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-send size-7 rounded-full"
              aria-label="Send message"
            >
              <ArrowUpIcon className="aui-composer-send-icon size-4" />
            </TooltipIconButton>
          </ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(s) => s.thread.isRunning}>
          <ComposerPrimitive.Cancel asChild>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-cancel size-7 rounded-full"
              aria-label="Stop generating"
            >
              <SquareIcon className="aui-composer-cancel-icon size-3.5 fill-current" />
            </Button>
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </div>
    </div>
  );
};

const MessageError = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage = () => {
  const {
    ToolFallback: ToolFallbackComponent = ToolFallback,
    ToolGroup,
    ReasoningGroup,
  } = useContext(ThreadComponentsContext);
  const t = useT();
  const stopped = useAuiState(
    (s) => s.message.status?.type === 'incomplete' && s.message.status.reason === 'cancelled',
  );

  const ACTION_BAR_PT = 'pt-1.5';
  // Keep the action bar inside the contained root's paint box, then cancel its reserved space in flow.
  const ACTION_BAR_HEIGHT = `min-h-7.5 ${ACTION_BAR_PT}`;

  return (
    <MessagePrimitive.Root
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      className="fade-in slide-in-from-bottom-1 animate-in relative -mb-7.5 pb-7.5 duration-150 [contain-intrinsic-size:auto_200px] [content-visibility:auto]"
    >
      <div
        data-slot="aui_assistant-message-content"
        className="text-foreground px-2 leading-relaxed wrap-break-word"
      >
        <MessagePrimitive.GroupedParts
          groupBy={groupPartByType({
            reasoning: ['group-chainOfThought', 'group-reasoning'],
            'tool-call': ['group-chainOfThought', 'group-tool'],
            'standalone-tool-call': [],
          })}
        >
          {({ part, children }) => {
            switch (part.type) {
              case 'group-chainOfThought':
                return <div data-slot="aui_chain-of-thought">{children}</div>;
              case 'group-tool':
                if (ToolGroup) {
                  return <ToolGroup group={part}>{children}</ToolGroup>;
                }
                return (
                  <ToolGroupRoot variant="ghost">
                    <ToolGroupTrigger
                      count={part.indices.length}
                      active={part.status.type === 'running'}
                    />
                    <ToolGroupContent>{children}</ToolGroupContent>
                  </ToolGroupRoot>
                );
              case 'group-reasoning': {
                if (ReasoningGroup) {
                  return <ReasoningGroup group={part}>{children}</ReasoningGroup>;
                }
                const running = part.status.type === 'running';
                return (
                  <ReasoningRoot streaming={running}>
                    <ReasoningTrigger active={running} />
                    <ReasoningContent aria-busy={running}>
                      <ReasoningText>{children}</ReasoningText>
                    </ReasoningContent>
                  </ReasoningRoot>
                );
              }
              case 'text':
                return <MarkdownText />;
              case 'reasoning':
                return <Reasoning {...part} />;
              case 'tool-call':
                return part.toolUI ?? <ToolFallbackComponent {...part} />;
              case 'data':
                return part.dataRendererUI;
              case 'file':
                return (
                  <div data-slot="aui_assistant-message-file" className="py-1">
                    <File {...part} />
                  </div>
                );
              case 'image':
                return (
                  <div data-slot="aui_assistant-message-image" className="py-1">
                    <Image {...part} />
                  </div>
                );
              case 'indicator':
                return (
                  <div
                    data-slot="aui_assistant-message-indicator"
                    role="status"
                    className="text-muted-foreground flex items-center gap-2 py-1.5 text-sm"
                  >
                    {/* background-clip: text can't reach an SVG stroke, so the icon pulses instead. */}
                    <BrainIcon
                      aria-hidden
                      className="size-4 shrink-0 animate-pulse motion-reduce:animate-none"
                    />
                    <span className="relative inline-block leading-none">
                      {t('thread.thinking')}
                      {/* Highlight to full foreground, not the default faint tint, so the hint reads at a glance. */}
                      <span
                        aria-hidden
                        className="shimmer shimmer-color-foreground pointer-events-none absolute inset-0 motion-reduce:animate-none"
                      >
                        {t('thread.thinking')}
                      </span>
                    </span>
                  </div>
                );
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <MessageError />
      </div>

      <div
        data-slot="aui_assistant-message-footer"
        className={cn('ms-2 flex items-center', ACTION_BAR_HEIGHT)}
      >
        {stopped ? (
          <span className="text-muted-foreground text-sm">{t('thread.stopped')}</span>
        ) : (
          <AssistantActionBar />
        )}
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar = () => {
  const t = useT();

  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-assistant-action-bar-root text-muted-foreground animate-in fade-in col-start-3 row-start-2 -ms-1 flex gap-1 duration-200"
    >
      <ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip={t('thread.copy')}>
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon className="animate-in zoom-in-50 fade-in duration-200 ease-out" />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon className="animate-in zoom-in-75 fade-in duration-150" />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.ExportMarkdown asChild>
        <TooltipIconButton tooltip={t('thread.export')}>
          <DownloadIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.ExportMarkdown>
    </ActionBarPrimitive.Root>
  );
};

const UserFilePart = (part) => (
  <div data-slot="aui_user-message-file" className="py-1">
    <File {...part} />
  </div>
);

const UserImagePart = (part) => (
  <div data-slot="aui_user-message-image" className="py-1">
    <Image {...part} />
  </div>
);

const UserMessage = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_user-message-root"
      className="fade-in slide-in-from-bottom-1 animate-in grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [contain-intrinsic-size:auto_200px] [content-visibility:auto] [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <UserMessageAttachments />

      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div className="aui-user-message-content peer bg-muted text-foreground rounded-[12px] px-3.5 py-2 wrap-break-word empty:hidden">
          <MessagePrimitive.Parts components={{ File: UserFilePart, Image: UserImagePart }} />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};
