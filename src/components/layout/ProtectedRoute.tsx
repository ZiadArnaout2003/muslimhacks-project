import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../types/database'
import { LoadingState } from '../ui/States'
import { dashboardPathForRole } from '../../lib/roleRouting'

export function ProtectedRoute({ allow }: { allow: UserRole[] }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <LoadingState label="Checking your session…" />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <LoadingState label="Loading your profile…" />
  if (!allow.includes(profile.role)) return <Navigate to={dashboardPathForRole(profile.role)} replace />

  return <Outlet />
}
