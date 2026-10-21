import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/context';
import { getModels, modelLoader, unloadModel } from '@/services/providers';

const SELECTED_KEY = 'ai-chat:model';

// What the user reads when a model fails to load. The library's own messages
// are written for developers — a stack of ONNX and WebGPU internals — so each
// failure is sorted into one of a few causes the user can act on, and the
// original goes to the console for whoever is debugging.
//
// Quota first: the browser aborts a Cache API write that would exceed the
// origin's quota, and transformers.js sometimes re-wraps that DOMException as a
// plain Error, so the message is checked as well as the name.
function describeLoadFailure(error, t) {
  console.error(error);
  const text = `${error?.name ?? ''} ${error?.message ?? ''}`;
  if (error?.name === 'QuotaExceededError' || /quota/i.test(text)) return t('model.storageFull');
  if (/failed to fetch|network|load failed/i.test(text)) return t('model.loadNetwork');
  if (/gpu|adapter|device|memory/i.test(text)) return t('model.loadGpu');
  return t('model.loadFailed');
}

const IDLE_ATTEMPT = { id: '', status: 'idle', error: null };

export function useModels({ endpoint } = {}) {
  const t = useT();
  const [models, setModels] = useState(null);
  const [error, setError] = useState(null);
  const [endpointError, setEndpointError] = useState(null);
  const [fetching, setFetching] = useState(false);
  // Restored on mount so a refresh comes back to the same model rather than an
  // empty picker. Paired with the persisted runtime, which keeps the restored id
  // in a list that contains it.
  const [selectedModelId, setSelectedModelId] = useState(
    () => localStorage.getItem(SELECTED_KEY) ?? '',
  );
  // The single load attempt in flight, tagged with the model it belongs to.
  const [attempt, setAttempt] = useState(IDLE_ATTEMPT);
  // Which models this tab has actually loaded. `attempt` describes the most
  // recent load and nothing else, so it cannot answer "is *this* model ready"
  // once the selection has moved on. Deliberately not persisted: it mirrors the
  // in-memory map in llm.js, which a refresh empties. App restores the truth by
  // re-loading the cached models rather than by restoring this list.
  const [loadedModelIds, setLoadedModelIds] = useState([]);
  // Ids already loaded or currently loading. Read synchronously so two callers
  // reaching for the same model in the same tick — the startup sweep and the
  // Load button — cannot both start it.
  const claimed = useRef(new Set());
  // The id the running attempt belongs to, readable outside a render. A delete
  // needs it, and reaching for it through the state updater would run the
  // abort twice under StrictMode.
  const loadingId = useRef('');
  // Aborts the running load's requests. llm.js threads this through env.fetch,
  // which is the only place transformers.js can be interrupted.
  const controller = useRef(null);

  // Only the newest request may write. An older probe of a slower endpoint must
  // not overwrite a newer one that already answered.
  const requestId = useRef(0);

  const load = useCallback(async (baseURL) => {
    const id = ++requestId.current;
    setFetching(true);
    setError(null);
    try {
      const { models: next, endpointError: probeError } = await getModels(baseURL);
      if (id === requestId.current) {
        setModels(next);
        setEndpointError(probeError);
      }
    } catch (err) {
      if (id === requestId.current) setError(err.message);
    } finally {
      if (id === requestId.current) setFetching(false);
    }
  }, []);

  // Initial probe uses whatever endpoint was stored. Later probes are explicit,
  // so typing a URL never fires a request per keystroke.
  const initialEndpoint = useRef(endpoint);
  useEffect(() => {
    load(initialEndpoint.current);
  }, [load]);

  const selectModel = useCallback((id) => {
    localStorage.setItem(SELECTED_KEY, id);
    setSelectedModelId(id);
  }, []);

  const selectedModel = models?.find((model) => model.id === selectedModelId);
  const requiresLoad = selectedModel?.requiresLoad ?? false;
  const isSelectedLoaded = loadedModelIds.includes(selectedModelId);
  // The newest entry is the one to return to when the runtime switch comes back
  // round, so the info card and the dropdown survive the trip.
  const lastLoadedModelId = loadedModelIds.at(-1) ?? '';

  /**
   * Load one model into GPU memory, by id.
   *
   * Resolves once the model is usable, so callers can await a sequence of them
   * instead of compiling several graphs at once.
   */
  const loadModelById = useCallback(
    async (id) => {
      if (!id || claimed.current.has(id)) return;
      claimed.current.add(id);
      loadingId.current = id;
      const attemptController = new AbortController();
      controller.current = attemptController;
      setAttempt({ id, status: 'loading', error: null });
      try {
        await modelLoader(id, attemptController.signal);
        // Aborting stops the downloads, but a model already past them is being
        // compiled on the GPU and will finish regardless. It is dropped rather
        // than adopted, so an abort means the same thing wherever it lands.
        if (attemptController.signal.aborted) return;
        loadingId.current = '';
        setAttempt((current) => (current.id === id ? { ...current, status: 'loaded' } : current));
        // Re-loading an already-known model would otherwise push a duplicate and
        // move it to the end of the list.
        setLoadedModelIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
      } catch (err) {
        // Released so the user can retry a failed model; a loaded one stays
        // claimed for the life of the tab, matching the map in llm.js.
        claimed.current.delete(id);
        // The abort surfaces as a fetch failure. It is the outcome asked for,
        // and forgetModel has already put the state where it belongs.
        if (attemptController.signal.aborted) return;
        loadingId.current = '';
        setAttempt((current) =>
          current.id === id
            ? { ...current, status: 'idle', error: describeLoadFailure(err, t) }
            : current,
        );
      } finally {
        if (controller.current === attemptController) controller.current = null;
      }
      // `t` is closed over for the one message this hook words itself.
    },
    [t],
  );

  /**
   * Drop one model, in this hook and in GPU memory, ahead of deleting its files.
   * Deleting the weights does not unload what is already compiled, so without
   * this the model would go on reporting as loaded. A load still running for it
   * is aborted, or it would write the files straight back.
   */
  const forgetModel = useCallback(async (id) => {
    if (loadingId.current === id) {
      controller.current?.abort();
      loadingId.current = '';
    }
    const wasClaimed = claimed.current.delete(id);
    setAttempt((current) => (current.id === id ? IDLE_ATTEMPT : current));
    setLoadedModelIds((ids) => ids.filter((loadedId) => loadedId !== id));
    if (wasClaimed) await unloadModel(id);
  }, []);

  const loader = useCallback(() => {
    if (!requiresLoad) return Promise.resolve();
    return loadModelById(selectedModelId);
  }, [requiresLoad, selectedModelId, loadModelById]);

  return {
    models: models ?? [],
    loading: models === null && error === null,
    fetching,
    error,
    endpointError,
    load,
    selectedModelId,
    setSelectedModelId: selectModel,
    loadedModelIds,
    lastLoadedModelId,
    isSelectedLoaded,
    loader,
    loadModelById,
    forgetModel,
    // The model of the current attempt, for as long as it still has something
    // to show — a bar while it runs, an error once it fails. A runtime switch
    // clears the selection; this is what it comes back to, so neither is lost
    // on the trip.
    activeAttemptId: attempt.status === 'loading' || attempt.error ? attempt.id : '',
    // Strictly the model a load is running for. `busy` says only that *some*
    // load is in flight, which is the right gate for a control and the wrong
    // one for a label: a list keyed on it reports every row as downloading.
    loadingModelId: attempt.status === 'loading' ? attempt.id : '',
    // The last attempt's error whichever model it was for — the selection can
    // move on while a load fails, and that failure still needs reporting.
    attemptError: attempt.error,
    attemptModelId: attempt.id,
    // Any model loading, selected or not — one graph compiles at a time, so the
    // Load button stays disabled while a background restore is still running.
    busy: attempt.status === 'loading',
    requiresLoad,
    isReady: Boolean(selectedModel) && (!requiresLoad || isSelectedLoaded),
  };
}
