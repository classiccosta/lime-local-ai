import { Thread } from '@/components/assistant-ui/thread';
import { Mark } from '@/components/Mark';
import { ErrorBanner } from '@/features/chat/components/ErrorBanner';
import { Title } from '@/features/chat/components/Title';
import { useAssistantRuntime } from '@/features/chat/hooks/useAssistantRuntime';
import { useSession } from '@/features/chat/hooks/useSession';
import { MobileHeader } from '@/features/layout/components/MobileHeader';
import { MobileSheet } from '@/features/layout/components/MobileSheet';
import { ModelPicker } from '@/features/models/components/ModelPicker';
import { ComposerModelsContext } from '@/features/models/composerModels';
import { useModelSetup } from '@/features/models/hooks/useModelSetup';
import { SessionSidebar } from '@/features/sessions/components/SessionSidebar';
import { useSessions } from '@/features/sessions/hooks/useSessions';
import { SettingsContent } from '@/features/settings/components/SettingsContent';
import { SettingsDialog } from '@/features/settings/components/SettingsDialog';
import { useEndpoint } from '@/features/settings/hooks/useEndpoint';
import { usePanel } from '@/features/settings/hooks/usePanel';
import { useT } from '@/i18n/context';
import { useKeyboardInset } from '@/lib/useKeyboardInset';
import { useIsMobile } from '@/lib/useMediaQuery';
import { cn } from '@/lib/utils';
import { useConversation } from '@/state/useConversation';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useState } from 'react';

export default function App() {
  const t = useT();
  const { endpoint, setEndpoint } = useEndpoint();
  const { models, selectedModelId, selectedModel, restored, picker, endpointStatus } =
    useModelSetup({ endpoint, setEndpoint });
  const sessions = usePanel();
  // Below `md` the sessions panel stops fitting beside the thread, so it becomes
  // a sheet over it. Its open state is separate from the desktop one and starts
  // shut: a remembered "expanded" rail is a reasonable thing to restore, a
  // remembered open drawer covering the whole screen is not.
  const isMobile = useIsMobile();
  useKeyboardInset();
  const [drawer, setDrawer] = useState(null);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const { conversation, dispatch, title } = useConversation();

  const { send } = useSession({ conversation, dispatch, models, selectedModelId, endpoint });

  const { sessionList, openSession, deleteSessionFromList, newSession, canCreate, storageError } =
    useSessions({
      conversation,
      dispatch,
      title,
    });

  const runtime = useAssistantRuntime({ conversation, dispatch, send });

  const closeDrawer = () => setDrawer(null);

  // `restored` rather than a runtime check: the composer lists every provider.
  const composerModels = {
    picker,
    selectedModel,
    restoring: !restored,
    onOpenSettings: () => setSettingsOpen(true),
  };

  const sessionsBody = (
    <div
      // Unselectable down to its padding, like the sidebar inside it.
      className={cn(
        'h-full text-sm select-none',
        isMobile ? 'p-4' : sessions.open ? 'px-4 py-3' : 'px-2 py-3',
      )}
    >
      <SessionSidebar
        sessions={sessionList}
        activeId={conversation.sessionId}
        // Another chat switches behind the open sheet, so several can be
        // looked through in a row; tapping the one already open is the way
        // back to it, and closes the sheet as before.
        onSelect={(id) => {
          if (id === conversation.sessionId) {
            closeDrawer();
            return;
          }
          openSession(id);
        }}
        onDelete={deleteSessionFromList}
        onNew={newSession}
        // The sessions sheet closes first on a phone, so the dialog is not
        // opened underneath another modal.
        onOpenSettings={() => {
          closeDrawer();
          setSettingsOpen(true);
        }}
        canCreate={canCreate}
        // Always expanded in the sheet: the rail exists to reclaim width beside
        // the thread, and a sheet is not beside anything.
        open={isMobile || sessions.open}
        onToggle={isMobile ? closeDrawer : sessions.toggle}
        sheet={isMobile}
      />
    </div>
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ComposerModelsContext.Provider value={composerModels}>
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SettingsContent
            models={<ModelPicker {...picker} />}
            endpoint={endpoint}
            endpointStatus={endpointStatus}
          />
        </SettingsDialog>
        {/* The visible height, measured by useKeyboardInset: with the keyboard
            open it is the area above it, so the whole layout shrinks and closes
            up instead of being pushed up. 100% until it has been measured. */}
        {/* The height changes in one step; what rides on the keyboard slides
            there on its own (useKeyboardInset, `data-keyboard-follow`). */}
        <div className="flex h-[var(--app-height,100%)]">
          <aside
            hidden={isMobile}
            className={cn(
              'bg-sidebar shrink-0 border-r transition-[width] duration-200 motion-reduce:transition-none',
              sessions.open ? 'w-64' : 'w-13',
            )}
          >
            {sessionsBody}
          </aside>

          <main className="relative flex min-w-0 flex-1 flex-col">
            {/* Two headers, not one restyled: the desktop one floats over the
                thread behind a fade, the mobile one is a solid bar in the flow
                carrying the controls the hidden panels used to hold. */}
            {isMobile ? (
              <MobileHeader
                title={title}
                onOpenSessions={() => setDrawer('sessions')}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            ) : (
              <div className="absolute inset-x-0 top-0 z-10">
                {/* Opaque across the header band, then fades out, so the bar
                  ends on a soft edge rather than a border. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(to_bottom,var(--background)_0px,var(--background)_44px,transparent_100%)]"
                />
                <header className="relative flex h-11 items-center gap-2.5 px-4 pt-2">
                  <Mark className="text-sm" />
                  <Title>{title}</Title>
                </header>
              </div>
            )}

            {/* The banner floats over the top of the thread rather than taking
                a row of its own, so it appearing and fading never shifts the
                messages or the composer. On desktop the header floats over the
                top of `main` too (h-11), so the banner starts below it; the
                mobile header is in the flow, above this container already. */}
            <div className="relative min-h-0 flex-1">
              <div
                className={cn(
                  'pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col',
                  !isMobile && 'top-11',
                )}
              >
                <ErrorBanner key={conversation.errorCount} message={conversation.error} />
                <ErrorBanner
                  key={`storage-${storageError?.count ?? 0}`}
                  message={storageError ? t(storageError.key) : null}
                />
              </div>
              <Thread />
            </div>
          </main>
        </div>

        {/* Mounted only below the breakpoint, so the panel exists in exactly one
            container at a time and nothing is rendered twice. */}
        {isMobile && (
          <MobileSheet
            open={drawer === 'sessions'}
            onOpenChange={(next) => setDrawer(next ? 'sessions' : null)}
            label={t('panel.sessions')}
            selectable={false}
          >
            <div className="min-h-0 flex-1">{sessionsBody}</div>
          </MobileSheet>
        )}
      </ComposerModelsContext.Provider>
    </AssistantRuntimeProvider>
  );
}
