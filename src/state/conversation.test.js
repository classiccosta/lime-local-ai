import { describe, expect, it } from 'vitest';
import {
  conversationReducer,
  createConversation,
  DEFAULT_SESSION_NAME,
  getSessionTitle,
} from './conversation';

const userMessage = (text) => ({ role: 'user', content: [{ type: 'text', text }] });
const assistantMessage = (text) => ({ role: 'assistant', content: [{ type: 'text', text }] });

// Frozen all the way down, so a reducer that mutates its input throws (ES
// modules are strict) instead of passing unnoticed.
function deepFreeze(value) {
  Object.values(value).forEach((child) => {
    if (child && typeof child === 'object') deepFreeze(child);
  });
  return Object.freeze(value);
}

// Every call in this file goes through here, so every action in every test
// runs against frozen state and a frozen action.
const reduce = (state, action) => conversationReducer(deepFreeze(state), deepFreeze(action));

// A conversation mid-request: one user message sent, `req-1` in flight.
function generating() {
  return reduce(createConversation(), {
    type: 'SEND_START',
    message: userMessage('Hello'),
    requestId: 'req-1',
    startedAt: 1000,
  });
}

describe('createConversation', () => {
  it('starts idle, empty and clean', () => {
    const state = createConversation();
    expect(state).toMatchObject({
      messages: [],
      status: 'idle',
      error: null,
      errorCount: 0,
      streamed: '',
      dirty: false,
      activeRequestId: null,
      startedAt: null,
    });
    expect(typeof state.sessionId).toBe('string');
  });

  it('gives each conversation its own id', () => {
    expect(createConversation().sessionId).not.toBe(createConversation().sessionId);
  });
});

describe('immutability', () => {
  // Each action from a state where it does real work, not an early return.
  it.each([
    ['SEND_START', createConversation, { message: userMessage('Hi'), requestId: 'req-2' }],
    ['TOKEN', generating, { requestId: 'req-1', token: 'x' }],
    ['REPLY', generating, { requestId: 'req-1', message: assistantMessage('Hi') }],
    ['FAIL', generating, { requestId: 'req-1', error: 'boom' }],
    ['CANCEL', generating, {}],
    ['LOAD_SESSION', generating, { sessionId: 'loaded', messages: [userMessage('Old')] }],
    ['NEW_SESSION', generating, { sessionId: 'fresh' }],
  ])('%s leaves its input untouched', (type, makeState, payload) => {
    const state = makeState();
    const snapshot = structuredClone(state);
    const next = reduce(state, { type, ...payload });
    expect(state).toEqual(snapshot);
    expect(next).not.toBe(state);
  });
});

describe('SEND_START', () => {
  it('appends the message and takes ownership with the request id', () => {
    const state = generating();
    expect(state.messages).toEqual([userMessage('Hello')]);
    expect(state.status).toBe('generating');
    expect(state.activeRequestId).toBe('req-1');
    expect(state.startedAt).toBe(1000);
    expect(state.dirty).toBe(true);
  });

  it('clears the previous error and streamed text but keeps the error count', () => {
    const failed = reduce(generating(), {
      type: 'FAIL',
      requestId: 'req-1',
      error: 'boom',
    });
    const state = reduce(
      { ...failed, streamed: 'stale' },
      { type: 'SEND_START', message: userMessage('Again'), requestId: 'req-2' },
    );
    expect(state.error).toBeNull();
    expect(state.streamed).toBe('');
    expect(state.errorCount).toBe(1);
  });
});

describe('TOKEN', () => {
  it('accumulates tokens for the active request', () => {
    let state = generating();
    state = reduce(state, { type: 'TOKEN', requestId: 'req-1', token: 'Hel' });
    state = reduce(state, { type: 'TOKEN', requestId: 'req-1', token: 'lo' });
    expect(state.streamed).toBe('Hello');
  });

  it('ignores tokens from another request', () => {
    const state = generating();
    const next = reduce(state, { type: 'TOKEN', requestId: 'old', token: 'x' });
    expect(next).toBe(state);
  });
});

describe('REPLY', () => {
  it('appends the reply and releases the request', () => {
    const streaming = reduce(generating(), {
      type: 'TOKEN',
      requestId: 'req-1',
      token: 'Hi',
    });
    const state = reduce(streaming, {
      type: 'REPLY',
      requestId: 'req-1',
      message: assistantMessage('Hi there'),
    });
    expect(state.messages).toEqual([userMessage('Hello'), assistantMessage('Hi there')]);
    expect(state.status).toBe('idle');
    expect(state.streamed).toBe('');
    expect(state.activeRequestId).toBeNull();
    expect(state.dirty).toBe(true);
  });

  // A reply arriving after a session switch must be dropped.
  it('ignores a reply for a request that is no longer active', () => {
    const switched = reduce(generating(), {
      type: 'NEW_SESSION',
      sessionId: 'other',
    });
    const state = reduce(switched, {
      type: 'REPLY',
      requestId: 'req-1',
      message: assistantMessage('Late'),
    });
    expect(state).toBe(switched);
  });

  it('ignores a reply after the request was cancelled', () => {
    const cancelled = reduce(generating(), { type: 'CANCEL' });
    const state = reduce(cancelled, {
      type: 'REPLY',
      requestId: 'req-1',
      message: assistantMessage('Late'),
    });
    expect(state).toBe(cancelled);
  });
});

