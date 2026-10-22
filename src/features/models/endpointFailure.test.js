import { describe, expect, it } from 'vitest';
import { describeEndpointFailure } from './endpointFailure';

const t = (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key);

describe('describeEndpointFailure', () => {
  it('reports an unreachable endpoint', () => {
    expect(describeEndpointFailure(new TypeError('Failed to fetch'), t)).toBe(
      'endpoint.unreachable',
    );
  });

  it('reports an endpoint that did not answer in time', () => {
    const error = new DOMException('signal timed out', 'TimeoutError');
    expect(describeEndpointFailure(error, t)).toBe('endpoint.timeout');
  });

  it('gives the HTTP status without the body', () => {
    const error = Object.assign(new Error('Request failed: 404'), { status: 404, body: '<html>' });
    expect(describeEndpointFailure(error, t)).toBe('endpoint.httpError {"status":404}');
  });

  it('falls back to a generic message, e.g. for a reply that is not JSON', () => {
    expect(describeEndpointFailure(new SyntaxError('Unexpected token <'), t)).toBe(
      'endpoint.failed',
    );
  });
});
