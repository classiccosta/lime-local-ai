import { useExternalStoreRuntime } from '@assistant-ui/react';
import { displayMessages, STOPPED_PREFIX, STREAMING_ID } from '../displayMessages';

function convertMessage(message) {
  return {
    id: message.id,
    role: message.role,
    content: message.content
      .filter((part) => part.type === 'text')
      .map((part) => ({ type: 'text', text: part.text })),
    ...(message.id === STREAMING_ID && {
      status: { type: 'running' },
      ...(message.startedAt && { createdAt: new Date(message.startedAt) }),
    }),
    ...(message.id?.startsWith(STOPPED_PREFIX) && {
      status: { type: 'incomplete', reason: 'cancelled' },
    }),
  };
}

export function useAssistantRuntime({ conversation, dispatch, send }) {
  return useExternalStoreRuntime({
    messages: displayMessages(conversation),
    isRunning: conversation.status === 'generating',
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
