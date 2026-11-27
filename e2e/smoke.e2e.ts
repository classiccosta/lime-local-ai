import { expect, test } from '@playwright/test';

// Never resolves: every request to it is answered by the interception below.
const endpoint = 'http://fake-endpoint.test/v1';
const headers = { 'Access-Control-Allow-Origin': '*' };

const sse = [
  { type: 'response.output_text.delta', delta: 'Hello from ' },
  { type: 'response.output_text.delta', delta: 'the fake endpoint.' },
  { type: 'response.completed' },
]
  // The parser drops an event that has no blank line after it.
  .map((event) => `data: ${JSON.stringify(event)}\n\n`)
  .join('');

test('sends a message and shows the streamed reply', async ({ page }) => {
  await page.addInitScript((url) => localStorage.setItem('ai-chat:endpoint', url), endpoint);
  await page.route(`${endpoint}/models`, (route) =>
    route.fulfill({ headers, json: { data: [{ id: 'fake-model' }] } }),
  );
  // Fulfilled in one piece: this covers parsing the stream, not its pacing.
  await page.route(`${endpoint}/responses`, (route) =>
    route.fulfill({ headers, contentType: 'text/event-stream', body: sse }),
  );

  await page.goto('/');
  await page.getByRole('textbox', { name: 'Message input' }).fill('Hi there');
  const request = page.waitForRequest(`${endpoint}/responses`);
  await page.getByRole('button', { name: 'Send message' }).click();

  expect((await request).postDataJSON()).toEqual({
    model: 'fake-model',
    stream: true,
    input: [{ role: 'user', content: 'Hi there' }],
  });
  await expect(page.locator('[data-role="assistant"]')).toContainText(
    'Hello from the fake endpoint.',
  );
});
