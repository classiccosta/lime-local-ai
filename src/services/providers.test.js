import { afterEach, describe, expect, it, vi } from 'vitest';
import { getModels } from './providers';

describe('getModels', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers no in-browser models while WebGPU is gated off, even with navigator.gpu', async () => {
    vi.stubGlobal('navigator', { gpu: {} });

    const { models } = await getModels('');

    expect(models).toEqual([]);
  });

  it('hides embedding models from the endpoint list', async () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          data: [{ id: 'google/gemma-4-e2b' }, { id: 'text-embedding-nomic-embed-text-v1.5' }],
        }),
      ),
    );

    const { models, endpointError } = await getModels('http://localhost:1234/v1');

    expect(endpointError).toBeNull();
    expect(models.map((m) => m.id)).toEqual(['google/gemma-4-e2b']);
  });

  it('treats an endpoint with only embedding models like an empty one', async () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ data: [{ id: 'text-embedding-nomic-embed-text-v1.5' }] })),
    );

    const { models, endpointError } = await getModels('http://localhost:1234/v1');

    expect(endpointError).toBeNull();
    expect(models).toEqual([]);
  });
});
