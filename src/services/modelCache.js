import { LOCAL_MODELS } from './localModels';

// transformers.js caches downloaded weights here (env.cacheKey). Hard-coded
// rather than imported from the library, because importing it would pull the
// ~23 MB runtime into the initial bundle just to read a string.
const MODEL_CACHE_NAME = 'transformers-cache';

// A download needs more room than its own byte count: the Cache API holds the
// response while it writes, and the quota itself can shrink mid-download as the
// disk fills. 15% covers both without being so cautious that a download which
// would have succeeded gets flagged as impossible.
const HEADROOM = 1.15;

/**
 * Whether `needed` bytes plausibly fit in `free`.
 *
 * Returns null when there is nothing to judge — no estimate available, or no
 * pending download — so callers can tell "will not fit" from "cannot say".
 * Every browser reports quota approximately, so a true here is a likelihood,
 * not a reservation; the download can still fail and must still be caught.
 */
export function fitsInStorage(free, needed) {
  if (free == null || !needed) return null;
  return free >= needed * HEADROOM;
}

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

// Models whose download was stopped part-way. The cache itself cannot answer
// "complete?" — transformers.js writes each file as it lands and keys them by
// URL, so a half-finished model looks exactly like a whole one. Without this
// list a cancelled download would be auto-restored on the next refresh, quietly
// fetching the rest of a 1.5 GB model behind a skeleton.
const INCOMPLETE_KEY = 'ai-chat:incomplete-models';

// localStorage itself throws where site data is blocked, not just on bad JSON.
function readIds(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIds(key, ids) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* nothing to record it in; the download simply is not remembered */
  }
}

export function readIncompleteModels() {
  return readIds(INCOMPLETE_KEY);
}

export function markIncomplete(modelId) {
  const ids = readIncompleteModels();
  if (ids.includes(modelId)) return;
  writeIds(INCOMPLETE_KEY, [...ids, modelId]);
}

/** Called once a model has loaded in full, whatever it was flagged as before. */
export function clearIncomplete(modelId) {
  const ids = readIncompleteModels();
  if (!ids.includes(modelId)) return;
  writeIds(
    INCOMPLETE_KEY,
    ids.filter((id) => id !== modelId),
  );
}

/**
 * Delete every cache transformers.js writes to, and report whether they went.
 *
 * `env.cacheKey` is configurable and the library's cross-origin backend keeps a
 * second cache of its own, so matching by name rather than deleting one
 * constant means a renamed or additional store cannot survive the clear and
 * leave the panel reporting models that were supposed to be gone.
 */
export async function clearModelCache() {
  // Nothing is half-downloaded once nothing is downloaded at all.
  try {
    localStorage.removeItem(INCOMPLETE_KEY);
  } catch {
    /* never written in the first place */
  }
  if (typeof caches === 'undefined') return true;

  const targets = await modelCacheNames();
  await Promise.all(targets.map((name) => caches.delete(name)));

  // `caches.delete` resolves false for a cache that was not there, which is not
  // a failure. What matters is that none of them is there now.
  const remaining = await caches.keys();
  return !remaining.some((name) => targets.includes(name));
}

// Every cache transformers.js may have written to — see clearModelCache for why
// this matches by name rather than trusting one constant.
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
  clearIncomplete(modelId);
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
