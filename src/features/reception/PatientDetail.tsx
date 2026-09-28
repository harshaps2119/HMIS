import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getPatient, provisionPatientAccount } from '../../services/patientService'
import { getPatientAppointments } from '../../services/appointmentService'
import { getPatientUserByPhone } from '../../services/userService'
import { sendPatientIdEmail } from '../../services/emailService'
import { useAuth } from '../../contexts/AuthContext'
import { Patient, Appointment, UserProfile } from '../../types'
import { formatDate, formatTime } from '../../utils/dateUtils'
import {
  Phone, Mail, MapPin, AlertTriangle, Calendar,
  ArrowLeft, Plus, ShieldCheck, Key, Copy, RefreshCw, CheckCircle, Hash,
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorState from '../../components/ui/ErrorState'
import StatusBadge from '../../components/ui/StatusBadge'

function generateTemporaryPassword(phoneDigits: string) {
  const last4 = phoneDigits.slice(-4) || '2026'
  const randomLetters = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `Care#${randomLetters}${last4}`
}

export default function PatientDetail() {
  const { patientRecordId } = useParams<{ patientRecordId: string }>()
  const navigate = useNavigate()
  const { userProfile, currentUser } = useAuth()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [portalUser, setPortalUser] = useState<UserProfile | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [error, setError] = useState('')

  // Provisioning modal state
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false)
  const [provisionEmail, setProvisionEmail] = useState('')
  const [provisionPassword, setProvisionPassword] = useState('')
  const [provisionLoading, setProvisionLoading] = useState(false)
  const [provisionError, setProvisionError] = useState('')
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string
    password: string
    patientId: string
  } | null>(null)

  const loadPatientData = async () => {
    if (!patientRecordId) return
    try {
      const decodedId = decodeURIComponent(patientRecordId)
      const p = await getPatient(decodedId)
      if (!p) {
        setError('Patient not found.')
      } else {
        setPatient(p)
        setProvisionEmail(p.email || '')
        setProvisionPassword(generateTemporaryPassword(p.phone))
        const [appts, user] = await Promise.all([
          getPatientAppointments(p.id),
          getPatientUserByPhone(p.phone),
        ])
        setAppointments(appts)
        setPortalUser(user)
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load patient details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPatientData()
  }, [patientRecordId])

  const handleCopyPatientId = () => {
    if (!patient) return
    const idToCopy = patient.patientId || patient.uhid
    navigator.clipboard.writeText(idToCopy)
    toast.success(`Patient ID ${idToCopy} copied to clipboard!`)
  }

  const handleResendPatientIdEmail = async () => {
    if (!patient) return
    if (!patient.email) {
      toast.error('Patient has no email address on record.')
      return
    }

    setSendingEmail(true)
    try {
      const displayId = patient.patientId || patient.uhid
      const res = await sendPatientIdEmail(
        {
          patientName: patient.name,
          email: patient.email,
          patientId: displayId,
          performedBy: currentUser && userProfile ? {
            userId: currentUser.uid,
            userRole: userProfile.role,
            userName: userProfile.name,
          } : undefined,
        },
        true
      )

      if (res.success) {
        toast.success(`Patient ID welcome email sent to ${patient.email}!`)
      } else {
        toast.error(`Email delivery could not be completed: ${res.error || 'Check server configuration'}`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send email'
      toast.error(msg)
    } finally {
      setSendingEmail(false)
    }
  }

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProvisionError('')
    if (!patient) return

    if (!provisionEmail.trim() || !provisionEmail.includes('@')) {
      setProvisionError('A valid email address is required.')
      return
    }
    if (!provisionPassword || provisionPassword.length < 6) {
      setProvisionError('Password must be at least 6 characters.')
      return
    }

    setProvisionLoading(true)
    try {
      const result = await provisionPatientAccount({
        name: patient.name,
        phone: patient.phone,
        email: provisionEmail.trim(),
        password: provisionPassword,
        gender: patient.gender,
        age: patient.age,
        dateOfBirth: patient.dateOfBirth,
        address: patient.address,
        allergies: patient.allergies,
        medicalHistory: patient.medicalHistory,
        emergencyContact: patient.emergencyContact,
        emergencyContactName: patient.emergencyContactName,
      })

      const displayId = result.patientId || patient.patientId || patient.uhid

      setCreatedCredentials({
        email: provisionEmail.trim(),
        password: provisionPassword,
        patientId: displayId,
      })

      // Send Patient ID welcome email
      try {
        await sendPatientIdEmail({
          patientName: patient.name,
          email: provisionEmail.trim(),
          patientId: displayId,
          performedBy: currentUser && userProfile ? {
            userId: currentUser.uid,
            userRole: userProfile.role,
            userName: userProfile.name,
          } : undefined,
        })
      } catch (err) {
        console.warn('Welcome email delivery failed on provision:', err)
      }

      toast.success('Patient Portal login provisioned successfully!')
      // Refresh user profile and patient info
      const [updatedUser, updatedPatient] = await Promise.all([
        getPatientUserByPhone(patient.phone),
        getPatient(patient.id),
      ])
      setPortalUser(updatedUser)
      if (updatedPatient) setPatient(updatedPatient)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Provisioning failed.'
      setProvisionError(msg)
    } finally {
      setProvisionLoading(false)
    }
  }

  const handleCopyCredentials = () => {
    if (!createdCredentials || !patient) return
    const text = `Prasad Dental Care Patient Portal Credentials:\nPatient Name: ${patient.name}\nPatient ID: ${createdCredentials.patientId}\nMobile: ${patient.phone}\nLogin Email: ${createdCredentials.email}\nInitial Password: ${createdCredentials.password}\nPortal Link: ${window.location.origin}/login?portal=patient`
    navigator.clipboard.writeText(text)
    toast.success('Credentials copied to clipboard!')
  }

  if (loading) return <LoadingSpinner className="py-16" />
  if (error || !patient) return <ErrorState message={error || 'Patient not found'} onRetry={() => navigate(-1)} />

  const displayPatientId = patient.patientId || patient.uhid

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-primary-100 text-primary-800 border border-primary-200">
              <Hash className="h-3 w-3" />
              Patient ID: {displayPatientId}
            </span>
            <button
              type="button"
              onClick={handleCopyPatientId}
              className="text-xs text-gray-500 hover:text-primary-700 flex items-center gap-1 p-1 rounded hover:bg-gray-100 transition-colors"
              title="Copy Patient ID"
            >
              <Copy className="h-3.5 w-3.5" /> Copy ID
            </button>
          </div>
        </div>
        <button
          onClick={() =>
            navigate(
              `/reception/appointments/new?patientRecordId=${encodeURIComponent(
                patient.id
              )}&patientName=${encodeURIComponent(
                patient.name
              )}&patientPhone=${encodeURIComponent(patient.phone)}`
            )
          }
          className="btn-primary"
        >
          <Plus className="h-4 w-4" /> New Appointment
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Patient Demographic Card */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-700">{patient.name.charAt(0)}</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{patient.name}</h2>
              <p className="text-sm text-gray-500">
                {patient.gender}
                {patient.age ? `, ${patient.age} yrs` : ''}
              </p>
            </div>
          </div>

          {/* Prominent Patient ID Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary-50 border border-primary-100">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-primary-700 font-bold">Patient ID</p>
              <p className="text-base font-mono font-extrabold text-primary-900">{displayPatientId}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyPatientId}
              className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1 bg-white hover:bg-primary-100 text-primary-800 border-primary-200"
              title="Copy Patient ID"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="font-mono">{patient.phone}</span>
            </div>
            {patient.email && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="truncate">{patient.email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleResendPatientIdEmail}
                  disabled={sendingEmail}
                  className="w-full btn-secondary text-xs py-1.5 flex items-center justify-center gap-1.5 text-primary-700 hover:bg-primary-50 border-primary-200"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {sendingEmail ? 'Sending Email...' : 'Resend Patient ID Email'}
                </button>
              </div>
            )}
            {patient.address && (
              <div className="flex items-start gap-2 text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                {patient.address}
              </div>
            )}
            {patient.dateOfBirth && (
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" />
                DOB: {patient.dateOfBirth}
              </div>
            )}
          </div>

          {/* Portal Access Status */}
          <div className="pt-3 border-t border-gray-100">
            {portalUser ? (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  <span>Portal Login Active</span>
                </div>
                <p className="text-xs text-teal-700 truncate">
                  Account Email: {portalUser.email || patient.email || '—'}
                </p>
                <p className="text-[11px] text-teal-600">
                  Patient logs in with Patient ID <strong>{displayPatientId}</strong>
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                  <Key className="h-4 w-4 text-amber-600" />
                  <span>No Portal Access</span>
                </div>
                <p className="text-xs text-amber-700">
                  This patient does not yet have login credentials for the Patient Portal.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedCredentials(null)
                    setProvisionError('')
                    setIsProvisionModalOpen(true)
                  }}
                  className="w-full btn-secondary text-xs bg-white text-amber-800 border-amber-300 hover:bg-amber-100/50 py-1.5 flex items-center justify-center gap-1"
                >
                  <Key className="h-3.5 w-3.5" /> Provision Portal Login
                </button>
              </div>
            )}
          </div>

          {patient.allergies && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-semibold text-red-700">Allergies</span>
              </div>
              <p className="text-sm text-red-600">{patient.allergies}</p>
            </div>
          )}

          {patient.medicalHistory && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-xs font-semibold text-yellow-700 mb-1">Medical History</p>
              <p className="text-sm text-yellow-800">{patient.medicalHistory}</p>
            </div>
          )}

          {patient.emergencyContact && (
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs">
              <p className="font-semibold text-gray-700">Emergency Contact</p>
              <p className="text-gray-600 mt-0.5">
                {patient.emergencyContactName ? `${patient.emergencyContactName}: ` : ''}
                {patient.emergencyContact}
              </p>
            </div>
          )}
        </div>

        {/* Appointments history list */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Appointments History</h2>
          {appointments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No appointments found for this patient.
            </p>
          ) : (
            <div className="space-y-3">
              {appointments.map(appt => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appt.reason}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(appt.date)} · {formatTime(appt.time)} · Dr. {appt.doctorName}
                    </p>
                    {appt.expectedTreatment && (
                      <p className="text-xs text-teal-600 mt-0.5">
                        Expected: {appt.expectedTreatment} ({appt.expectedTreatmentPrice || 'Ref Price'})
                      </p>
                    )}
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Provision Portal Modal */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            {!createdCredentials ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Provision Patient Portal Access</h3>
                    <p className="text-xs text-gray-500">{patient.name} ({displayPatientId})</p>
                  </div>
                </div>

                {provisionError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    {provisionError}
                  </div>
                )}

                <form onSubmit={handleProvisionSubmit} className="space-y-3">
                  <div>
                    <label className="form-label text-xs">Login Email Address *</label>
                    <input
                      type="email"
                      value={provisionEmail}
                      onChange={e => setProvisionEmail(e.target.value)}
                      className="form-input text-xs"
                      placeholder="patient@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label text-xs">Initial Password *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={provisionPassword}
                        onChange={e => setProvisionPassword(e.target.value)}
                        className="form-input text-xs font-mono"
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setProvisionPassword(generateTemporaryPassword(patient.phone))}
                        className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1 shrink-0"
                      >
                        <RefreshCw className="h-3 w-3" /> Generate
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-500 pt-1">
                    This will securely create an active account in Supabase Auth and link it with the patient's record. The patient will be able to log in with Patient ID ({displayPatientId}) or email.
                  </p>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsProvisionModalOpen(false)}
                      className="btn-secondary text-xs flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={provisionLoading}
                      className="btn-primary text-xs flex-1 flex items-center justify-center gap-1"
                    >
                      {provisionLoading ? <LoadingSpinner size="sm" /> : 'Provision Access'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 text-teal-800">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Credentials Provisioned</h3>
                    <p className="text-xs text-gray-500">Provide these to the patient</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500">Patient ID:</span>
                    <span className="font-mono font-bold text-primary-900">{createdCredentials.patientId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500">Login Email:</span>
                    <span className="font-semibold text-teal-800">{createdCredentials.email}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Initial Password:</span>
                    <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-300">
                      {createdCredentials.password}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg p-2.5">
                  Welcome email containing Patient ID and login details has been dispatched to <strong>{createdCredentials.email}</strong>.
                </p>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5"
                  >
                    <Copy className="h-4 w-4" /> Copy Credentials
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsProvisionModalOpen(false)}
                    className="btn-primary text-xs flex-1"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

