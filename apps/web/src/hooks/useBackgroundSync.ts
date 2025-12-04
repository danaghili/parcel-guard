import { useCallback, useEffect, useRef } from 'react'
import { useOnlineStatus } from './useOnlineStatus'

/**
 * Queued action to be synced when back online
 */
interface QueuedAction {
  id: string
  type: string
  payload: unknown
  timestamp: number
  retryCount: number
}

/**
 * Action handler function type
 */
type ActionHandler = (payload: unknown) => Promise<void>

const STORAGE_KEY = 'parcelguard_sync_queue'
const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2 seconds between retries

/**
 * Load queue from localStorage
 */
function loadQueue(): QueuedAction[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Save queue to localStorage
 */
function saveQueue(queue: QueuedAction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

/**
 * Generate a unique ID for queued actions
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Hook for managing offline action queue with background sync
 *
 * Usage:
 * ```tsx
 * const { queueAction, pendingCount } = useBackgroundSync({
 *   'deleteEvent': async (payload) => await eventsApi.delete(payload.id),
 *   'markImportant': async (payload) => await eventsApi.update(payload.id, { isImportant: true }),
 * })
 *
 * // Queue an action (works offline)
 * queueAction('deleteEvent', { id: 'event-123' })
 * ```
 */
export function useBackgroundSync(handlers: Record<string, ActionHandler>): {
  queueAction: (type: string, payload: unknown) => void
  pendingCount: number
  isSyncing: boolean
  clearQueue: () => void
} {
  const isOnline = useOnlineStatus()
  const queueRef = useRef<QueuedAction[]>(loadQueue())
  const isSyncingRef = useRef(false)
  const handlersRef = useRef(handlers)

  // Keep handlers ref up to date
  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  /**
   * Process the queue when online
   */
  const processQueue = useCallback(async () => {
    if (isSyncingRef.current || queueRef.current.length === 0) {
      return
    }

    isSyncingRef.current = true

    const queue = [...queueRef.current]
    const processed: string[] = []
    const failed: QueuedAction[] = []

    for (const action of queue) {
      const handler = handlersRef.current[action.type]

      if (!handler) {
        console.warn(`No handler for action type: ${action.type}`)
        processed.push(action.id) // Remove unknown actions
        continue
      }

      try {
        await handler(action.payload)
        processed.push(action.id)
        console.debug(`Background sync: processed ${action.type}`)
      } catch (error) {
        console.error(`Background sync failed for ${action.type}:`, error)

        if (action.retryCount < MAX_RETRIES) {
          // Retry later with incremented count
          failed.push({ ...action, retryCount: action.retryCount + 1 })
        } else {
          // Max retries exceeded, drop the action
          console.error(`Background sync: max retries exceeded for ${action.type}, dropping action`)
          processed.push(action.id)
        }
      }
    }

    // Update queue with remaining failed actions
    queueRef.current = failed
    saveQueue(failed)

    isSyncingRef.current = false

    // If there are still items to retry, schedule a retry
    if (failed.length > 0) {
      setTimeout(() => {
        if (navigator.onLine) {
          processQueue()
        }
      }, RETRY_DELAY)
    }
  }, [])

  /**
   * Queue an action to be processed when online
   */
  const queueAction = useCallback(
    (type: string, payload: unknown) => {
      const action: QueuedAction = {
        id: generateId(),
        type,
        payload,
        timestamp: Date.now(),
        retryCount: 0,
      }

      queueRef.current = [...queueRef.current, action]
      saveQueue(queueRef.current)

      console.debug(`Background sync: queued ${type}`)

      // If online, process immediately
      if (navigator.onLine) {
        processQueue()
      }
    },
    [processQueue],
  )

  /**
   * Clear the entire queue
   */
  const clearQueue = useCallback(() => {
    queueRef.current = []
    saveQueue([])
  }, [])

  // Process queue when coming back online
  useEffect(() => {
    if (isOnline && queueRef.current.length > 0) {
      processQueue()
    }
  }, [isOnline, processQueue])

  // Process queue on mount if online
  useEffect(() => {
    if (navigator.onLine && queueRef.current.length > 0) {
      processQueue()
    }
  }, [processQueue])

  return {
    queueAction,
    pendingCount: queueRef.current.length,
    isSyncing: isSyncingRef.current,
    clearQueue,
  }
}

/**
 * Pre-configured background sync hook for ParcelGuard actions
 *
 * Supports:
 * - deleteEvent: Delete an event
 * - markEventImportant: Mark event as important
 * - markEventFalseAlarm: Mark event as false alarm
 */
export function useEventSync(): {
  queueDeleteEvent: (eventId: string) => void
  queueMarkImportant: (eventId: string, isImportant: boolean) => void
  queueMarkFalseAlarm: (eventId: string, isFalseAlarm: boolean) => void
  pendingCount: number
  isSyncing: boolean
} {
  // Import API lazily to avoid circular dependencies
  const handlers: Record<string, ActionHandler> = {
    deleteEvent: async (payload) => {
      const { eventsApi } = await import('@/lib/api')
      await eventsApi.delete((payload as { eventId: string }).eventId)
    },
    markEventImportant: async (payload) => {
      const { eventsApi } = await import('@/lib/api')
      const { eventId, isImportant } = payload as { eventId: string; isImportant: boolean }
      await eventsApi.update(eventId, { isImportant })
    },
    markEventFalseAlarm: async (payload) => {
      const { eventsApi } = await import('@/lib/api')
      const { eventId, isFalseAlarm } = payload as { eventId: string; isFalseAlarm: boolean }
      await eventsApi.update(eventId, { isFalseAlarm })
    },
  }

  const { queueAction, pendingCount, isSyncing } = useBackgroundSync(handlers)

  return {
    queueDeleteEvent: (eventId: string) => queueAction('deleteEvent', { eventId }),
    queueMarkImportant: (eventId: string, isImportant: boolean) =>
      queueAction('markEventImportant', { eventId, isImportant }),
    queueMarkFalseAlarm: (eventId: string, isFalseAlarm: boolean) =>
      queueAction('markEventFalseAlarm', { eventId, isFalseAlarm }),
    pendingCount,
    isSyncing,
  }
}
