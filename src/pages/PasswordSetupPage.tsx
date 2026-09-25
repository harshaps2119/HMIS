import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Lock, Save } from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { updatePassword } from '../services/authService'
import { CLINIC_NAME } from '../utils/constants'

export default function PasswordSetupPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

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
      toast.success('Password updated. You can now sign in to the Patient Portal.')
      navigate('/login?portal=patient', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update your password.')
    } finally {
      setLoading(false)
    }
  }

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