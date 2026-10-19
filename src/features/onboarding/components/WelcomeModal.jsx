import { ProgressBar } from '@/features/models/components/ProgressBar';
import { useT } from '@/i18n/context';
import { useIsMobile } from '@/lib/useMediaQuery';
import { cn } from '@/lib/utils';
import { findLocalModel } from '@/services/localModels';
import { AlertTriangle, Check, Download, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

const DEFAULT_ENDPOINT = 'http://localhost:11434';

/**
 * The strip across the top of the dialog, at about a third of its height.
 *
 * Drawn rather than photographed: the project ships no artwork, and an inline
 * figure costs no request, scales to any width and follows the theme. To use a
 * real image instead, replace the <svg> with an <img> under the same wrapper —
 * the gradient beneath and the fade above it are what seat the strip against
 * the card, and neither depends on what sits between them.
 */
function Hero({ line }) {
  return (
    <div className="from-primary/25 relative h-32 shrink-0 overflow-hidden bg-gradient-to-bl via-[#222623] to-[#1b1e1c] sm:h-52">
      <svg
        aria-hidden="true"
        viewBox="0 0 640 208"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        <defs>
          <pattern id="welcome-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        {/* Barely there: it is a texture under the figure, not a element of it. */}
        <rect
          width="640"
          height="208"
          fill="url(#welcome-grid)"
          className="text-foreground/[0.03]"
          opacity="0.5"
        />
        {/* A field of weights arriving — the thing the dialog is about to ask
            permission to download. Held to the right third so the line beside it
            sits on open ground rather than on top of the figure. */}
        {[
          [404, 138, 34],
          [436, 112, 60],
          [468, 150, 26],
          [500, 92, 82],
          [532, 128, 46],
          [564, 160, 20],
          [596, 106, 66],
        ].map(([x, y, height]) => (
          <rect
            key={x}
            x={x}
            y={y}
            width="14"
            height={height}
            rx="3"
            fill="currentColor"
            className="text-primary"
            opacity={0.25 + (height % 24) / 60}
          />
        ))}
        <text x="404" y="56" className="fill-primary" fontSize="34" fontWeight="500">
          &gt;_
        </text>
      </svg>
      {/* Fades the strip into the card so it reads as part of the surface
          rather than a picture pasted onto it. */}
      <div className="from-card absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t to-transparent" />
      {/* Archivo at its extremes — 900 weight, 125% width — which the variable
          font already carries and nothing else in the app uses. Same family as
          the body copy, so it stays on-brand, but heavy and wide enough to read
          as a different face rather than as body text enlarged. Given the left
          half outright: at this size the line is the strip's subject and the
          figure is what sits beside it. */}
      <p className="absolute inset-y-0 left-0 flex w-[74%] items-center px-5 font-sans text-[clamp(1rem,5.8vw,44px)] leading-[0.95] font-black text-balance sm:w-[58%] sm:px-7">
        {line}
      </p>
    </div>
  );
}

function Radio({ checked }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'mt-0.5 size-[18px] shrink-0 rounded-full transition-colors',
        checked
          ? 'border-primary bg-[#14170f] border-[5px]'
          : 'border-muted-foreground/60 border-2',
      )}
    />
  );
}

// The smallest download is the one to recommend: it is the difference between
// waiting a minute and waiting twenty on the very first thing the app asks of
// someone, and either model answers a first question equally well.
function recommendedId(models) {
  const sized = models.map((model) => ({
    id: model.id,
    bytes: findLocalModel(model.id)?.info?.downloadBytes ?? Infinity,
  }));
  return sized.sort((a, b) => a.bytes - b.bytes)[0]?.id ?? '';
}

