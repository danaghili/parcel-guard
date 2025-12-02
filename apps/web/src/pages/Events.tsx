export function Events(): JSX.Element {
  return (
    <div className="p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-slate-400 text-sm">Motion events coming in Phase 4</p>
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-slate-400">Event timeline will appear here</p>
      </div>
    </div>
  )
}