describe('FAIL', () => {
  it('removes the unanswered user message and records the error', () => {
    const state = reduce(generating(), {
      type: 'FAIL',
      requestId: 'req-1',
      error: 'boom',
    });
    expect(state.messages).toEqual([]);
    expect(state.status).toBe('idle');
    expect(state.error).toBe('boom');
    expect(state.activeRequestId).toBeNull();
    expect(state.dirty).toBe(true);
  });

  // The same error string twice must still read as a new failure.
  it('bumps the error count on every failure', () => {
    let state = createConversation();
    for (const requestId of ['a', 'b']) {
      state = reduce(state, {
        type: 'SEND_START',
        message: userMessage('Hello'),
        requestId,
      });
      state = reduce(state, { type: 'FAIL', requestId, error: 'boom' });
    }
    expect(state.error).toBe('boom');
    expect(state.errorCount).toBe(2);
  });

  it('ignores a failure for another request', () => {
    const state = generating();
    const next = reduce(state, { type: 'FAIL', requestId: 'old', error: 'boom' });
    expect(next).toBe(state);
  });
});

describe('startedAt', () => {
  it.each([
    ['REPLY', { requestId: 'req-1', message: assistantMessage('Hi') }],
    ['FAIL', { requestId: 'req-1', error: 'boom' }],
    ['CANCEL', {}],
  ])('is cleared by %s', (type, payload) => {
    expect(reduce(generating(), { type, ...payload }).startedAt).toBeNull();
  });
});

describe('CANCEL', () => {
  it('releases the request but keeps the sent message', () => {
    const streaming = reduce(generating(), {
      type: 'TOKEN',
      requestId: 'req-1',
      token: 'partial',
    });
    const state = reduce(streaming, { type: 'CANCEL' });
    expect(state.messages).toEqual([userMessage('Hello')]);
    expect(state.dirty).toBe(true); // cancelled turn is still persisted
    expect(state.status).toBe('idle');
    expect(state.streamed).toBe('');
    expect(state.activeRequestId).toBeNull();
  });

  it('is a no-op when nothing is in flight', () => {
    const state = createConversation();
    expect(reduce(state, { type: 'CANCEL' })).toBe(state);
  });
});

describe('LOAD_SESSION', () => {
  it('replaces everything with the loaded session, clean', () => {
    const messages = [userMessage('Old'), assistantMessage('Reply')];
    const state = reduce(generating(), {
      type: 'LOAD_SESSION',
      sessionId: 'loaded',
      messages,
    });
    expect(state).toMatchObject({
      sessionId: 'loaded',
      messages,
      status: 'idle',
      error: null,
      errorCount: 0,
      streamed: '',
      // Opening a chat must not bump its `updatedAt`.
      dirty: false,
      activeRequestId: null,
    });
  });
});

describe('NEW_SESSION', () => {
  it('starts an empty, clean conversation with the given id', () => {
    const state = reduce(generating(), { type: 'NEW_SESSION', sessionId: 'fresh' });
    expect(state).toMatchObject({
      sessionId: 'fresh',
      messages: [],
      status: 'idle',
      dirty: false,
      activeRequestId: null,
    });
  });
});

describe('unknown actions', () => {
  it('throws', () => {
    expect(() => reduce(createConversation(), { type: 'NOPE' })).toThrow(
      'Unknown conversation action: NOPE',
    );
  });
});

describe('getSessionTitle', () => {
  it('uses the first user message text', () => {
    const messages = [assistantMessage('Welcome'), userMessage('First'), userMessage('Second')];
    expect(getSessionTitle(messages)).toBe('First');
  });

  it('truncates past 50 characters with an ellipsis', () => {
    const text = 'a'.repeat(60);
    expect(getSessionTitle([userMessage(text)])).toBe(`${'a'.repeat(50)}...`);
  });

  it('keeps exactly 50 characters whole', () => {
    const text = 'a'.repeat(50);
    expect(getSessionTitle([userMessage(text)])).toBe(text);
  });

  it('skips non-text parts', () => {
    const message = {
      role: 'user',
      content: [
        { type: 'image', image: 'data:' },
        { type: 'text', text: 'Caption' },
      ],
    };
    expect(getSessionTitle([message])).toBe('Caption');
  });

  it('returns null without a user text part', () => {
    expect(getSessionTitle([])).toBeNull();
    expect(getSessionTitle([assistantMessage('Hi')])).toBeNull();
    expect(
      getSessionTitle([{ role: 'user', content: [{ type: 'image', image: 'x' }] }]),
    ).toBeNull();
  });
});

describe('DEFAULT_SESSION_NAME', () => {
  // Stored in IndexedDB and matched by components; changing it orphans old rows.
  it('stays the stored marker', () => {
    expect(DEFAULT_SESSION_NAME).toBe('New session');
  });
});
