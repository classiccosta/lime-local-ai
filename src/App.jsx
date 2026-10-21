import { Thread } from '@/components/assistant-ui/thread';
import { Mark } from '@/components/Mark';
import { ErrorBanner } from '@/features/chat/components/ErrorBanner';
import { Title } from '@/features/chat/components/Title';
import { useAssistantRuntime } from '@/features/chat/hooks/useAssistantRuntime';
import { useSession } from '@/features/chat/hooks/useSession';
import { MobileHeader } from '@/features/layout/components/MobileHeader';
import { MobileSheet } from '@/features/layout/components/MobileSheet';
import { ModelPicker } from '@/features/models/components/ModelPicker';
import { shortLabel } from '@/features/models/labels';
import { isStaleSelection } from '@/features/models/selection';
import { ComposerModelsContext } from '@/features/models/composerModels';
import { useModels } from '@/features/models/hooks/useModels';
import { useRuntime } from '@/features/models/hooks/useRuntime';
import { SessionSidebar } from '@/features/sessions/components/SessionSidebar';
import { useSessions } from '@/features/sessions/hooks/useSessions';
import { EndpointField } from '@/features/settings/components/EndpointField';
import { LanguageSwitch } from '@/features/settings/components/LanguageSwitch';
import { SettingsDialog } from '@/features/settings/components/SettingsDialog';
import { SettingValue } from '@/features/settings/components/SettingValue';
import { useEndpoint } from '@/features/settings/hooks/useEndpoint';
import { usePanel } from '@/features/settings/hooks/usePanel';
import { useStorage } from '@/features/settings/hooks/useStorage';
import { useT } from '@/i18n/context';
import { useKeyboardInset } from '@/lib/useKeyboardInset';
import { useIsMobile } from '@/lib/useMediaQuery';
import { cn } from '@/lib/utils';
import { findLocalModel } from '@/services/localModels';
import { useConversation } from '@/state/useConversation';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { Cloud, HardDrive } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function App() {
  const t = useT();
  const { endpoint, setEndpoint } = useEndpoint();
  const {
    storage,
    storageReady,
    refresh: refreshStorage,
    requestPersist,
    removeModel,
  } = useStorage();
  const sessions = usePanel('sessions');
  // Below `md` the sessions panel stops fitting beside the thread, so it becomes
  // a sheet over it. Its open state is separate from the desktop one and starts
  // shut: a remembered "expanded" rail is a reasonable thing to restore, a
  // remembered open drawer covering the whole screen is not.
  const isMobile = useIsMobile();
  useKeyboardInset();
  const [drawer, setDrawer] = useState(null);

  const {
    models,
    loading,
    error,
    setSelectedModelId,
    selectedModelId,
    loadedModelIds,
    loadModelById,
    loadingModelId,
    forgetModel,
    busy,
    attemptError,
    attemptModelId,
    fetching,
    load,
    endpointError,
  } = useModels({ endpoint });

  // No longer a filter on what settings shows — both providers are listed in one
  // column — but still persisted with the model, and set whenever one is chosen.
  const { setRuntimeId } = useRuntime();
  // The model list is one flat set tagged by provider; settings splits it back
  // into its two sources.
  const webgpuModels = models.filter((model) => model.provider === 'Web-GPU');
  const endpointModels = models.filter((model) => model.provider === 'LM-Studio');
  // On disk, whether or not on the GPU yet. A loaded model is on disk by
  // definition, and listing it here covers the moment before the storage
  // re-read that its load triggers comes back.
  const downloaded = new Set([...(storage?.cachedModelIds ?? []), ...loadedModelIds]);
  // Once an endpoint has answered with models, its list replaces the field; this
  // brings the field back to point somewhere else.
  const [editingEndpoint, setEditingEndpoint] = useState(false);

  // A finished download changes what is on disk. So does a failed one, which
  // may have filled the quota on the way to giving up. Keyed on the loaded list
  // rather than on the status flag, because a model restored in the background
  // never shows up in the selected model's status.
  useEffect(() => {
    if (loadedModelIds.length || attemptError) refreshStorage();
  }, [loadedModelIds, attemptError, refreshStorage]);

  const [settingsOpen, setSettingsOpen] = useState(false);

  // A refresh empties the map in llm.js, so every model whose weights are still
  // on disk comes back listed as cached but unable to generate. All of them are
  // loaded once on startup so that state is true rather than cosmetic — they
  // read from the cache, which costs GPU memory and compile time but no network.
  //
  // Held back until both the model list and the cache contents are known, so the
  // picker is not shown and then immediately taken away again. One model at a
  // time, selected first, since that is the one the user is about to use. The
  // ref keeps the storage refresh each load triggers from starting it over.
  const [restored, setRestored] = useState(false);
  const restoreStarted = useRef(false);
  useEffect(() => {
    if (restoreStarted.current || loading || !storageReady) return;
    restoreStarted.current = true;
    const cached = storage?.cachedModelIds ?? [];
    // A cached id missing from the list has no runtime to load it — no WebGPU,
    // so providers dropped the in-browser models entirely.
    const restorable = models
      .filter((model) => model.requiresLoad && cached.includes(model.id))
      .map((model) => model.id)
      .sort((a, b) => (a === selectedModelId ? -1 : b === selectedModelId ? 1 : 0));
    (async () => {
      try {
        for (const id of restorable) await loadModelById(id);
      } finally {
        // Whatever happened to the models, the picker comes back. A restore
        // that cannot finish must not leave the app with no way to choose one.
        setRestored(true);
      }
    })();
  }, [loading, storageReady, storage, models, selectedModelId, loadModelById]);

  // Picking from the composer is a different act from picking in Settings: the
  // model is one the user can send to right now, so the runtime switch follows
  // the choice rather than filtering it. `generate` dispatches on the model's
  // own provider, so this only keeps the panel showing what the composer did.
  const chooseModel = (id) => {
    const model = models.find((entry) => entry.id === id);
    if (!model) return;
    setRuntimeId(model.provider);
    setSelectedModelId(id);
  };

  // From the composer: a model that is not downloaded yet. Selecting it makes
  // the settings panel's progress bar and info card follow the download, and
  // persistence is requested first, exactly as the Load button does.
  const loadFromComposer = async (id) => {
    chooseModel(id);
    await requestPersist();
    loadModelById(id);
  };

  // Nothing selected and something ready to answer: choose it rather than
  // leaving the composer saying "Select a model" over a picker with one entry.
  // Waits for the restore to finish so a model coming back from cache is
  // preferred over an endpoint's, and fires once — a later runtime switch
  // clears the selection deliberately, and re-picking there would fight it.
  // The stale check has its own guard and runs on every list change: behind
  // the once-only guard, a model dropped after auto-select stayed selected.
  const autoSelected = useRef(false);
  useEffect(() => {
    if (!restored) return;
    // A list that failed outright says nothing about what exists. Cleared
    // rather than replaced: the run this triggers picks in the usual order.
    // Re-armed because nobody chose this empty selection, unlike a runtime
    // switch, so a loaded model can take over from the one that went away.
    if (!error && isStaleSelection({ selectedModelId, models, endpointError })) {
      autoSelected.current = false;
      setSelectedModelId('');
      return;
    }
    if (autoSelected.current || selectedModelId) return;
    const first =
      models.find((model) => model.requiresLoad && loadedModelIds.includes(model.id)) ??
      models.find((model) => !model.requiresLoad);
    if (!first) return;
    autoSelected.current = true;
    chooseModel(first.id);
    // chooseModel is redefined every render and would restart the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, selectedModelId, models, loadedModelIds, error, endpointError]);

  const loadFromEndpoint = (url) => {
    setEndpoint(url);
    // Only a model from the old endpoint stops being reachable. An in-browser
    // one is listed beside it now, and pointing elsewhere does not touch it.
    // The same endpoint reloaded is left to the stale check, so a model it
    // still offers stays selected. Re-armed for the same reason as there.
    if (url !== endpoint && endpointModels.some((model) => model.id === selectedModelId)) {
      autoSelected.current = false;
      setSelectedModelId('');
    }
    setEditingEndpoint(false);
    load(url);
  };

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

  // Memory first: a load still running for this model would write its files
  // back between the delete and the re-read.
  const deleteModel = async (id) => {
    await forgetModel(id);
    await removeModel(id);
    if (selectedModelId === id) setSelectedModelId('');
  };

  // Downloaded models are marked rather than the rest: on-disk is the state
  // worth seeing at a glance, and the rest already carry a download mark and
  // their size. Picking a loaded one just selects it; one on disk but not on
  // the GPU loads from disk. A model not downloaded is fetched only from its
  // download icon, through the composer's path (select, ask for persistence,
  // load). Only one model compiles at a time, so the rest wait while one is
  // in flight.
  const webgpuItems = webgpuModels.map((model) => {
    const onDisk = downloaded.has(model.id);
    const loadingThis = loadingModelId === model.id;
    return {
      id: model.id,
      label: onDisk ? shortLabel(model) : (model.label ?? model.id),
      icon: onDisk ? HardDrive : null,
      iconLabel: t('settings.downloaded'),
      active: model.id === selectedModelId && loadedModelIds.includes(model.id),
      busy: loadingThis,
      disabled: busy && !loadingThis,
      dim: !onDisk,
      pickable: onDisk,
      onDownload: onDisk ? undefined : () => loadFromComposer(model.id),
      downloadLabel: t('settings.download', { name: shortLabel(model) }),
      onDelete: onDisk && !loadingThis ? () => deleteModel(model.id) : undefined,
      deleteLabel: t('settings.deleteHint', { name: shortLabel(model) }),
    };
  });

  const endpointItems = endpointModels.map((model) => ({
    id: model.id,
    label: model.label ?? model.id,
    icon: Cloud,
    iconLabel: t('settings.remote'),
    active: model.id === selectedModelId,
  }));

  // The in-browser rows only once the restore has settled: until then the
  // skeleton stands in for them, and the endpoint's rows need no such wait.
  const webgpuReady = !loading && !error && restored;
  const pickModel = (id) => {
    if (!webgpuModels.some((model) => model.id === id) || loadedModelIds.includes(id)) {
      chooseModel(id);
    } else {
      loadFromComposer(id);
    }
  };

  // Built once and handed to both pickers — the settings dialog and the
  // composer's menu — so they show and do exactly the same thing.
  const modelPicker = {
    items: [...(webgpuReady ? webgpuItems : []), ...endpointItems],
    onPick: pickModel,
    loading,
    error,
    restored,
    noWebgpu: webgpuModels.length === 0,
    // Named, because it may belong to a model other than the selected one.
    loadingError: attemptError
      ? `${shortLabel(findLocalModel(attemptModelId) ?? { id: attemptModelId })}: ${attemptError}`
      : null,
    ariaLabel: t('settings.models'),
  };
  // `restored` rather than a runtime check: the composer lists every provider.
  const composerModels = {
    picker: modelPicker,
    selectedModel: models.find((model) => model.id === selectedModelId),
    restoring: !restored,
  };

  // A failing endpoint always shows the field, where its error is.
  const editEndpoint = editingEndpoint || endpointModels.length === 0 || Boolean(endpointError);

  // Written as elements rather than an extracted component because they read
  // two dozen values from this scope. One column, both providers: a tab per
  // provider hid half of what could be picked at any moment.
  const settingsSections = (
    <>
      <section className="flex flex-col gap-2">
        {/* Same face as the Endpoint and Language titles below it. */}
        <h3 className="text-muted-foreground text-xs">{t('settings.models')}</h3>

        <ModelPicker {...modelPicker} />
      </section>

      {/* The field carries its own "Endpoint" label, so the title is only
          drawn over the plain value. */}
      <section className="flex flex-col gap-2 border-t pt-3">
        {editEndpoint ? (
          <EndpointField
            endpoint={endpoint}
            onLoad={loadFromEndpoint}
            fetching={fetching}
            error={endpointError}
            modelCount={endpointModels.length}
          />
        ) : (
          <>
            <span className="text-muted-foreground text-xs">{t('settings.endpointTitle')}</span>
            <SettingValue
              value={endpoint}
              changeLabel={t('settings.changeEndpoint')}
              onChange={() => setEditingEndpoint(true)}
            />
          </>
        )}
      </section>

      <LanguageSwitch />
    </>
  );

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
          {settingsSections}
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
