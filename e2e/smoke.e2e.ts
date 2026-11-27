import { expect, test, type Page } from '@playwright/test';

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

// A request for this message is never answered, so its reply stays in flight.
const held = 'Keep waiting';

const userTurns = (page: Page) => page.locator('[data-role="user"]');
const replies = (page: Page) => page.locator('[data-role="assistant"]');
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function send(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Message input' }).fill(text);
  const request = page.waitForRequest(`${endpoint}/responses`);
  await button(page, 'Send message').click();
  return request;
}

async function expectStopped(page: Page) {
  await expect(userTurns(page)).toHaveText(held);
  await expect(replies(page)).toHaveText('Stopped');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((url) => localStorage.setItem('ai-chat:endpoint', url), endpoint);
  await page.route(`${endpoint}/models`, (route) =>
    route.fulfill({ headers, json: { data: [{ id: 'fake-model' }] } }),
  );
  // Fulfilled in one piece: this covers parsing the stream, not its pacing.
  await page.route(`${endpoint}/responses`, async (route) => {
    if (route.request().postDataJSON().input.at(-1).content === held) return;
    await route.fulfill({ headers, contentType: 'text/event-stream', body: sse });
  });

  await page.goto('/');
  // Sending before the startup auto-select fails with "no model".
  await expect(button(page, 'Model')).toContainText('fake-model');
});

test('sends a message and shows the streamed reply', async ({ page }) => {
  const request = await send(page, 'Hi there');

  expect(request.postDataJSON()).toEqual({
    model: 'fake-model',
    stream: true,
    input: [{ role: 'user', content: 'Hi there' }],
  });
  await expect(replies(page)).toContainText('Hello from the fake endpoint.');
});

test('Stop keeps the user turn, and a reload keeps the session', async ({ page }) => {
  await send(page, held);
  const aborted = page.waitForEvent('requestfailed');
  await button(page, 'Stop generating').click();
  await aborted;
  await expectStopped(page);
  // The row appears once the session is stored; reloading earlier could lose it.
  await expect(button(page, held)).toBeVisible();

  await page.reload();

  await expect(button(page, held)).toBeVisible();
  await expectStopped(page);
});

test('switching session mid-reply stops that reply', async ({ page }) => {
  await send(page, 'First chat');
  await expect(replies(page)).toContainText('Hello from the fake endpoint.');
  await button(page, 'New').click();
  await send(page, held);
  await expect(button(page, 'Stop generating')).toBeVisible();

  const aborted = page.waitForEvent('requestfailed');
  await button(page, 'First chat').click();
  await aborted;

  await expect(userTurns(page)).toHaveText('First chat');
  await expect(replies(page)).toContainText('Hello from the fake endpoint.');
  await expect(button(page, 'Send message')).toBeVisible();
  await button(page, held).click();
  await expectStopped(page);
});
