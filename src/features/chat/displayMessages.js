export const STREAMING_ID = '__streaming__';
export const STOPPED_PREFIX = '__stopped__:';

// FAIL and openSession roll an unanswered turn back (ADR-009), so a user turn
// nothing answers can only come from Stop, a reload mid-reply, or abandoning a
// first turn. Deriving the marker here means no stored flag and no migration.
export function displayMessages({ messages, status, streamed }) {
  const isRunning = status === 'generating';
  const result = [];

  messages.forEach((message, index) => {
    result.push(message);
    if (message.role !== 'user') return;
    const next = messages[index + 1];
    const unanswered = next ? next.role === 'user' : !isRunning;
    if (unanswered) {
      result.push({ id: STOPPED_PREFIX + message.id, role: 'assistant', content: [] });
    }
  });

  if (isRunning) {
    result.push({
      id: STREAMING_ID,
      role: 'assistant',
      content: [{ type: 'text', text: streamed }],
    });
  }
  return result;
}
