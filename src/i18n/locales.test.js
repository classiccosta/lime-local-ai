import { describe, expect, it } from 'vitest';
import { DICTIONARIES } from './context';
import { en } from './en';
import { LOCALES } from './locales';

// The fallback to English hides a missing key at runtime, so a third language
// makes a gap easy to ship. Every locale must answer to exactly en's keys.
describe('translations', () => {
  const sourceKeys = Object.keys(en).sort();

  it.each(Object.entries(DICTIONARIES))('%s has exactly the English keys', (_, dictionary) => {
    expect(Object.keys(dictionary).sort()).toEqual(sourceKeys);
  });

  it('offers every dictionary in the language switch, and nothing else', () => {
    expect(LOCALES.map((locale) => locale.id).sort()).toEqual(Object.keys(DICTIONARIES).sort());
  });
});
