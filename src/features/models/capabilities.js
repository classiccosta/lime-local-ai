// What a model can be sent, as this version of the app is able to send it.
//
// Deliberately a property of the app rather than of the model: SmolVLM is a
// vision-language model and `llm.js` can already hand `generate` an image, but
// nothing in the send path builds one — `useSession` posts text parts only, and
// the OpenAI-compatible client does the same. Advertising an attachment button
// against that would produce a file the request quietly drops.
//
// When the send path grows image support this becomes a real per-model check:
// `findLocalModel(id)?.kind === 'vision2seq'` for the in-browser catalogue, and
// whatever the endpoint reports for the rest. Until then it answers false for
// every model, and it answers it in one place.
export function supportsFileInput() {
  return false;
}
