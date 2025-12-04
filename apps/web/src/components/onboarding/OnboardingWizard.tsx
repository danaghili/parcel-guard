import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { WelcomeStep } from './steps/WelcomeStep'
import { AddCameraStep } from './steps/AddCameraStep'
import { NotificationsStep } from './steps/NotificationsStep'
import { CompleteStep } from './steps/CompleteStep'

export type OnboardingStep = 'welcome' | 'camera' | 'notifications' | 'complete'

interface OnboardingWizardProps {
  onComplete: () => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps): JSX.Element {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [cameraAdded, setCameraAdded] = useState(false)
  const navigate = useNavigate()

  const steps: OnboardingStep[] = ['welcome', 'camera', 'notifications', 'complete']
  const currentIndex = steps.indexOf(currentStep)

  const handleNext = useCallback(() => {
    const nextIndex = currentIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]!)
    }
  }, [currentIndex, steps])

  const handleBack = useCallback(() => {
    const prevIndex = currentIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]!)
    }
  }, [currentIndex, steps])

  const handleCameraAdded = useCallback(() => {
    setCameraAdded(true)
    handleNext()
  }, [handleNext])

  const handleSkipCamera = useCallback(() => {
    handleNext()
  }, [handleNext])

  const handleComplete = useCallback(() => {
    onComplete()
    navigate('/')
  }, [onComplete, navigate])

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Progress bar */}
      <div className="p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <div key={step} className="flex-1 flex items-center">
                <div
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    index <= currentIndex ? 'bg-primary-500' : 'bg-slate-700'
                  }`}
                />
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-400 mt-2">
            Step {currentIndex + 1} of {steps.length}
          </p>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {currentStep === 'welcome' && <WelcomeStep onNext={handleNext} />}
          {currentStep === 'camera' && (
            <AddCameraStep
              onCameraAdded={handleCameraAdded}
              onSkip={handleSkipCamera}
              onBack={handleBack}
            />
          )}
          {currentStep === 'notifications' && (
            <NotificationsStep onNext={handleNext} onBack={handleBack} />
          )}
          {currentStep === 'complete' && (
            <CompleteStep cameraAdded={cameraAdded} onComplete={handleComplete} />
          )}
        </div>
      </div>
    </div>
  )
}
