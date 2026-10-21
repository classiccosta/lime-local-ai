# Decisions

Format: ID · date · status. Context → Decision → Consequences.

## ADR-001 · 2026-10-20 · Accepted — Plain JS until v1

Context: codebase is JS; v1 target 2026-11-20; target roles expect TS.
Decision: stay JS through v1, migrate to TS post-v1.
Consequences: no mid-sprint churn. TS absence is visible until migrated; README says it's planned.

## ADR-002 · pre-git · Accepted — assistant-ui for the chat UI

Context: chat UI needs streaming, composer, markdown, cancel, attachments; hand-building is slow and error-prone.
Decision: @assistant-ui/react via useExternalStoreRuntime; reducer stays source of truth.
Consequences: mature UX fast. Coupling limited to useAssistantRuntime.js + generated components. Older docs stale.

## ADR-003 · pre-git · Accepted — Send full history every request

Context: previous_response_id broke on reload, session switch, endpoint change.
Decision: send the whole message array to both backends. Don't reintroduce server-side chaining.
Consequences: portable sessions; payload grows with conversation (fine for local servers).

## ADR-004 · pre-git · Accepted — Request ownership via activeRequestId

Context: late reply after session switch was appended to the wrong conversation.
Decision: TOKEN/REPLY/FAIL carry requestId, ignored unless it matches. Cancellation is separate (AbortController on id → null).
Consequences: no cross-session corruption; errors from cancelled requests are silently dropped.

## ADR-005 · pre-git · Accepted — Lazy-load WebGPU runtime

Context: transformers.js ≈ 23 MB WASM.
Decision: llm.js only via await import(); listing/cache code free of transformers imports.
Consequences: initial bundle ~67 kB gzip; some constants duplicated on purpose.

## ADR-006 · 2026-10-19 · Accepted — Git workflow

Decision: main always deployable; one ticket = one branch = one PR; squash only; conventional commits; CI green before merge; ruleset enforced when public.
Consequences: linear, readable history.

## ADR-007 · 2026-10-20 · Accepted — lucide as the only icon library

Context: lucide in 24 files, hugeicons in 1.
Decision: keep lucide; set components.json iconLibrary to lucide; remove hugeicons packages.
Consequences: one fewer dependency, consistent icons.

## ADR-008 · 2026-10-20 · Accepted — v1 date fixed, scope flexes

Decision: v1.0.0 on 2026-11-20. Slip → cut Sprint 3 polish first, never Sprint 1.
