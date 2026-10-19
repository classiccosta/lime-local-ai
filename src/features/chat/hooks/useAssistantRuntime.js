import { useExternalStoreRuntime } from '@assistant-ui/react';
import { useMemo } from 'react';

const STREAMING_ID = '__streaming__';

function convertMessage(message) {
  return {
    id: message.id,
    role: message.role,
    content: message.content
      .filter((part) => part.type === 'text')
      .map((part) => ({ type: 'text', text: part.text })),
    ...(message.id === STREAMING_ID && { status: { type: 'running' } }),
  };
}

export function useAssistantRuntime({ conversation, dispatch, send }) {
  const isRunning = conversation.status === 'generating';
  const { messages, streamed } = conversation;

  const withStreaming = useMemo(
    () =>
      isRunning
        ? [
            ...messages,
            { id: STREAMING_ID, role: 'assistant', content: [{ type: 'text', text: streamed }] },
          ]
        : messages,
    [isRunning, messages, streamed],
  );

  return useExternalStoreRuntime({
    messages: withStreaming,
    isRunning,
    convertMessage,
    onNew: (message) =>
      send(
        message.content
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join('\n'),
      ),
    onCancel: () => dispatch({ type: 'CANCEL' }),
  });
}
