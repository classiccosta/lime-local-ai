import { LOCAL_MODELS, LOCAL_PROVIDER_ID } from './localModels';
import { generate as generateOpenAi, getOpenAiModels } from './openai';

function getLocalModels() {
  // Without WebGPU these cannot load at all, so do not offer them.
  if (!('gpu' in navigator)) return [];
  return LOCAL_MODELS.map(({ id, label }) => ({
    modelId: id,
    label,
    providerId: LOCAL_PROVIDER_ID,
  }));
}

// Get Available Models
export async function getModels(baseURL) {
  const local = getLocalModels();

  let openaiCompatible = [];
  // Reported rather than thrown: an unreachable endpoint must not take the
  // in-browser provider down with it, but the caller still needs to tell
  // "unreachable" apart from "reachable and empty".
  let endpointError = null;
  // No endpoint configured is a normal state, not a failure — skip the probe.
  if (baseURL) {
    try {
      const { data } = await getOpenAiModels({ baseURL });
      openaiCompatible = data ?? [];
    } catch (error) {
      endpointError = error.message;
    }
  }

  const arr = [...local, ...openaiCompatible];
  const models = arr.map(({ modelId, id, label, providerId }) => {
    const provider = providerId === LOCAL_PROVIDER_ID ? 'Web-GPU' : 'LM-Studio';
    const resolved = modelId ?? id;
    return {
      id: resolved,
      label: label ?? resolved,
      provider,
      requiresLoad: provider === 'Web-GPU',
    };
  });
  return { models, endpointError };
}

// Load Web-GPU Model
export async function modelLoader(modelId, callback, signal) {
  const { loadModel } = await import('./llm');
  return loadModel(modelId, callback, signal);
}

// Release every in-browser model. Only call this once something has actually
// been loaded: the import pulls in the ~23 MB runtime, which is free when it is
// already in memory and wasteful otherwise.
export async function unloadModels() {
  const { unloadAll } = await import('./llm');
  return unloadAll();
}

// Release one in-browser model. Same rule as unloadModels: only for a model
// that was actually loaded, so the runtime is already in memory.
export async function unloadModel(modelId) {
  const { unloadModel: unload } = await import('./llm');
  return unload(modelId);
}

// Generate output
export async function generate({ model, provider, messages, onToken, baseURL, signal }) {
  if (provider === 'LM-Studio') {
    return generateOpenAi({ model, messages, onToken, baseURL, signal });
  }
  if (provider === 'Web-GPU') {
    const { generate: generateLLM } = await import('./llm');
    // llm.js resolves to a bare string; wrap it so both providers return the
    // same shape.
    const text = await generateLLM({ modelId: model, messages, onToken, signal });
    return { text };
  }
  throw new Error(`Unknown provider: ${provider}`);
}
