// Splits buffered Server-Sent Events text into complete events. A network
// chunk can end mid-event, so whatever follows the last blank line comes back
// as `rest` and must be prepended to the next chunk.
export function parseSSE(buffer) {
  const blocks = buffer.replaceAll('\r\n', '\n').split('\n\n');
  const rest = blocks.pop();

  const events = blocks.flatMap((block) => {
    const data = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, ''))
      .join('\n');
    // `[DONE]` is the Chat Completions terminator; some servers send it on
    // /responses too.
    if (!data || data === '[DONE]') return [];
    return [JSON.parse(data)];
  });

  return { events, rest };
}
