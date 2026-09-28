import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getTodaysAppointmentsByDoctor, updateAppointmentStatus } from '../../services/appointmentService'
import { searchPatientsByName, searchPatientsByPhone } from '../../services/patientService'
import { Appointment, Patient } from '../../types'
import { todayISO, formatTime } from '../../utils/dateUtils'
import {
  Calendar, Clock, CheckCircle, Search, FileEdit, ArrowRight,
  User, RefreshCw, UserCheck
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import StatusBadge from '../../components/ui/StatusBadge'
import SearchInput from '../../components/ui/SearchInput'
import EmptyState from '../../components/ui/EmptyState'
import { format } from 'date-fns'
import { normalizePhoneNumber } from '../../utils/phoneUtils'
import { CLINIC_CONFIG } from '../../utils/constants'

export default function DoctorDashboard() {
  const { userProfile, currentUser } = useAuth()
  const navigate = useNavigate()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchResults, setSearchResults] = useState<Patient[]>([])
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const loadData = async () => {
    if (!currentUser) return
    setLoading(true)
    try {
      const appts = await getTodaysAppointmentsByDoctor(currentUser.uid, todayISO())
      setAppointments(appts)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentUser])

  const handleSearch = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    try {
      const isPhone = /^\d/.test(term.replace('+', ''))
      let pts: Patient[]
      if (isPhone) {
        const normalized = normalizePhoneNumber(term)
        pts = await searchPatientsByPhone(normalized)
      } else {
        pts = await searchPatientsByName(term)
      }
      setSearchResults(pts)
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
    }
  }

  const waitingCount = appointments.filter(a => a.status === 'waiting' || a.status === 'checked-in').length
  const inConsultCount = appointments.filter(a => a.status === 'in-consultation').length
  const completedCount = appointments.filter(a => a.status === 'completed').length

  const handleStartConsultation = async (appt: Appointment) => {
    if (appt.status !== 'in-consultation' && appt.status !== 'completed') {
      await updateAppointmentStatus(appt.id, 'in-consultation')
    }
    navigate(
      `/doctor/consultations/new/${appt.id}?patientRecordId=${encodeURIComponent(
        appt.patientRecordId || ''
      )}&patientName=${encodeURIComponent(
        appt.patientName
      )}&patientPhone=${encodeURIComponent(appt.patientPhone || appt.uhid)}`
    )
  }

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
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {userProfile?.name || 'Dr. Hemanth Kumar'} 🩺
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {format(new Date(), 'EEEE, dd MMMM yyyy')} · {userProfile?.specialization || 'BDS, MDS – Orthodontics'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={loadData} className="btn-secondary">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="btn-primary"
          >
            <Search className="h-4 w-4" /> Find Patient Record
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
            placeholder="Search patient by UHID (phone) or name..."
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
                      UHID: {p.uhid} · {p.gender}{p.age ? `, ${p.age} yrs` : ''}
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
            <p className="text-sm text-gray-500">Today's Assigned</p>
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

      {/* Scheduled Patients List */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Today's Assigned Patients</h2>
        {loading ? (
          <LoadingSpinner className="py-12" />
        ) : appointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No appointments assigned for today"
            description="Patients scheduled for you today will appear here."
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {appointments.map(appt => {
              const targetRecordId = appt.patientRecordId || appt.id
              return (
                <div
                  key={appt.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                      {appt.patientName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="font-bold text-gray-900 hover:text-teal-600 cursor-pointer"
                          onClick={() => navigate(`/doctor/patients/${targetRecordId}`)}
                        >
                          {appt.patientName}
                        </span>
                        <StatusBadge status={appt.status} />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatTime(appt.time)} ·{' '}
                        <span className="text-gray-700 font-medium">{appt.reason}</span>
                        {appt.expectedTreatment && (
                          <span className="text-teal-700 font-medium">
                            {' '}
                            (Ref: {appt.expectedTreatment})
                          </span>
                        )}{' '}
                        · UHID: {appt.patientPhone || appt.uhid}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/doctor/patients/${targetRecordId}`)}
                      className="btn-secondary text-xs"
                    >
                      <User className="h-3.5 w-3.5" /> Clinical Profile
                    </button>
                    <button
                      onClick={() => handleStartConsultation(appt)}
                      className="btn-primary text-xs bg-teal-600 hover:bg-teal-700"
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
    </div>
  )
}
