import { afterEach, describe, expect, it, vi } from 'vitest';
import { dropLegacyPrefs, readPref, writePref } from './prefs';

function memoryStorage(entries = {}) {
  const map = new Map(Object.entries(entries));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
    keys: () => [...map.keys()],
  };
}

function blockedStorage() {
  const blocked = () => {
    throw new DOMException('blocked', 'SecurityError');
  };
  return { getItem: blocked, setItem: blocked, removeItem: blocked };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readPref / writePref', () => {
  it('round-trips a value under the prefix', () => {
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);

    writePref('panel:sessions', false);

    expect(storage.keys()).toEqual(['ai-chat:panel:sessions']);
    expect(readPref('panel:sessions')).toBe('false');
  });

  it('returns the fallback when nothing is stored', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    expect(readPref('model', '')).toBe('');
    expect(readPref('model')).toBeNull();
  });

  it('survives a storage that throws', () => {
    vi.stubGlobal('localStorage', blockedStorage());
    expect(readPref('locale', 'en')).toBe('en');
    expect(() => writePref('locale', 'pt')).not.toThrow();
  });
});

describe('dropLegacyPrefs', () => {
  it('removes the legacy keys and keeps the live ones', () => {
    const storage = memoryStorage({
      'ai-chat:onboarded': 'true',
      'ai-chat:panel:config': 'true',
      'ai-chat:incomplete-models': '[]',
      'ai-chat:runtime': 'Web-GPU',
      'ai-chat:model': 'qwen',
      'ai-chat:panel:sessions': 'true',
    });
    vi.stubGlobal('localStorage', storage);

    dropLegacyPrefs();

    expect(storage.keys()).toEqual(['ai-chat:model', 'ai-chat:panel:sessions']);
  });

  it('survives a storage that throws', () => {
    vi.stubGlobal('localStorage', blockedStorage());
    expect(() => dropLegacyPrefs()).not.toThrow();
  });
});
