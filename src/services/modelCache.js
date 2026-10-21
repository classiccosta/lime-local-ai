import { LOCAL_MODELS } from './localModels';

// transformers.js caches downloaded weights here (env.cacheKey). Hard-coded
// rather than imported from the library, because importing it would pull the
// ~23 MB runtime into the initial bundle just to read a string.
const MODEL_CACHE_NAME = 'transformers-cache';

/**
 * Size and contents of the model cache, without reading a single response body.
 *
 * `StorageManager.estimate()` exposes a per-mechanism breakdown through
 * `usageDetails`, but that field is Chromium-only. The same figure can be summed
 * from the entries' Content-Length headers, which costs one `keys()` call plus a
 * header lookup each. If any entry lacks the header the sum would silently
 * under-report, so the size is reported as null rather than deserialising
 * gigabytes of blobs to find out.
 */
const EMPTY_CACHE = { present: false, bytes: null, modelIds: [] };

async function readCache() {
  // `caches` is absent outside a secure context, and `has`/`open` throw outright
  // in a private window or a cross-origin frame. Reporting an empty cache is
  // right in every one of those cases — and letting the rejection escape would
  // leave the caller unable to tell that the read had finished at all.
  if (typeof caches === 'undefined') return EMPTY_CACHE;
  try {
    return await readCacheEntries();
  } catch {
    return EMPTY_CACHE;
  }
}

async function readCacheEntries() {
  if (!(await caches.has(MODEL_CACHE_NAME))) {
    return EMPTY_CACHE;
  }

  const cache = await caches.open(MODEL_CACHE_NAME);
  const requests = await cache.keys();

  // transformers.js keys entries by their Hugging Face URL, which embeds the
  // repo id. An interrupted download leaves some of a model's files behind, so
  // this means "has files for", not "complete" — the loader re-fetches whatever
  // is missing either way, and the fit check only errs towards optimism.
  const urls = requests.map((request) => request.url);
  const modelIds = LOCAL_MODELS.filter((model) => urls.some((url) => url.includes(model.id))).map(
    (model) => model.id,
  );

  let bytes = 0;
  for (const request of requests) {
    const response = await cache.match(request);
    const length = response?.headers.get('content-length');
    if (length == null) {
      bytes = null;
      break;
    }
    bytes += Number(length);
  }

  return { present: true, bytes, modelIds };
}

// `navigator.storage.persisted?.()` evaluates to undefined where the method is
// missing, and chaining `.catch` onto undefined throws — so the optional call is
// awaited before anything is done with its result.
async function isPersisted() {
  try {
    return (await navigator.storage.persisted?.()) ?? false;
  } catch {
    return false;
  }
}

/**
 * Ask the browser to exempt this origin from eviction under disk pressure.
 *
 * Firefox also grants persisted origins a larger quota, so this is worth calling
 * before a large download rather than warning about its absence afterwards.
 * Chromium decides silently from engagement heuristics and never prompts;
 * Firefox may prompt. Idempotent — it resolves true when already granted.
 */
export async function requestPersistence() {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/**
 * A snapshot of what this origin is using and how much room is left.
 *
 * `estimate()` is the only storage-accounting API present in every target
 * browser, and every one of them fuzzes what it returns: Chromium sets quota to
 * a share of free disk so it moves as the disk fills, Firefox rounds usage into
 * blocks, Safari starts small and raises the quota on demand. The figures are
 * good enough to warn with and not good enough to gate on.
 */
export async function readStorage() {
  if (!navigator.storage?.estimate) return null;

  const { usage = 0, quota = 0, usageDetails } = await navigator.storage.estimate();
  const cache = await readCache();

  return {
    usage,
    // The origin's total budget, not what is left in it. `free` is the figure
    // the meter reports; reading `quota` as "available" was the original bug.
    quota,
    free: Math.max(0, quota - usage),
    // Prefer the browser's own breakdown where it exists, fall back to the
    // header sum everywhere else.
    models: usageDetails?.caches ?? cache.bytes,
    // No portable way to size an IndexedDB database, so this row stays
    // Chromium-only and the component hides it when null.
    conversations: usageDetails?.indexedDB ?? null,
    hasModelCache: cache.present,
    cachedModelIds: cache.modelIds,
    persisted: await isPersisted(),
  };
}

// Every cache transformers.js may have written to. `env.cacheKey` is configurable
// and the library's cross-origin backend keeps a second cache of its own, so
// matching by name means neither can keep a deleted model's files.
async function modelCacheNames() {
  const names = await caches.keys();
  return names.filter((name) => name === MODEL_CACHE_NAME || name.includes('transformers'));
}

/**
 * Delete one model's files, leaving the others on disk.
 *
 * Entries are keyed by their Hugging Face URL, which embeds the repo id — the
 * same match `readCacheEntries` uses to decide a model is cached at all, so
 * whatever made it count as downloaded is exactly what goes.
 */
export async function deleteModelFromCache(modelId) {
  if (typeof caches === 'undefined') return;

  for (const name of await modelCacheNames()) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    await Promise.all(
      requests
        .filter((request) => request.url.includes(modelId))
        .map((request) => cache.delete(request)),
    );
  }
}
