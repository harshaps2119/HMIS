import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { signIn, signOut, getAuthErrorMessage } from '../services/authService'
import { getUserProfile } from '../services/userService'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import {
  Stethoscope,
  Mail,
  Lock,
  AlertCircle,
  ShieldCheck,
  Users,
  ArrowLeft,
} from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { CLINIC_NAME, CLINIC_ADDRESS, CLINIC_PHONE } from '../utils/constants'

const roleDashboard: Record<UserRole, string> = {
  receptionist: '/reception/dashboard',
  doctor: '/doctor/dashboard',
  patient: '/patient/dashboard',
  admin: '/reception/dashboard',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentUser, userProfile } = useAuth()

  const portalParam = searchParams.get('portal')
  const isDeactivated = searchParams.get('deactivated') === 'true'

  // Determine current portal mode (staff vs patient)
  const isStaffPortal = portalParam === 'staff'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(
    isDeactivated ? 'Your account has been deactivated. Please contact the clinic administrator.' : ''
  )

  useEffect(() => {
    if (isDeactivated) {
      setError('Your account has been deactivated. Please contact the clinic administrator.')
    }
  }, [isDeactivated])

  useEffect(() => {
    if (currentUser && userProfile && userProfile.active) {
      navigate(roleDashboard[userProfile.role] || '/login', { replace: true })
    }
  }, [currentUser, userProfile, navigate])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      const user = await signIn(email.trim(), password)
      const profile = await getUserProfile(user.uid)

      if (!profile || !profile.active) {
        if (import.meta.env.DEV) console.warn('No active profile in public.users for uid:', user.uid)
        await signOut()
        setError('No active clinic profile is associated with this account. Contact the clinic administrator.')
        return
      }

      // Security & role-routing assurance:
      // Client-selected portal never escalates privileges.
      if (isStaffPortal && profile.role === 'patient') {
        toast.success('Signed in. Redirecting to Patient Portal.')
        navigate('/patient/dashboard', { replace: true })
        return
      }

      if (!isStaffPortal && profile.role !== 'patient') {
        toast.success('Signed in as clinic staff. Redirecting to Staff Dashboard.')
        navigate(roleDashboard[profile.role] || '/reception/dashboard', { replace: true })
        return
      }

      toast.success('Signed in successfully.')
      navigate(roleDashboard[profile.role] || '/login', { replace: true })
    } catch (authError: unknown) {
      if (import.meta.env.DEV) console.error('[signIn] error:', authError)
      setError(getAuthErrorMessage(authError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-sky-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Portal Selection */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-md py-1 px-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Portal Selection</span>
          </button>
        </div>

        {/* Clinic Identity */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 text-white mb-3 shadow-md">
            <Stethoscope className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{CLINIC_NAME}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{CLINIC_ADDRESS}</p>
          <p className="text-xs text-teal-700 font-medium">{CLINIC_PHONE}</p>
        </div>

        {/* Portal Authentication Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200/80 p-6 sm:p-8">
          {/* Portal Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isStaffPortal
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                }`}
              >
                {isStaffPortal ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
                    Staff Portal
                  </>
                ) : (
                  <>
                    <Users className="h-3.5 w-3.5 text-cyan-700" />
                    Patient Portal
                  </>
                )}
              </span>

              {/* Portal switcher link */}
              <button
                type="button"
                onClick={() => {
                  setError('')
                  navigate(isStaffPortal ? '/login?portal=patient' : '/login?portal=staff')
                }}
                className="text-xs text-teal-700 hover:text-teal-900 font-semibold underline underline-offset-2"
              >
                Switch to {isStaffPortal ? 'Patient Portal' : 'Staff Portal'}
              </button>
            </div>

            <h2 className="text-xl font-bold text-gray-900">
              {isStaffPortal ? 'Staff Portal Login' : 'Patient Portal Login'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {isStaffPortal
                ? 'Authorized access for Doctors, Receptionists, and Administrators'
                : 'Enter your registered email and password to access your health records'}
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label text-xs" htmlFor="email">
                {isStaffPortal ? 'Staff Email' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="form-input pl-10 text-xs"
                  placeholder={isStaffPortal ? 'doctor@dentalcare.com' : 'patient@example.com'}
                  autoComplete="email"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="form-label text-xs" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="form-input pl-10 text-xs"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-3 px-4 rounded-xl font-semibold text-xs text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                isStaffPortal
                  ? 'bg-teal-700 hover:bg-teal-800'
                  : 'bg-cyan-700 hover:bg-cyan-800'
              }`}
              disabled={loading}
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <span>Sign In to {isStaffPortal ? 'Staff Portal' : 'Patient Portal'}</span>
              )}
            </button>
          </form>

          {/* Informational Notice inside card */}
          <div className="mt-5 pt-4 border-t border-gray-100 text-xs">
            {isStaffPortal ? (
              <p className="text-center text-gray-400">
                Staff accounts are provisioned by clinic administration. If you require credentials, contact your clinic administrator.
              </p>
            ) : (
              <div className="p-3 rounded-xl bg-cyan-50/70 border border-cyan-100 text-cyan-900 text-center">
                <p className="font-semibold">Patient access is provided by the clinic.</p>
                <p className="text-cyan-700 mt-0.5">
                  Please contact clinic reception if you have not received your login credentials.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Security badge below card */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-xs text-gray-400">Role-based clinic security &bull; Powered by Supabase Auth</p>
        </div>
      </div>
    </div>
  )
}
