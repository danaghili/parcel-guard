import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

interface UsePwaInstallReturn {
  isInstallable: boolean
  isInstalled: boolean
  install: () => Promise<boolean>
  dismiss: () => void
}

/**
 * Hook to handle PWA installation
 */
export function usePwaInstall(): UsePwaInstallReturn {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    const checkStandalone = (): boolean => {
      try {
        return (
          window.matchMedia?.('(display-mode: standalone)').matches ||
          (window.navigator as Navigator & { standalone?: boolean }).standalone === true
        )
      } catch {
        return false
      }
    }

    if (checkStandalone()) {
      setIsInstalled(true)
      return
    }

    const handleBeforeInstall = (event: Event): void => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault()
      // Store the event for later use
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = (): void => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) return false

    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      if (outcome === 'accepted') {
        setIsInstalled(true)
        setInstallPrompt(null)
        return true
      }
    } catch (error) {
      console.error('Error installing PWA:', error)
    }

    return false
  }, [installPrompt])

  const dismiss = useCallback((): void => {
    setInstallPrompt(null)
    // Store dismissal in localStorage to not show again this session
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }, [])

  // Check if dismissed recently (within 7 days)
  const isDismissed = (): boolean => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (!dismissed) return false
    const dismissedTime = parseInt(dismissed, 10)
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    return Date.now() - dismissedTime < sevenDaysMs
  }

  return {
    isInstallable: installPrompt !== null && !isDismissed(),
    isInstalled,
    install,
    dismiss,
  }
}
