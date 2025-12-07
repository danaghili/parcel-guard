import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PinInput } from '@/components/auth/PinInput'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Spinner } from '@/components/ui/Spinner'

export function Login(): JSX.Element {
  const { login, error, clearError, isLoading } = useAuth()
  const [username, setUsername] = useState('')
  const [hasError, setHasError] = useState(false)
  const usernameRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  // Focus username input on mount
  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  const handlePinComplete = async (pin: string): Promise<void> => {
    if (!username.trim()) {
      setHasError(true)
      usernameRef.current?.focus()
      return
    }

    setHasError(false)
    try {
      await login(username.trim(), pin)
      navigate(from, { replace: true })
    } catch {
      setHasError(true)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-sm">
        {/* Logo/Title */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto mb-4 bg-primary-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-primary-400"
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
          </div>
          <h1 className="text-2xl font-bold text-white">ParcelGuard</h1>
          <p className="text-slate-400 mt-2">Sign in to continue</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onDismiss={clearError} />
          </div>
        )}

        {/* Username input */}
        <div className="mb-6">
          <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
            Username
          </label>
          <input
            ref={usernameRef}
            id="username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              if (hasError) setHasError(false)
              if (error) clearError()
            }}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter your username"
            autoComplete="username"
            disabled={isLoading}
          />
        </div>

        {/* PIN input */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            PIN
          </label>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="lg" />
            </div>
          ) : (
            <PinInput onComplete={handlePinComplete} error={hasError} disabled={isLoading || !username.trim()} />
          )}
        </div>

      </div>
    </main>
  )
}
