// A fetch that never reached a server — endpoint down, wrong address, or a
// response the browser withheld for lack of CORS headers, which it reports the
// same way on purpose. Each engine words it differently: Chrome "Failed to
// fetch", Safari "Load failed", Firefox "NetworkError when attempting…".
export function isNetworkError(error) {
  return /failed to fetch|load failed|networkerror/i.test(error?.message ?? '');
}

// An HTTP error response, tagged by openai.js with its status and body so the
// user can be shown the one and the console the other.
export function httpError(status, body) {
  return Object.assign(new Error(`Request failed: ${status}`), { status, body });
}
