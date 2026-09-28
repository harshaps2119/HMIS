import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { searchPatients, getRecentPatients } from '../../services/patientService'
import { Patient } from '../../types'
import { UserPlus, Phone, User, ArrowRight, Hash, Users, MapPin } from 'lucide-react'
import SearchInput from '../../components/ui/SearchInput'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'

export default function PatientSearch() {
  const navigate = useNavigate()
  const location = useLocation()
  const isDoctor = location.pathname.startsWith('/doctor')

  const [allPatients, setAllPatients] = useState<Patient[]>([])
  const [results, setResults] = useState<Patient[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Load patients on initial page mount
  const loadDirectory = useCallback(async () => {
    setInitialLoading(true)
    try {
      const data = await getRecentPatients(50)
      setAllPatients(data)
      setResults(data)
    } catch (err) {
      console.error('Failed to load patient directory:', err)
    } finally {
      setInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDirectory()
  }, [loadDirectory])

  const handleSearch = useCallback(async (term: string) => {
    const clean = term.trim()
    setSearchTerm(clean)

    if (!clean) {
      setResults(allPatients)
      setSearched(false)
      return
    }

    setLoading(true)
    setSearched(true)
    try {
      const patients = await searchPatients(clean)
      setResults(patients)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
    }
  }, [allPatients])

  const registerRoute = isDoctor ? '/reception/patients/register' : '/reception/patients/register'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Directory & Search</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse all registered clinic patients or search by Patient ID (PDC-...), verified mobile, or name
          </p>
        </div>
        {!isDoctor && (
          <button
            onClick={() => navigate(registerRoute)}
            className="btn-primary"
          >
            <UserPlus className="h-4 w-4" />
            Register Patient
          </button>
        )}
      </div>

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <SearchInput
            placeholder="Search by Patient ID (e.g. PDC-000001), mobile, or name..."
            onSearch={handleSearch}
            className="w-full max-w-xl"
          />
        </div>

        <div className="mt-4">
          {initialLoading ? (
            <div className="py-12 text-center space-y-3">
              <LoadingSpinner className="mx-auto" />
              <p className="text-sm text-gray-500">Loading patient directory...</p>
            </div>
          ) : loading ? (
            <div className="py-12 text-center space-y-3">
              <LoadingSpinner className="mx-auto" />
              <p className="text-sm text-gray-500">Searching patients...</p>
            </div>
          ) : !searched && allPatients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No patients registered yet"
              description="Your clinic directory is currently empty. Register your first patient to begin scheduling appointments, consultations, and prescriptions."
              action={!isDoctor ? {
                label: 'Register First Patient',
                onClick: () => navigate(registerRoute)
              } : undefined}
            />
          ) : searched && results.length === 0 ? (
            <EmptyState
              icon={User}
              title="No matching patients found"
              description={`No registered patient matches "${searchTerm}". Verify the Patient ID, mobile number, or register them as a new patient.`}
              action={!isDoctor ? {
                label: 'Register Patient',
                onClick: () => navigate(registerRoute)
              } : undefined}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">
                  {searched ? `Search Results for "${searchTerm}"` : 'All Registered Patients'}
                </h2>
                <span className="text-xs bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-full font-semibold border border-primary-200">
                  {results.length} {results.length === 1 ? 'patient' : 'patients'}
                </span>
              </div>

              <div className="space-y-3">
                {results.map(patient => {
                  const displayId = patient.patientId || patient.uhid
                  return (
                    <div
                      key={patient.id || patient.uhid}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 cursor-pointer transition-all shadow-sm hover:shadow"
                      onClick={() =>
                        navigate(
                          isDoctor
                            ? `/doctor/patients/${patient.id}`
                            : `/reception/patients/${patient.id}`
                        )
                      }
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                          <span className="text-lg font-bold text-primary-700">
                            {patient.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{patient.name}</p>
                            {displayId && (
                              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-primary-100 text-primary-800 border border-primary-200">
                                <Hash className="h-3 w-3" />
                                {displayId}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="h-3.5 w-3.5 text-gray-400" />
                              {patient.phone}
                            </span>
                            {patient.gender && (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">
                                {patient.gender}
                              </span>
                            )}
                            {patient.age && <span>{patient.age} yrs</span>}
                            {patient.address && (
                              <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 truncate max-w-xs">
                                <MapPin className="h-3 w-3" />
                                {patient.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
