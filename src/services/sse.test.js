import { describe, expect, it } from 'vitest';
import { parseSSE } from './sse';

const delta = (text) =>
  `event: response.output_text.delta\ndata: ${JSON.stringify({ type: 'response.output_text.delta', delta: text })}\n\n`;

describe('parseSSE', () => {
  it('parses one complete event', () => {
    const { events, rest } = parseSSE(delta('Hi'));

    expect(events).toEqual([{ type: 'response.output_text.delta', delta: 'Hi' }]);
    expect(rest).toBe('');
  });

  // A network chunk doesn't line up with an event: this is the case that
  // breaks a parser which splits each chunk on its own.
  it('keeps an event cut mid-chunk until the next chunk completes it', () => {
    const full = delta('Hello');
    const cut = 20;

    const first = parseSSE(full.slice(0, cut));
    expect(first.events).toEqual([]);
    expect(first.rest).toBe(full.slice(0, cut));

    const second = parseSSE(first.rest + full.slice(cut));
    expect(second.events).toEqual([{ type: 'response.output_text.delta', delta: 'Hello' }]);
    expect(second.rest).toBe('');
  });

  it('parses two events in one chunk', () => {
    const { events, rest } = parseSSE(delta('a') + delta('b'));

    expect(events.map((event) => event.delta)).toEqual(['a', 'b']);
    expect(rest).toBe('');
  });

  it('ignores lines that are not data', () => {
    const { events } = parseSSE(': keep-alive\n\nevent: ping\n\n' + delta('x'));

    expect(events).toEqual([{ type: 'response.output_text.delta', delta: 'x' }]);
  });

  it('ignores the [DONE] sentinel', () => {
    const { events, rest } = parseSSE(delta('x') + 'data: [DONE]\n\n');

    expect(events).toEqual([{ type: 'response.output_text.delta', delta: 'x' }]);
    expect(rest).toBe('');
  });

  it('accepts CRLF line endings', () => {
    const { events } = parseSSE(delta('x').replaceAll('\n', '\r\n'));

    expect(events).toEqual([{ type: 'response.output_text.delta', delta: 'x' }]);
  });
});
