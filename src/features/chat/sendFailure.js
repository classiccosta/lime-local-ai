import { isNetworkError } from '@/lib/errors';

// Longer than this and a server's own message is more likely a dump than a
// sentence meant for whoever is chatting.
const MAX_SERVER_MESSAGE = 160;

// What the banner says when a send fails. The raw errors are English and
// written for developers — a server's whole JSON body, "Failed to fetch" — so
// each is sorted into a cause the user can act on, in their language, and the
// original goes to the console.
export function describeSendFailure(error, t) {
  if (error?.body) console.error(error, error.body);
  else console.error(error);

  if (error?.code === 'NO_MODEL') return t('banner.noModel');
  if (error?.status) return t('banner.httpError', { status: error.status });
  if (error?.code === 'STREAM_FAILED') {
    const message = error.message.trim();
    return message && message.length <= MAX_SERVER_MESSAGE && !message.includes('\n')
      ? message
      : t('banner.serverFailed');
  }
  if (isNetworkError(error)) return t('banner.unreachable');
  return t('banner.failed');
}
