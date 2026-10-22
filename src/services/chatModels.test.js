import { describe, expect, it } from 'vitest';
import { isChatModel } from './chatModels';

describe('isChatModel', () => {
  it('trusts a type field when the server sends one', () => {
    expect(isChatModel({ id: 'nomic', type: 'embeddings' })).toBe(false);
    expect(isChatModel({ id: 'gemma', type: 'llm' })).toBe(true);
    expect(isChatModel({ id: 'gemma', type: 'vlm' })).toBe(true);
  });

  it('lets the type field win over the name', () => {
    expect(isChatModel({ id: 'embed-anything-chat', type: 'llm' })).toBe(true);
  });

  it('falls back to the name when there is no type field', () => {
    expect(isChatModel({ id: 'text-embedding-nomic-embed-text-v1.5' })).toBe(false);
    expect(isChatModel({ id: 'BAAI/bge-EMBED' })).toBe(false);
  });

  it('keeps anything it cannot rule out', () => {
    expect(isChatModel({ id: 'google/gemma-4-e2b' })).toBe(true);
    expect(isChatModel({})).toBe(true);
  });
});
