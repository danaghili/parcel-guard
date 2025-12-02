import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PinInput } from '@/components/auth/PinInput'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Spinner } from '@/components/ui/Spinner'

export function Login(): JSX.Element {
  const { login, error, clearError, isLoading } = useAuth()
  const [hasError, setHasError] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  const handlePinComplete = async (pin: string): Promise<void> => {
    setHasError(false)
    try {
      await login(pin)
      navigate(from, { replace: true })
    } catch {
      setHasError(true)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900">
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
          <p className="text-slate-400 mt-2">Enter your PIN to continue</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onDismiss={clearError} />
          </div>
        )}

        {/* PIN input */}
        <div className="mb-8">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="lg" />
            </div>
          ) : (
            <PinInput onComplete={handlePinComplete} error={hasError} disabled={isLoading} />
          )}
        </div>

        {/* Help text */}
        <p className="text-center text-sm text-slate-500">
          Default PIN: <span className="text-slate-400 font-mono">1234</span>
        </p>
      </div>
    </div>
  )
}
