import {
  AutoModelForCausalLM,
  AutoTokenizer,
  InterruptableStoppingCriteria,
  TextStreamer,
  env,
} from '@huggingface/transformers';
import { findLocalModel, generationOptions } from './localModels';

// One entry per model that has been loaded this session; switching models keeps
// the previous one warm rather than re-downloading it.
const loaded = new Map();

// `from_pretrained` takes no AbortSignal, so there is no per-call way to stop a
// download once it starts. `env.fetch` is the library's own override point and
// every file it fetches goes through it, so the signal is threaded in here
// instead. Without this a cancel could only stop watching the download, never
// stop it — and the library's in-flight deduplication would then hand the same
// progress-less promise to the next attempt.
//
// One module-level signal is enough because only one model loads at a time: the
// startup restore runs its models in sequence and the picker is locked for the
// duration of a manual load.
const baseFetch = env.fetch;
let activeSignal = null;
env.fetch = (input, init) => baseFetch(input, { ...init, signal: activeSignal ?? init?.signal });

export async function loadModel(modelId, signal) {
  if (loaded.has(modelId)) return;

  const spec = findLocalModel(modelId);
  if (!spec) throw new Error(`Unknown in-browser model: ${modelId}`);

  const options = { dtype: spec.dtype, device: 'webgpu' };

  const mine = signal ?? null;
  activeSignal = mine;
  try {
    const tokenizer = await AutoTokenizer.from_pretrained(modelId);
    const model = await AutoModelForCausalLM.from_pretrained(modelId, options);
    loaded.set(modelId, { model, tokenizer });
  } finally {
    // Only if no later load has taken over in the meantime.
    if (activeSignal === mine) activeSignal = null;
  }
}

/**
 * Release one loaded model, for a per-model delete.
 *
 * Deleting the weights off disk leaves the compiled graph sitting in GPU
 * memory, still usable — so without this a deleted model would keep reporting
 * as loaded, and it would be. Disposal frees the GPU buffers too.
 */
export async function unloadModel(modelId) {
  const entry = loaded.get(modelId);
  loaded.delete(modelId);
  try {
    await entry?.model?.dispose?.();
  } catch {
    /* already gone */
  }
}

// A text-only chat template wants plain string content, not the parts array.
function flatten(messages) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n'),
  }));
}

export async function generate({ modelId, messages, onToken, signal }) {
  signal?.throwIfAborted();

  const entry = loaded.get(modelId);
  if (!entry) throw new Error('Model is not loaded yet.');
  const { model, tokenizer } = entry;
  const spec = findLocalModel(modelId);

  const inputs = tokenizer.apply_chat_template(flatten(messages), {
    add_generation_prompt: true,
    return_dict: true,
    ...spec?.chatTemplate,
  });

  const stopper = new InterruptableStoppingCriteria();
  const onAbort = () => stopper.interrupt();
  signal?.addEventListener('abort', onAbort, { once: true });

  let outputs;
  try {
    outputs = await model.generate({
      ...inputs,
      ...generationOptions(spec),
      stopping_criteria: stopper,
      streamer: new TextStreamer(tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: onToken,
      }),
    });
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }

  // An interrupted run resolves with whatever it produced rather than throwing,
  // so the caller only learns it was cancelled if we say so.
  signal?.throwIfAborted();

  const [decoded] = tokenizer.batch_decode(
    outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true },
  );
  return decoded;
}
