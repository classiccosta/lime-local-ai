import { describe, expect, it } from 'vitest';
import { LOCAL_MODELS, generationOptions } from './localModels';

describe('generationOptions', () => {
  it("uses a model's own values over the defaults", () => {
    const spec = {
      generation: { max_new_tokens: 1024, do_sample: true, temperature: 0.1, top_k: 50 },
    };

    expect(generationOptions(spec)).toEqual({
      max_new_tokens: 1024,
      do_sample: true,
      temperature: 0.1,
      top_k: 50,
    });
  });

  it('falls back to defaults long enough not to cut a reply off', () => {
    const options = generationOptions({ id: 'no-values' });

    expect(options.max_new_tokens).toBeGreaterThan(512);
    expect(options.do_sample).toBe(false);
  });

  it('gives every catalogue model more than the old 512-token cap', () => {
    for (const spec of LOCAL_MODELS) {
      expect(generationOptions(spec).max_new_tokens).toBeGreaterThan(512);
    }
  });
});
