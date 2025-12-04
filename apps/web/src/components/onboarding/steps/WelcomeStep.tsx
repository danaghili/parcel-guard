interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps): JSX.Element {
  return (
    <div className="text-center">
      {/* Logo/Icon */}
      <div className="w-24 h-24 mx-auto mb-6 bg-primary-500/20 rounded-full flex items-center justify-center">
        <svg
          className="w-12 h-12 text-primary-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Welcome to ParcelGuard</h1>
      <p className="text-slate-400 mb-8">
        Your DIY security system for monitoring communal areas and protecting deliveries.
      </p>

      {/* Features list */}
      <div className="text-left space-y-3 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium">Live Camera Feeds</p>
            <p className="text-sm text-slate-400">Monitor all your cameras in real-time</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium">Motion Detection</p>
            <p className="text-sm text-slate-400">Automatically record when movement is detected</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium">Instant Notifications</p>
            <p className="text-sm text-slate-400">Get alerts on your phone when events occur</p>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
      >
        Get Started
      </button>
    </div>
  )
}
