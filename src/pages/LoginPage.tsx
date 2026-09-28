import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { signIn, signOut, getAuthErrorMessage, sendPasswordResetEmail } from '../services/authService'
import { getUserProfile } from '../services/userService'
import { resolvePatientLogin } from '../services/patientService'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import {
  Lock,
  AlertCircle,
  ShieldCheck,
  Users,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Mail,
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
  const { currentUser, userProfile, isPasswordRecovery } = useAuth()

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

  // Forgot Password state (patient portal only)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState('')

  useEffect(() => {
    if (isDeactivated) {
      setError('Your account has been deactivated. Please contact the clinic administrator.')
    }
  }, [isDeactivated])

  useEffect(() => {
    // If in password recovery, redirect to /set-password, never to a dashboard
    if (isPasswordRecovery) {
      navigate('/set-password', { replace: true })
      return
    }
    if (currentUser && userProfile && userProfile.active) {
      navigate(roleDashboard[userProfile.role] || '/login', { replace: true })
    }
  }, [currentUser, userProfile, isPasswordRecovery, navigate])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    const cleanInput = email.trim()
    if (!cleanInput) {
      setError(isStaffPortal ? 'Enter a valid staff email address.' : 'Enter your Patient ID or registered email.')
      return
    }
    if (isStaffPortal && !cleanInput.includes('@')) {
      setError('Enter a valid staff email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      let loginEmail = cleanInput
      if (!isStaffPortal && !cleanInput.includes('@')) {
        const resolveResult = await resolvePatientLogin(cleanInput)
        if (!resolveResult.found || !resolveResult.email) {
          setError(resolveResult.error || `No patient account found with Patient ID: ${cleanInput}`)
          setLoading(false)
          return
        }
        if (resolveResult.active === false) {
          setError('Your patient account has been deactivated. Please contact clinic reception.')
          setLoading(false)
          return
        }
        loginEmail = resolveResult.email
      }

      const user = await signIn(loginEmail, password)
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

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setResetError('')

    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setResetError('Enter a valid email address.')
      return
    }

    setResetLoading(true)
    try {
      // redirectTo must point to /set-password — Supabase will append the
      // recovery token as a hash fragment: /set-password#access_token=...&type=recovery
      const redirectTo = `${window.location.origin}/set-password`
      await sendPasswordResetEmail(resetEmail.trim(), redirectTo)
      setResetSent(true)
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('[forgotPassword] error:', err)
      // Always show a generic message to prevent email enumeration.
      setResetSent(true)
    } finally {
      setResetLoading(false)
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

        {/* Clinic Identity & Official Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-md p-1.5 mb-3 border border-gray-100">
            <img src="/logo.jpg" alt={CLINIC_NAME} className="w-full h-full object-contain rounded-xl" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{CLINIC_NAME}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{CLINIC_ADDRESS}</p>
          <p className="text-xs text-teal-700 font-medium">Contact: {CLINIC_PHONE}</p>
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
                : 'Enter your permanent Patient ID (e.g. PDC-000124) and password to access your health records'}
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
                {isStaffPortal ? 'Staff Email' : 'Patient ID or Registered Email'}
              </label>
              <div className="relative">
                {isStaffPortal ? (
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                ) : (
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                )}
                <input
                  id="email"
                  type={isStaffPortal ? "email" : "text"}
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="form-input pl-10 text-xs"
                  placeholder={isStaffPortal ? 'hemanth.kumar@prasaddentalcare.com' : 'PDC-000124 or patient@example.com'}
                  autoComplete={isStaffPortal ? "email" : "username"}
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

            {/* Forgot Password — patient portal only */}
            {!isStaffPortal && !showForgotPassword && (
              <div className="text-center">
                <button
                  type="button"
                  id="forgot-password-trigger"
                  onClick={() => {
                    setResetEmail(email) // pre-fill with whatever they typed
                    setResetSent(false)
                    setResetError('')
                    setShowForgotPassword(true)
                  }}
                  className="text-xs text-cyan-700 hover:text-cyan-900 font-medium underline underline-offset-2 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
                >
                  Forgot Password?
                </button>
              </div>
            )}
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

        {/* Forgot Password Panel — renders below the login card, patient portal only */}
        {!isStaffPortal && showForgotPassword && (
          <div className="mt-4 bg-white rounded-3xl shadow-xl border border-cyan-200/80 p-6">
            {resetSent ? (
              /* Success state */
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 mb-3">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Check Your Email</h3>
                <p className="text-xs text-gray-500 mb-4">
                  If <span className="font-medium text-gray-700">{resetEmail}</span> is registered,
                  you will receive a password reset link shortly. Click the link in the email to set a new password.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false)
                    setResetSent(false)
                    setResetEmail('')
                  }}
                  className="text-xs text-cyan-700 hover:text-cyan-900 font-semibold underline underline-offset-2 transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              /* Reset request form */
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Reset Your Password</h3>
                    <p className="text-xs text-gray-500">Enter your registered email to receive a reset link.</p>
                  </div>
                </div>

                {resetError && (
                  <div className="mb-3 flex items-start gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{resetError}</p>
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <div>
                    <label className="form-label text-xs" htmlFor="reset-email">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={e => setResetEmail(e.target.value)}
                        className="form-input pl-10 text-xs"
                        placeholder="patient@example.com"
                        autoComplete="email"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-xs font-semibold text-white shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {resetLoading ? <LoadingSpinner size="sm" /> : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* Security badge below card */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-xs text-gray-400">Role-based clinic security &bull; Powered by Supabase Auth</p>
        </div>
      </div>
    </div>
  )
}
