import { useState, useEffect, useCallback, RefObject } from 'react'

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>
}

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void>
}

export interface UseFullscreenReturn {
  isFullscreen: boolean
  enterFullscreen: () => Promise<void>
  exitFullscreen: () => Promise<void>
  toggleFullscreen: () => Promise<void>
  isSupported: boolean
}

export function useFullscreen(
  elementRef: RefObject<HTMLElement>
): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const isSupported =
    typeof document !== 'undefined' &&
    (!!document.fullscreenEnabled ||
      !!(document as FullscreenDocument).webkitFullscreenElement !== undefined)

  const enterFullscreen = useCallback(async () => {
    const element = elementRef.current as FullscreenElement | null
    if (!element) return

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen()
      }
    } catch (err) {
      console.error('Failed to enter fullscreen:', err)
    }
  }, [elementRef])

  const exitFullscreen = useCallback(async () => {
    const doc = document as FullscreenDocument

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen()
      }
    } catch (err) {
      console.error('Failed to exit fullscreen:', err)
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen()
    } else {
      await enterFullscreen()
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen])

  useEffect(() => {
    const handleChange = () => {
      const doc = document as FullscreenDocument
      const fullscreenElement =
        document.fullscreenElement || doc.webkitFullscreenElement
      setIsFullscreen(!!fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleChange)
    document.addEventListener('webkitfullscreenchange', handleChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleChange)
      document.removeEventListener('webkitfullscreenchange', handleChange)
    }
  }, [])

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    isSupported,
  }
}
