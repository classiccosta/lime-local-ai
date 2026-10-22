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
});
