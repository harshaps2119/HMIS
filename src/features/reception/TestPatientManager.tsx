import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Search,
  AlertTriangle,
  Trash2,
  ChevronRight,
  User,
  Phone,
  Mail,
  Shield,
  FileText,
  Calendar,
  Pill,
  Info,
  ArrowLeft,
  CheckCircle,
  Hash,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { logAction } from '../../services/auditService'
import { normalizePhoneNumber } from '../../utils/phoneUtils'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

// ── Types returned by the inspect/delete RPCs ────────────────────────────────

interface PatientInspection {
  patient_id: string
  uhid: string
  name: string
  phone: string
  email: string | null
  gender: string | null
  created_at: string
  has_portal_account: boolean
  auth_user_id: string | null
  public_user_email: string | null
  appointment_count: number
  consultation_count: number
  prescription_count: number
  audit_log_count: number
  can_delete: boolean
}

interface DeletionResult {
  success: boolean
  patient_id: string
  patient_name: string
  patient_uhid: string
  auth_user_deleted: boolean
  auth_user_id: string | null
  deleted_prescriptions: number
  deleted_consultations: number
  deleted_appointments: number
  audit_logs_retained: boolean
  note: string
}

interface PatientSearchResult {
  id: string
  name: string
  uhid: string
  phone: string
  email: string | null
  patient_id?: string
}

// ── Search function — tries multiple strategies ───────────────────────────────

