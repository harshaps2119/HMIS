import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getPatient, getPatientByUserId } from '../../services/patientService'
import { getPatientAppointments } from '../../services/appointmentService'
import { getPatientConsultations } from '../../services/consultationService'
import { getPatientPrescriptions } from '../../services/prescriptionService'
import { Patient, Appointment, Consultation, Prescription } from '../../types'
import { formatDate, formatTime, isAppointmentFuture } from '../../utils/dateUtils'
import {
  Calendar, FileText, Clock, AlertCircle, ArrowRight,
  Stethoscope, Pill, CheckCircle, Phone, Plus, Hash, Copy
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import StatusBadge from '../../components/ui/StatusBadge'
import { maskPhone } from '../../utils/maskPhone'
import { updateUserProfile } from '../../services/userService'
import { normalizePhoneNumber, isValidIndianMobile } from '../../utils/phoneUtils'
import BookAppointmentModal from './BookAppointmentModal'
import toast from 'react-hot-toast'

export default function PatientDashboard() {
  const { currentUser, userProfile, loading: authLoading, profileLoading, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isBookingOpen, setIsBookingOpen] = useState(false)

  const [phoneInput, setPhoneInput] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState('')

  const handleLinkPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setLinkError('')
    const normalized = normalizePhoneNumber(phoneInput.trim())
    if (!isValidIndianMobile(normalized)) {
      setLinkError('Please enter a valid 10-digit Indian mobile number.')
      return
    }
    setLinking(true)
    try {
      if (userProfile?.id) {
        await updateUserProfile(userProfile.id, { phone: normalized })
        await refreshProfile()
        toast.success('Mobile number linked successfully!')
      }
    } catch (err) {
      console.error('Failed to link mobile number:', err)
      setLinkError('Unable to update mobile number. Please try again.')
    } finally {
      setLinking(false)
    }
  }

  const loadData = useCallback(async () => {
    setLoadError('')
    if (authLoading || profileLoading) {
      setLoading(true)
      return
    }
    if (!currentUser) {
      setLoading(false)
      setLoadError('Your session has expired. Please sign in again.')
      return
    }
    if (!userProfile) {
      setLoading(false)
      setLoadError('Your clinic profile could not be loaded. Please sign in again or contact the clinic administrator.')
      return
    }

    const lookupTarget = userProfile.patientId || userProfile.phone

    setLoading(true)
    try {
      let p: Patient | null = null

      if (lookupTarget) {
        p = await getPatient(lookupTarget)
      }

      if (!p && currentUser.uid) {
        p = await getPatientByUserId(currentUser.uid)
      }

      if (!p && !lookupTarget) {
        setLoading(false)
        return
      }

      if (!p) {
        setLoadError('No patient record was found for your account. Please contact the clinic receptionist.')
        return
      }

      setPatient(p)

      const [appts, consults, rxs] = await Promise.all([
        getPatientAppointments(p.id),
        getPatientConsultations(p.id),
        getPatientPrescriptions(p.id),
      ])
      setAppointments(appts || [])
      setConsultations(consults || [])
      setPrescriptions(rxs || [])
    } catch (err) {
      console.error('Failed to load patient dashboard records:', err)
      setLoadError('We could not load your patient records. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [authLoading, currentUser, profileLoading, userProfile])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading || authLoading || profileLoading) return <LoadingSpinner className="py-16" />

  if (loadError) {
    return (
      <div className="card p-8 max-w-2xl mx-auto text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h1 className="text-lg font-bold text-gray-900">Patient dashboard unavailable</h1>
        <p className="text-sm text-gray-600">{loadError}</p>
        <button type="button" onClick={loadData} className="btn-primary mx-auto">
          Try again
        </button>
      </div>
    )
  }

  const upcomingAppt = appointments.find(
    a => (a.status === 'scheduled' || a.status === 'waiting') && isAppointmentFuture(a.date)
  ) || appointments.find(a => a.status === 'scheduled')

  const requestedAppts = appointments.filter(a => a.status === 'requested')
  const latestConsult = consultations[0]
  const latestRx = prescriptions[0]
  const displayPatientId = patient?.patientId || patient?.uhid || userProfile?.patientId

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-teal-200 font-semibold">Patient Portal</span>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">Hello, {patient?.name || userProfile?.name} 👋</h1>
            <div className="flex flex-wrap items-center gap-2.5 mt-3 text-teal-100 text-xs sm:text-sm">
              {displayPatientId && (
                <span className="inline-flex items-center gap-1.5 bg-teal-950/80 border border-teal-400/40 px-3 py-1 rounded-lg font-mono font-bold text-teal-100 shadow-sm">
                  <Hash className="h-3.5 w-3.5 text-teal-300" />
                  Patient ID: {displayPatientId}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(displayPatientId)
                      toast.success(`Patient ID ${displayPatientId} copied!`)
                    }}
                    className="ml-1 p-0.5 hover:text-white transition-colors"
                    title="Copy Patient ID"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </span>
              )}
              <span className="bg-teal-800/80 px-2.5 py-1 rounded-md font-mono">
                Mobile: {userProfile?.phone ? maskPhone(userProfile.phone) : (patient?.phone ? maskPhone(patient.phone) : '—')}
              </span>
              {patient?.gender && <span>{patient.gender}</span>}
              {patient?.age && <span>· {patient.age} yrs</span>}
            </div>
          </div>
          <div className="flex sm:flex-col gap-2 shrink-0">
            <button
              onClick={() => setIsBookingOpen(true)}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Calendar className="h-4 w-4" /> Book Appointment
            </button>
            <button
              onClick={() => navigate('/patient/prescriptions')}
              className="px-4 py-2 bg-white text-teal-900 text-xs font-bold rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <FileText className="h-4 w-4" /> My Prescriptions
            </button>
          </div>
        </div>
      </div>

      {/* Allergies Warning if present */}
      {patient?.allergies && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Medical Alert: Recorded Allergies</p>
            <p className="text-red-700 mt-0.5">{patient.allergies}</p>
          </div>
        </div>
      )}

      {/* Notice & Form if no mobile number is linked to userProfile */}
      {!userProfile?.phone && (
        <div className="card p-6 border-amber-200 bg-amber-50/50 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Link Your Registered Mobile Number</h3>
              <p className="text-xs text-gray-600 mt-1">
                To view your dental appointments, prescriptions, and clinical history, enter the 10-digit mobile number provided during your clinic visit.
              </p>
            </div>
          </div>
          {linkError && (
            <p className="text-xs text-red-600 font-medium pl-8">{linkError}</p>
          )}
          <form onSubmit={handleLinkPhone} className="flex flex-col sm:flex-row gap-2.5 sm:items-center pl-8 max-w-md">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-mono">+91</span>
              <input
                type="tel"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="9876543210"
                className="form-input text-xs pl-10"
                maxLength={10}
                required
              />
            </div>
            <button
              type="submit"
              disabled={linking}
              className="btn-primary bg-amber-600 hover:bg-amber-700 text-xs py-2 px-4 shrink-0 flex items-center justify-center gap-1.5"
            >
              {linking ? <LoadingSpinner size="sm" /> : <><Phone className="h-3.5 w-3.5" /> Link Mobile</>}
            </button>
          </form>
        </div>
      )}

      {/* Appointment Requests Pending Clinic Confirmation */}
      {requestedAppts.length > 0 && (
        <div className="card p-6 border-l-4 border-amber-500 bg-amber-50/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
              <Clock className="h-5 w-5 text-amber-600" />
              <span>Appointment Requests (Pending Clinic Review)</span>
            </div>
            <span className="badge bg-amber-100 text-amber-800 border border-amber-200">
              {requestedAppts.length} Pending
            </span>
          </div>
          <div className="space-y-3">
            {requestedAppts.map(req => (
              <div
                key={req.id}
                className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">
                      {formatDate(req.date)} at {formatTime(req.time)}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                    Doctor: <span className="font-medium text-gray-800">{req.doctorName}</span>
                  </p>
                  <p className="text-xs text-gray-600">
                    Reason: <span className="text-gray-800 italic">"{req.reason}"</span>
                  </p>
                  {req.expectedTreatment && (
                    <p className="text-xs text-teal-700">
                      Procedure: {req.expectedTreatment}
                    </p>
                  )}
                  {req.notes && (
                    <p className="text-xs text-gray-400">
                      Note: {req.notes}
                    </p>
                  )}
                </div>
                <div className="text-xs text-amber-800 bg-amber-100/70 px-3 py-1.5 rounded-lg border border-amber-200 font-medium shrink-0 self-start sm:self-auto">
                  Awaiting clinic confirmation
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Appointment Card */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-600" /> Upcoming Appointment
            </h2>
            <button
              onClick={() => navigate('/patient/appointments')}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
            >
              All Appointments →
            </button>
          </div>

          {upcomingAppt ? (
            <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-teal-900">{formatDate(upcomingAppt.date)}</span>
                <StatusBadge status={upcomingAppt.status} />
              </div>
              <p className="text-xs text-gray-600">
                Time: <strong className="text-gray-900">{formatTime(upcomingAppt.time)}</strong>
              </p>
              <p className="text-xs text-gray-600">
                Doctor: <strong className="text-gray-900">Dr. {upcomingAppt.doctorName}</strong>
              </p>
              <p className="text-xs text-gray-500 pt-1">
                Reason: {upcomingAppt.reason}
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-xs">
              No upcoming appointments scheduled.
            </div>
          )}
        </div>

        {/* Recent Consultation Card */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-teal-600" /> Recent Consultation
            </h2>
            <button
              onClick={() => navigate('/patient/history')}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
            >
              View History →
            </button>
          </div>

          {latestConsult ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b">
                <span>Date: <strong>{formatDate(latestConsult.date)}</strong></span>
                <span>Dr. {latestConsult.doctorName}</span>
              </div>
              <div className="text-xs">
                <span className="font-semibold text-gray-500 block">Diagnosis:</span>
                <p className="font-bold text-gray-900 mt-0.5">
                  {latestConsult.diagnoses?.join(', ') || latestConsult.otherDiagnosis || 'Consultation'}
                </p>
              </div>
              {latestConsult.treatmentPerformed && (
                <div className="text-xs">
                  <span className="font-semibold text-gray-500 block">Treatment:</span>
                  <p className="text-gray-800 mt-0.5">{latestConsult.treatmentPerformed}</p>
                </div>
              )}
              {latestRx && (
                <div className="pt-2">
                  <button
                    onClick={() => navigate(`/patient/prescriptions/${latestRx.id}`)}
                    className="btn-secondary w-full text-xs text-teal-700 font-semibold"
                  >
                    <FileText className="h-3.5 w-3.5" /> View Prescription
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-xs">
              No previous consultations on record.
            </div>
          )}
        </div>
      </div>

      {/* Latest Active Prescription Banner */}
      {latestRx && (
        <div className="card p-6 border-teal-200 bg-teal-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-teal-800 font-bold text-sm">
                <Pill className="h-4 w-4" /> Active Prescription
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Issued on {formatDate(latestRx.date)} by Dr. {latestRx.doctorName} ({latestRx.medications.length} medicines)
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {latestRx.medications.map((m, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-white rounded text-xs text-gray-800 border border-teal-200">
                    {m.name} ({m.frequency})
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => navigate(`/patient/prescriptions/${latestRx.id}`)}
              className="btn-primary bg-teal-600 hover:bg-teal-700 text-xs shrink-0"
            >
              View Prescription / Print (PDF)
            </button>
          </div>
        </div>
      )}

      {/* Book Appointment Modal */}
      <BookAppointmentModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={loadData}
        patient={patient}
      />
    </div>
  )
}
