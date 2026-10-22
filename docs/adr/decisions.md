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

## ADR-009 · 2026-10-21 · Superseded by ADR-10 — Switching chat mid-reply rolls back the turn

Context: switching session aborts the in-flight request; the user turn is already persisted and would stay unanswered.
Decision: switching (openSession) rolls the turn back like a failure. Stop keeps it. A first turn is always kept so the chat isn't deleted. Reload keeps it (nothing runs).
Consequences: no orphan questions from switching. Stop, reload and first-turn cases still leave an unanswered turn, which s1-07's marker covers.

## ADR-010 · 2026-10-21 · Accepted — Switching chat mid-reply is a Stop (supersedes ADR-009)

Context: with HTTP streaming the user sees the reply start; rolling the question back on a switch reads as data loss, and it was the only interruption with its own rule.
Decision: switching session mid-reply dispatches CANCEL and nothing else. The user turn is kept and shows the "Stopped" marker, same as Stop and reload.
Consequences: one rule for every interruption; abandonedMessages and its rollback write are deleted. Partial reply is still discarded everywhere (bl-06).

## ADR-011 · 2026-10-21 · Accepted — Remove onboarding, info panels and settings rail

Context: three features sat behind SHOW_* flags set to false; v1 allows no dead code behind flags.
Decision: delete WelcomeModal/first-run, ModelInfo, StorageMeter and the settings rail with their flags. Settings live only in SettingsDialog.
Consequences: less code and UI. No pre-download storage warning or "Clear models": a full disk surfaces as the QuotaExceededError on load; models are deleted one by one in the model list. Persistence is still requested before the first download.
No download progress or stop button: the model row shows a spinner until the load finishes.” It’s the most visible consequence, and it should be on record.

## ADR-012 · 2026-10-22 · Accepted — WebGPU paused for v1; endpoint-only

Context: in-browser models small enough for a phone (Qwen3-0.6B, SmolVLM) hallucinate on basic questions; the endpoint path works well.
Decision: gate WebGPU off with one constant (WEBGPU_ENABLED in localModels.js). The code stays; the app behaves as in a browser without WebGPU. The live demo is documented as "bring your own endpoint", with a recorded demo in the README.
Consequences: v1 needs an OpenAI-compatible endpoint (LM Studio with CORS on); no model works on mobile. Dormant code behind one flag, an exception to the no-flags rule with an expiry: if WebGPU isn't back by v1.1, it is removed (archive branch).
