import { describe, expect, it } from 'vitest';
import { LEGACY_KEYS, removeLegacyKeys } from './legacyKeys';

function memoryStorage(entries) {
  const map = new Map(Object.entries(entries));
  return {
    getItem: (key) => map.get(key) ?? null,
    removeItem: (key) => map.delete(key),
    keys: () => [...map.keys()],
  };
}

describe('removeLegacyKeys', () => {
  it('removes every legacy key and keeps the live ones', () => {
    const storage = memoryStorage({
      ...Object.fromEntries(LEGACY_KEYS.map((key) => [key, 'x'])),
      'ai-chat:model': 'qwen',
      'ai-chat:panel:sessions': 'true',
    });

    removeLegacyKeys(storage);

    expect(storage.keys()).toEqual(['ai-chat:model', 'ai-chat:panel:sessions']);
  });

  it('does nothing when none are stored', () => {
    const storage = memoryStorage({ 'ai-chat:locale': 'pt' });
    removeLegacyKeys(storage);
    expect(storage.keys()).toEqual(['ai-chat:locale']);
  });

  it('swallows a storage that throws', () => {
    const storage = {
      removeItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
    };
    expect(() => removeLegacyKeys(storage)).not.toThrow();
  });
});
