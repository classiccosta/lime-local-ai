import { describe, expect, it } from 'vitest';
import { displayMessages, STOPPED_PREFIX, STREAMING_ID } from './displayMessages';

const user = (id) => ({ id, role: 'user', content: [{ type: 'text', text: id }] });
const assistant = (id) => ({ id, role: 'assistant', content: [{ type: 'text', text: id }] });

// Frozen all the way down, so a helper that mutates its input throws.
function deepFreeze(value) {
  Object.values(value).forEach((child) => {
    if (child && typeof child === 'object') deepFreeze(child);
  });
  return Object.freeze(value);
}

const display = (input) => displayMessages(deepFreeze(input)).map((message) => message.id);

describe('displayMessages', () => {
  it('appends the streaming message while generating, without a stopped marker', () => {
    const result = displayMessages(
      deepFreeze({ messages: [user('u1')], status: 'generating', streamed: 'hi' }),
    );
    expect(result.map((message) => message.id)).toEqual(['u1', STREAMING_ID]);
    expect(result[1].content).toEqual([{ type: 'text', text: 'hi' }]);
  });

  it('gives the streaming message no parts before the first token', () => {
    const result = displayMessages(
      deepFreeze({ messages: [user('u1')], status: 'generating', streamed: '' }),
    );
    expect(result[1].content).toEqual([]);
  });

  it('carries the request start time on the streaming message', () => {
    const result = displayMessages(
      deepFreeze({ messages: [user('u1')], status: 'generating', streamed: '', startedAt: 42 }),
    );
    expect(result[1].startedAt).toBe(42);
  });

  it('marks a trailing user turn as stopped when idle', () => {
    expect(display({ messages: [user('u1')], status: 'idle', streamed: '' })).toEqual([
      'u1',
      `${STOPPED_PREFIX}u1`,
    ]);
  });

  it('adds nothing after an answered turn', () => {
    expect(
      display({ messages: [user('u1'), assistant('a1')], status: 'idle', streamed: '' }),
    ).toEqual(['u1', 'a1']);
  });

  it('keeps the marker on an earlier stopped turn', () => {
    expect(
      display({
        messages: [user('u1'), user('u2'), assistant('a2')],
        status: 'idle',
        streamed: '',
      }),
    ).toEqual(['u1', `${STOPPED_PREFIX}u1`, 'u2', 'a2']);
  });

  it('marks an earlier stopped turn while the next one is generating', () => {
    expect(
      display({ messages: [user('u1'), user('u2')], status: 'generating', streamed: '' }),
    ).toEqual(['u1', `${STOPPED_PREFIX}u1`, 'u2', STREAMING_ID]);
  });
});
