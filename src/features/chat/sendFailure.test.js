import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeSendFailure } from './sendFailure';

// Echoes the key and its values, so a test can tell which message was chosen
// without depending on any translation.
const t = (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key);

const typed = (message, fields) => Object.assign(new Error(message), fields);

describe('describeSendFailure', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  afterEach(() => consoleError.mockClear());

  it('asks for a model when none is selected', () => {
    expect(describeSendFailure(typed('No model selected.', { code: 'NO_MODEL' }), t)).toBe(
      'banner.noModel',
    );
  });

  it.each([
    ['Chrome', new TypeError('Failed to fetch')],
    ['Safari', new TypeError('Load failed')],
    ['Firefox', new TypeError('NetworkError when attempting to fetch resource.')],
  ])('reports an unreachable endpoint (%s)', (_, error) => {
    expect(describeSendFailure(error, t)).toBe('banner.unreachable');
  });

  it('gives the HTTP status without the body, and logs the body', () => {
    const body = '{"error":{"message":"Model not found"}}';
    const message = describeSendFailure(typed('Request failed: 404', { status: 404, body }), t);

    expect(message).toBe('banner.httpError {"status":404}');
    expect(message).not.toContain('Model not found');
    expect(consoleError).toHaveBeenCalledWith(expect.anything(), body);
  });

  it('passes on a short message the server sent in the stream', () => {
    const error = typed('Context length exceeded', { code: 'STREAM_FAILED' });
    expect(describeSendFailure(error, t)).toBe('Context length exceeded');
  });

  it('replaces a long or multi-line stream message with a generic one', () => {
    expect(describeSendFailure(typed('x'.repeat(500), { code: 'STREAM_FAILED' }), t)).toBe(
      'banner.serverFailed',
    );
    expect(describeSendFailure(typed('Traceback:\n  at …', { code: 'STREAM_FAILED' }), t)).toBe(
      'banner.serverFailed',
    );
    expect(describeSendFailure(typed('', { code: 'STREAM_FAILED' }), t)).toBe(
      'banner.serverFailed',
    );
  });

  it('falls back to a generic message for anything else', () => {
    expect(describeSendFailure(new Error('Unknown provider: X'), t)).toBe('banner.failed');
    expect(describeSendFailure(undefined, t)).toBe('banner.failed');
  });

  it('logs the original error', () => {
    const error = new Error('Unknown provider: X');
    describeSendFailure(error, t);
    expect(consoleError).toHaveBeenCalledWith(error);
  });
});
