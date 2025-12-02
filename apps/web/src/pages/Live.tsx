export function Live(): JSX.Element {
  return (
    <div className="p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Live View</h1>
        <p className="text-slate-400 text-sm">Camera feeds coming in Phase 2</p>
      </header>

      <div className="bg-slate-800 rounded-lg p-8 text-center">
        <svg
          className="w-16 h-16 mx-auto text-slate-600 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <p className="text-slate-400">Live camera grid will appear here</p>
      </div>
    </div>
  )
}
