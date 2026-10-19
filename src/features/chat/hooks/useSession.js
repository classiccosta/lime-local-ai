import { useEffect, useRef } from 'react';
import { generate } from '@/services/providers';

export function useSession({
  conversation,
  dispatch,
  models = [],
  selectedModelId,
  endpoint,
} = {}) {
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
    dispatch({ type: 'SEND_START', message, requestId });

    try {
      const selectedModel = models?.find((model) => model.id === selectedModelId);
      if (!selectedModel) throw new Error('No model selected.');
      const { text } = await generate({
        messages,
        model: selectedModel.id,
        provider: selectedModel.provider,
        baseURL: endpoint,
        signal: controller.signal,
        onToken: (token) => dispatch({ type: 'TOKEN', token, requestId }),
      });

      dispatch({
        type: 'REPLY',
        requestId,
        message: { id: crypto.randomUUID(), role: 'assistant', content: [{ type: 'text', text }] },
      });
    } catch (err) {
      dispatch({ type: 'FAIL', requestId, error: err.message });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  };

  return { send };
}
