import { Cloud, HardDrive } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { buildPickerItems } from './pickerItems';

const t = (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key);

const small = { id: 'small', label: 'Small · 500 MB', provider: 'webgpu', requiresLoad: true };
const large = { id: 'large', label: 'Large · 2 GB', provider: 'webgpu', requiresLoad: true };
const remote = { id: 'qwen3-8b', provider: 'endpoint', requiresLoad: false };

function build(overrides = {}) {
  return buildPickerItems({
    webgpuModels: [small, large],
    endpointModels: [remote],
    downloaded: new Set(),
    loadedModelIds: [],
    selectedModelId: '',
    loadingModelId: '',
    busy: false,
    webgpuReady: true,
    onDownload: vi.fn(),
    onDelete: vi.fn(),
    t,
    ...overrides,
  });
}

const row = (items, id) => items.find((item) => item.id === id);

describe('buildPickerItems', () => {
  it('lists the in-browser rows before the endpoint ones', () => {
    expect(build().map((item) => item.id)).toEqual(['small', 'large', 'qwen3-8b']);
  });

  it('offers a model not on disk for download, with its size and no delete', () => {
    const onDownload = vi.fn();
    const item = row(build({ onDownload }), 'small');
    expect(item).toMatchObject({ label: 'Small · 500 MB', icon: null, dim: true, pickable: false });
    expect(item.onDelete).toBeUndefined();
    item.onDownload();
    expect(onDownload).toHaveBeenCalledWith('small');
  });

  it('marks a model on disk, drops its size and offers delete instead of download', () => {
    const onDelete = vi.fn();
    const item = row(build({ downloaded: new Set(['small']), onDelete }), 'small');
    expect(item).toMatchObject({ label: 'Small', icon: HardDrive, dim: false, pickable: true });
    expect(item.onDownload).toBeUndefined();
    item.onDelete();
    expect(onDelete).toHaveBeenCalledWith('small');
  });

  // Selected but not on the GPU yet: it cannot answer, so it is not shown as the active one.
  it('shows an in-browser model as active only once it is loaded', () => {
    const selected = { downloaded: new Set(['small']), selectedModelId: 'small' };
    expect(row(build(selected), 'small').active).toBe(false);
    expect(row(build({ ...selected, loadedModelIds: ['small'] }), 'small').active).toBe(true);
  });

  it('disables the other rows while one loads, and keeps delete off the loading one', () => {
    const items = build({
      downloaded: new Set(['small', 'large']),
      loadingModelId: 'small',
      busy: true,
    });
    expect(row(items, 'small')).toMatchObject({ busy: true, disabled: false });
    expect(row(items, 'small').onDelete).toBeUndefined();
    expect(row(items, 'large')).toMatchObject({ busy: false, disabled: true });
    expect(row(items, 'large').onDelete).toBeTypeOf('function');
  });

  it('leaves the in-browser rows out until they are ready, and keeps the endpoint ones', () => {
    expect(build({ webgpuReady: false }).map((item) => item.id)).toEqual(['qwen3-8b']);
  });

  it('marks endpoint rows as remote and active when selected, without loading', () => {
    const item = row(build({ selectedModelId: 'qwen3-8b' }), 'qwen3-8b');
    expect(item).toMatchObject({ label: 'qwen3-8b', icon: Cloud, active: true });
  });
});
