export async function getOpenAiModels({ baseURL, timeoutMs = 3000 }) {
  const response = await fetch(`${baseURL}/models`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${await response.text()}`);
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
    throw new Error(`Request failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();

  // `output_text` is an SDK convenience field that raw HTTP replies don't
  // always carry, so fall back to walking the `output` array.
  const text =
    data.output_text ??
    (data.output ?? [])
      .flatMap((item) => item.content ?? [])
      .filter((part) => part.type === 'output_text')
      .map((part) => part.text)
      .join('');

  // Not streaming yet: emit the whole reply once so the UI's streaming
  // placeholder still resolves.
  onToken?.(text);

  return { text };
}
