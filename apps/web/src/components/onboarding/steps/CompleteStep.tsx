interface CompleteStepProps {
  cameraAdded: boolean
  onComplete: () => void
}

export function CompleteStep({ cameraAdded, onComplete }: CompleteStepProps): JSX.Element {
  return (
    <div className="text-center">
      {/* Success icon */}
      <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">You're All Set!</h2>
      <p className="text-slate-400 mb-8">
        ParcelGuard is ready to start monitoring your space.
      </p>

      {/* Summary */}
      <div className="bg-slate-800 rounded-lg p-4 mb-8 text-left">
        <h3 className="text-sm font-medium text-slate-300 mb-3">What's Next</h3>
        <ul className="space-y-2">
          {cameraAdded ? (
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-slate-300 text-sm">
                Your camera is connected - check the Live View to see the feed
              </span>
            </li>
          ) : (
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-slate-300 text-sm">
                Add a camera in Settings to start monitoring
              </span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-slate-300 text-sm">
              Motion events will be recorded automatically when detected
            </span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-slate-300 text-sm">
              Configure storage retention and more in Settings
            </span>
          </li>
        </ul>
      </div>

      {/* Tip */}
      <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-3 mb-8">
        <p className="text-sm text-primary-300">
          <strong>Tip:</strong> Add ParcelGuard to your home screen for quick access.
          Look for the install prompt or use your browser's menu.
        </p>
      </div>

      <button
        onClick={onComplete}
        className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  )
}
