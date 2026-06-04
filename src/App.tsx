import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthListener, useProfile } from './hooks/useAuth'
import { useAuthStore } from './store/authStore'
import { PREVIEW_ENABLED, previewUser, previewProfile } from './lib/devPreview'
import AppLayout from './components/layout/AppLayout'
import AuthPage from './pages/AuthPage'
import OnboardingAvatar from './components/auth/OnboardingAvatar'
import DashboardPage from './pages/DashboardPage'
import EventPage from './pages/EventPage'
import LeaderboardPage from './pages/LeaderboardPage'
import AdminPage from './pages/AdminPage'
import MaradonaPage from './pages/MaradonaPage'
import PelePage from './pages/PelePage'

function AuthedRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/events/:id" element={<EventPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/maradona" element={<MaradonaPage />} />
        <Route path="/pele" element={<PelePage />} />
      </Route>
      <Route path="/auth" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

// DEV-ONLY: when ?preview is in the URL, skip the login wall and load
// straight into the app as an admin. See src/lib/devPreview.ts.
function PreviewGate() {
  useEffect(() => {
    useAuthStore.setState({
      user: previewUser,
      profile: previewProfile,
      session: null,
      isLoading: false,
    })
  }, [])

  return <AuthedRoutes />
}

const Spinner = () => (
  <div className="flex h-screen items-center justify-center bg-casino-night">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
  </div>
)

// Mandatory first-run gate: no profile picture → must pick one before entering.
function OnboardingGate() {
  const { user } = useAuthStore()
  const { data: profile, isLoading } = useProfile(user?.id)

  if (isLoading || !profile) return <Spinner />
  if (!profile.avatar_url) return <OnboardingAvatar />
  return <AuthedRoutes />
}

function AuthGate() {
  useAuthListener()
  const { user, isLoading } = useAuthStore()

  if (isLoading) return <Spinner />

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    )
  }

  return <OnboardingGate />
}

export default function App() {
  return (
    <BrowserRouter>
      {PREVIEW_ENABLED ? <PreviewGate /> : <AuthGate />}
    </BrowserRouter>
  )
}