function ModelRow({ model, recommended, loaded, loading, disabled, onLoad, t }) {
  const info = findLocalModel(model.id)?.info;

  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-xl border p-4 transition-colors',
        loaded ? 'border-primary bg-primary/5' : 'border-border',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="truncate">{model.label ?? model.id}</span>
            {recommended && !loaded && (
              <span className="border-primary/40 text-primary shrink-0 rounded-full border px-2 py-0.5 text-[8px] uppercase">
                {t('welcome.recommended')}
              </span>
            )}
          </span>
          {info && (
            <span className="text-muted-foreground text-xs leading-normal sm:text-sm">
              {info.parameters} · {info.quantization} · {info.context}
            </span>
          )}
        </div>
        {loaded ? (
          <span
            title={t('welcome.ready')}
            className="text-primary grid size-8 shrink-0 place-items-center"
          >
            <Check aria-hidden="true" className="size-4" />
            <span className="sr-only">{t('welcome.ready')}</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onLoad(model.id)}
            disabled={disabled}
            aria-label={loading ? t('welcome.downloading') : t('welcome.download')}
            title={loading ? t('welcome.downloading') : t('welcome.download')}
            className="border-border hover:bg-accent focus-visible:ring-ring grid size-8 shrink-0 place-items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
          >
            <Download
              aria-hidden="true"
              className={cn('size-4', loading && 'animate-pulse motion-reduce:animate-none')}
            />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * First-run runtime choice.
 *
 * The one decision the app cannot make for the user: whether models run in this
 * tab or on a server they already have. Asked once, on a browser with nothing
 * stored, because every later visit can read the answer back.
 */
export function WelcomeModal({
  open,
  onConfirm,
  models = [],
  loadedModelIds = [],
  onLoadModel,
  progress,
  loadingStatus,
  loadingError,
  loadingModelId,
  busy,
  onCancelLoad,
}) {
  const t = useT();
  const isMobile = useIsMobile();
  // Short copy on a phone. Every key passed here has a `…Short` twin, so the
  // lookup never falls through to a raw key.
  const ts = (key) => t(isMobile ? `${key}Short` : key);
  const [step, setStep] = useState('runtime');
  const [choice, setChoice] = useState('Web-GPU');
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [needsModel, setNeedsModel] = useState(false);
  // Whether a download was started from this dialog. `busy` alone cannot say:
  // it is true for any load in flight, and on a browser with a populated cache
  // the startup restore is already running behind this dialog — which made the
  // close button fade out and back in for reasons the user had no part in.
  const [requested, setRequested] = useState(false);

  const local = models.filter((model) => model.requiresLoad);
  const recommended = recommendedId(local);
  const anyLoaded = local.some((model) => loadedModelIds.includes(model.id));

  // A download started here is owned by useModels, not by this dialog: its
  // AbortController is only ever pulled by an explicit cancel, so unmounting the
  // modal leaves the request running. Nothing about leaving is withheld — the
  // progress reappears in the settings panel, and carries on unseen when that
  // panel is shut.
  const downloading = busy && requested;

  const confirm = () => onConfirm({ runtimeId: choice, endpoint: endpoint.trim() });

  const advance = () => {
    // The endpoint route is finished at step one — there is nothing to download,
    // and the address has already been given.
    if (choice !== 'Web-GPU') {
      confirm();
      return;
    }
    // Nor is there anything to download where the models cannot run at all.
    if (!local.length) {
      confirm();
      return;
    }
    setStep('models');
  };

  const finish = () => {
    // A download still running counts as having done the thing: it survives the
    // dialog closing and lands in the background. Only someone who has started
    // nothing at all is held here.
    if (!anyLoaded && !downloading) {
      setNeedsModel(true);
      return;
    }
    confirm();
  };

  const loadModel = (id) => {
    setNeedsModel(false);
    setRequested(true);
    onLoadModel?.(id);
  };

  // Leaving is allowed at any point except mid-download, which would abandon a
  // half-written model and leave the cache holding files for one that is flagged
  // incomplete. Whatever is selected is applied on the way out, so closing early
  // is a choice rather than a cancellation — the rest is reachable in Settings.

  return (
    // Closing by any route is the same as confirming what is selected: the
    // default is the recommended one, and trapping someone in a dialog to make
    // a choice the app is happy to guess would be worse than guessing.
    <Dialog.Root open={open} onOpenChange={(next) => !next && confirm()}>
      <Dialog.Portal>
        {/* The shared DialogContent draws its own opaque overlay and gives no
            way to soften it, so the primitives are composed here. Light enough
            to keep the app legible underneath: this dialog introduces the app,
            and hiding what it is introducing defeats it. */}
        <Dialog.Overlay className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/45 duration-100" />
        <Dialog.Content
          aria-describedby={undefined}
          /* Centred in what is visible, not in the window. The max-height above
             already shrinks the card when a keyboard opens, but a card centred
             on the full viewport still has its middle — and the endpoint field
             near its foot — behind the keyboard. Halving the inset moves the
             centre with it. */
          // Radix focuses the first focusable element on open, which is the
          // close button — a real focus, so the ring paints itself the moment
          // the dialog appears. Focus goes to the panel instead: it is still
          // trapped and Tab still reaches every control, but nothing is singled
          // out before the user has touched anything.
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="bg-card border-border data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-[calc(50%-var(--keyboard-inset,0px)/2)] left-1/2 z-50 flex max-h-[calc(100dvh-2rem-var(--keyboard-inset,0px))] w-[640px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border shadow-[0_24px_64px_-12px_rgba(0,0,0,0.7)] duration-100 outline-none"
        >
          <Hero line={t('welcome.hero')} />

          {/* Over the strip rather than in the body: the artwork is the only
              part of the dialog with room to spare, and a close control belongs
              at the card's corner. Absent while a download runs — there is
              nothing to click because there is nothing safe to do. */}
          {/* Never disabled. Leaving is always available, whatever is loading. */}
          <Dialog.Close
            aria-label={t('welcome.close')}
            className="text-foreground/60 hover:bg-foreground/10 hover:text-foreground focus-visible:ring-ring absolute top-4 right-4 grid size-7 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <X aria-hidden="true" className="size-4" />
          </Dialog.Close>

          <div className="scrollbar-none flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:gap-5 sm:p-7 sm:pt-6">
            {/* Only the lower half changes between steps — the strip and the
                card stay put, so the second step reads as the same dialog
                continuing rather than a new one replacing it. */}
            <div>
              <Dialog.Title className="text-[16px] font-semibold sm:text-[18px]">
                {step === 'runtime' ? (
                  <>
                    Lime<span className="text-primary"></span> {t('welcome.title')}
                  </>
                ) : (
                  t('welcome.modelsTitle')
                )}
              </Dialog.Title>
              <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
                {step === 'runtime' ? ts('welcome.subtitle') : ts('welcome.modelsSubtitle')}
              </p>
            </div>

            {step === 'models' ? (
              <div className="flex flex-col gap-2.5">
                {local.length === 0 && (
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    {t('welcome.noWebgpu')}
                  </p>
                )}
                {local.map((model) => (
                  <ModelRow
                    key={model.id}
                    model={model}
                    t={t}
                    recommended={model.id === recommended}
                    loaded={loadedModelIds.includes(model.id)}
                    // This row's own state, not the app's: `busy` is true for
                    // any load and would report both rows as downloading.
                    loading={loadingModelId === model.id}
                    // Disabled for any load though — one graph compiles at a
                    // time, whoever started the other one.
                    disabled={busy}
                    onLoad={loadModel}
                  />
                ))}

                <ProgressBar value={progress} status={loadingStatus} onCancel={onCancelLoad} />

                {/* Says what actually happens on the way out. A refresh is the
                    one thing that does throw the download away, and that is the
                    failure a first-time user will not see coming. */}
                {downloading && (
                  <p className="text-muted-foreground flex items-start gap-2 text-xs leading-normal">
                    <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                    {t('welcome.keepsGoing')}
                  </p>
                )}
                {loadingError && (
                  <p className="text-destructive text-xs leading-normal">{loadingError}</p>
                )}
                {needsModel && !busy && (
                  <p role="alert" className="text-destructive text-xs leading-normal">
                    {t('welcome.needOne')}
                  </p>
                )}
              </div>
            ) : (
              <div
                role="radiogroup"
                aria-label={t('runtime.label')}
                className="flex flex-col gap-2.5"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={choice === 'Web-GPU'}
                  onClick={() => setChoice('Web-GPU')}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                    choice === 'Web-GPU'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50',
                  )}
                >
                  <Radio checked={choice === 'Web-GPU'} />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{t('welcome.webgpu')}</span>
                    <span className="text-muted-foreground text-xs leading-normal sm:text-sm">
                      {ts('welcome.webgpuBody')}
                    </span>
                  </span>
                  <span className="border-primary/40 text-primary ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[8px] uppercase">
                    {t('welcome.recommended')}
                  </span>
                </button>

                <div
                  className={cn(
                    'flex flex-col gap-2.5 rounded-xl border p-4 transition-colors',
                    choice === 'LM-Studio'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50',
                  )}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={choice === 'LM-Studio'}
                    onClick={() => setChoice('LM-Studio')}
                    className="focus-visible:ring-ring flex items-start gap-3 text-left focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Radio checked={choice === 'LM-Studio'} />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold">{t('welcome.endpoint')}</span>
                      <span className="text-muted-foreground text-xs leading-normal sm:text-sm">
                        {ts('welcome.endpointBody')}
                      </span>
                    </span>
                  </button>
                  {/* Editable rather than the mock's static line: the address is the
                whole point of this option, and asking for it here saves a trip
                to Settings the moment the dialog closes. */}
                  <input
                    // See EndpointField for why this is not type="url".
                    type="text"
                    inputMode="url"
                    spellCheck="false"
                    autoComplete="off"
                    aria-label={t('endpoint.label')}
                    value={endpoint}
                    onChange={(event) => setEndpoint(event.target.value)}
                    onFocus={() => setChoice('LM-Studio')}
                    placeholder={DEFAULT_ENDPOINT}
                    className="bg-background border-border placeholder:text-muted-foreground/60 focus-visible:ring-ring ml-[30px] rounded-lg border px-3 py-2 text-xs focus-visible:ring-2 focus-visible:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground/70 text-xs">
                {step === 'runtime'
                  ? t('welcome.footnote')
                  : t('welcome.stepOf', { current: 2, total: 2 })}
              </span>
              <div className="flex items-center gap-2">
                {step === 'models' && (
                  <button
                    type="button"
                    onClick={() => setStep('runtime')}
                    disabled={downloading}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring h-8 rounded-full px-4 text-xs font-medium sm:text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                  >
                    {t('welcome.back')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={step === 'runtime' ? advance : finish}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring h-8 rounded-full px-5 text-xs font-semibold sm:text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                >
                  {step === 'runtime' ? t('welcome.continue') : ts('welcome.finish')}
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
