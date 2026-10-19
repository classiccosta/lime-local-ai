import { useT } from '@/i18n/context';
import { formatBytes } from '@/lib/format';
import { findLocalModel } from '@/services/localModels';
import { ExternalLink } from 'lucide-react';

// Runtime memory runs well above the download: weights plus activations, the KV
// cache and framework overhead. 1.5x reproduces the ~2.5 GB Liquid AI publish
// for LFM2.5, so it is used for both rather than quoting one and guessing the
// other. Shown as an estimate, which is what it is.
const VRAM_MULTIPLIER = 1.5;

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

export function ModelInfo({ modelId, loaded }) {
  const t = useT();
  const info = findLocalModel(modelId)?.info;
  if (!info) return null;

  return (
    <div className="bg-muted overflow-hidden rounded-lg">
      {/* The card carries the loaded state now that the button is gone with it.
          Full-bleed to the card's edges; the parent's clip rounds the strip's
          top corners to the same radius. */}
      {loaded && (
        <div className="bg-primary text-primary-foreground py-1 text-center text-[10px]">
          {t('info.loaded')}
        </div>
      )}
      <div className="flex flex-col gap-1.5 px-3 py-2.5 text-xs">
        <Row label={t('info.parameters')} value={info.parameters} />
        <Row label={t('info.quantization')} value={info.quantization} />
        <Row label={t('info.context')} value={info.context} />
        <Row label={t('info.download')} value={formatBytes(info.downloadBytes)} />
        <Row
          label={t('info.vram')}
          value={`~${formatBytes(info.downloadBytes * VRAM_MULTIPLIER)}`}
        />

        {/* Every figure above is transcribed by hand from the model's
            repository — nothing here is fetched — so the card says where it was
            read from rather than asking to be taken on trust. Written as one
            more label/value pair because that is what provenance is, and a
            corner icon has no header to belong to. The catalogue ids are
            Hugging Face repo ids, so the URL needs no extra field. */}
        <a
          href={`https://huggingface.co/${modelId}`}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring border-border/60 mt-0.5 flex items-center justify-between gap-3 border-t pt-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <span>{t('info.source')}</span>
          <span className="inline-flex items-center gap-1">
            Hugging Face
            <ExternalLink aria-hidden="true" className="size-3" />
          </span>
        </a>
      </div>
    </div>
  );
}
