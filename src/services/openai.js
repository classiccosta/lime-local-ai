import { httpError } from '@/lib/errors';
import { parseSSE } from './sse';

export async function getOpenAiModels({ baseURL, timeoutMs = 3000 }) {
  const response = await fetch(`${baseURL}/models`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw httpError(response.status, await response.text());
  }

  const data = await response.json();
  return data;
}

export async function generate({ model, messages, onToken, baseURL, signal }) {
  const response = await fetch(`${baseURL}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model,
      stream: true,
      // The full history goes with every request. Letting the server hold it via
      // previous_response_id meant any discontinuity — a page reload, opening a
      // saved session, changing endpoint — silently sent a single orphaned turn
      // while the UI still showed the whole conversation.
      input: messages.map((message) => ({
        role: message.role,
        content: message.content
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join('\n'),
      })),
    }),
  });

  if (!response.ok) {
    throw httpError(response.status, await response.text());
  }

  // A server that ignores `stream` answers with plain JSON; keep that path so
  // any OpenAI-compatible backend works whatever it supports.
  if (!response.headers.get('Content-Type')?.includes('text/event-stream')) {
    const text = readJsonText(await response.json());
    onToken?.(text);
    return { text };
  }

  let text = '';
  let buffer = '';
  // A reader, not `for await`: Safari's ReadableStream is not async iterable.
  // Abort reaches here through `signal` on fetch: the pending read rejects
  // with an AbortError.
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const parsed = parseSSE(buffer + value);
      buffer = parsed.rest;
      for (const event of parsed.events) {
        if (event.type === 'response.output_text.delta') {
          text += event.delta;
          onToken?.(event.delta);
        } else if (event.type === 'response.failed' || event.type === 'error') {
          // Tagged so the UI knows this message came from the server and may
          // be worth showing, unlike the browser's own fetch errors.
          throw Object.assign(new Error(event.response?.error?.message ?? event.message ?? ''), {
            code: 'STREAM_FAILED',
          });
        } else if (event.type === 'response.completed') {
          return { text };
        }
      }
    }
  } finally {
    // Closes the connection when we return on `response.completed` or throw
    // before the server ends the stream.
    reader.cancel().catch(() => {});
  }

  return { text };
}

// `output_text` is an SDK convenience field that raw HTTP replies don't
// always carry, so fall back to walking the `output` array.
function readJsonText(data) {
  return (
    data.output_text ??
    (data.output ?? [])
      .flatMap((item) => item.content ?? [])
      .filter((part) => part.type === 'output_text')
      .map((part) => part.text)
      .join('')
  );
}
