import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { createPatient, provisionPatientAccount } from '../../services/patientService'
import { sendPatientIdEmail } from '../../services/emailService'
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
    phone: string
    email: string
    password?: string
    emailSent: boolean
    emailError?: string
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
      let generatedPatientId = ''

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

        generatedPatientId = result.patientId

        if (currentUser && userProfile) {
          await logAction({
            userId: currentUser.uid,
            userRole: userProfile.role,
            userName: userProfile.name,
            action: 'patient_registered',
            targetId: result.patientId,
            targetType: 'patient',
            description: `Registered patient & provisioned portal login: ${form.name} (Patient ID: ${result.patientId})`,
          })
        }
      } else {
        // Offline-only demographic record without portal access
        const result = await createPatient(
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

        generatedPatientId = result.patientId

        if (currentUser && userProfile) {
          await logAction({
            userId: currentUser.uid,
            userRole: userProfile.role,
            userName: userProfile.name,
            action: 'patient_registered',
            targetId: result.patientId,
            targetType: 'patient',
            description: `Registered clinic patient: ${form.name} (Patient ID: ${result.patientId})`,
          })
        }
      }

      // Automatically send Patient ID welcome email if email is provided
      let emailSuccess = false
      let emailErrMsg = ''

      if (form.email.trim()) {
        try {
          const emailRes = await sendPatientIdEmail({
            patientName: form.name.trim(),
            email: form.email.trim(),
            patientId: generatedPatientId,
            performedBy: currentUser && userProfile ? {
              userId: currentUser.uid,
              userRole: userProfile.role,
              userName: userProfile.name,
            } : undefined,
          })
          emailSuccess = emailRes.success
          if (!emailRes.success) {
            emailErrMsg = emailRes.error || 'Email service could not deliver message.'
          }
        } catch (e: unknown) {
          emailErrMsg = e instanceof Error ? e.message : 'Failed to send email.'
        }
      }

      if (form.email.trim() && !emailSuccess) {
        toast('Patient registered successfully, but the Patient ID email could not be sent.', { icon: '⚠️' })
      } else {
        toast.success(`Patient ${form.name} registered successfully!`)
      }

      // Show success confirmation modal
      setCredentialsModal({
        isOpen: true,
        patientId: generatedPatientId,
        name: form.name.trim(),
        phone: verifiedPhone,
        email: form.email.trim(),
        password: provisionPortal ? portalPassword : '',
        emailSent: emailSuccess,
        emailError: emailErrMsg,
      })
    } catch (err: unknown) {
      console.error('Registration failed:', err)
      setError(getFirebaseErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const updateForm = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleCopyPatientId = () => {
    if (!credentialsModal) return
    navigator.clipboard.writeText(credentialsModal.patientId)
    toast.success(`Patient ID ${credentialsModal.patientId} copied!`)
  }

  const handleCopyCredentials = () => {
    if (!credentialsModal) return
    const text = `Prasad Dental Care Patient Details:\nPatient Name: ${credentialsModal.name}\nPatient ID: ${credentialsModal.patientId}\nMobile: ${credentialsModal.phone}\nLogin Email: ${credentialsModal.email || 'None'}\n${credentialsModal.password ? `Initial Password: ${credentialsModal.password}\n` : ''}Portal Link: ${window.location.origin}/login?portal=patient`
    navigator.clipboard.writeText(text)
    toast.success('Patient details copied to clipboard!')
  }

  const handleResendEmail = async () => {
    if (!credentialsModal || sendCredentialsState === 'sending' || !credentialsModal.email) return

    setSendCredentialsState('sending')
    setSendCredentialsError('')
    try {
      const emailRes = await sendPatientIdEmail(
        {
          patientName: credentialsModal.name,
          email: credentialsModal.email,
          patientId: credentialsModal.patientId,
          performedBy: currentUser && userProfile ? {
            userId: currentUser.uid,
            userRole: userProfile.role,
            userName: userProfile.name,
          } : undefined,
        },
        true
      )

      if (emailRes.success) {
        setSendCredentialsState('sent')
        toast.success(`Patient ID welcome email sent to ${credentialsModal.email}!`)
      } else {
        setSendCredentialsState('failed')
        setSendCredentialsError(emailRes.error || 'Unable to deliver email.')
        toast.error('Could not send Patient ID email.')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to send email.'
      setSendCredentialsState('failed')
      setSendCredentialsError(message)
      toast.error('Could not send Patient ID email.')
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
            Enter patient details to automatically generate a unique permanent Patient ID and provision Patient Portal access
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
              <label className="form-label">Patient Mobile Number</label>
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
                A unique permanent Patient ID (e.g. PDC-000001) will be generated automatically upon registration.
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
                <p className="text-sm font-semibold text-green-700">Mobile Number Added: +91 {verifiedPhone}</p>
                <p className="text-xs text-green-600">
                  Unique Patient ID will be generated automatically by the backend system.
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
                      Required for Patient Portal authentication and Patient ID welcome email
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
                    Generates secure login credentials allowing the patient to sign into the Patient Portal using their Patient ID.
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
                      The patient can sign in to the Patient Portal using their Patient ID and this password.
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

      {/* Clean Success Confirmation Modal */}
      {credentialsModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-teal-800">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Patient Registered Successfully</h3>
                <p className="text-xs text-gray-500">Patient ID has been generated automatically.</p>
              </div>
            </div>

            {/* Generated Patient ID Highlight Box */}
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-center space-y-1">
              <span className="text-xs uppercase tracking-wider text-teal-700 font-semibold">Generated Patient ID</span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-mono font-extrabold text-teal-900 tracking-wider">
                  {credentialsModal.patientId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPatientId}
                  className="p-1.5 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-800 transition-colors"
                  title="Copy Patient ID"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[11px] text-teal-700 font-medium">
                Permanent login identifier for patient portal access
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Patient Name:</span>
                <span className="font-semibold text-gray-900">{credentialsModal.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Patient ID:</span>
                <span className="font-mono font-bold text-gray-900">{credentialsModal.patientId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Phone:</span>
                <span className="font-mono font-semibold text-gray-900">{credentialsModal.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Email:</span>
                <span className="font-semibold text-gray-900">{credentialsModal.email || 'None'}</span>
              </div>
              {credentialsModal.password && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Initial Password:</span>
                  <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-300">
                    {credentialsModal.password}
                  </span>
                </div>
              )}
            </div>

            {/* Email delivery status banner */}
            {credentialsModal.email && (
              <>
                {credentialsModal.emailSent || sendCredentialsState === 'sent' ? (
                  <div className="p-2.5 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    <span>Patient ID welcome email sent to <strong>{credentialsModal.email}</strong>.</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Patient registered successfully, but the Patient ID email could not be sent.</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        {credentialsModal.emailError || sendCredentialsError || 'Backend email delivery was not completed. Communicate the Patient ID directly to the patient or click Resend.'}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyPatientId}
                className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5"
              >
                <Copy className="h-4 w-4" /> Copy ID
              </button>
              {credentialsModal.email && (
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={sendCredentialsState === 'sending'}
                  className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5"
                >
                  <Mail className="h-4 w-4" />
                  {sendCredentialsState === 'sending' ? 'Sending...' : 'Resend ID Email'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const id = credentialsModal.patientId
                  setCredentialsModal(null)
                  navigate(`/reception/patients/${id}`)
                }}
                className="btn-primary text-xs flex-1 flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="h-4 w-4" /> View Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

