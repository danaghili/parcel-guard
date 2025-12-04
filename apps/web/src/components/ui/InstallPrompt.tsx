import { usePwaInstall } from '@/hooks/usePwaInstall'

export function InstallPrompt(): JSX.Element | null {
  const { isInstallable, install, dismiss } = usePwaInstall()

  if (!isInstallable) return null

  return (
    <div
      className="fixed bottom-24 left-4 right-4 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-xl z-40 max-w-md mx-auto"
      role="alertdialog"
      aria-labelledby="install-prompt-title"
      aria-describedby="install-prompt-description"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 id="install-prompt-title" className="text-white font-medium text-sm">
            Install ParcelGuard
          </h3>
          <p id="install-prompt-description" className="text-slate-400 text-xs mt-1">
            Add to your home screen for quick access and offline support.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 text-slate-400 hover:text-slate-200 p-1"
          aria-label="Dismiss install prompt"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="flex gap-3 mt-4">
        <button
          onClick={dismiss}
          className="flex-1 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          Not now
        </button>
        <button
          onClick={install}
          className="flex-1 px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
        >
          Install
        </button>
      </div>
    </div>
  )
}
