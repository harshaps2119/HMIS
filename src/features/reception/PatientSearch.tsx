import { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { searchPatients } from '../../services/patientService'
import { Patient } from '../../types'
import { UserPlus, Phone, User, ArrowRight, Hash } from 'lucide-react'
import SearchInput from '../../components/ui/SearchInput'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'

export default function PatientSearch() {
  const navigate = useNavigate()
  const location = useLocation()
  const isDoctor = location.pathname.startsWith('/doctor')
  const [results, setResults] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const patients = await searchPatients(term)
      setResults(patients)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Directory & Search</h1>
          <p className="text-sm text-gray-500 mt-1">Search by Patient ID (PDC-...), verified mobile, or patient name</p>
        </div>
        {!isDoctor && (
          <button
            onClick={() => navigate('/reception/patients/register')}
            className="btn-primary"
          >
            <UserPlus className="h-4 w-4" />
            Register Patient
          </button>
        )}
      </div>

      <div className="card p-6">
        <SearchInput
          placeholder="Search by Patient ID (e.g. PDC-000001), mobile, or name..."
          onSearch={handleSearch}
          className="max-w-xl"
        />

        <div className="mt-6">
          {loading ? (
            <LoadingSpinner className="py-8" />
          ) : searched && results.length === 0 ? (
            <EmptyState
              icon={User}
              title="No patients found"
              description="No registered patient matches this query. Verify Patient ID, phone, or name, or register as a new patient."
              action={!isDoctor ? { label: 'Register Patient', onClick: () => navigate('/reception/patients/register') } : undefined}
            />
          ) : (
            <div className="space-y-3">
              {results.map(patient => {
                const displayId = patient.patientId || patient.uhid
                return (
                  <div
                    key={patient.id || patient.uhid}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 cursor-pointer transition-colors"
                    onClick={() => navigate(isDoctor ? `/doctor/patients/${patient.id}` : `/reception/patients/${patient.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary-700">{patient.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{patient.name}</p>
                          {displayId && (
                            <span className="inline-flex items-center gap-1 text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-primary-100 text-primary-800 border border-primary-200">
                              <Hash className="h-3 w-3" />
                              {displayId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1 text-sm text-gray-500 font-mono">
                            <Phone className="h-3 w-3" />
                            {patient.phone}
                          </span>
                          <span className="text-sm text-gray-500">{patient.gender}</span>
                          {patient.age && <span className="text-sm text-gray-500">{patient.age} yrs</span>}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

