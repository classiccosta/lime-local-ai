import { findLocalModel } from '@/services/localModels';

// Whether the selection restored from `ai-chat:model` points at a model the
// list no longer offers — dropped by the endpoint, or a WebGPU model on a
// browser without WebGPU. Left alone, it blocks auto-select for good, since an
// id that is set reads as a choice already made.
//
// The list says nothing about an endpoint that did not answer: LM Studio not
// started yet is an ordinary startup, and its models come back on reconnect.
// Only a catalogue id can be judged then, since it is known to be in-browser.
export function isStaleSelection({ selectedModelId, models, endpointError }) {
  if (!selectedModelId) return false;
  if (models.some((model) => model.id === selectedModelId)) return false;
  if (!findLocalModel(selectedModelId) && endpointError) return false;
  return true;
}
