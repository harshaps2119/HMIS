import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import LoadingSpinner from '../ui/LoadingSpinner'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles: UserRole[]
}

const roleDashboard: Record<UserRole, string> = {
  receptionist: '/reception/dashboard',
  doctor: '/doctor/dashboard',
  patient: '/patient/dashboard',
  admin: '/reception/dashboard',
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { currentUser, userProfile, loading, profileLoading, isPasswordRecovery } = useAuth()

  // If in password recovery, never allow access to protected dashboards — redirect to /set-password
  if (isPasswordRecovery) {
    return <Navigate to="/set-password" replace />
  }

  // Wait if auth is initializing OR if user is authenticated but profile is still loading from database
  if (loading || (currentUser && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Not logged in at all — redirect to matching portal
  if (!currentUser) {
    const isPatientRoute = allowedRoles.includes('patient') && !allowedRoles.includes('doctor') && !allowedRoles.includes('receptionist')
    const loginTarget = isPatientRoute ? '/login?portal=patient' : '/login?portal=staff'
    return <Navigate to={loginTarget} replace />
  }

  // Logged in but profile record does not exist
  if (!userProfile) {
    return <Navigate to="/" replace />
  }

  // Account is deactivated — deny access immediately
  if (!userProfile.active) {
    const isPatientRoute = allowedRoles.includes('patient') && !allowedRoles.includes('doctor') && !allowedRoles.includes('receptionist')
    const loginTarget = isPatientRoute ? '/login?portal=patient&deactivated=true' : '/login?portal=staff&deactivated=true'
    return <Navigate to={loginTarget} replace />
  }

  // Role authorization check
  if (!allowedRoles.includes(userProfile.role)) {
    const dashboardPath = roleDashboard[userProfile.role] || '/'
    return <Navigate to={dashboardPath} replace />
  }

  return <>{children}</>
}
