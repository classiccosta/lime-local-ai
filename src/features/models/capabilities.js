// What a model can be sent, as this version of the app is able to send it.
//
// Deliberately a property of the app rather than of the model: nothing in the
// send path builds an image — `useSession` posts text parts only, `llm.js` loads
// text-only models, and the OpenAI-compatible client sends text too. Advertising
// an attachment button against that would produce a file the request quietly
// drops.
//
// When the send path grows image support this becomes a real per-model check:
// a vision `kind` in the in-browser catalogue, and whatever the endpoint reports
// for the rest. Until then it answers false for
// every model, and it answers it in one place.
export function supportsFileInput() {
  return false;
}
