// The in-browser model catalogue. Deliberately free of any @huggingface/transformers
// import so that listing models never pulls in the ~23 MB runtime — services/llm.js
// reads the same entries once a model is actually being loaded.
export const LOCAL_PROVIDER_ID = 'Web-GPU';

export const LOCAL_MODELS = [
  {
    id: 'HuggingFaceTB/SmolVLM-500M-Instruct',
    label: 'SmolVLM-500M · 390 MB',
    // Vision-language: separate embedding, vision and decoder graphs, each
    // quantised on its own.
    kind: 'vision2seq',
    dtype: {
      embed_tokens: 'fp16',
      vision_encoder: 'q4',
      decoder_model_merged: 'q4',
    },
    info: {
      parameters: '500M',
      quantization: 'q4 · fp16 embeds',
      context: '8K',
      // Sum of the three ONNX graphs this dtype map selects, read from the repo.
      downloadBytes: 391_000_000,
    },
    // No sampling recommendation published. Greedy decoding loops on its own,
    // so the repetition penalty is what keeps a long reply from repeating.
    generation: { max_new_tokens: 1024, do_sample: false, repetition_penalty: 1.1 },
  },
  {
    id: 'LiquidAI/LFM2.5-2.6B-ONNX',
    label: 'LFM2.5-2.6B · 1.5 GB',
    // Text-only causal LM shipped as one merged graph, so a single dtype.
    kind: 'causal',
    dtype: 'q4f16',
    info: {
      parameters: '2.69B',
      quantization: 'q4f16',
      context: '128K',
      // model_q4f16.onnx plus its two external data files, read from the repo.
      downloadBytes: 1_534_000_000,
    },
    // Sampling values from the model card. Its 512 tokens is only the quick-start
    // example and cut long answers off mid-sentence.
    generation: {
      max_new_tokens: 2048,
      do_sample: true,
      temperature: 0.1,
      top_k: 50,
      repetition_penalty: 1.1,
    },
  },
];

// For a model without its own values: long enough not to cut a normal reply off.
const DEFAULT_GENERATION = { max_new_tokens: 2048, do_sample: false };

export function generationOptions(spec) {
  return { ...DEFAULT_GENERATION, ...spec?.generation };
}

export function findLocalModel(id) {
  return LOCAL_MODELS.find((model) => model.id === id);
}
