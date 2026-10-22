// OpenAI-compatible /models lists every model the server has, embedding models
// included, and choosing one of those fails on the first message. LM Studio's
// /v1/models carries no type, so the name is usually all there is to go on.
// When unsure, keep the model: a wrongly hidden chat model can't be picked at all.
export function isChatModel(entry) {
  if (typeof entry?.type === 'string') return entry.type !== 'embeddings';
  return !/embed/i.test(entry?.id ?? '');
}
