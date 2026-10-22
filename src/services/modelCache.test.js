import { describe, expect, it } from 'vitest';
import { repoIdOf } from './modelCache';

describe('repoIdOf', () => {
  it('reads the repo id from a Hugging Face file URL', () => {
    expect(
      repoIdOf(
        'https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX/resolve/main/onnx/model_q4f16.onnx',
      ),
    ).toBe('onnx-community/Qwen3-0.6B-ONNX');
  });

  it('ignores anything that is not a model file', () => {
    expect(repoIdOf('https://huggingface.co/api/models/org/repo')).toBeNull();
    expect(repoIdOf('not a url')).toBeNull();
  });
});
