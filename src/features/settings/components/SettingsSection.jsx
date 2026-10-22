/**
 * One block of the settings dialog: a small muted title over its controls,
 * ruled off from the block above. The first block has no rule to draw.
 *
 * `title` is optional because the endpoint field carries its own label;
 * `titleId` is for a control that names itself by the title.
 */
export function SettingsSection({ title, titleId, children }) {
  return (
    <section className="flex flex-col gap-2 border-t pt-3 first:border-t-0 first:pt-0">
      {title && (
        <h3 id={titleId} className="text-muted-foreground text-xs">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}
