import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import {
  getTodaysAppointmentsByDoctor,
  getActiveAppointmentsByDoctor,
  getAppointmentsByDate,
  getAllActiveAppointments,
  updateAppointmentStatus,
} from '../../services/appointmentService'
import { searchPatients } from '../../services/patientService'
import { getDoctors } from '../../services/userService'
import { Appointment, Patient, UserProfile, AppointmentStatus } from '../../types'
import { todayISO, formatTime, formatDate } from '../../utils/dateUtils'
import {
  Calendar, Clock, CheckCircle, Search, FileEdit, ArrowRight,
  User, RefreshCw, UserCheck, Stethoscope, ChevronRight,
  Activity, X, Sparkles, Filter
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import StatusBadge from '../../components/ui/StatusBadge'
import SearchInput from '../../components/ui/SearchInput'
import EmptyState from '../../components/ui/EmptyState'
import { format } from 'date-fns'
import { CLINIC_CONFIG } from '../../utils/constants'

export default function DoctorDashboard() {
  const { userProfile, currentUser } = useAuth()
  const navigate = useNavigate()
  const isAdmin = userProfile?.role === 'admin'

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [activeQueueCount, setActiveQueueCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Doctor Selector for Admin mode
  const [doctors, setDoctors] = useState<UserProfile[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')

  // View Filter: 'active-queue' | 'today' | 'date'
  const [scheduleFilter, setScheduleFilter] = useState<'today' | 'active-queue' | 'date'>('active-queue')
  const [selectedDate, setSelectedDate] = useState<string>(todayISO())

  // Patient Quick Search
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Check & Analyze Appointment Modal
  const [selectedApptForAnalysis, setSelectedApptForAnalysis] = useState<Appointment | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Initialize doctors list (for admin) and effective doctor ID
  useEffect(() => {
    getDoctors()
      .then(docList => {
        setDoctors(docList)
        if (isAdmin) {
          // Default to first active doctor or Dr. Hemanth Kumar
          const preferred = docList.find(d => d.email?.includes('hemanth') || d.name?.includes('Hemanth')) || docList[0]
          if (preferred) setSelectedDoctorId(preferred.id)
        } else if (currentUser?.uid) {
          setSelectedDoctorId(currentUser.uid)
        }
      })
      .catch(console.error)
  }, [isAdmin, currentUser])

  const loadData = useCallback(async () => {
    const docId = selectedDoctorId || currentUser?.uid
    if (!docId) return
    setLoading(true)

    try {
      // 1. Always fetch active queue count for doctor to alert about upcoming/pending visits
      const activeList = await getActiveAppointmentsByDoctor(docId)
      setActiveQueueCount(activeList.length)

      // 2. Fetch specific view based on scheduleFilter
      let appts: Appointment[] = []
      if (scheduleFilter === 'active-queue') {
        appts = activeList
      } else if (scheduleFilter === 'date') {
        const list = await getAppointmentsByDate(selectedDate)
        appts = list.filter(a => a.doctorId === docId)
      } else {
        // Today
        appts = await getTodaysAppointmentsByDoctor(docId, todayISO())
        // If today has zero, but there are active appointments on other dates, auto-fallback gracefully
        if (appts.length === 0 && activeList.length > 0) {
          appts = activeList
        }
      }

      setAppointments(appts)
    } catch (err) {
      console.error('DoctorDashboard load error:', err)
      toast.error('Failed to load appointments.')
    } finally {
      setLoading(false)
    }
  }, [selectedDoctorId, currentUser, scheduleFilter, selectedDate])

  useEffect(() => {
    if (selectedDoctorId || currentUser?.uid) {
      loadData()
    }
  }, [loadData, selectedDoctorId, currentUser])

  const handleSearch = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    try {
      const pts = await searchPatients(term)
      setSearchResults(pts)
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
    }
  }

  const handleStatusChangeInModal = async (newStatus: AppointmentStatus) => {
    if (!selectedApptForAnalysis) return
    setUpdatingStatus(true)
    try {
      await updateAppointmentStatus(selectedApptForAnalysis.id, newStatus)
      toast.success(`Status updated to ${newStatus}`)
      setSelectedApptForAnalysis(prev => prev ? { ...prev, status: newStatus } : null)
      await loadData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleStartConsultation = async (appt: Appointment) => {
    if (appt.status !== 'in-consultation' && appt.status !== 'completed') {
      await updateAppointmentStatus(appt.id, 'in-consultation')
    }
    setSelectedApptForAnalysis(null)
    navigate(
      `/doctor/consultations/new/${appt.id}?patientRecordId=${encodeURIComponent(
        appt.patientRecordId || ''
      )}&patientName=${encodeURIComponent(
        appt.patientName
      )}&patientPhone=${encodeURIComponent(appt.patientPhone || appt.uhid)}`
    )
  }

  const currentDoctorObj = doctors.find(d => d.id === selectedDoctorId) || {
    name: userProfile?.name || 'Dr. Hemanth Kumar',
    specialization: userProfile?.specialization || 'BDS, MDS – Orthodontics',
  }

  const waitingCount = appointments.filter(a => a.status === 'waiting' || a.status === 'checked-in').length
  const inConsultCount = appointments.filter(a => a.status === 'in-consultation').length
  const completedCount = appointments.filter(a => a.status === 'completed').length

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
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Admin Supervisor View
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {currentDoctorObj.name} 🩺
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {format(new Date(), 'EEEE, dd MMMM yyyy')} · {currentDoctorObj.specialization || 'BDS, MDS – Orthodontics'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Doctor Switcher for Admin */}
          {isAdmin && doctors.length > 0 && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs">
              <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
              <span className="text-gray-500 font-medium">Doctor:</span>
              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value)}
                className="bg-transparent font-semibold text-gray-900 focus:outline-none cursor-pointer"
              >
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button onClick={loadData} className="btn-secondary text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="btn-primary text-xs"
          >
            <Search className="h-3.5 w-3.5" /> Patient Lookup
          </button>
        </div>
      </div>

      {/* Global Patient Search Panel */}
      {searchOpen && (
        <div className="card p-6 border-teal-200 bg-teal-50/30">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-teal-900">Quick Patient Record Lookup</h2>
            <button onClick={() => setSearchOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
          </div>
          <SearchInput
            placeholder="Search patient by Patient ID (PDC-...), mobile, name, or email..."
            onSearch={handleSearch}
          />
          {searching && <LoadingSpinner className="py-4" size="sm" />}
          {searchResults.length > 0 && (
            <div className="mt-3 divide-y divide-gray-100 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              {searchResults.map(p => (
                <div
                  key={p.id || p.uhid}
                  onClick={() => navigate(`/doctor/patients/${p.id}`)}
                  className="p-3 hover:bg-teal-50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      ID: <span className="font-mono font-bold text-teal-800">{p.patientId || p.uhid}</span> · Mobile: {p.phone}{p.age ? ` · ${p.age} yrs` : ''}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">
              {scheduleFilter === 'active-queue' ? 'Active Queue' : scheduleFilter === 'date' ? 'Date Appointments' : "Today's Assigned"}
            </p>
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{appointments.length}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Waiting</p>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-amber-600">{waitingCount}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">In Consultation</p>
            <UserCheck className="h-5 w-5 text-teal-500" />
          </div>
          <p className="text-3xl font-bold text-teal-600">{inConsultCount}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Completed</p>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">{completedCount}</p>
        </div>
      </div>

      {/* Schedule Tabs & Filters */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-teal-600" />
            <h2 className="text-base font-bold text-gray-900">Doctor's Consultation Schedule</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setScheduleFilter('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                scheduleFilter === 'today'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Today
            </button>
            <button
              type="button"
              onClick={() => setScheduleFilter('active-queue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                scheduleFilter === 'active-queue'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              All Active Queue
              {activeQueueCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${scheduleFilter === 'active-queue' ? 'bg-white text-teal-700' : 'bg-teal-100 text-teal-800'}`}>
                  {activeQueueCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-lg">
              <Filter className="h-3.5 w-3.5 text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => {
                  setSelectedDate(e.target.value)
                  setScheduleFilter('date')
                }}
                className="bg-transparent text-xs text-gray-700 font-medium focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Helpful Banner if Today is empty but Active Queue has booked appointments */}
        {scheduleFilter === 'today' && appointments.length === 0 && activeQueueCount > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                No visits scheduled for today ({formatDate(todayISO())}), but you have <strong>{activeQueueCount} active patient appointment(s)</strong> in your queue.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setScheduleFilter('active-queue')}
              className="text-xs font-bold text-amber-900 underline hover:text-amber-700 shrink-0 ml-2"
            >
              View Active Queue →
            </button>
          </div>
        )}

        {/* Scheduled Patients List */}
        {loading ? (
          <LoadingSpinner className="py-12" />
        ) : appointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={scheduleFilter === 'today' ? "No appointments assigned for today" : "No appointments found"}
            description={
              scheduleFilter === 'today'
                ? "Patients booked for you today will appear here. Switch to 'All Active Queue' to view upcoming visits."
                : "No matching appointments found for the selected filter."
            }
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {appointments.map(appt => {
              const targetRecordId = appt.patientRecordId || appt.id
              return (
                <div
                  key={appt.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/80 px-3 rounded-xl transition-all border border-transparent hover:border-gray-200 cursor-pointer"
                  onClick={() => setSelectedApptForAnalysis(appt)}
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                      {appt.patientName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm hover:text-teal-700">
                          {appt.patientName}
                        </span>
                        <StatusBadge status={appt.status} />
                        <span className="text-[11px] font-mono font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {appt.date} · {formatTime(appt.time)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        <strong className="text-gray-700 font-semibold">Chief Complaint:</strong> {appt.reason || 'Routine consultation'}
                        {appt.expectedTreatment && (
                          <span className="text-teal-700 font-medium ml-2 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                            Procedure: {appt.expectedTreatment}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                        Phone: {appt.patientPhone || appt.uhid} · ID: {appt.patientId || appt.patientRecordId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setSelectedApptForAnalysis(appt)}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-gray-700 hover:bg-gray-100"
                      title="Click to check and analyze patient case"
                    >
                      <Search className="h-3.5 w-3.5 text-gray-500" /> Check & Analyze
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartConsultation(appt)}
                      className="btn-primary text-xs py-1.5 px-3 bg-teal-600 hover:bg-teal-700 flex items-center gap-1.5 shadow-xs"
                    >
                      <FileEdit className="h-3.5 w-3.5" /> Open Consultation
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Check & Analyze Appointment Modal */}
      {selectedApptForAnalysis && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-teal-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-lg">
                  {selectedApptForAnalysis.patientName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold">{selectedApptForAnalysis.patientName}</h3>
                  <p className="text-xs text-teal-100 font-mono">
                    ID: {selectedApptForAnalysis.patientId || selectedApptForAnalysis.patientRecordId} · {selectedApptForAnalysis.patientPhone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApptForAnalysis(null)}
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Clinical Analysis & Case Presentation */}
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                <div>
                  <span className="text-gray-500 block text-[11px]">Appointment Date & Time</span>
                  <span className="font-semibold text-gray-900 text-xs">
                    {formatDate(selectedApptForAnalysis.date)} at {formatTime(selectedApptForAnalysis.time)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Current Status</span>
                  <div className="mt-0.5">
                    <StatusBadge status={selectedApptForAnalysis.status} />
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Attending Doctor</span>
                  <span className="font-semibold text-gray-900 text-xs">{selectedApptForAnalysis.doctorName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Visit Type</span>
                  <span className="font-semibold text-gray-900 text-xs uppercase">{selectedApptForAnalysis.visitType || 'Standard'}</span>
                </div>
              </div>

              {/* Case Symptoms & Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-gray-900 block text-xs">Chief Complaint / Visit Reason:</label>
                <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200 text-teal-950 font-medium text-xs leading-relaxed">
                  {selectedApptForAnalysis.reason || 'General dental consultation & checkup.'}
                </div>
              </div>

              {selectedApptForAnalysis.expectedTreatment && (
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-900 block text-xs">Expected Procedure / Treatment:</label>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-medium text-xs flex justify-between items-center">
                    <span>{selectedApptForAnalysis.expectedTreatment}</span>
                    {selectedApptForAnalysis.expectedTreatmentPrice && (
                      <span className="font-bold font-mono text-blue-950">{selectedApptForAnalysis.expectedTreatmentPrice}</span>
                    )}
                  </div>
                </div>
              )}

              {selectedApptForAnalysis.notes && (
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-900 block text-xs">Reception & Clinical Notes:</label>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 text-xs">
                    {selectedApptForAnalysis.notes}
                  </div>
                </div>
              )}

              {/* Quick Status Transitions */}
              <div className="pt-2 border-t border-gray-100">
                <label className="font-bold text-gray-700 block text-[11px] mb-2">Update Patient Visit Stage:</label>
                <div className="flex flex-wrap gap-1.5">
                  {(['scheduled', 'checked-in', 'waiting', 'in-consultation', 'completed'] as AppointmentStatus[]).map(st => (
                    <button
                      key={st}
                      type="button"
                      disabled={updatingStatus || selectedApptForAnalysis.status === st}
                      onClick={() => handleStatusChangeInModal(st)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors capitalize ${
                        selectedApptForAnalysis.status === st
                          ? 'bg-teal-700 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {st.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  const id = selectedApptForAnalysis.patientRecordId || selectedApptForAnalysis.id
                  setSelectedApptForAnalysis(null)
                  navigate(`/doctor/patients/${id}`)
                }}
                className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5 py-2"
              >
                <User className="h-4 w-4" /> Full Dental History
              </button>
              <button
                type="button"
                onClick={() => handleStartConsultation(selectedApptForAnalysis)}
                className="btn-primary text-xs flex-1 flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 py-2 shadow-xs"
              >
                <FileEdit className="h-4 w-4" /> Open Consultation Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
