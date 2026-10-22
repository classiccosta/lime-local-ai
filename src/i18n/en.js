// Source language. Every other file in this directory answers to these keys:
// a key missing there falls back to the English string rather than to nothing.
//
// Keys are namespaced by where they appear, not by what they say, so a string
// used twice in different places stays two entries — the two can need to
// diverge in another language even when they match in English.
export const en = {
  'panel.sessions': 'Sessions',
  'panel.settings': 'Settings',
  'panel.show': 'Show {label}',
  'panel.hide': 'Hide {label}',
  'panel.close': 'Close {label}',

  'sessions.new': 'New',
  'sessions.settings': 'Settings',
  'settings.models': 'Models',
  'settings.noWebgpu':
    "WebGPU isn't available in this browser. Use Chrome or Edge, or connect an endpoint below.",
  'settings.changeEndpoint': 'Change',
  'settings.downloaded': 'Downloaded',
  'settings.remote': 'Runs on the endpoint',
  'settings.endpointTitle': 'Endpoint',
  'settings.download': 'Download {name}',
  'settings.deleteHint': 'Delete {name}',
  'settings.title': 'Settings',
  'sessions.empty': 'No sessions yet.',
  'sessions.loadFailed': "Couldn't open your saved chats.",
  'sessions.saveFailed': "Couldn't save this chat to browser storage.",
  'sessions.deleteFailed': "Couldn't delete this chat.",
  'sessions.untitled': 'New chat',
  'sessions.actions': 'Options for {name}',
  'sessions.deleteShort': 'Delete session',

  'language.label': 'Language',
  'language.change': 'Change',

  'runtime.label': 'Runtime',

  'model.label': 'Model',
  'model.placeholder': 'Select a model',
  'model.loading': 'Loading…',
  'model.listError': "Couldn't load the model list. Reload the page to try again.",
  'model.restoring': 'Loading models…',
  'model.storageFull':
    'Not enough browser storage for this model. Delete a downloaded model with its trash icon, then try again.',
  'model.loadNetwork': 'The download failed. Check your connection and try again.',
  'model.loadGpu':
    "This device's GPU couldn't run the model. Close other tabs or try a smaller model.",
  'model.loadFailed': "The model couldn't be loaded. Try again.",

  'thread.welcome': 'How can I help you today?',
  'thread.placeholder': 'Send a message...',
  'thread.stopped': 'Stopped',
  'thread.thinking': 'Thinking…',
  'thread.thoughtFor': 'Thought for {time}',
  'thread.copy': 'Copy',
  'thread.export': 'Export as Markdown',

  'composer.choose': 'Choose a model',
  'composer.textOnly': 'Text only in this version of Lime',
  'composer.attachmentsUnavailable': 'Attachments unavailable',
  'composer.noWebgpu':
    "WebGPU isn't available in this browser. Use Chrome or Edge, or connect an endpoint in Settings.",
  'composer.noModels':
    'No models available. Use Chrome or Edge to run them in the browser, or connect an endpoint in Settings.',

  'banner.noModel': 'Choose a model first.',
  'banner.unreachable': "Can't reach the endpoint. Check it's running and allows CORS.",
  'banner.httpError': 'The server returned an error ({status}).',
  'banner.serverFailed': "The server couldn't finish the reply. Try again.",
  'banner.failed': 'Something went wrong. Try again.',

  'endpoint.label': 'Endpoint',
  'endpoint.submit': 'Load models',
  'endpoint.submitting': 'Loading…',
  'endpoint.none': 'No models found at this endpoint.',
  'endpoint.count_one': '{count} model available.',
  'endpoint.count_other': '{count} models available.',
  'endpoint.unreachable': "Can't reach this endpoint. Check it's running and allows CORS.",
  'endpoint.timeout': "The endpoint didn't answer in time. Check it's running.",
  'endpoint.httpError': 'The endpoint returned an error ({status}).',
  'endpoint.failed': "Couldn't read a model list from this address. Check the URL.",
};
