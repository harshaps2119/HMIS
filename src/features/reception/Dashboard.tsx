import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getTodaysAppointments, getAppointmentRequests } from '../../services/appointmentService'
import { getRecentPatients } from '../../services/patientService'
import { todayISO, formatTime } from '../../utils/dateUtils'
import { Appointment } from '../../types'
import {
  Calendar, Users, Clock, CheckCircle, Plus,
  Search, ClipboardList, TrendingUp, ArrowRight, Bell
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import StatusBadge from '../../components/ui/StatusBadge'
import { format } from 'date-fns'
import { CLINIC_CONFIG } from '../../utils/constants'

export default function ReceptionDashboard() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [appts, reqs] = await Promise.all([
          getTodaysAppointments(todayISO()),
          getAppointmentRequests(),
        ])
        setAppointments(appts || [])
        setPendingRequestsCount(reqs?.length || 0)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const waiting = appointments.filter(a => a.status === 'waiting' || a.status === 'checked-in').length
  const completed = appointments.filter(a => a.status === 'completed').length
  const newPatients = appointments.filter(a => a.visitType === 'new-consultation').length

  const stats = [
    { label: "Today's Appointments", value: appointments.length, icon: Calendar, color: 'bg-blue-500', bg: 'bg-blue-50' },
    { label: 'Waiting', value: waiting, icon: Clock, color: 'bg-yellow-500', bg: 'bg-yellow-50' },
    { label: 'Completed', value: completed, icon: CheckCircle, color: 'bg-green-500', bg: 'bg-green-50' },
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Today's Appointments</h2>
          <button
            onClick={() => navigate('/reception/appointments')}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            View All <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        {appointments.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No appointments scheduled for today.</p>
        ) : (
          <div className="space-y-3">
            {appointments.slice(0, 6).map(appt => (
              <div
                key={appt.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/reception/patients/${encodeURIComponent(appt.patientRecordId)}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-700">
                      {appt.patientName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{appt.patientName}</p>
                    <p className="text-xs text-gray-500">{formatTime(appt.time)} · {appt.reason}</p>
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