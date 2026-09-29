import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  getTodaysAppointments,
  getAppointmentRequests,
  getAllActiveAppointments,
  getAllAppointments,
} from '../../services/appointmentService'
import { getAllConsultations } from '../../services/consultationService'
import { getDoctors } from '../../services/userService'
import { todayISO, formatTime, formatDate } from '../../utils/dateUtils'
import { Appointment, Consultation, UserProfile } from '../../types'
import {
  Calendar, Users, Clock, CheckCircle, Plus,
  Search, ClipboardList, TrendingUp, ArrowRight, Bell, Activity,
  Stethoscope, Filter, FileText, Check, ShieldCheck, UserCheck, XCircle, ChevronRight
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import StatusBadge from '../../components/ui/StatusBadge'
import { format } from 'date-fns'
import { CLINIC_CONFIG } from '../../utils/constants'

export default function ReceptionDashboard() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const isAdmin = userProfile?.role === 'admin'

  const [allAppointments, setAllAppointments] = useState<Appointment[]>([])
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [activeQueue, setActiveQueue] = useState<Appointment[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [doctors, setDoctors] = useState<UserProfile[]>([])
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filter Tabs: 'all' | 'today' | 'active' | 'completed' | 'consultations'
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'active' | 'completed' | 'consultations'>('all')

  // Search & Filtering controls
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('all')
  const [selectedDateFilter, setSelectedDateFilter] = useState('')

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
      setPendingRequestsCount(reqs?.length || 0)
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
      label: 'Total Appointments',
      value: allAppointments.length,
      icon: Calendar,
      color: 'bg-purple-600',
      bg: 'bg-purple-50',
      sub: 'All historical records',
      tabKey: 'all',
    },
    {
      label: "Today's Schedule",
      value: todayAppointments.length,
      icon: Clock,
      color: 'bg-blue-600',
      bg: 'bg-blue-50',
      sub: `${todayAppointments.filter(a => a.status === 'completed').length} completed today`,
      tabKey: 'today',
    },
    {
      label: 'Active Clinic Queue',
      value: activeQueue.length,
      icon: Activity,
      color: 'bg-teal-600',
      bg: 'bg-teal-50',
      sub: 'Waiting or scheduled',
      tabKey: 'active',
    },
    {
      label: 'Completed History',
      value: completedCount,
      icon: CheckCircle,
      color: 'bg-emerald-600',
      bg: 'bg-emerald-50',
      sub: `${consultations.length} clinical sheets filed`,
      tabKey: 'completed',
    },
  ]

  const quickActions = [
    { label: 'Register Patient', icon: Plus, action: () => navigate('/reception/patients/register'), color: 'btn-primary' },
    { label: 'Patient Directory', icon: Search, action: () => navigate('/reception/patients'), color: 'btn-secondary' },
    { label: 'Schedule Appointment', icon: Calendar, action: () => navigate('/reception/appointments/new'), color: 'btn-secondary' },
    {
      label: `Online Requests (${pendingRequestsCount})`,
      icon: Clock,
      action: () => navigate('/reception/appointments?tab=requests'),
      color: pendingRequestsCount > 0 ? 'btn-primary bg-amber-600 hover:bg-amber-700' : 'btn-secondary',
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

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}