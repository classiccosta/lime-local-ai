import { buildPickerItems } from '@/features/models/pickerItems';
import { useModels } from '@/features/models/hooks/useModels';
import { useStorage } from '@/features/models/hooks/useStorage';
import { shortLabel } from '@/features/models/labels';
import { isStaleSelection } from '@/features/models/selection';
import { useT } from '@/i18n/context';
import { findLocalModel } from '@/services/localModels';
import { useEffect, useRef, useState } from 'react';

/**
 * Everything App needs from the model list: what to send with, what the two
 * pickers show, and the endpoint section's state. Every way of changing the
 * selection (picking, loading, deleting, auto-select, stale clear) stays in
 * here, so App can only hand `picker` on. One hook, not several: the
 * auto-select guard is shared by its effect and by `loadFromEndpoint`.
 */
export function useModelSetup({ endpoint, setEndpoint }) {
  const t = useT();
  const {
    storage,
    storageReady,
    refresh: refreshStorage,
    requestPersist,
    removeModel,
  } = useStorage();

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

  // The model list is one flat set tagged by provider; settings splits it back
  // into its two sources.
  const webgpuModels = models.filter((model) => model.provider === 'webgpu');
  const endpointModels = models.filter((model) => model.provider === 'endpoint');
  // On disk, whether or not on the GPU yet. A loaded model is on disk by
  // definition, and listing it here covers the moment before the storage
  // re-read that its load triggers comes back.
  const downloaded = new Set([...(storage?.cachedModelIds ?? []), ...loadedModelIds]);

  // A finished download changes what is on disk. So does a failed one, which
  // may have filled the quota on the way to giving up. Keyed on the loaded list
  // rather than on the status flag, because a model restored in the background
  // never shows up in the selected model's status.
  useEffect(() => {
    if (loadedModelIds.length || attemptError) refreshStorage();
  }, [loadedModelIds, attemptError, refreshStorage]);

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

  // From the composer: a model that is not downloaded yet. Selecting it makes
  // the settings panel's progress bar and info card follow the download, and
  // persistence is requested first, exactly as the Load button does.
  const loadFromComposer = async (id) => {
    setSelectedModelId(id);
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
    setSelectedModelId(first.id);
  }, [restored, selectedModelId, models, loadedModelIds, error, endpointError, setSelectedModelId]);

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
    load(url);
  };

  // Memory first: a load still running for this model would write its files
  // back between the delete and the re-read.
  const deleteModel = async (id) => {
    await forgetModel(id);
    await removeModel(id);
    if (selectedModelId === id) setSelectedModelId('');
  };

  // The in-browser rows only once the restore has settled: until then the
  // skeleton stands in for them, and the endpoint's rows need no such wait.
  const webgpuReady = !loading && !error && restored;
  const pickModel = (id) => {
    if (!webgpuModels.some((model) => model.id === id) || loadedModelIds.includes(id)) {
      setSelectedModelId(id);
    } else {
      loadFromComposer(id);
    }
  };

  // Built once and handed to both pickers — the settings dialog and the
  // composer's menu — so they show and do exactly the same thing.
  const modelPicker = {
    items: buildPickerItems({
      webgpuModels,
      endpointModels,
      downloaded,
      loadedModelIds,
      selectedModelId,
      loadingModelId,
      busy,
      webgpuReady,
      onDownload: loadFromComposer,
      onDelete: deleteModel,
      t,
    }),
    onPick: pickModel,
    loading,
    error,
    restored,
    // Named, because it may belong to a model other than the selected one.
    loadingError: attemptError
      ? `${shortLabel(findLocalModel(attemptModelId) ?? { id: attemptModelId })}: ${attemptError}`
      : null,
    ariaLabel: t('settings.models'),
  };

  const endpointStatus = {
    fetching,
    error: endpointError,
    modelCount: endpointModels.length,
    load: loadFromEndpoint,
  };

  return {
    models,
    selectedModelId,
    selectedModel: models.find((model) => model.id === selectedModelId),
    restored,
    picker: modelPicker,
    endpointStatus,
  };
}
