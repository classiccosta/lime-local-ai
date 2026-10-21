import { deleteSession, getSession, listSessions, saveSession } from '@/services/sessionStore';
import { abandonedMessages, DEFAULT_SESSION_NAME } from '@/state/conversation';
import { useCallback, useEffect, useState } from 'react';
// A session is only stored — and so only listed — once it has a title, which
// its first user message gives it. Before that it lives in the reducer alone:
// a blank "New chat" row in the sidebar is a promise of a conversation that may
// never happen, and pressing New repeatedly used to stack them up.
async function listTitled() {
  const rows = await listSessions();
  return rows.filter((row) => row.name !== DEFAULT_SESSION_NAME);
}

export function useSessions({ conversation, dispatch, title }) {
  const [sessionList, setSessionList] = useState([]);
  // `{ key, count }`: an i18n key for what failed, and how many failures there
  // have been, so the banner can tell a repeat from the one it already showed.
  // The browser's own wording (often a bare DOMException name) goes to the
  // console, where it is useful, rather than on screen, where it is not.
  const [storageError, setStorageError] = useState(null);
  const report = useCallback((key, error) => {
    console.error(error);
    setStorageError((previous) => ({ key, count: (previous?.count ?? 0) + 1 }));
  }, []);
  const { sessionId, messages, status, dirty } = conversation;

  // A blank session has nothing to leave behind, so there is nothing to start
  // afresh from; and a reply still streaming would land in the next one.
  const canCreate = messages.length > 0 && status !== 'generating';

  // Memoised so the mount effect below can list it as a dependency and still
  // run once: dispatch is stable for the lifetime of the hook.
  const getSessionFromList = useCallback(
    async (id) => {
      try {
        const res = await getSession(id);
        dispatch({ type: 'LOAD_SESSION', sessionId: res.id, messages: res.messages });
      } catch (error) {
        report('sessions.loadFailed', error);
      }
    },
    [dispatch, report],
  );

  async function openSession(id) {
    const kept = abandonedMessages(conversation);
    // Ownership goes first, so a reply landing while the row is rewritten is
    // dropped instead of saved and then clobbered by the rollback. CANCEL
    // leaves `dirty` alone, so the save effect does not race this write.
    if (status === 'generating') dispatch({ type: 'CANCEL' });
    if (kept) {
      try {
        // The first user message stays, so the title is unchanged.
        await saveSession({ id: sessionId, name: title, messages: kept });
        setSessionList(await listTitled());
      } catch (error) {
        report('sessions.saveFailed', error);
      }
    }
    await getSessionFromList(id);
  }

  // No row is written here: the save effect creates it on the first send.
  function newSession() {
    if (!canCreate) return;
    dispatch({ type: 'NEW_SESSION', sessionId: crypto.randomUUID() });
  }

  async function deleteSessionFromList(id) {
    try {
      await deleteSession(id);
      setSessionList(await listTitled());
    } catch (error) {
      report('sessions.deleteFailed', error);
      return;
    }
    // Deleting the open chat would leave messages on screen with no row behind
    // them, and the next send would resurrect the deleted id. Start a fresh one.
    if (id === sessionId) dispatch({ type: 'NEW_SESSION', sessionId: crypto.randomUUID() });
  }

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Rows from before sessions waited for a title: blank, and named with the
      // marker. Cleared so they stop surfacing as "New chat".
      const blank = (await listSessions()).filter(
        (row) => row.name === DEFAULT_SESSION_NAME && !row.messages?.length,
      );
      await Promise.all(blank.map((row) => deleteSession(row.id)));

      const list = await listTitled();
      if (cancelled) return;
      setSessionList(list);
      // With nothing stored, the reducer's own fresh session is already the
      // right place to start; it is written once it has a first message.
      if (list.length > 0) await getSessionFromList(list[0].id);
    };
    run().catch((error) => report('sessions.loadFailed', error));
    return () => {
      cancelled = true;
    };
  }, [getSessionFromList, dispatch, report]);

  // Persisting is a side effect, so it cannot live in the render path — writing
  // there would hit storage on every re-render, including once per streamed token.
  useEffect(() => {
    // `dirty` alone decides this: an untouched session — new or just loaded —
    // never needs writing, and a conversation emptied by a failed first turn
    // must be written, or the store keeps the turn the UI already rolled back.
    if (!dirty) return;
    let cancelled = false;
    const run = async () => {
      // No title means no first message — a failed first turn rolled back to
      // empty. Nothing untitled is stored, so the row (if it got written) goes.
      if (title) await saveSession({ id: sessionId, name: title, messages });
      else await deleteSession(sessionId);
      if (cancelled) return;
      setSessionList(await listTitled());
    };
    run().catch((error) => report('sessions.saveFailed', error));
    return () => {
      cancelled = true;
    };
  }, [dirty, sessionId, title, messages, report]);

  return {
    newSession,
    canCreate,
    openSession,
    deleteSessionFromList,
    sessionList,
    storageError,
  };
}
