import { useCallback, useEffect, useState } from 'react';
import {
  clearModelCache,
  deleteModelFromCache,
  readStorage,
  requestPersistence,
} from '@/services/modelCache';

export function useStorage() {
  const [storage, setStorage] = useState(null);
  const [clearing, setClearing] = useState(false);
  // A browser without `estimate()` leaves `storage` null for good, so null
  // alone cannot say whether the first read has happened. Callers that wait on
  // the cache contents — the startup restore — need to tell the two apart.
  const [ready, setReady] = useState(false);

  // Read once on mount. Resolving inside .then keeps the write out of the
  // effect body, and the flag stops a slow read landing after unmount.
  useEffect(() => {
    let cancelled = false;
    // `ready` gates the startup restore, so a rejection here would hold the
    // whole model picker behind a skeleton that never resolves. Not knowing the
    // figures is a state the panel already renders; never finding out is not.
    readStorage()
      .catch(() => null)
      .then((next) => {
        if (cancelled) return;
        setStorage(next);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    setStorage(await readStorage().catch(() => null));
    setReady(true);
  }, []);

  const clear = useCallback(async () => {
    setClearing(true);
    try {
      await clearModelCache();
      await refresh();
    } finally {
      setClearing(false);
    }
  }, [refresh]);

  // One model's files, then a re-read so the list stops marking it downloaded.
  const removeModel = useCallback(
    async (id) => {
      await deleteModelFromCache(id);
      await refresh();
    },
    [refresh],
  );

  // Granting persistence can raise the quota in Firefox, so the figures are
  // re-read afterwards rather than left showing the pre-grant numbers.
  const requestPersist = useCallback(async () => {
    const granted = await requestPersistence();
    await refresh();
    return granted;
  }, [refresh]);

  return { storage, storageReady: ready, clear, clearing, refresh, requestPersist, removeModel };
}
