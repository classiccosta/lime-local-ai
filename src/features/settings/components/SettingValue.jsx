/**
 * A setting shown as its current value, with a "Change" link to edit it.
 *
 * For settings that are set once and then left alone — the endpoint, the
 * language. A live input for each would make the dialog read as a form to fill
 * in, when almost every visit is to pick a model.
 */
export function SettingValue({ value, changeLabel, onChange }) {
  return (
    <div className="flex h-7 items-center justify-between gap-2">
      <span className="truncate text-xs">{value}</span>
      <button
        type="button"
        onClick={onChange}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring shrink-0 rounded-sm text-xs underline underline-offset-2 focus-visible:ring-2 focus-visible:outline-none"
      >
        {changeLabel}
      </button>
    </div>
  );
}
