import { useState } from 'react'
import { camerasApi, type StreamTestResult } from '@/lib/api'

interface AddCameraStepProps {
  onCameraAdded: () => void
  onSkip: () => void
  onBack: () => void
}

type CameraStep = 'url' | 'testing' | 'details' | 'saving'

export function AddCameraStep({ onCameraAdded, onSkip, onBack }: AddCameraStepProps): JSX.Element {
  const [step, setStep] = useState<CameraStep>('url')
  const [streamUrl, setStreamUrl] = useState('')
  const [testResult, setTestResult] = useState<StreamTestResult | null>(null)
  const [cameraId, setCameraId] = useState('')
  const [cameraName, setCameraName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleTestStream = async () => {
    setError(null)
    setStep('testing')

    try {
      const result = await camerasApi.testStream(streamUrl)
      setTestResult(result)

      if (result.accessible) {
        setStep('details')
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
      onCameraAdded()
    } catch (err) {
      setStep('details')
      setError(err instanceof Error ? err.message : 'Failed to create camera')
    }
  }

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Add Your First Camera</h2>
        <p className="text-slate-400 text-sm">
          Connect a camera to start monitoring. You can add more cameras later in Settings.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Enter URL */}
      {(step === 'url' || step === 'testing') && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Stream URL</label>
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="rtsp://camera:8554/stream"
              disabled={step === 'testing'}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-slate-500">
              Enter the RTSP or HLS stream URL from your camera
            </p>
          </div>

          <button
            onClick={handleTestStream}
            disabled={!streamUrl.trim() || step === 'testing'}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {step === 'testing' && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {step === 'testing' ? 'Testing Connection...' : 'Test Connection'}
          </button>

          <div className="flex gap-3">
            <button
              onClick={onBack}
              disabled={step === 'testing'}
              className="flex-1 py-2 px-4 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={onSkip}
              disabled={step === 'testing'}
              className="flex-1 py-2 px-4 text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
            >
              Skip for Now
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Camera Details */}
      {(step === 'details' || step === 'saving') && (
        <div className="space-y-4">
          {testResult?.accessible && testResult.latency && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              Connection successful! Latency: {testResult.latency}ms
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Camera ID</label>
            <input
              type="text"
              value={cameraId}
              onChange={(e) => setCameraId(e.target.value)}
              placeholder="front-door"
              disabled={step === 'saving'}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-slate-500">Unique identifier (no spaces)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Camera Name</label>
            <input
              type="text"
              value={cameraName}
              onChange={(e) => setCameraName(e.target.value)}
              placeholder="Front Door Camera"
              disabled={step === 'saving'}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-slate-500">Display name for this camera</p>
          </div>

          <button
            onClick={handleSave}
            disabled={!cameraId.trim() || !cameraName.trim() || step === 'saving'}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {step === 'saving' && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {step === 'saving' ? 'Adding Camera...' : 'Add Camera'}
          </button>

          <button
            onClick={() => setStep('url')}
            disabled={step === 'saving'}
            className="w-full py-2 px-4 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Back
          </button>
        </div>
      )}
    </div>
  )
}
