import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getDoctors } from '../../services/userService'
import { createAppointment } from '../../services/appointmentService'
import {
  searchPatients,
  getPatientById,
} from '../../services/patientService'
import { getTreatments } from '../../services/treatmentService'
import { logAction } from '../../services/auditService'
import { useAuth } from '../../contexts/AuthContext'
import { getFirebaseErrorMessage } from '../../utils/errorUtils'
import { UserProfile, Patient, VisitType, TreatmentItem } from '../../types'
import { ArrowLeft, Calendar, Search, X, Info } from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { normalizePhoneNumber } from '../../utils/phoneUtils'

export default function AppointmentCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userProfile, currentUser } = useAuth()

  const [doctors, setDoctors] = useState<UserProfile[]>([])
  const [treatments, setTreatments] = useState<TreatmentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searching, setSearching] = useState(false)

  const [form, setForm] = useState({
    doctorId: '',
    doctorName: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    visitType: 'new-consultation' as VisitType,
    reason: '',
    expectedTreatment: '',
    expectedTreatmentPrice: '',
    notes: '',
  })

  // Load patient from URL if passed
  useEffect(() => {
    const patientRecordId = searchParams.get('patientRecordId')
    if (patientRecordId) {
      getPatientById(patientRecordId).then(p => {
        if (p) setSelectedPatient(p)
      }).catch(console.error)
    }
  }, [searchParams])

  // Load doctors & treatment master
  useEffect(() => {
    getDoctors()
      .then(docs => {
        if (docs.length > 0) {
          setDoctors(docs)
        } else {
          setDoctors([
            {
              id: 'd0000000-0000-0000-0000-000000000002',
              uid: 'd0000000-0000-0000-0000-000000000002',
              name: 'Dr. Hemanth Kumar',
              phone: '+918328456378',
              role: 'doctor',
              specialization: 'BDS, MDS – Orthodontics',
              active: true,
            } as UserProfile,
          ])
        }
      })
      .catch(() => {
        setDoctors([
          {
            id: 'd0000000-0000-0000-0000-000000000002',
            uid: 'd0000000-0000-0000-0000-000000000002',
            name: 'Dr. Hemanth Kumar',
            phone: '+918328456378',
            role: 'doctor',
            specialization: 'BDS, MDS – Orthodontics',
            active: true,
          } as UserProfile,
        ])
      })

    getTreatments().then(setTreatments).catch(console.error)
  }, [])

  const handlePatientSearch = async (term: string) => {
    setPatientSearch(term)
    if (!term.trim()) {
      setPatientResults([])
      return
    }
    setSearching(true)
    try {
      const results = await searchPatients(term)
      setPatientResults(results)
    } catch {
      // Ignored
    } finally {
      setSearching(false)
    }
  }

  const handleSelectTreatment = (treatmentName: string) => {
    const item = treatments.find(t => t.treatmentName === treatmentName)
    setForm(f => ({
      ...f,
      expectedTreatment: treatmentName,
      expectedTreatmentPrice: item?.priceDisplay || '',
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) {
      toast.error('Please select a registered patient')
      return
    }
    if (!form.doctorId) {
      toast.error('Please select an attending doctor')
      return
    }
    if (!form.date || !form.time) {
      toast.error('Date and time are required')
      return
    }
    if (!form.reason.trim()) {
      toast.error('Reason for visit is required')
      return
    }

    setLoading(true)
    try {
      const id = await createAppointment(
        {
          patientRecordId: selectedPatient.id,
          patientPhone: selectedPatient.phone,
          uhid: selectedPatient.uhid,
          patientName: selectedPatient.name,
          createdBy: currentUser?.uid || userProfile?.uid || '',
          doctorId: form.doctorId,
          doctorName: form.doctorName,
          date: form.date,
          time: form.time,
          visitType: form.visitType,
          reason: form.reason,
          expectedTreatment: form.expectedTreatment || undefined,
          expectedTreatmentPrice: form.expectedTreatmentPrice || undefined,
          status: 'scheduled',
          notes: form.notes,
        },
        currentUser?.uid || ''
      )

      if (currentUser && userProfile) {
        await logAction({
          userId: currentUser.uid,
          userRole: userProfile.role,
          userName: userProfile.name,
          action: 'appointment_created',
          targetId: id,
          targetType: 'appointment',
          description: `Scheduled appointment for ${selectedPatient.name} with ${form.doctorName}`,
        })
      }

      toast.success('Appointment scheduled successfully!')
      navigate('/reception/appointments')
    } catch (err) {
      toast.error(getFirebaseErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Patient Appointment</h1>
          <p className="text-sm text-gray-500">Book and route patient consultation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 max-w-2xl space-y-5">
        {/* Patient selection */}
        <div>
          <label className="form-label">Select Patient *</label>
          {selectedPatient ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary-50 border border-primary-200">
              <div>
                <p className="text-sm font-semibold text-primary-900">{selectedPatient.name}</p>
                <p className="text-xs text-primary-600 font-mono">
                  UHID: {selectedPatient.uhid}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="p-1 hover:bg-primary-100 rounded"
              >
                <X className="h-4 w-4 text-primary-600" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => handlePatientSearch(e.target.value)}
                  placeholder="Search patient by name or phone/UHID..."
                  className="form-input pl-9"
                />
              </div>
              {(patientResults.length > 0 || searching) && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
                  {searching ? (
                    <div className="p-3">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : (
                    patientResults.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p)
                          setPatientSearch('')
                          setPatientResults([])
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b last:border-0"
                      >
                        <span className="font-medium text-gray-900">{p.name}</span>
                        <span className="text-gray-500 ml-2 font-mono">({p.uhid})</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Doctor */}
        <div>
          <label className="form-label">Attending Doctor *</label>
          <select
            className="form-input"
            value={form.doctorId}
            onChange={e => {
              const doc = doctors.find(d => d.uid === e.target.value)
              setForm(f => ({ ...f, doctorId: e.target.value, doctorName: doc?.name || '' }))
            }}
            required
          >
            <option value="">Select attending doctor</option>
            {doctors.map(d => (
              <option key={d.uid} value={d.uid}>
                {d.name}
                {d.specialization ? ` (${d.specialization})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Date *</label>
            <input
              type="date"
              className="form-input"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div>
            <label className="form-label">Time *</label>
            <input
              type="time"
              className="form-input"
              value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              required
            />
          </div>
        </div>

        <div>
          <label className="form-label">Visit Type *</label>
          <select
            className="form-input"
            value={form.visitType}
            onChange={e => setForm(f => ({ ...f, visitType: e.target.value as VisitType }))}
            required
          >
            <option value="new-consultation">New Consultation</option>
            <option value="follow-up">Follow-up</option>
            <option value="emergency">Emergency</option>
            <option value="procedure">Procedure</option>
          </select>
        </div>

        <div>
          <label className="form-label">Reason for Visit *</label>
          <input
            type="text"
            className="form-input"
            value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
            placeholder="e.g. Tooth pain in lower right jaw, routine scaling, filling"
            required
          />
        </div>

        {/* Optional Treatment Master Dropdown */}
        <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 space-y-2">
          <div className="flex items-center justify-between">
            <label className="form-label text-xs font-semibold text-teal-900 mb-0">
              Expected Treatment / Service (Optional Reference)
            </label>
            {form.expectedTreatmentPrice && (
              <span className="text-xs font-bold text-teal-700 bg-white px-2 py-0.5 rounded border border-teal-200">
                Ref: {form.expectedTreatmentPrice}
              </span>
            )}
          </div>
          <select
            className="form-input text-xs"
            value={form.expectedTreatment}
            onChange={e => handleSelectTreatment(e.target.value)}
          >
            <option value="">-- Not yet determined / Consultation only --</option>
            {treatments.map(t => (
              <option key={t.id} value={t.treatmentName}>
                {t.treatmentName} ({t.category}) — {t.priceDisplay}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <Info className="h-3 w-3 shrink-0 text-teal-600" />
            Expected service is for scheduling and tariff guidance only. Clinical diagnosis is
            independently made by the doctor.
          </p>
        </div>

        <div>
          <label className="form-label">Notes (Optional)</label>
          <textarea
            className="form-input"
            rows={2}
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Special instructions or notes"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Calendar className="h-4 w-4" /> Schedule Appointment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
