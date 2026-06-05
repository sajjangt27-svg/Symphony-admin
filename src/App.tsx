import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import AuthPage from '@/pages/Auth'
import DashboardPage from '@/pages/Dashboard'
import DoctorsPage from '@/pages/Doctors'
import ClinicsPage from '@/pages/Clinics'
import AppointmentsPage from '@/pages/Appointments'
import WizardPage from '@/pages/Wizard'
import UsersPage from '@/pages/Users'
import NotificationsPage from '@/pages/Notifications'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="/doctors" element={<RequireAuth><DoctorsPage /></RequireAuth>} />
      <Route path="/clinics" element={<RequireAuth><ClinicsPage /></RequireAuth>} />
      <Route path="/appointments" element={<RequireAuth><AppointmentsPage /></RequireAuth>} />
      <Route path="/wizard" element={<RequireAuth><WizardPage /></RequireAuth>} />
      <Route path="/users" element={<RequireAuth><UsersPage /></RequireAuth>} />
      <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
    </Routes>
  )
}
