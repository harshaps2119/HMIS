import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getPatientAppointments } from '../../services/appointmentService'
import { getPatient, getPatientByUserId } from '../../services/patientService'
import { Appointment, Patient } from '../../types'
import { formatDate, formatTime, isAppointmentPast } from '../../utils/dateUtils'
import { Calendar, Clock, User, Plus } from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import BookAppointmentModal from './BookAppointmentModal'

type TabType = 'upcoming' | 'requested' | 'past' | 'cancelled'

export default function PatientAppointments() {
  const { currentUser, userProfile } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const [isBookingOpen, setIsBookingOpen] = useState(false)

  const loadData = useCallback(async () => {
    const identifier = userProfile?.phone || userProfile?.patientId
    setLoading(true)
    try {
      let p: Patient | null = null
      if (identifier) {
        p = await getPatient(identifier)
      }
      if (!p && currentUser?.uid) {
        p = await getPatientByUserId(currentUser.uid)
      }

      setPatient(p)

      const lookupId = p?.id || identifier || ''
      const contactPhone = p?.phone || userProfile?.phone || ''

      if (lookupId) {
        const appts = await getPatientAppointments(lookupId, contactPhone)
        setAppointments(appts || [])
      } else {
        setAppointments([])
      }
    } catch (err) {
      console.error('Failed to load appointments:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUser, userProfile])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) return <LoadingSpinner className="py-16" />

  const upcomingList = appointments.filter(
    a => (a.status === 'scheduled' || a.status === 'checked-in' || a.status === 'waiting')
  )

  const requestedList = appointments.filter(a => a.status === 'requested')

  const pastList = appointments.filter(
    a => a.status === 'completed' || (isAppointmentPast(a.date) && a.status !== 'cancelled' && a.status !== 'no-show' && a.status !== 'requested')
  )

  const cancelledList = appointments.filter(
    a => a.status === 'cancelled' || a.status === 'no-show'
  )

  const currentList =
    activeTab === 'upcoming' ? upcomingList :
    activeTab === 'requested' ? requestedList :
    activeTab === 'past' ? pastList : cancelledList

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-xs text-gray-500 mt-1">Review scheduled visits and track online appointment requests</p>
        </div>
        <button
          onClick={() => setIsBookingOpen(true)}
          className="btn-primary bg-teal-600 hover:bg-teal-700 text-xs py-2.5 px-4 flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto shadow-sm"
        >
          <Plus className="h-4 w-4" /> Book Appointment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'upcoming'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Upcoming & Active ({upcomingList.length})
        </button>
        <button
          onClick={() => setActiveTab('requested')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'requested'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>Requested Slots</span>
          {requestedList.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {requestedList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'past'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Past Visits ({pastList.length})
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'cancelled'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Cancelled ({cancelledList.length})
        </button>
      </div>

      {currentList.length === 0 ? (
        <div className="card p-12">
          <EmptyState
            icon={Calendar}
            title={`No ${activeTab} appointments`}
            description={
              activeTab === 'requested'
                ? 'You do not have any pending appointment requests. Click "Book Appointment" to request a new slot.'
                : 'When you book or visit the clinic, your appointments will be listed here.'
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map(appt => (
            <div key={appt.id} className="card p-5 hover:border-teal-200 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 text-base">{appt.reason}</span>
                    <StatusBadge status={appt.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1 font-medium text-gray-700">
                      <Calendar className="h-3.5 w-3.5 text-teal-600" /> {formatDate(appt.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-gray-400" /> {formatTime(appt.time)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-gray-400" /> Dr. {appt.doctorName}
                    </span>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="text-gray-400 font-mono">UHID: {appt.uhid}</span>
                </div>
              </div>

              {appt.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">
                  <span className="font-semibold text-gray-700">Notes:</span> {appt.notes}
                </div>
              )}
            </div>
          ))}
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
