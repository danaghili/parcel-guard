import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { OfflineIndicator } from '@/components/ui/OfflineIndicator'
import { InstallPrompt } from '@/components/ui/InstallPrompt'
import { Spinner } from '@/components/ui/Spinner'

// Lazy load pages for code splitting
const Login = lazy(() => import('@/pages/Login').then((m) => ({ default: m.Login })))
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Live = lazy(() => import('@/pages/Live').then((m) => ({ default: m.Live })))
const Camera = lazy(() => import('@/pages/Camera').then((m) => ({ default: m.Camera })))
const Cameras = lazy(() => import('@/pages/Cameras').then((m) => ({ default: m.Cameras })))
const CameraSettings = lazy(() =>
  import('@/pages/CameraSettings').then((m) => ({ default: m.CameraSettings }))
)
const Events = lazy(() => import('@/pages/Events').then((m) => ({ default: m.Events })))
const EventDetail = lazy(() =>
  import('@/pages/EventDetail').then((m) => ({ default: m.EventDetail }))
)
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })))
const System = lazy(() => import('@/pages/System').then((m) => ({ default: m.System })))

function PageLoader(): JSX.Element {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner size="lg" />
    </div>
  )
}

function App(): JSX.Element {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes with app shell */}
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/live" element={<Live />} />
              <Route path="/live/:cameraId" element={<Camera />} />
              <Route path="/cameras" element={<Cameras />} />
              <Route path="/cameras/:id" element={<CameraSettings />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/system" element={<System />} />
            </Route>
          </Routes>
        </Suspense>
        <ToastContainer />
        <OfflineIndicator />
        <InstallPrompt />
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
