import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { createPatient, provisionPatientAccount } from '../../services/patientService'
import { sendPasswordSetupEmail } from '../../services/authService'
import { logAction } from '../../services/auditService'
import { useAuth } from '../../contexts/AuthContext'
import { getFirebaseErrorMessage } from '../../utils/errorUtils'
import { normalizePhoneNumber, isValidIndianMobile, maskPhoneNumber } from '../../utils/phoneUtils'
import {
  ArrowLeft,
  CheckCircle,
  Phone,
  User,
  AlertCircle,
  Key,
  Copy,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  Mail,
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

type Step = 'phone' | 'details'

interface FormData {
  name: string
  dateOfBirth: string
  age: string
  gender: 'Male' | 'Female' | 'Other' | ''
  address: string
  email: string
  emergencyContact: string
  emergencyContactName: string
  allergies: string
  medicalHistory: string
}

const initialForm: FormData = {
  name: '',
  dateOfBirth: '',
  age: '',
  gender: '',
  address: '',
  email: '',
  emergencyContact: '',
  emergencyContactName: '',
  allergies: '',
  medicalHistory: '',
}

function generateTemporaryPassword(phoneDigits: string) {
  const last4 = phoneDigits.slice(-4) || '2026'
  const randomLetters = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `Care#${randomLetters}${last4}`
}

export default function PatientRegistration() {
  const navigate = useNavigate()
  const { userProfile, currentUser } = useAuth()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [verifiedPhone, setVerifiedPhone] = useState('')
  const [form, setForm] = useState<FormData>(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Portal provisioning state
  const [provisionPortal, setProvisionPortal] = useState(true)
  const [portalPassword, setPortalPassword] = useState('')
  const [credentialsModal, setCredentialsModal] = useState<{
    isOpen: boolean
    patientId: string
    name: string
    uhid: string
    email: string
    password: string
  } | null>(null)
  const [sendCredentialsState, setSendCredentialsState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [sendCredentialsError, setSendCredentialsError] = useState('')

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const normalized = normalizePhoneNumber(phone.trim())
    if (!isValidIndianMobile(normalized)) {
      setError('Please enter a valid 10-digit Indian mobile number.')
      return
    }

    setVerifiedPhone(normalized)
    setPortalPassword(generateTemporaryPassword(normalized))
    setStep('details')
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Patient name is required.')
      return
    }
    if (!form.gender) {
      setError('Gender is required.')
      return
    }

    if (provisionPortal) {
      if (!form.email.trim() || !form.email.includes('@')) {
        setError('A valid email address is required to provision a Patient Portal login.')
        return
      }
      if (!portalPassword || portalPassword.length < 6) {
        setError('Portal password must be at least 6 characters.')
        return
      }
    }

    setLoading(true)
    try {
      if (provisionPortal) {
        // Provision portal login and clinic record simultaneously via secure RPC
        const result = await provisionPatientAccount({
          name: form.name.trim(),
          phone: verifiedPhone,
          email: form.email.trim(),
          password: portalPassword,
          gender: form.gender as 'Male' | 'Female' | 'Other',
          age: form.age ? parseInt(form.age) : undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          address: form.address || undefined,
          allergies: form.allergies || undefined,
          medicalHistory: form.medicalHistory || undefined,
          emergencyContact: form.emergencyContact || undefined,
          emergencyContactName: form.emergencyContactName || undefined,
        })

        if (currentUser && userProfile) {
          await logAction({
            userId: currentUser.uid,
            userRole: userProfile.role,
            userName: userProfile.name,
            action: 'patient_registered',
            targetId: result.patientId,
            targetType: 'patient',
            description: `Registered patient & provisioned portal login: ${form.name} (UHID: ${maskPhoneNumber(verifiedPhone)})`,
          })
        }

        // Show credentials modal so staff can provide credentials to patient
        setCredentialsModal({
          isOpen: true,
          patientId: result.patientId,
          name: form.name.trim(),
          uhid: verifiedPhone,
          email: form.email.trim(),
          password: portalPassword,
        })
        toast.success(`Patient ${form.name} registered & portal access provisioned!`)
        return
      }

      // Offline-only / demographic record without portal access
      const patientRecordId = await createPatient(
        {
          uhid: verifiedPhone,
          phone: verifiedPhone,
          name: form.name.trim(),
          dateOfBirth: form.dateOfBirth,
          age: form.age ? parseInt(form.age) : undefined,
          gender: form.gender as 'Male' | 'Female' | 'Other',
          address: form.address,
          email: form.email,
          allergies: form.allergies,
          medicalHistory: form.medicalHistory,
          emergencyContact: form.emergencyContact,
          emergencyContactName: form.emergencyContactName,
          createdBy: currentUser?.uid || userProfile?.uid || '',
        },
        currentUser?.uid || ''
      )

      if (currentUser && userProfile) {
        await logAction({
          userId: currentUser.uid,
          userRole: userProfile.role,
          userName: userProfile.name,
          action: 'patient_registered',
          targetId: patientRecordId,
          targetType: 'patient',
          description: `Registered clinic patient: ${form.name} (UHID: ${maskPhoneNumber(verifiedPhone)})`,
        })
      }

      toast.success(`Patient ${form.name} registered successfully!`)
      navigate(`/reception/patients/${patientRecordId}`)
    } catch (err: unknown) {
      console.error('Registration failed:', err)
      setError(getFirebaseErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const updateForm = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleCopyCredentials = () => {
    if (!credentialsModal) return
    const text = `DentalCare Patient Portal Credentials:\nPatient Name: ${credentialsModal.name}\nUHID / Mobile: ${credentialsModal.uhid}\nLogin Email: ${credentialsModal.email}\nInitial Password: ${credentialsModal.password}\nPortal Link: ${window.location.origin}/login?portal=patient`
    navigator.clipboard.writeText(text)
    toast.success('Credentials copied to clipboard!')
  }

  const handleSendCredentials = async () => {
    if (!credentialsModal || sendCredentialsState === 'sending') return

    setSendCredentialsState('sending')
    setSendCredentialsError('')
    try {
      await sendPasswordSetupEmail(
        credentialsModal.email,
        `${window.location.origin}/set-password?portal=patient`
      )
      setSendCredentialsState('sent')
      toast.success(`Password setup instructions sent to ${credentialsModal.email}.`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to send the password setup email.'
      setSendCredentialsState('failed')
      setSendCredentialsError(message)
      toast.error('Could not send patient credentials.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Register New Patient</h1>
          <p className="text-sm text-gray-500">
            Enter the patient mobile number (UHID), fill clinical demographics, and provision Patient Portal access
          </p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {(['phone', 'details'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === s
                  ? 'bg-primary-600 text-white'
                  : ['phone', 'details'].indexOf(step) > i
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {['phone', 'details'].indexOf(step) > i ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-sm ${
                step === s ? 'text-primary-600 font-medium' : 'text-gray-400'
              }`}
            >
              {s === 'phone' ? 'Mobile Number' : 'Patient Details & Portal Access'}
            </span>
            {i < 1 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      <div className="card p-6 max-w-2xl">
        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {step === 'phone' && (
          <form onSubmit={handleContinue} className="space-y-4">
            <h2 className="font-semibold text-gray-900">Patient Mobile Number</h2>
            <div>
              <label className="form-label">Patient Mobile Number (UHID)</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-600 text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="form-input rounded-l-none"
                  required
                  maxLength={10}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This mobile number becomes the patient's permanent UHID.
              </p>
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || phone.length !== 10}
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Phone className="h-4 w-4" /> Continue
                </>
              )}
            </button>
          </form>
        )}

        {step === 'details' && (
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-semibold text-green-700">Mobile Number Added</p>
                <p className="text-xs text-green-600 font-mono">
                  Permanent UHID: {verifiedPhone}
                </p>
              </div>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-3">Demographic Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => updateForm('name', e.target.value)}
                    className="form-input"
                    placeholder="Patient full name"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={e => updateForm('dateOfBirth', e.target.value)}
                    className="form-input"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={e => updateForm('age', e.target.value)}
                    className="form-input"
                    placeholder="Age in years"
                    min="0"
                    max="120"
                  />
                </div>
                <div>
                  <label className="form-label">Gender *</label>
                  <select
                    value={form.gender}
                    onChange={e => updateForm('gender', e.target.value)}
                    className="form-input"
                    required
                  >
                    <option value="">Select gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">
                    Email Address {provisionPortal && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => updateForm('email', e.target.value)}
                    className="form-input"
                    placeholder="patient@email.com"
                    required={provisionPortal}
                  />
                  {provisionPortal && (
                    <p className="text-[11px] text-teal-700 mt-1">
                      Required for patient portal authentication
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Address</label>
                  <textarea
                    value={form.address}
                    onChange={e => updateForm('address', e.target.value)}
                    className="form-input"
                    rows={2}
                    placeholder="Full residential address"
                  />
                </div>
                <div>
                  <label className="form-label">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={form.emergencyContactName}
                    onChange={e => updateForm('emergencyContactName', e.target.value)}
                    className="form-input"
                    placeholder="Emergency contact person"
                  />
                </div>
                <div>
                  <label className="form-label">Emergency Contact Phone</label>
                  <input
                    type="tel"
                    value={form.emergencyContact}
                    onChange={e => updateForm('emergencyContact', e.target.value)}
                    className="form-input"
                    placeholder="Emergency contact number"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Known Drug/Dental Allergies</label>
                  <input
                    type="text"
                    value={form.allergies}
                    onChange={e => updateForm('allergies', e.target.value)}
                    className="form-input"
                    placeholder="e.g. Penicillin, Local Anesthetics (leave blank if none)"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Systemic Medical History</label>
                  <textarea
                    value={form.medicalHistory}
                    onChange={e => updateForm('medicalHistory', e.target.value)}
                    className="form-input"
                    rows={3}
                    placeholder="Hypertension, Diabetes, Bleeding disorders, Cardiac history, etc."
                  />
                </div>
              </div>
            </div>

            {/* Portal Provisioning Section */}
            <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  id="provision-toggle"
                  type="checkbox"
                  checked={provisionPortal}
                  onChange={e => setProvisionPortal(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1">
                  <label htmlFor="provision-toggle" className="font-semibold text-gray-900 text-sm flex items-center gap-1.5 cursor-pointer">
                    <ShieldCheck className="h-4 w-4 text-teal-700" />
                    Provision Patient Portal Login
                  </label>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Generates secure login credentials allowing the patient to sign into the Patient Portal.
                  </p>
                </div>
              </div>

              {provisionPortal && (
                <div className="pt-2 pl-7 space-y-3">
                  <div>
                    <label className="form-label text-xs">Initial Temporary Password *</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={portalPassword}
                          onChange={e => setPortalPassword(e.target.value)}
                          className="form-input pl-9 text-xs font-mono"
                          placeholder="At least 6 characters"
                          required={provisionPortal}
                          minLength={6}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setPortalPassword(generateTemporaryPassword(verifiedPhone))}
                        className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 shrink-0"
                        title="Generate random password"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Generate
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Provide this temporary password to the patient along with their email address.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <User className="h-4 w-4" /> Complete Registration
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Credentials Handover Modal */}
      {credentialsModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-teal-800">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Registration Complete</h3>
                <p className="text-xs text-gray-500">Patient Portal credentials generated</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Patient Name:</span>
                <span className="font-semibold text-gray-900">{credentialsModal.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">UHID (Mobile):</span>
                <span className="font-mono font-semibold text-gray-900">{credentialsModal.uhid}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Portal Login Email:</span>
                <span className="font-semibold text-teal-800">{credentialsModal.email}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Initial Password:</span>
                <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-300">
                  {credentialsModal.password}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Share the temporary password manually or send a secure password setup link. The patient can sign in at the <strong>Patient Portal</strong>.
            </p>

            {sendCredentialsState === 'sent' && (
              <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">
                Password setup instructions were sent to {credentialsModal.email}.
              </p>
            )}
            {sendCredentialsState === 'failed' && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                {sendCredentialsError || 'Unable to send password setup instructions.'}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5"
              >
                <Copy className="h-4 w-4" /> Copy Credentials
              </button>
              <button
                type="button"
                onClick={handleSendCredentials}
                disabled={sendCredentialsState === 'sending' || sendCredentialsState === 'sent'}
                className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5"
              >
                <Mail className="h-4 w-4" />
                {sendCredentialsState === 'sending' ? 'Sending...' : sendCredentialsState === 'sent' ? 'Credentials Sent' : 'Send Credentials to Patient'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCredentialsModal(null)
                  navigate(`/reception/patients/${credentialsModal.patientId}`)
                }}
                className="btn-primary text-xs flex-1 flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="h-4 w-4" /> View Patient Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
