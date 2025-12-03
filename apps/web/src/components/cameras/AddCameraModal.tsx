import { useState } from 'react'

import { camerasApi, type StreamTestResult } from '../../lib/api'

interface AddCameraModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type WizardStep = 'url' | 'testing' | 'details' | 'saving'

export function AddCameraModal({ isOpen, onClose, onSuccess }: AddCameraModalProps) {
  const [step, setStep] = useState<WizardStep>('url')
  const [streamUrl, setStreamUrl] = useState('')
  const [testResult, setTestResult] = useState<StreamTestResult | null>(null)
  const [cameraId, setCameraId] = useState('')
  const [cameraName, setCameraName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setStep('url')
    setStreamUrl('')
    setTestResult(null)
    setCameraId('')
    setCameraName('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleTestStream = async () => {
    setError(null)
    setStep('testing')

    try {
      const result = await camerasApi.testStream(streamUrl)
      setTestResult(result)

      if (result.accessible) {
        setStep('details')
        // Generate a default ID
        setCameraId(`camera-${Date.now().toString(36)}`)
      } else {
        setStep('url')
        setError(result.error || 'Stream is not accessible')
      }
    } catch (err) {
      setStep('url')
      setError(err instanceof Error ? err.message : 'Failed to test stream')
    }
  }

  const handleSave = async () => {
    if (!cameraId.trim() || !cameraName.trim()) {
      setError('Camera ID and name are required')
      return
    }

    setError(null)
    setStep('saving')

    try {
      await camerasApi.create({
        id: cameraId.trim(),
        name: cameraName.trim(),
        streamUrl: streamUrl.trim(),
      })
      onSuccess()
      handleClose()
    } catch (err) {
      setStep('details')
      setError(err instanceof Error ? err.message : 'Failed to create camera')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Camera</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-3 h-3 rounded-full ${step === 'url' || step === 'testing' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <div className={`w-8 h-0.5 ${step === 'details' || step === 'saving' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <div className={`w-3 h-3 rounded-full ${step === 'details' || step === 'saving' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Enter URL */}
        {(step === 'url' || step === 'testing') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stream URL
            </label>
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="rtsp://camera:8554/stream or http://camera/stream.m3u8"
              disabled={step === 'testing'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Enter the RTSP or HLS stream URL from your camera
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleClose}
                disabled={step === 'testing'}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTestStream}
                disabled={!streamUrl.trim() || step === 'testing'}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {step === 'testing' && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {step === 'testing' ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Enter camera details */}
        {(step === 'details' || step === 'saving') && (
          <div>
            {testResult && testResult.latency && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
                Connection successful! Latency: {testResult.latency}ms
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Camera ID
                </label>
                <input
                  type="text"
                  value={cameraId}
                  onChange={(e) => setCameraId(e.target.value)}
                  placeholder="front-door"
                  disabled={step === 'saving'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Unique identifier for this camera (no spaces)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Camera Name
                </label>
                <input
                  type="text"
                  value={cameraName}
                  onChange={(e) => setCameraName(e.target.value)}
                  placeholder="Front Door Camera"
                  disabled={step === 'saving'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Display name for this camera
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setStep('url')}
                disabled={step === 'saving'}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={!cameraId.trim() || !cameraName.trim() || step === 'saving'}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {step === 'saving' && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {step === 'saving' ? 'Saving...' : 'Add Camera'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
