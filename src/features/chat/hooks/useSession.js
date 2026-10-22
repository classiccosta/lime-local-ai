import { useEffect, useRef } from 'react';
import { describeSendFailure } from '@/features/chat/sendFailure';
import { useT } from '@/i18n/context';
import { generate } from '@/services/providers';

export function useSession({
  conversation,
  dispatch,
  models = [],
  selectedModelId,
  endpoint,
} = {}) {
  const t = useT();
  const controllerRef = useRef(null);

  useEffect(() => {
    if (conversation.activeRequestId === null) controllerRef.current?.abort();
  }, [conversation.activeRequestId]);

  const send = async (prompt) => {
    if (conversation.status === 'generating') return;
    if (prompt === '') return;

    const requestId = crypto.randomUUID();
    const controller = new AbortController();
    controllerRef.current = controller;

    const message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: [{ type: 'text', text: prompt }],
    };

    // Built here because `conversation.messages` from this render is what we
    // must send — the dispatch below is not visible until the next render.
    const messages = [...conversation.messages, message];
    dispatch({ type: 'SEND_START', message, requestId, startedAt: Date.now() });

    try {
      const selectedModel = models?.find((model) => model.id === selectedModelId);
      if (!selectedModel)
        throw Object.assign(new Error('No model selected.'), { code: 'NO_MODEL' });
      const { text } = await generate({
        messages,
        model: selectedModel.id,
        provider: selectedModel.provider,
        baseURL: endpoint,
        signal: controller.signal,
        onToken: (token) => dispatch({ type: 'TOKEN', token, requestId, at: Date.now() }),
      });

      dispatch({
        type: 'REPLY',
        requestId,
        at: Date.now(),
        message: { id: crypto.randomUUID(), role: 'assistant', content: [{ type: 'text', text }] },
      });
    } catch (err) {
      // An abort means the reducer has already moved on and would drop this
      // FAIL; describing it would only log a spurious AbortError.
      if (!controller.signal.aborted) {
        dispatch({ type: 'FAIL', requestId, error: describeSendFailure(err, t) });
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  };

  return { send };
}
