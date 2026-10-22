import { createContext, useContext } from 'react';

// The composer's model picker lives inside the assistant-ui thread, several
// levels below where the model state is held, and the thread takes no props of
// its own for it. A context keeps that one value out of every component in
// between. Null when no provider is mounted, so the thread still renders on its
// own — the picker simply does not appear.
//
// It carries the same picker state the settings dialog renders (`picker`), not
// raw model lists, so the composer's menu has no logic of its own to drift.
export const ComposerModelsContext = createContext(null);

export function useComposerModels() {
  return useContext(ComposerModelsContext);
}
