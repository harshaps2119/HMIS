import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  getTodaysAppointments,
  getAppointmentRequests,
  getAllActiveAppointments,
  getAllAppointments,
  rescheduleAppointment,
  confirmAppointmentRequest,
  rejectAppointmentRequest,
} from '../../services/appointmentService'
import { getAllConsultations } from '../../services/consultationService'
import { getDoctors } from '../../services/userService'
import { todayISO, formatTime, formatDate } from '../../utils/dateUtils'
import { Appointment, Consultation, UserProfile } from '../../types'
import {
  Calendar, Users, Clock, CheckCircle, Plus,
  Search, ClipboardList, TrendingUp, ArrowRight, Bell, Activity,
  Stethoscope, Filter, FileText, Check, ShieldCheck, UserCheck, XCircle, ChevronRight, X
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { CLINIC_CONFIG } from '../../utils/constants'

const TIME_SLOTS = [
  '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
  '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
]

export default function ReceptionDashboard() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const isAdmin = userProfile?.role === 'admin'

  const [allAppointments, setAllAppointments] = useState<Appointment[]>([])
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [activeQueue, setActiveQueue] = useState<Appointment[]>([])
  const [requests, setRequests] = useState<Appointment[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [doctors, setDoctors] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  // Filter Tabs: 'all' | 'today' | 'active' | 'online' | 'completed' | 'consultations'
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'active' | 'online' | 'completed' | 'consultations'>('all')

  // Search & Filtering controls
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('all')
  const [selectedDateFilter, setSelectedDateFilter] = useState('')

  // Reschedule Modal State
  const [rescheduleModalAppt, setRescheduleModalAppt] = useState<Appointment | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [allAppts, todayAppts, allActive, reqs, consults, docList] = await Promise.all([
        getAllAppointments(150),
        getTodaysAppointments(todayISO()),
        getAllActiveAppointments(),
        getAppointmentRequests(),
        getAllConsultations(60),
        getDoctors(),
      ])

      setAllAppointments(allAppts || [])
      setTodayAppointments(todayAppts || [])
      setActiveQueue(allActive || [])
      setRequests(reqs || [])
      setConsultations(consults || [])
      setDoctors(docList || [])
    } catch (err) {
      console.error('Failed to load dashboard records:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Reschedule and request handlers
  const handleOpenReschedule = (appt: Appointment) => {
    setRescheduleModalAppt(appt)
    setRescheduleDate(appt.date || todayISO())
    setRescheduleTime(appt.time || '10:00')
    setRescheduleReason('')
  }

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rescheduleModalAppt) return

    setRescheduling(true)
    try {
      await rescheduleAppointment(
        rescheduleModalAppt.id,
        rescheduleDate,
        rescheduleTime,
        rescheduleReason.trim() || undefined
      )
      toast.success(`Appointment rescheduled to ${formatDate(rescheduleDate)} at ${formatTime(rescheduleTime)}!`)
      setRescheduleModalAppt(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to reschedule appointment')
    } finally {
      setRescheduling(false)
    }
  }

  const handleConfirmRequest = async (appt: Appointment) => {
    setActionLoadingId(appt.id)
    try {
      await confirmAppointmentRequest(appt.id)
      toast.success(`Appointment for ${appt.patientName} confirmed!`)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm appointment')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRejectRequest = async (appt: Appointment) => {
    const reason = window.prompt(`Enter rejection reason for ${appt.patientName}'s request:`, 'Doctor schedule unavailable')
    if (!reason || !reason.trim()) return

    setActionLoadingId(appt.id)
    try {
      await rejectAppointmentRequest(appt.id, reason.trim())
      toast.success('Appointment request rejected')
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject appointment')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Counts
  const completedCount = useMemo(
    () => allAppointments.filter(a => a.status === 'completed').length,
    [allAppointments]
  )
  const cancelledCount = useMemo(
    () => allAppointments.filter(a => ['cancelled', 'no-show'].includes(a.status)).length,
    [allAppointments]
  )

  // Filter appointments list based on tab, doctor, date, and search term
  const filteredAppointments = useMemo(() => {
    let list: Appointment[] = []

    if (activeTab === 'today') {
      list = todayAppointments
    } else if (activeTab === 'active') {
      list = activeQueue
    } else if (activeTab === 'online') {
      list = requests
    } else if (activeTab === 'completed') {
      list = allAppointments.filter(a => a.status === 'completed')
    } else {
      // 'all'
      list = allAppointments
    }

    // Apply Doctor Filter
    if (selectedDoctorFilter !== 'all') {
      list = list.filter(a => a.doctorId === selectedDoctorFilter)
    }

    // Apply Date Filter
    if (selectedDateFilter) {
      list = list.filter(a => a.date === selectedDateFilter)
    }

    // Apply Search Term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      list = list.filter(
        a =>
          a.patientName.toLowerCase().includes(q) ||
          (a.patientPhone && a.patientPhone.includes(q)) ||
          (a.uhid && a.uhid.toLowerCase().includes(q)) ||
          (a.doctorName && a.doctorName.toLowerCase().includes(q)) ||
          (a.reason && a.reason.toLowerCase().includes(q)) ||
          (a.expectedTreatment && a.expectedTreatment.toLowerCase().includes(q))
      )
    }

    return list
  }, [allAppointments, todayAppointments, activeQueue, activeTab, selectedDoctorFilter, selectedDateFilter, searchTerm])

  // Filter consultations
  const filteredConsultations = useMemo(() => {
    let list = consultations
    if (selectedDoctorFilter !== 'all') {
      list = list.filter(c => c.doctorId === selectedDoctorFilter)
    }
    if (selectedDateFilter) {
      list = list.filter(c => c.date === selectedDateFilter)
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      list = list.filter(
        c =>
          c.patientName.toLowerCase().includes(q) ||
          c.doctorName.toLowerCase().includes(q) ||
          c.chiefComplaint.toLowerCase().includes(q) ||
          (c.treatmentPerformed && c.treatmentPerformed.toLowerCase().includes(q))
      )
    }
    return list
  }, [consultations, selectedDoctorFilter, selectedDateFilter, searchTerm])

  const stats = [
    {
      label: 'All Appointments',
      value: allAppointments.length,
      icon: Calendar,
      color: 'bg-purple-600',
      bg: 'bg-purple-50',
      sub: 'All historical records',
      tabKey: 'all' as const,
    },
    {
      label: 'Online Requests',
      value: requests.length,
      icon: Clock,
      color: 'bg-amber-600',
      bg: 'bg-amber-50',
      sub: requests.length > 0 ? `${requests.length} awaiting clinic review` : 'No pending requests',
      tabKey: 'online' as const,
    },
    {
      label: "Today's Schedule",
      value: todayAppointments.length,
      icon: Calendar,
      color: 'bg-blue-600',
      bg: 'bg-blue-50',
      sub: `${todayAppointments.filter(a => a.status === 'completed').length} completed today`,
      tabKey: 'today' as const,
    },
    {
      label: 'Active Clinic Queue',
      value: activeQueue.length,
      icon: Activity,
      color: 'bg-teal-600',
      bg: 'bg-teal-50',
      sub: 'Waiting or scheduled',
      tabKey: 'active' as const,
    },
  ]

  const quickActions = [
    { label: 'Register Patient', icon: Plus, action: () => navigate('/reception/patients/register'), color: 'btn-primary' },
    { label: 'Patient Directory', icon: Search, action: () => navigate('/reception/patients'), color: 'btn-secondary' },
    { label: 'Schedule Appointment', icon: Calendar, action: () => navigate('/reception/appointments/new'), color: 'btn-secondary' },
    {
      label: `Online Requests (${requests.length})`,
      icon: Clock,
      action: () => setActiveTab('online'),
      color: requests.length > 0 ? 'btn-primary bg-amber-600 hover:bg-amber-700' : 'btn-secondary',
    },
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
              {isAdmin && (
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  Administrator Dashboard
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},
              {' '}{userProfile?.name || (isAdmin ? 'Clinic Administrator' : 'Receptionist')} 👋
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {format(new Date(), 'EEEE, dd MMMM yyyy')} · Clinic Operations & Full Historical Overview
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => navigate('/admin/staff')}
              className="btn-secondary text-xs"
            >
              <Users className="h-3.5 w-3.5" /> Staff Management
            </button>
          )}
          <button onClick={loadData} className="btn-secondary text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Refresh Data
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <LoadingSpinner className="py-8" />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color, bg, sub, tabKey }) => (
            <div
              key={label}
              onClick={() => setActiveTab(tabKey as any)}
              className="card p-5 cursor-pointer hover:border-teal-300 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <div className={`${bg} p-2 rounded-lg`}>
                  <Icon className={`h-4 w-4 ${color.replace('bg-', 'text-')}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Quick Reception & Administrative Actions</h2>
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

      {/* Main Clinic Appointments & Historical Records Center */}
      <div className="card p-6 space-y-5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-600" />
              Clinic Appointments & History Records
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Comprehensive historical log of all patient bookings, clinical queues, and completed visits
            </p>
          </div>

          <button
            onClick={() => navigate('/reception/appointments')}
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 self-start sm:self-auto"
          >
            Open Appointment Queue Manager <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>All Appointments History</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800'}`}>
              {allAppointments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('online')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'online'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Online Requests</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'online' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
              {requests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'today'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Today's Visits</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'today' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800'}`}>
              {todayAppointments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Active In Queue</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800'}`}>
              {activeQueue.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Completed</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'completed' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800'}`}>
              {completedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('consultations')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'consultations'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Clinical Treatments History</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'consultations' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800'}`}>
              {consultations.length}
            </span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-200">
          <div className="relative flex-1 max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by patient name, mobile, doctor, or treatment..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Doctor Filter */}
            {doctors.length > 0 && (
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs">
                <Stethoscope className="h-3.5 w-3.5 text-gray-500" />
                <select
                  value={selectedDoctorFilter}
                  onChange={e => setSelectedDoctorFilter(e.target.value)}
                  className="bg-transparent text-xs text-gray-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="all">All Attending Doctors</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Filter */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs">
              <Filter className="h-3.5 w-3.5 text-gray-500" />
              <input
                type="date"
                value={selectedDateFilter}
                onChange={e => setSelectedDateFilter(e.target.value)}
                className="bg-transparent text-xs text-gray-700 font-medium focus:outline-none cursor-pointer"
              />
              {selectedDateFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter('')}
                  className="text-xs text-gray-400 hover:text-gray-600 ml-1"
                  title="Clear date filter"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Section: Appointments Table or Clinical Consultations */}
        {activeTab === 'consultations' ? (
          /* Clinical Treatments / Consultations History View */
          <div>
            {filteredConsultations.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-600">No clinical consultations found.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Completed doctor consultation records and treatments will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredConsultations.map(consult => (
                  <div
                    key={consult.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/70 px-3 rounded-xl transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm shrink-0">
                        {consult.patientName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            onClick={() => navigate(`/reception/patients/${consult.patientRecordId || consult.patientId}`)}
                            className="font-bold text-gray-900 text-sm hover:text-indigo-600 cursor-pointer"
                          >
                            {consult.patientName}
                          </span>
                          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            Dr. {consult.doctorName}
                          </span>
                          <span className="text-[11px] font-mono text-gray-500">
                            {formatDate(consult.date)} at {formatTime(consult.time)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          <strong className="text-gray-700 font-semibold">Chief Complaint:</strong> {consult.chiefComplaint}
                          {consult.treatmentPerformed && (
                            <span className="text-teal-800 font-medium ml-2">
                              · Treatment: {consult.treatmentPerformed}
                            </span>
                          )}
                        </p>
                        {consult.diagnoses && consult.diagnoses.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {consult.diagnoses.map(d => (
                              <span key={d} className="px-1.5 py-0.2 rounded text-[10px] bg-gray-100 text-gray-700 border border-gray-200">
                                {d}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => navigate(`/reception/patients/${consult.patientRecordId || consult.patientId}`)}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-gray-700 hover:bg-gray-100"
                      >
                        Patient Record <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Appointments List View */
          <div>
            {filteredAppointments.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-600">No appointments found matching this criteria.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Try switching tabs or clearing your search / date filter.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredAppointments.map(appt => (
                  <div
                    key={appt.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/80 px-3 rounded-xl transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                        {appt.patientName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            onClick={() => navigate(`/reception/patients/${encodeURIComponent(appt.patientRecordId || appt.id)}`)}
                            className="font-bold text-gray-900 text-sm hover:text-teal-700 cursor-pointer"
                          >
                            {appt.patientName}
                          </span>
                          <StatusBadge status={appt.status} />
                          <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {formatDate(appt.date)} · {formatTime(appt.time)}
                          </span>
                          <span className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
                            <Stethoscope className="h-3 w-3 text-teal-600" /> Dr. {appt.doctorName}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          <strong className="text-gray-700 font-semibold">Reason:</strong> {appt.reason || 'General consultation'}
                          {appt.expectedTreatment && (
                            <span className="text-teal-700 font-medium ml-2 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                              Procedure: {appt.expectedTreatment} {appt.expectedTreatmentPrice ? `(${appt.expectedTreatmentPrice})` : ''}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                          ID: {appt.patientId || appt.patientRecordId} · Mobile: {appt.patientPhone || appt.uhid}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
                      {appt.status === 'requested' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleConfirmRequest(appt)}
                            disabled={actionLoadingId === appt.id}
                            className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-1.5 px-3 flex items-center gap-1 font-semibold"
                          >
                            <Check className="h-3.5 w-3.5" /> Confirm Slot
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReschedule(appt)}
                            disabled={actionLoadingId === appt.id}
                            className="btn-primary bg-amber-600 hover:bg-amber-700 text-xs py-1.5 px-3 flex items-center gap-1 font-semibold"
                          >
                            <Clock className="h-3.5 w-3.5" /> Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(appt)}
                            disabled={actionLoadingId === appt.id}
                            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-red-600 hover:bg-red-50 border-red-200"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </>
                      ) : (
                        <>
                          {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleOpenReschedule(appt)}
                              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-amber-800 hover:bg-amber-50 border-amber-200"
                              title="Reschedule appointment slot"
                            >
                              <Clock className="h-3.5 w-3.5 text-amber-600" /> Reschedule
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/reception/patients/${encodeURIComponent(appt.patientRecordId || appt.id)}`)}
                            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-gray-700 hover:bg-gray-100"
                            title="View complete clinical and dental history"
                          >
                            <Users className="h-3.5 w-3.5 text-gray-400" /> Patient History
                          </button>
                          <button
                            onClick={() => navigate('/reception/appointments')}
                            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-teal-700 hover:bg-teal-50 border-teal-200"
                            title="Manage patient status in queue"
                          >
                            Queue <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {rescheduleModalAppt && (
        <Modal
          isOpen={true}
          onClose={() => setRescheduleModalAppt(null)}
          title="Reschedule Appointment Slot"
          size="md"
        >
          <form onSubmit={handleRescheduleSubmit} className="space-y-4">
            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold text-sm text-gray-900">{rescheduleModalAppt.patientName}</p>
              <p>Attending Doctor: <strong className="text-gray-800">Dr. {rescheduleModalAppt.doctorName}</strong></p>
              <p>Current Slot: <strong className="font-mono text-gray-800">{formatDate(rescheduleModalAppt.date)} at {formatTime(rescheduleModalAppt.time)}</strong></p>
              <p>Reason: <span className="italic">{rescheduleModalAppt.reason}</span></p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">New Appointment Date</label>
              <input
                type="date"
                required
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
                className="form-input text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">New Time Slot</label>
              <select
                value={rescheduleTime}
                onChange={e => setRescheduleTime(e.target.value)}
                className="form-input text-xs"
              >
                {TIME_SLOTS.map(t => (
                  <option key={t} value={t}>{formatTime(t)} ({t})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Reschedule Note (Optional)</label>
              <input
                type="text"
                value={rescheduleReason}
                onChange={e => setRescheduleReason(e.target.value)}
                placeholder="e.g. Previous slot unavailable, shifted by clinic"
                className="form-input text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRescheduleModalAppt(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rescheduling}
                className="btn-primary bg-amber-600 hover:bg-amber-700 text-xs font-bold flex items-center gap-1.5"
              >
                {rescheduling ? <LoadingSpinner size="sm" /> : <><Check className="h-3.5 w-3.5" /> Save Reschedule</>}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}