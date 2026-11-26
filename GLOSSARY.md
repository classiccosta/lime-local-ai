# Lime

A local-first chat client for language models. It shows models from two sources as one list and keeps every conversation in the browser.

## Language

**Model**:
A language model the user can pick for a reply, from either provider.
_Avoid_: LLM (in UI and docs), engine

**Provider**:
The kind of source a model comes from: in-browser WebGPU or an endpoint. The rest of the app never branches on it.
_Avoid_: Backend, runtime

**Endpoint**:
A user-configured OpenAI-compatible server (LM Studio, llama.cpp, vLLM) that Lime reaches over HTTP.
_Avoid_: Server, API, host

**Cached**:
A model whose weights are stored on the device. Says nothing about whether it is ready to run.
_Avoid_: Downloaded, installed

**Loaded**:
A cached model that is held in GPU memory right now. Not kept across reloads.
_Avoid_: Ready, active

**Conversation**:
The chat that is open: its messages, title and timestamps.
_Avoid_: Chat, thread

**Session**:
A conversation saved on the device and listed in the sidebar.
_Avoid_: History item, saved chat

**Active request**:
The one reply currently being generated. Only its own tokens and result may change the conversation.
_Avoid_: Pending request, in-flight call

**Stop**:
The user ending a reply early. Switching to another session mid-reply counts as a Stop, and the user turn stays, shown as stopped.
_Avoid_: Cancel, abort, interrupt
