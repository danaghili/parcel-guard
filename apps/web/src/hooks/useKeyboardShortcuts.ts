import { useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface Shortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  description: string
  action: () => void
}

/**
 * Hook to register global keyboard shortcuts for navigation
 */
export function useKeyboardShortcuts(): void {
  const navigate = useNavigate()
  const location = useLocation()

  const shortcuts: Shortcut[] = [
    {
      key: '1',
      description: 'Go to Dashboard',
      action: () => navigate('/'),
    },
    {
      key: '2',
      description: 'Go to Live View',
      action: () => navigate('/live'),
    },
    {
      key: '3',
      description: 'Go to Events',
      action: () => navigate('/events'),
    },
    {
      key: '4',
      description: 'Go to Settings',
      action: () => navigate('/settings'),
    },
    {
      key: 'Escape',
      description: 'Go back',
      action: () => {
        // Navigate back if not on a main page
        const mainPages = ['/', '/live', '/events', '/settings']
        if (!mainPages.includes(location.pathname)) {
          navigate(-1)
        }
      },
    },
    {
      key: '/',
      description: 'Focus search (if available)',
      action: () => {
        // Find and focus any search input on the page
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[name="search"], input[placeholder*="search" i]'
        )
        searchInput?.focus()
      },
    },
  ]

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to blur the input
        if (event.key === 'Escape') {
          target.blur()
        }
        return
      }

      // Ignore if any modifier key is pressed (except for defined shortcuts)
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey

      for (const shortcut of shortcuts) {
        const keyMatches = event.key === shortcut.key || event.key === shortcut.key.toLowerCase()
        const ctrlMatches =
          shortcut.ctrlKey === undefined
            ? !event.ctrlKey
            : shortcut.ctrlKey === event.ctrlKey
        const metaMatches =
          shortcut.metaKey === undefined
            ? !event.metaKey
            : shortcut.metaKey === event.metaKey
        const shiftMatches =
          shortcut.shiftKey === undefined
            ? !event.shiftKey
            : shortcut.shiftKey === event.shiftKey

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches) {
          // For simple key shortcuts, ignore if modifier is pressed
          if (!shortcut.ctrlKey && !shortcut.metaKey && hasModifier) {
            continue
          }
          event.preventDefault()
          shortcut.action()
          return
        }
      }
    },
    [shortcuts, location.pathname]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Returns the list of available keyboard shortcuts for display
 */
export function getKeyboardShortcuts(): Array<{ key: string; description: string }> {
  return [
    { key: '1', description: 'Go to Dashboard' },
    { key: '2', description: 'Go to Live View' },
    { key: '3', description: 'Go to Events' },
    { key: '4', description: 'Go to Settings' },
    { key: 'Esc', description: 'Go back / Close modal' },
    { key: '/', description: 'Focus search' },
  ]
}
