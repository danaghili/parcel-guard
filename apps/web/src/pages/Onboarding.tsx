import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { settingsApi } from '@/lib/api'

interface OnboardingProps {
  onComplete: () => void
}

export function Onboarding({ onComplete }: OnboardingProps): JSX.Element {
  const handleComplete = async () => {
    try {
      // Mark onboarding as complete in settings
      await settingsApi.update({ onboardingComplete: true })
    } catch (err) {
      console.error('Failed to save onboarding status:', err)
    }
    onComplete()
  }

  return <OnboardingWizard onComplete={handleComplete} />
}
