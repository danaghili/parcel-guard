import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/Spinner'
import { settingsApi } from '@/lib/api'
import { Onboarding } from '@/pages/Onboarding'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      checkOnboardingStatus()
    }
  }, [isAuthenticated])

  const checkOnboardingStatus = async () => {
    try {
      const settings = await settingsApi.get()
      setOnboardingComplete(settings.onboardingComplete)
    } catch (err) {
      // If we can't check, assume onboarding is complete to not block users
      console.error('Failed to check onboarding status:', err)
      setOnboardingComplete(true)
    } finally {
      setCheckingOnboarding(false)
    }
  }

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Spinner size="lg" />
      </div>
    )
  }

  // Show onboarding wizard if not complete
  if (onboardingComplete === false) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return <>{children}</>
}
