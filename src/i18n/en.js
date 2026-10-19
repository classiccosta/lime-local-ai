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
  'panel.more': 'Show more',

  'sessions.new': 'New',
  'sessions.settings': 'Settings',
  'settings.models': 'Models',
  'settings.noWebgpu': 'WebGPU is not available in this browser.',
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

  'welcome.title': 'runs your models locally',
  'welcome.subtitle': 'Nothing leaves your device. Choose one of the options:',
  // Short forms, used below the md breakpoint. Rewrites rather than truncations:
  // on a phone the sentence worth keeping is the one that answers "which do I
  // tap", and the reassurance is already carried by the strip above.
  'welcome.subtitleShort': 'Choose one of the options:',
  'welcome.webgpu': 'In-browser · WebGPU',
  'welcome.webgpuBody':
    'Models download and run right in this tab. No setup — needs a WebGPU-capable browser and a few GB per model.',
  'welcome.webgpuBodyShort': 'Downloads and runs in this tab. A few GB per model.',
  'welcome.recommended': 'Recommended',
  'welcome.endpoint': 'Local endpoint',
  'welcome.endpointBody':
    'Fetch models from a server you run — Ollama, llama.cpp, LM Studio or any OpenAI-compatible endpoint.',
  'welcome.endpointBodyShort': 'Use a server you already run — Ollama, LM Studio.',
  'welcome.footnote': 'Change anytime in settings.',
  'welcome.continue': 'Continue',
  'welcome.close': 'Close',
  'welcome.hero': 'Keep your AI in-house.',
  'welcome.modelsTitle': 'Pick a model to download',
  'welcome.modelsSubtitle': 'It downloads once and then runs offline. You can add others later.',
  'welcome.modelsSubtitleShort': 'Downloads once, then runs offline.',
  'welcome.download': 'Download',
  'welcome.downloading': 'Downloading…',
  'welcome.ready': 'Ready',
  'welcome.needOne': 'You have to load at least one model to continue.',
  'welcome.keepsGoing':
    'You can close this — the download carries on. Check settings for more info.',
  'welcome.noWebgpu':
    'This browser cannot run models in the tab. Connect a local endpoint in Settings instead.',
  'welcome.back': 'Back',
  'welcome.finish': 'Start chatting',
  'welcome.finishShort': 'Start',
  'welcome.stepOf': 'Step {current} of {total}',

  'runtime.label': 'Runtime',

  'model.label': 'Model',
  'model.hint': 'Pick a model to download and run on this device.',
  'model.placeholder': 'Select a model',
  'model.loading': 'Loading…',
  'model.listError': 'Could not load models: {error}',
  'model.load': 'Load Model',
  'model.loadingButton': 'Loading...',
  'model.restoring': 'Loading models…',
  'model.storageFull':
    'Not enough browser storage for this model. Delete a downloaded model with its trash icon, then try again.',
  'model.loadNetwork': 'The download failed. Check your connection and try again.',
  'model.loadGpu':
    "This device's GPU couldn't run the model. Close other tabs or try a smaller model.",
  'model.loadFailed': "The model couldn't be loaded. Try again.",

  'progress.loading': 'Loading model…',
  'progress.preparing': 'Preparing model…',
  'progress.stop': 'Stop loading model',
  'progress.stopShort': 'Stop loading',
  'progress.bar': 'Model download',

  'info.loaded': 'Loaded',
  'info.parameters': 'Parameters',
  'info.quantization': 'Quantization',
  'info.context': 'Context',
  'info.download': 'Download',
  'info.vram': 'VRAM est.',
  'info.source': 'Source',

  'thread.welcome': 'How can I help you today?',
  'thread.placeholder': 'Send a message...',

  'composer.choose': 'Choose a model',
  'composer.textOnly': 'Text only in this version of Lime',
  'composer.attachmentsUnavailable': 'Attachments unavailable',

  'endpoint.label': 'Endpoint',
  'endpoint.submit': 'Load models',
  'endpoint.submitting': 'Loading…',
  'endpoint.none': 'No models found at this endpoint.',
  'endpoint.count_one': '{count} model available.',
  'endpoint.count_other': '{count} models available.',

  'storage.label': 'Storage',
  'storage.help': 'How browser storage is measured',
  'storage.bar': 'Browser storage used',
  'storage.contains': 'What you are keeping on your device:',
  'storage.itemModels': 'Downloaded model files',
  'storage.itemConversations': 'Saved conversations',
  'storage.itemSettings': 'A few settings',
  'storage.caveat':
    'Your browser sets the size from your device’s free space, so it can move over time.',
  'storage.free': '{size} free',
  'storage.of': 'of {size}',
  'storage.models': 'Models',
  'storage.conversations': 'Conversations',
  'storage.tooBig': '{label} needs about {size} and may not fit. Clear cached models first.',
  'storage.notPersisted': 'The browser may evict cached models when disk runs low.',
  'storage.clear': 'Clear cached models',
  'storage.confirm': 'Delete models',
  'storage.clearing': 'Clearing…',
  'storage.cancel': 'Cancel',
};
