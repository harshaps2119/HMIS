import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Lock, Save, AlertCircle } from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { updatePassword, subscribeToAuthStateWithEvent, signOut } from '../services/authService'
import { useAuth } from '../contexts/AuthContext'
import { CLINIC_NAME } from '../utils/constants'

/**
 * PasswordSetupPage — handles the Supabase Auth recovery flow.
 *
 * Recovery flow summary:
 *  1. Receptionist calls sendPasswordSetupEmail(email, redirectTo='/set-password')
 *  2. Patient receives email, clicks link.
 *  3. Supabase verifies the token and redirects to:
 *       /set-password#access_token=...&refresh_token=...&type=recovery
 *  4. The Supabase JS client detects the hash on page load and fires
 *     onAuthStateChange with event='PASSWORD_RECOVERY'.
 *  5. This component listens for that event before allowing the form.
 *  6. Patient enters a new password → updateUser() is called.
 *  7. Recovery session is signed out, patient is redirected to login.
 *
 * IMPORTANT: Do NOT allow updateUser() before the PASSWORD_RECOVERY event
 * is received. Calling it without a valid recovery session will fail.
 */
export default function PasswordSetupPage() {
  const navigate = useNavigate()
  const { isPasswordRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Three states for the recovery session:
  //  'waiting'   — on page load, waiting for Supabase to fire PASSWORD_RECOVERY
  //  'ready'     — recovery session confirmed, show password form
  //  'invalid'   — page was opened without a valid recovery link
  const [sessionState, setSessionState] = useState<'waiting' | 'ready' | 'invalid'>(
    // If AuthContext already detected PASSWORD_RECOVERY (event fired before
    // this component mounted), start in 'ready' immediately.
    isPasswordRecovery ? 'ready' : 'waiting'
  )

  useEffect(() => {
    // If AuthContext already flagged recovery, we are ready — no need to wait.
    if (isPasswordRecovery && sessionState === 'waiting') {
      setSessionState('ready')
      return
    }

    // Give Supabase JS client a moment to process the URL hash tokens.
    // The client fires onAuthStateChange with event='PASSWORD_RECOVERY' once
    // the token is validated. We wait for that before showing the form.
    //
    // IMPORTANT: use the 2-argument form — callback receives (event, user).
    const unsubscribe = subscribeToAuthStateWithEvent((event, _user) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionState('ready')
      }
    })

    // Timeout: if PASSWORD_RECOVERY has not fired within 8 seconds,
    // the URL did not contain a valid recovery token (e.g. user navigated
    // directly to /set-password without clicking an email link).
    const timeout = setTimeout(() => {
      setSessionState((current) => {
        if (current === 'waiting') return 'invalid'
        return current
      })
    }, 8000)

    return () => {
      unsubscribe()
      clearTimeout(timeout)
    }
  }, [isPasswordRecovery])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (sessionState !== 'ready') {
      setError('No active password-reset session. Please use the link from your email.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await updatePassword(password)
      // Sign out the recovery session so the patient starts fresh at login.
      // This prevents the recovery session from being reused and ensures a
      // clean login state.
      await signOut()
      toast.success('Password updated. You can now sign in to the Patient Portal.')
      navigate('/login?portal=patient', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update your password.')
    } finally {
      setLoading(false)
    }
  }

  // ── LOADING STATE ─────────────────────────────────────────────────────────
  // Supabase is processing the recovery token from the URL hash.
  if (sessionState === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-sky-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-200/80 p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-700 text-white mb-4 shadow-md">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Verifying Reset Link</h1>
          <p className="text-xs text-gray-500 mb-5">{CLINIC_NAME}</p>
          <LoadingSpinner size="md" />
          <p className="text-xs text-gray-500 mt-4">
            Please wait while your password reset session is established…
          </p>
        </div>
      </div>
    )
  }

  // ── INVALID / EXPIRED LINK ────────────────────────────────────────────────
  if (sessionState === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-sky-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-200/80 p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 text-red-600 mb-4 shadow-md">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h1>
          <p className="text-xs text-gray-500 mb-4">{CLINIC_NAME}</p>
          <p className="text-sm text-gray-600 mb-6">
            This password-reset link is invalid or has already been used. Please ask
            clinic reception to resend your credentials email.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login?portal=patient')}
            className="btn-primary w-full"
          >
            Go to Patient Login
          </button>
        </div>
      </div>
    )
  }

  // ── READY: SHOW PASSWORD FORM ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-sky-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-200/80 p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-700 text-white mb-3 shadow-md">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Set Patient Portal Password</h1>
          <p className="text-xs text-gray-500 mt-1">{CLINIC_NAME}</p>
        </div>

        {error && <p className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label text-xs" htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="form-input text-xs"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="form-label text-xs" htmlFor="confirm-password">Confirm New Password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              className="form-input text-xs"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <LoadingSpinner size="sm" /> : <><Save className="h-4 w-4" /> Set Password</>}
          </button>
        </form>
      </div>
    </div>
  )
}