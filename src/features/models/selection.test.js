import { describe, expect, it } from 'vitest';
import { LOCAL_MODELS } from '@/services/localModels';
import { isStaleSelection } from './selection';

const catalogueId = LOCAL_MODELS[0].id;
const endpointId = 'qwen3-8b';
const webgpu = { id: catalogueId, provider: 'webgpu', requiresLoad: true };
const endpoint = { id: endpointId, provider: 'endpoint', requiresLoad: false };

// Whether the id restored from `ai-chat:model` points at nothing, so App can
// clear it and let auto-select pick a model that can actually answer.
describe('isStaleSelection', () => {
  it('keeps an id that is in the list', () => {
    expect(
      isStaleSelection({
        selectedModelId: endpointId,
        models: [webgpu, endpoint],
        endpointError: null,
      }),
    ).toBe(false);
  });

  it('has nothing to clear when nothing is selected', () => {
    expect(isStaleSelection({ selectedModelId: '', models: [], endpointError: null })).toBe(false);
  });

  // No WebGPU: providers drops the in-browser models, so they can never load.
  it('clears a catalogue id missing from the list', () => {
    expect(
      isStaleSelection({ selectedModelId: catalogueId, models: [endpoint], endpointError: null }),
    ).toBe(true);
  });

  // The endpoint answered and no longer serves it.
  it('clears an endpoint id the endpoint did not list', () => {
    expect(
      isStaleSelection({ selectedModelId: endpointId, models: [webgpu], endpointError: null }),
    ).toBe(true);
  });

  // LM Studio not started yet: the model comes back on reconnect, so the
  // stored choice is kept.
  it('keeps an endpoint id while the endpoint is unreachable', () => {
    expect(
      isStaleSelection({
        selectedModelId: endpointId,
        models: [webgpu],
        endpointError: 'Failed to fetch',
      }),
    ).toBe(false);
  });
});
