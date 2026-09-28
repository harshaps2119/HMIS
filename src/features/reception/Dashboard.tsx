import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getTodaysAppointments, getAppointmentRequests, getAllActiveAppointments } from '../../services/appointmentService'
import { getRecentPatients } from '../../services/patientService'
import { todayISO, formatTime, formatDate } from '../../utils/dateUtils'
import { Appointment } from '../../types'
import {
  Calendar, Users, Clock, CheckCircle, Plus,
  Search, ClipboardList, TrendingUp, ArrowRight, Bell, Activity
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import StatusBadge from '../../components/ui/StatusBadge'
import { format } from 'date-fns'
import { CLINIC_CONFIG } from '../../utils/constants'

export default function ReceptionDashboard() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [activeQueue, setActiveQueue] = useState<Appointment[]>([])
  const [viewMode, setViewMode] = useState<'today' | 'active'>('today')
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [appts, reqs, allActive] = await Promise.all([
          getTodaysAppointments(todayISO()),
          getAppointmentRequests(),
          getAllActiveAppointments(),
        ])
        setAppointments(appts || [])
        setActiveQueue(allActive || [])
        setPendingRequestsCount(reqs?.length || 0)
        // If today has zero but active queue has patients, default to active view
        if ((!appts || appts.length === 0) && allActive && allActive.length > 0) {
          setViewMode('active')
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const displayedList = viewMode === 'today' ? appointments : activeQueue
  const waiting = displayedList.filter(a => a.status === 'waiting' || a.status === 'checked-in').length
  const completed = displayedList.filter(a => a.status === 'completed').length

  const stats = [
    { label: "Today's Visits", value: appointments.length, icon: Calendar, color: 'bg-blue-500', bg: 'bg-blue-50' },
    { label: 'Active In Queue', value: activeQueue.length, icon: Activity, color: 'bg-teal-500', bg: 'bg-teal-50' },
    { label: 'Waiting / Checked-in', value: waiting, icon: Clock, color: 'bg-yellow-500', bg: 'bg-yellow-50' },
    { label: 'Pending Requests', value: pendingRequestsCount, icon: Bell, color: 'bg-amber-500', bg: 'bg-amber-50' },
  ]

  const quickActions = [
    { label: 'Register Patient', icon: Plus, action: () => navigate('/reception/patients/register'), color: 'btn-primary' },
    { label: 'Search Patient', icon: Search, action: () => navigate('/reception/patients'), color: 'btn-secondary' },
    { label: 'Create Appointment', icon: Calendar, action: () => navigate('/reception/appointments/new'), color: 'btn-secondary' },
    { label: `Requests (${pendingRequestsCount})`, icon: Clock, action: () => navigate('/reception/appointments?tab=requests'), color: pendingRequestsCount > 0 ? 'btn-primary bg-amber-600 hover:bg-amber-700' : 'btn-secondary' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
            <img src={CLINIC_CONFIG.logo} alt={CLINIC_CONFIG.name} className="w-full h-full object-contain rounded-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                {CLINIC_CONFIG.name}
              </span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500 font-medium">
                {CLINIC_CONFIG.doctor.name} ({CLINIC_CONFIG.doctor.qualifications})
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},
              {' '}{userProfile?.name?.split(' ')[0] || 'Receptionist'} 👋
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <LoadingSpinner className="py-8" />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{label}</p>
                <div className={`${bg} p-2 rounded-lg`}>
                  <Icon className={`h-5 w-5 ${color.replace('bg-', 'text-')}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map(({ label, icon: Icon, action, color }) => (
            <button
              key={label}
              onClick={action}
              className={`${color} flex-col h-20 gap-2 text-xs`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Today's appointments */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">
              {viewMode === 'today' ? "Today's Clinic Appointments" : "Active Patient Queue"}
            </h2>
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs font-semibold ml-2">
              <button
                type="button"
                onClick={() => setViewMode('today')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'today' ? 'bg-white text-teal-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Today ({appointments.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('active')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'active' ? 'bg-white text-teal-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Active ({activeQueue.length})
              </button>
            </div>
          </div>
          <button
            onClick={() => navigate('/reception/appointments')}
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 self-start sm:self-auto"
          >
            Manage Queue <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {displayedList.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-400">
              {viewMode === 'today'
                ? "No appointments scheduled for today."
                : "No active patients in clinic queue."}
            </p>
            {viewMode === 'today' && activeQueue.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode('active')}
                className="mt-2 text-xs font-bold text-teal-700 underline hover:text-teal-900"
              >
                View {activeQueue.length} Active Queue Patient(s) →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedList.slice(0, 8).map(appt => (
              <div
                key={appt.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-colors"
                onClick={() => navigate(`/reception/patients/${encodeURIComponent(appt.patientRecordId || appt.id)}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary-700">
                      {appt.patientName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appt.patientName}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(appt.date)} at {formatTime(appt.time)} · Dr. {appt.doctorName}
                    </p>
                  </div>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}