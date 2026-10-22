import { isNetworkError } from '@/lib/errors';

// What the endpoint field says when the model list can't be fetched. Worded at
// render time from the error itself, so it follows a change of language. The
// probe has already logged the original.
export function describeEndpointFailure(error, t) {
  if (isNetworkError(error)) return t('endpoint.unreachable');
  if (error?.name === 'TimeoutError') return t('endpoint.timeout');
  if (error?.status) return t('endpoint.httpError', { status: error.status });
  return t('endpoint.failed');
}
