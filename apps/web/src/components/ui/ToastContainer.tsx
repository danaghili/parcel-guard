import { useToast } from '@/contexts/ToastContext'
import { Toast } from './Toast'

export function ToastContainer(): JSX.Element {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) {
    return <></>
  }

  return (
    <div
      className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  )
}
