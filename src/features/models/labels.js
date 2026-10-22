// The catalogue labels carry their download size — "Qwen3-0.6B · 570 MB" —
// which is noise on a model already on disk and the deciding fact on one a row
// is offering to fetch.
export function shortLabel(model) {
  return (model.label ?? model.id).split(' · ')[0];
}
