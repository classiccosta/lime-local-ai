import { useT } from '@/i18n/context';
import { DEFAULT_SESSION_NAME } from '@/state/conversation';

export function Title({ children }) {
  const t = useT();
  // The stored marker is swapped for display text here rather than at the point
  // it is written, so switching language renames every unnamed session at once
  // instead of leaving a trail of them in past languages.
  const title = !children || children === DEFAULT_SESSION_NAME ? t('sessions.untitled') : children;
  return <h3 className="min-w-0 truncate text-base font-semibold">{title}</h3>;
}
