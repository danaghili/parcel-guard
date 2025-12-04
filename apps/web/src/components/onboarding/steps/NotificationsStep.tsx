import { useState, useEffect } from 'react'
import { settingsApi, type NotificationStatus } from '@/lib/api'

interface NotificationsStepProps {
  onNext: () => void
  onBack: () => void
}

export function NotificationsStep({ onNext, onBack }: NotificationsStepProps): JSX.Element {
  const [status, setStatus] = useState<NotificationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [testSent, setTestSent] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  useEffect(() => {
    loadNotificationStatus()
  }, [])

  const loadNotificationStatus = async () => {
    try {
      const data = await settingsApi.getNotificationStatus()
      setStatus(data)
    } catch (err) {
      console.error('Failed to load notification status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTestNotification = async () => {
    setTestError(null)
    try {
      await settingsApi.testNotification()
      setTestSent(true)
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Failed to send test notification')
    }
  }

  const isConfigured = status?.configured ?? false

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-yellow-500/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Get Notified</h2>
        <p className="text-slate-400 text-sm">
          Receive instant push notifications when motion is detected.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <svg className="animate-spin h-8 w-8 text-primary-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : isConfigured ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-green-400 font-medium">Notifications Configured</p>
                <p className="text-sm text-slate-400">
                  Topic: {status?.topic}
                </p>
              </div>
            </div>
          </div>

          {testSent ? (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm">
              Test notification sent! Check your phone.
            </div>
          ) : testError ? (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {testError}
            </div>
          ) : null}

          <button
            onClick={handleTestNotification}
            disabled={testSent}
            className="w-full py-2 px-4 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {testSent ? 'Test Sent!' : 'Send Test Notification'}
          </button>

          <p className="text-xs text-slate-500 text-center">
            You can configure quiet hours and per-camera settings in Settings later.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg">
            <p className="text-slate-300 text-sm mb-3">
              To receive notifications, you need to configure ntfy.sh:
            </p>
            <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
              <li>Install the ntfy app on your phone</li>
              <li>Subscribe to a unique topic</li>
              <li>Set NTFY_TOPIC in your server environment</li>
            </ol>
          </div>

          <a
            href="https://ntfy.sh"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-2 px-4 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-center"
          >
            Learn More About ntfy.sh
          </a>

          <p className="text-xs text-slate-500 text-center">
            You can skip this step and configure notifications later in Settings.
          </p>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 py-2 px-4 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
        >
          {isConfigured ? 'Continue' : 'Skip for Now'}
        </button>
      </div>
    </div>
  )
}
