import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  getTodaysAppointments,
  updateAppointmentStatus,
  getAppointmentRequests,
  confirmAppointmentRequest,
  rescheduleAppointment,
  rejectAppointmentRequest,
} from '../../services/appointmentService'
import { getDoctors } from '../../services/userService'
import { logAction } from '../../services/auditService'
import { useAuth } from '../../contexts/AuthContext'
import { Appointment, AppointmentStatus, UserProfile } from '../../types'
import { todayISO, formatTime, formatDate } from '../../utils/dateUtils'
import {
  Calendar, Plus, RefreshCw, Clock, CheckCircle, XCircle,
  AlertCircle, Stethoscope, User, Phone, Check, X, ArrowRight
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import { format } from 'date-fns'

const STATUS_ACTIONS: Partial<Record<AppointmentStatus, { label: string; next: AppointmentStatus }[]>> = {
  scheduled: [
    { label: 'Check In', next: 'checked-in' },
    { label: 'No Show', next: 'no-show' },
    { label: 'Cancel', next: 'cancelled' },
  ],
  'checked-in': [
    { label: 'Mark Waiting', next: 'waiting' },
    { label: 'Cancel', next: 'cancelled' },
  ],
  waiting: [
    { label: 'In Consultation', next: 'in-consultation' },
  ],
  'in-consultation': [
    { label: 'Complete', next: 'completed' },
  ],
}

const TIME_SLOTS = [
  '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
  '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
]

export default function AppointmentQueue() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { currentUser, userProfile } = useAuth()

  const initialTab = searchParams.get('tab') === 'requests' ? 'requests' : 'queue'
  const [activeTab, setActiveTab] = useState<'queue' | 'requests'>(initialTab)

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [requests, setRequests] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  // Modal States for Requests Management
  const [confirmModalAppt, setConfirmModalAppt] = useState<Appointment | null>(null)
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState<Appointment | null>(null)
  const [rejectModalAppt, setRejectModalAppt] = useState<Appointment | null>(null)

  // Confirm Form
  const [confirmDoctorId, setConfirmDoctorId] = useState('')
  const [confirmDate, setConfirmDate] = useState('')
  const [confirmTime, setConfirmTime] = useState('')
  const [confirmNotes, setConfirmNotes] = useState('')

  // Reschedule Form
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')

  // Reject Form
  const [rejectReason, setRejectReason] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [todayAppts, pendingReqs, docList] = await Promise.all([
        getTodaysAppointments(todayISO()),
        getAppointmentRequests(),
        getDoctors(),
      ])
      setAppointments(todayAppts || [])
      setRequests(pendingReqs || [])
      setDoctors(docList || [])
    } catch {
      toast.error('Failed to load appointments queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleTabChange = (tab: 'queue' | 'requests') => {
    setActiveTab(tab)
    setSearchParams(tab === 'requests' ? { tab: 'requests' } : {})
  }

  const handleStatusChange = async (appt: Appointment, newStatus: AppointmentStatus) => {
    setUpdating(appt.id)
    try {
      await updateAppointmentStatus(appt.id, newStatus)
      if (currentUser && userProfile) {
        await logAction({
          userId: currentUser.uid,
          userRole: userProfile.role,
          userName: userProfile.name,
          action: 'appointment_updated',
          targetId: appt.id,
          targetType: 'appointment',
          description: `Appointment status updated to ${newStatus} for patient ${appt.patientName}`,
        })
      }
      toast.success(`Status updated to ${newStatus}`)
      await loadData()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdating(null)
    }
  }

  // --- REQUEST ACTIONS ---
  const openConfirmModal = (appt: Appointment) => {
    setConfirmModalAppt(appt)
    setConfirmDoctorId(appt.doctorId || (doctors[0]?.id || ''))
    setConfirmDate(appt.date || todayISO())
    setConfirmTime(appt.time || '10:00')
    setConfirmNotes('')
  }

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmModalAppt) return

    const selectedDoc = doctors.find(d => d.id === confirmDoctorId)
    setUpdating(confirmModalAppt.id)
    try {
      await confirmAppointmentRequest(confirmModalAppt.id, {
        doctorId: confirmDoctorId,
        doctorName: selectedDoc ? selectedDoc.name : confirmModalAppt.doctorName,
        date: confirmDate,
        time: confirmTime,
        notes: confirmNotes ? `${confirmModalAppt.notes || ''} [Confirmed: ${confirmNotes}]`.trim() : undefined,
      })

      if (currentUser && userProfile) {
        await logAction({
          userId: currentUser.uid,
          userRole: userProfile.role,
          userName: userProfile.name,
          action: 'appointment_updated',
          targetId: confirmModalAppt.id,
          targetType: 'appointment',
          description: `Confirmed appointment request for ${confirmModalAppt.patientName}`,
        })
      }

      toast.success(`Appointment confirmed for ${confirmModalAppt.patientName}!`)
      setConfirmModalAppt(null)
      await loadData()
    } catch (err: unknown) {
      console.error('Failed to confirm request:', err)
      toast.error('Failed to confirm appointment')
    } finally {
      setUpdating(null)
    }
  }

  const openRescheduleModal = (appt: Appointment) => {
    setRescheduleModalAppt(appt)
    setRescheduleDate(appt.date)
    setRescheduleTime(appt.time)
    setRescheduleReason('')
  }

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rescheduleModalAppt) return

    setUpdating(rescheduleModalAppt.id)
    try {
      await rescheduleAppointment(
        rescheduleModalAppt.id,
        rescheduleDate,
        rescheduleTime,
        rescheduleReason.trim() || undefined
      )

      if (currentUser && userProfile) {
        await logAction({
          userId: currentUser.uid,
          userRole: userProfile.role,
          userName: userProfile.name,
          action: 'appointment_updated',
          targetId: rescheduleModalAppt.id,
          targetType: 'appointment',
          description: `Rescheduled appointment request for ${rescheduleModalAppt.patientName} to ${rescheduleDate}`,
        })
      }

      toast.success(`Appointment rescheduled to ${formatDate(rescheduleDate)} at ${formatTime(rescheduleTime)}`)
      setRescheduleModalAppt(null)
      await loadData()
    } catch {
      toast.error('Failed to reschedule appointment')
    } finally {
      setUpdating(null)
    }
  }

  const openRejectModal = (appt: Appointment) => {
    setRejectModalAppt(appt)
    setRejectReason('')
  }

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectModalAppt) return

    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason')
      return
    }

    setUpdating(rejectModalAppt.id)
    try {
      await rejectAppointmentRequest(rejectModalAppt.id, rejectReason.trim())

      if (currentUser && userProfile) {
        await logAction({
          userId: currentUser.uid,
          userRole: userProfile.role,
          userName: userProfile.name,
          action: 'appointment_updated',
          targetId: rejectModalAppt.id,
          targetType: 'appointment',
          description: `Rejected appointment request for ${rejectModalAppt.patientName}: ${rejectReason}`,
        })
      }

      toast.success('Appointment request rejected')
      setRejectModalAppt(null)
      await loadData()
    } catch {
      toast.error('Failed to reject appointment request')
    } finally {
      setUpdating(null)
    }
  }

  const grouped = {
    active: appointments.filter(a => ['scheduled', 'checked-in', 'waiting', 'in-consultation'].includes(a.status)),
    completed: appointments.filter(a => a.status === 'completed'),
    cancelled: appointments.filter(a => ['cancelled', 'no-show'].includes(a.status)),
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments Management</h1>
          <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="btn-secondary">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={() => navigate('/reception/appointments/new')}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" /> New Appointment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => handleTabChange('queue')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Today's Clinic Queue ({grouped.active.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('requests')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Online Appointment Requests</span>
          {requests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <LoadingSpinner className="py-16" />
      ) : activeTab === 'requests' ? (
        /* APPOINTMENT REQUESTS REVIEW SECTION */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pending Patient Requests</h2>
              <p className="text-xs text-gray-500">
                Review patient-requested slots, assign confirmed doctors, and finalize appointments.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
              {requests.length} pending review
            </span>
          </div>

          {requests.length === 0 ? (
            <div className="card p-12">
              <EmptyState
                icon={CheckCircle}
                title="All caught up!"
                description="No pending appointment requests from online patients."
              />
            </div>
          ) : (
            <div className="grid gap-4">
              {requests.map(req => (
                <div
                  key={req.id}
                  className="card p-5 border-l-4 border-amber-500 hover:border-amber-600 transition-colors shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-base">{req.patientName}</h3>
                        <StatusBadge status={req.status} />
                        <span className="badge bg-purple-50 text-purple-700 border border-purple-200">
                          {req.visitType}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-1">
                        <span className="font-mono flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-gray-400" /> {req.patientPhone || req.uhid}
                        </span>
                        <span>UHID: {req.uhid}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <button
                        onClick={() => openConfirmModal(req)}
                        disabled={updating === req.id}
                        className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5" /> Confirm
                      </button>
                      <button
                        onClick={() => openRescheduleModal(req)}
                        disabled={updating === req.id}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-blue-700 hover:bg-blue-50"
                      >
                        <Clock className="h-3.5 w-3.5" /> Reschedule
                      </button>
                      <button
                        onClick={() => openRejectModal(req)}
                        disabled={updating === req.id}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-red-600 hover:bg-red-50"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <span className="text-gray-400 block font-medium">Requested Schedule:</span>
                      <span className="font-semibold text-gray-900 flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3.5 w-3.5 text-primary-600" />
                        {formatDate(req.date)} at {formatTime(req.time)}
                      </span>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <span className="text-gray-400 block font-medium">Preferred Doctor:</span>
                      <span className="font-semibold text-gray-900 flex items-center gap-1 mt-0.5">
                        <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                        Dr. {req.doctorName}
                      </span>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-lg">
                      <span className="text-gray-400 block font-medium">Procedure (Optional):</span>
                      <span className="font-medium text-gray-800 mt-0.5 block">
                        {req.expectedTreatment || 'General Consultation'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-amber-50/50 p-3 rounded-lg text-xs text-gray-700 border border-amber-100">
                    <span className="font-semibold text-amber-900">Patient Note / Chief Complaint:</span>{' '}
                    <span className="italic">"{req.reason}"</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* TODAY'S CLINIC QUEUE SECTION */
        <>
          {/* Active Queue */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">In Queue & Active ({grouped.active.length})</h2>
            {grouped.active.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Queue is empty"
                description="No active patients waiting or in consultation."
              />
            ) : (
              <div className="space-y-3">
                {grouped.active.map(appt => (
                  <div
                    key={appt.id}
                    className="p-4 rounded-xl border border-gray-200 bg-white hover:border-primary-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{appt.patientName}</span>
                        <StatusBadge status={appt.status} />
                        <span className="badge bg-gray-100 text-gray-600">{appt.visitType}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-mono">
                        UHID: {appt.uhid} · {appt.patientPhone}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-600 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          {formatTime(appt.time)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Stethoscope className="h-3.5 w-3.5 text-gray-400" />
                          Dr. {appt.doctorName}
                        </span>
                        {appt.reason && <span>· {appt.reason}</span>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      {STATUS_ACTIONS[appt.status]?.map(action => (
                        <button
                          key={action.next}
                          onClick={() => handleStatusChange(appt, action.next)}
                          disabled={updating === appt.id}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          {updating === appt.id ? <LoadingSpinner size="sm" /> : action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Appointments */}
          {grouped.completed.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                Completed Visits ({grouped.completed.length})
              </h2>
              <div className="space-y-2">
                {grouped.completed.map(appt => (
                  <div
                    key={appt.id}
                    className="p-3 rounded-lg bg-gray-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-gray-900">{appt.patientName}</span>
                      <span className="text-gray-500 ml-2 font-mono">({appt.uhid})</span>
                      <span className="text-gray-400 ml-2">Dr. {appt.doctorName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{formatTime(appt.time)}</span>
                      <StatusBadge status={appt.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cancelled Appointments */}
          {grouped.cancelled.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Cancelled / No-Show ({grouped.cancelled.length})
              </h2>
              <div className="space-y-2">
                {grouped.cancelled.map(appt => (
                  <div
                    key={appt.id}
                    className="p-3 rounded-lg bg-gray-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-gray-700">{appt.patientName}</span>
                      <span className="text-gray-400 ml-2">Dr. {appt.doctorName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">{formatTime(appt.time)}</span>
                      <StatusBadge status={appt.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* CONFIRM MODAL */}
      {confirmModalAppt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Confirm Appointment
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Patient: <strong className="text-gray-800">{confirmModalAppt.patientName}</strong> ({confirmModalAppt.uhid})
            </p>

            <form onSubmit={handleConfirmSubmit} className="space-y-3">
              <div>
                <label className="form-label" htmlFor="confirmDoctor">Assign Doctor</label>
                <select
                  id="confirmDoctor"
                  value={confirmDoctorId}
                  onChange={e => setConfirmDoctorId(e.target.value)}
                  className="form-input text-xs"
                  required
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.specialization || 'Surgeon'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label" htmlFor="confirmDate">Confirmed Date</label>
                  <input
                    id="confirmDate"
                    type="date"
                    value={confirmDate}
                    onChange={e => setConfirmDate(e.target.value)}
                    className="form-input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="confirmTime">Confirmed Time</label>
                  <select
                    id="confirmTime"
                    value={confirmTime}
                    onChange={e => setConfirmTime(e.target.value)}
                    className="form-input text-xs"
                    required
                  >
                    {TIME_SLOTS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="confirmNotes">Confirmation Note (Optional)</label>
                <input
                  id="confirmNotes"
                  type="text"
                  value={confirmNotes}
                  onChange={e => setConfirmNotes(e.target.value)}
                  placeholder="e.g. Please bring previous dental X-rays"
                  className="form-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setConfirmModalAppt(null)}
                  className="btn-secondary flex-1 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating === confirmModalAppt.id}
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex-1 text-xs py-2"
                >
                  {updating === confirmModalAppt.id ? <LoadingSpinner size="sm" /> : 'Confirm & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {rescheduleModalAppt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Reschedule Appointment
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Patient: <strong className="text-gray-800">{rescheduleModalAppt.patientName}</strong>
            </p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label" htmlFor="rescheduleDate">New Date</label>
                  <input
                    id="rescheduleDate"
                    type="date"
                    value={rescheduleDate}
                    onChange={e => setRescheduleDate(e.target.value)}
                    className="form-input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="rescheduleTime">New Time Slot</label>
                  <select
                    id="rescheduleTime"
                    value={rescheduleTime}
                    onChange={e => setRescheduleTime(e.target.value)}
                    className="form-input text-xs"
                    required
                  >
                    {TIME_SLOTS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="rescheduleReason">Reason for Rescheduling</label>
                <input
                  id="rescheduleReason"
                  type="text"
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Doctor in surgery, proposed alternative slot"
                  className="form-input text-xs"
                  required
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setRescheduleModalAppt(null)}
                  className="btn-secondary flex-1 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating === rescheduleModalAppt.id}
                  className="btn-primary bg-blue-600 hover:bg-blue-700 flex-1 text-xs py-2"
                >
                  {updating === rescheduleModalAppt.id ? <LoadingSpinner size="sm" /> : 'Save Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalAppt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Reject Appointment Request
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Patient: <strong className="text-gray-800">{rejectModalAppt.patientName}</strong> ({rejectModalAppt.uhid})
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="form-label" htmlFor="rejectReason">Rejection Reason *</label>
                <textarea
                  id="rejectReason"
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Clinic fully booked on requested date, doctor on leave"
                  className="form-input text-xs"
                  required
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setRejectModalAppt(null)}
                  className="btn-secondary flex-1 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating === rejectModalAppt.id}
                  className="btn-primary bg-red-600 hover:bg-red-700 flex-1 text-xs py-2"
                >
                  {updating === rejectModalAppt.id ? <LoadingSpinner size="sm" /> : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
