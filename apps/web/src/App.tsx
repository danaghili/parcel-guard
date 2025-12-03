import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Live } from '@/pages/Live'
import { Camera } from '@/pages/Camera'
import { Cameras } from '@/pages/Cameras'
import { CameraSettings } from '@/pages/CameraSettings'
import { Events } from '@/pages/Events'
import { EventDetail } from '@/pages/EventDetail'
import { Settings } from '@/pages/Settings'
import { System } from '@/pages/System'

function App(): JSX.Element {
  return (
    <AuthProvider>
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
    </AuthProvider>
  )
}

export default App
