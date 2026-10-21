// Written into IndexedDB as a session's name until its first message renames
// it, so this is a stored marker rather than display text: translating it here
// would freeze each row in whatever language it happened to be created in.
// Components match against it and render `sessions.untitled` in its place.
export const DEFAULT_SESSION_NAME = 'New session';

export function createConversation() {
  return {
    sessionId: crypto.randomUUID(),
    messages: [],
    status: 'idle',
    error: null,
    // Bumped on every failure. The error text alone cannot say "this happened
    // again": the same failure twice is the same string, and when a send fails
    // fast its clearing and its setting land in one render.
    errorCount: 0,
    streamed: '',
    dirty: false,
    activeRequestId: null,
  };
}

export function conversationReducer(state, action) {
  switch (action.type) {
    case 'SEND_START':
      return {
        ...state,
        messages: [...state.messages, action.message],
        status: 'generating',
        error: null,
        streamed: '',
        dirty: true,
        activeRequestId: action.requestId,
      };

    case 'TOKEN':
      if (action.requestId !== state.activeRequestId) return state;
      return { ...state, streamed: state.streamed + action.token };

    case 'REPLY':
      if (action.requestId !== state.activeRequestId) return state;
      return {
        ...state,
        messages: [...state.messages, action.message],
        status: 'idle',
        streamed: '',
        dirty: true,
        activeRequestId: null,
      };

    case 'FAIL':
      if (action.requestId !== state.activeRequestId) return state;
      return {
        ...state,
        messages: state.messages.slice(0, -1),
        status: 'idle',
        error: action.error,
        errorCount: state.errorCount + 1,
        streamed: '',
        dirty: true,
        activeRequestId: null,
      };

    case 'CANCEL':
      if (state.activeRequestId === null) return state;
      return { ...state, status: 'idle', streamed: '', activeRequestId: null };

    case 'LOAD_SESSION':
      return {
        ...createConversation(),
        sessionId: action.sessionId,
        messages: action.messages,
      };

    case 'NEW_SESSION':
      return { ...createConversation(), sessionId: action.sessionId };

    default:
      throw new Error(`Unknown conversation action: ${action.type}`);
  }
}

export function getSessionTitle(messages) {
  const firstUserMessage = messages.find((message) => message.role === 'user');
  const textPart = firstUserMessage?.content.find((part) => part.type === 'text');
  if (!textPart) return null;
  return textPart.text.slice(0, 50) + (textPart.text.length > 50 ? '...' : '');
}
