import { Cloud, HardDrive } from 'lucide-react';
import { shortLabel } from './labels';

// The rows of both pickers, the settings dialog's and the composer's.
export function buildPickerItems({
  webgpuModels,
  endpointModels,
  downloaded,
  loadedModelIds,
  selectedModelId,
  loadingModelId,
  busy,
  webgpuReady,
  onDownload,
  onDelete,
  t,
}) {
  // Downloaded models are marked rather than the rest: on-disk is the state
  // worth seeing at a glance, and the rest already carry a download mark and
  // their size. Picking a loaded one just selects it; one on disk but not on
  // the GPU loads from disk. A model not downloaded is fetched only from its
  // download icon, through the composer's path (select, ask for persistence,
  // load). Only one model compiles at a time, so the rest wait while one is
  // in flight.
  const webgpuItems = webgpuModels.map((model) => {
    const onDisk = downloaded.has(model.id);
    const loadingThis = loadingModelId === model.id;
    return {
      id: model.id,
      label: onDisk ? shortLabel(model) : (model.label ?? model.id),
      icon: onDisk ? HardDrive : null,
      iconLabel: t('settings.downloaded'),
      active: model.id === selectedModelId && loadedModelIds.includes(model.id),
      busy: loadingThis,
      disabled: busy && !loadingThis,
      dim: !onDisk,
      pickable: onDisk,
      onDownload: onDisk ? undefined : () => onDownload(model.id),
      downloadLabel: t('settings.download', { name: shortLabel(model) }),
      onDelete: onDisk && !loadingThis ? () => onDelete(model.id) : undefined,
      deleteLabel: t('settings.deleteHint', { name: shortLabel(model) }),
    };
  });

  const endpointItems = endpointModels.map((model) => ({
    id: model.id,
    label: model.label ?? model.id,
    icon: Cloud,
    iconLabel: t('settings.remote'),
    active: model.id === selectedModelId,
  }));

  return [...(webgpuReady ? webgpuItems : []), ...endpointItems];
}