async function searchPatients(query: string): Promise<PatientSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) {
    // Return recent patients for easy test/demo identification
    const { data } = await supabase
      .from('patients')
      .select('id, name, uhid, phone, email, patient_id')
      .order('created_at', { ascending: false })
      .limit(10)
    return data || []
  }

  // Strategy 0: Patient ID (PDC-...)
  if (trimmed.toUpperCase().startsWith('PDC') || (trimmed.includes('-') && !trimmed.startsWith('+'))) {
    const { data } = await supabase
      .from('patients')
      .select('id, name, uhid, phone, email, patient_id')
      .or(`patient_id.ilike.%${trimmed.toUpperCase()}%,uhid.ilike.%${trimmed.toUpperCase()}%`)
      .limit(10)
    if (data && data.length > 0) return data
  }

  // Strategy 1: UUID (patient id)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidPattern.test(trimmed)) {
    const { data } = await supabase
      .from('patients')
      .select('id, name, uhid, phone, email, patient_id')
      .eq('id', trimmed)
      .limit(1)
    if (data && data.length > 0) return data
  }

  // Strategy 2: Phone / UHID
  const normalizedPhone = normalizePhoneNumber(trimmed)
  if (normalizedPhone.startsWith('+91')) {
    const { data } = await supabase
      .from('patients')
      .select('id, name, uhid, phone, email, patient_id')
      .or(`uhid.eq.${normalizedPhone},phone.eq.${normalizedPhone}`)
      .limit(5)
    if (data && data.length > 0) return data
  }

  // Strategy 3: Email
  if (trimmed.includes('@')) {
    const { data } = await supabase
      .from('patients')
      .select('id, name, uhid, phone, email, patient_id')
      .ilike('email', trimmed)
      .limit(5)
    if (data && data.length > 0) return data
  }

  // Strategy 4: Name (case-insensitive substring)
  const { data } = await supabase
    .from('patients')
    .select('id, name, uhid, phone, email, patient_id')
    .ilike('name', `%${trimmed}%`)
    .limit(10)
  return data || []
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TestPatientManager() {
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const [selectedPatient, setSelectedPatient] = useState<PatientInspection | null>(null)
  const [inspecting, setInspecting] = useState(false)

  const [confirmName, setConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deletionResult, setDeletionResult] = useState<DeletionResult | null>(null)

  // Auto-load test/recent patients on mount
  useEffect(() => {
    searchPatients('').then(setSearchResults).catch(console.error)
  }, [])

  // Restrict component strictly to Admin
  if (userProfile && userProfile.role !== 'admin') {
    return <Navigate to="/reception/dashboard" replace />
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearchResults([])
    setSelectedPatient(null)
    setDeletionResult(null)
    setSearching(true)
    try {
      const results = await searchPatients(query)
      setSearchResults(results)
      if (results.length === 0) toast.error('No patients found matching that query.')
    } catch (err) {
      toast.error('Search failed. Check console for details.')
      console.error('[TestPatientManager] search error:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleInspect = async (patientId: string) => {
    setInspecting(true)
    setSelectedPatient(null)
    setConfirmName('')
    setDeletionResult(null)
    try {
      const { data, error } = await supabase.rpc('inspect_patient_for_deletion', {
        p_patient_id: patientId,
      })
      if (error) throw error
      setSelectedPatient(data as PatientInspection)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(`Inspection failed: ${message}`)
      console.error('[TestPatientManager] inspect error:', err)
    } finally {
      setInspecting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPatient) return

    // Verify the typed confirmation name matches (case-insensitive)
    if (confirmName.trim().toLowerCase() !== selectedPatient.name.toLowerCase()) {
      toast.error('Patient name does not match. Please type the exact name to confirm.')
      return
    }

    setDeleting(true)
    try {
      const { data, error } = await supabase.rpc('delete_test_patient', {
        p_patient_id: selectedPatient.patient_id,
      })
      if (error) throw error

      const result = data as DeletionResult
      setDeletionResult(result)
      setSelectedPatient(null)
      setSearchResults([])
      setQuery('')
      setConfirmName('')

      // Log the deletion in the audit trail
      if (currentUser && userProfile) {
        try {
          await logAction({
            userId: currentUser.uid,
            userRole: userProfile.role,
            userName: userProfile.name,
            action: 'patient_deleted',
            targetId: selectedPatient.patient_id,
            targetType: 'patient',
            description: `Admin deleted test patient: ${selectedPatient.name} (UHID: ${selectedPatient.uhid})`,
          })
        } catch {
          // Non-fatal — deletion succeeded, audit log write failure is acceptable
          console.warn('[TestPatientManager] Audit log write failed after deletion')
        }
      }

      toast.success(`Test patient "${result.patient_name}" deleted successfully.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(`Deletion failed: ${message}`)
      console.error('[TestPatientManager] delete error:', err)
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Test Patient Manager</h1>
          <p className="text-sm text-gray-500">
            Admin-only tool for inspecting and safely deleting test/development patients
          </p>
        </div>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">Development / Test Use Only</p>
          <p>
            This tool permanently deletes patient records, including all appointments,
            consultations, prescriptions, and the linked Patient Portal account. This
            action <strong>cannot be undone</strong>. Audit logs are retained for traceability.
            Do NOT use this on real clinical patients.
          </p>
        </div>
      </div>

      {/* Deletion success card */}
      {deletionResult && (
        <div className="card p-6 border-green-200 bg-green-50">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h2 className="font-semibold text-green-800">Patient Deleted Successfully</h2>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className="text-gray-600">Patient Name</dt>
            <dd className="font-medium text-gray-900">{deletionResult.patient_name}</dd>
            <dt className="text-gray-600">UHID</dt>
            <dd className="font-mono text-gray-900">{deletionResult.patient_uhid}</dd>
            <dt className="text-gray-600">Prescriptions deleted</dt>
            <dd className="text-gray-900">{deletionResult.deleted_prescriptions}</dd>
            <dt className="text-gray-600">Consultations deleted</dt>
            <dd className="text-gray-900">{deletionResult.deleted_consultations}</dd>
            <dt className="text-gray-600">Appointments deleted</dt>
            <dd className="text-gray-900">{deletionResult.deleted_appointments}</dd>
            <dt className="text-gray-600">Portal account deleted</dt>
            <dd className="text-gray-900">{deletionResult.auth_user_deleted ? 'Yes' : 'No (no portal account existed)'}</dd>
            <dt className="text-gray-600">Audit logs</dt>
            <dd className="text-gray-900">Retained (audit trail preserved)</dd>
          </dl>
          <p className="mt-3 text-xs text-green-700">{deletionResult.note}</p>
        </div>
      )}

      {/* Search form */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Search Patient</h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Patient ID (PDC-XXXXXX), UHID, UUID, email, phone, or name"
            className="form-input flex-1"
          />
          <button type="submit" disabled={searching || !query.trim()} className="btn-primary">
            {searching ? <LoadingSpinner size="sm" /> : <><Search className="h-4 w-4" /> Search</>}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          Searches by Patient ID (PDC-XXXXXX), UUID, UHID, phone number, email address, or patient name
        </p>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-3">
            Search Results ({searchResults.length})
          </h2>
          <div className="space-y-2">
            {searchResults.map(patient => (
              <button
                key={patient.id}
                onClick={() => handleInspect(patient.id)}
                disabled={inspecting}
                className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-teal-700" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{patient.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-medium bg-teal-50 text-teal-700 border border-teal-200">
                        {patient.patient_id || patient.uhid}
                      </span>
                      {patient.patient_id && patient.uhid && patient.patient_id !== patient.uhid && (
                        <span className="text-xs text-gray-400 font-mono">
                          UHID: {patient.uhid}
                        </span>
                      )}
                    </div>
                    {patient.email && (
                      <p className="text-xs text-gray-400 mt-0.5">{patient.email}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inspecting spinner */}
      {inspecting && (
        <div className="card p-6 flex items-center gap-3">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-gray-600">Loading patient details…</span>
        </div>
      )}

      {/* Patient inspection panel */}
      {selectedPatient && !deletionResult && (
        <div className="space-y-4">
          {/* Patient profile */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Patient Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-gray-600">Name:</span>
                <span className="font-medium text-gray-900">{selectedPatient.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-gray-600">UHID / Phone:</span>
                <span className="font-mono text-gray-900">{selectedPatient.uhid}</span>
              </div>
              {selectedPatient.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900">{selectedPatient.email}</span>
                </div>
              )}
              {selectedPatient.gender && (
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-gray-600">Gender:</span>
                  <span className="text-gray-900">{selectedPatient.gender}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-gray-600">Portal account:</span>
                <span className={selectedPatient.has_portal_account ? 'text-green-700 font-medium' : 'text-gray-500'}>
                  {selectedPatient.has_portal_account ? 'Yes (will be deleted)' : 'No'}
                </span>
              </div>
            </div>
            {selectedPatient.auth_user_id && (
              <p className="mt-3 text-xs text-gray-400 font-mono">
                auth.users UUID: {selectedPatient.auth_user_id}
              </p>
            )}
          </div>

          {/* Related records summary */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Records That Will Be Deleted</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-100 text-center">
                <Calendar className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-orange-700">{selectedPatient.appointment_count}</p>
                <p className="text-xs text-orange-600">Appointments</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-center">
                <FileText className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-700">{selectedPatient.consultation_count}</p>
                <p className="text-xs text-blue-600">Consultations</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-100 text-center">
                <Pill className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-purple-700">{selectedPatient.prescription_count}</p>
                <p className="text-xs text-purple-600">Prescriptions</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                <Shield className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-600">{selectedPatient.audit_log_count}</p>
                <p className="text-xs text-gray-500">Audit Logs (kept)</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Audit logs are <strong>never deleted</strong> — they form the legal audit trail.
            </p>
          </div>

          {/* Deletion confirmation */}
          {selectedPatient.can_delete ? (
            <div className="card p-6 border-red-200 bg-red-50/40">
              <h2 className="font-semibold text-red-800 mb-1 flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Confirm Deletion
              </h2>
              <p className="text-sm text-red-700 mb-4">
                To confirm, type the patient's exact name:{' '}
                <strong className="font-mono">{selectedPatient.name}</strong>
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={confirmName}
                  onChange={e => setConfirmName(e.target.value)}
                  placeholder="Type patient name to confirm"
                  className="form-input flex-1 border-red-300 focus:ring-red-400"
                />
                <button
                  type="button"
                  disabled={
                    deleting ||
                    confirmName.trim().toLowerCase() !== selectedPatient.name.toLowerCase()
                  }
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleting ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <><Trash2 className="h-4 w-4" /> Delete Patient</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 border border-yellow-200">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Only admins can delete patients. You are logged in as{' '}
                <strong>{userProfile?.role}</strong>.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
