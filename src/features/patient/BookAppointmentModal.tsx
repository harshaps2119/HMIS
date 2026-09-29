import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { getDoctors } from '../../services/userService'
import { getTreatments } from '../../services/treatmentService'
import { requestPatientAppointment } from '../../services/appointmentService'
import { UserProfile, TreatmentItem, VisitType, Patient } from '../../types'
import { Calendar, Clock, Stethoscope, FileText, X } from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { CLINIC_CONFIG } from '../../utils/constants'

interface BookAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  patient: Patient | null
}

const TIME_SLOTS = [
  '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
  '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
]

export default function BookAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  patient,
}: BookAppointmentModalProps) {
  const { currentUser, userProfile } = useAuth()
  const [doctors, setDoctors] = useState<UserProfile[]>([])
  const [treatments, setTreatments] = useState<TreatmentItem[]>([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const todayStr = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    doctorId: '',
    date: todayStr,
    time: '10:00',
    visitType: 'new-consultation' as VisitType,
    reason: '',
    expectedTreatment: '',
    notes: '',
  })

  useEffect(() => {
    if (!isOpen) return

    Promise.all([getDoctors(), getTreatments()])
      .then(([docs, trts]) => {
        if (docs.length > 0) {
          setDoctors(docs)
          setForm(prev => ({ ...prev, doctorId: prev.doctorId || docs[0].id }))
        } else {
          // Fallback primary doctor if database doctors not yet loaded
          const defaultDoc: UserProfile = {
            id: '3aea3449-8ab7-4f84-88f9-61dd8d1bbc1b',
            uid: '3aea3449-8ab7-4f84-88f9-61dd8d1bbc1b',
            name: CLINIC_CONFIG.doctor.name,
            phone: `+91${CLINIC_CONFIG.doctor.phone}`,
            role: 'doctor',
            specialization: CLINIC_CONFIG.doctor.qualifications,
            active: true,
            createdAt: new Date().toISOString(),
          }
          setDoctors([defaultDoc])
          setForm(prev => ({ ...prev, doctorId: defaultDoc.id }))
        }
        setTreatments(trts || [])
      })
      .catch(err => {
        console.error('Failed to load doctors or treatments:', err)
      })
      .finally(() => {
        setLoadingDoctors(false)
      })
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const contactPhone = userProfile?.phone || patient?.phone
    if (!patient?.id || !contactPhone) {
      setError('Your patient profile must have a linked mobile number before requesting an appointment.')
      return
    }

    if (!form.reason.trim()) {
      setError('Please provide a reason or chief dental concern for this appointment.')
      return
    }

    const selectedDoc = doctors.find(d => d.id === form.doctorId) || doctors[0]
    if (!selectedDoc) {
      setError('Please select a preferred doctor.')
      return
    }

    setSubmitting(true)
    try {
      await requestPatientAppointment(
        {
          patientId: patient.id,
          patientPhone: contactPhone,
          patientName: patient.name || userProfile?.name || 'Patient',
          doctorId: selectedDoc.id,
          doctorName: selectedDoc.name,
          date: form.date,
          time: form.time,
          visitType: form.visitType,
          reason: form.reason.trim(),
          expectedTreatment: form.expectedTreatment || undefined,
          notes: form.notes.trim() || undefined,
        },
        currentUser?.uid || userProfile?.id || ''
      )

      toast.success('Appointment request submitted! Clinic reception will review and confirm your slot.')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      console.error('Booking failed:', err)
      const msg = err instanceof Error ? err.message : 'Unable to submit appointment request. Please try again.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Book an Appointment</h2>
            <p className="text-xs text-gray-500">Request a dental consultation slot with our specialists</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        {loadingDoctors ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Preferred Doctor */}
            <div>
              <label className="form-label" htmlFor="doctor">Preferred Doctor</label>
              <div className="relative">
                <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <select
                  id="doctor"
                  value={form.doctorId}
                  onChange={e => setForm(prev => ({ ...prev, doctorId: e.target.value }))}
                  className="form-input pl-10"
                  required
                >
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} {doc.specialization ? `(${doc.specialization})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visit Type */}
            <div>
              <label className="form-label">Visit Type</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-xs font-medium transition-all ${
                  form.visitType === 'new-consultation'
                    ? 'border-teal-500 bg-teal-50/50 text-teal-800 ring-1 ring-teal-500'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="visitType"
                    value="new-consultation"
                    checked={form.visitType === 'new-consultation'}
                    onChange={() => setForm(prev => ({ ...prev, visitType: 'new-consultation' }))}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span>New Consultation</span>
                </label>
                <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-xs font-medium transition-all ${
                  form.visitType === 'follow-up'
                    ? 'border-teal-500 bg-teal-50/50 text-teal-800 ring-1 ring-teal-500'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}>
                  <input
                    type="radio"
                    name="visitType"
                    value="follow-up"
                    checked={form.visitType === 'follow-up'}
                    onChange={() => setForm(prev => ({ ...prev, visitType: 'follow-up' }))}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span>Follow-up Visit</span>
                </label>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="date">Preferred Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="date"
                    type="date"
                    min={todayStr}
                    value={form.date}
                    onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                    className="form-input pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="form-label" htmlFor="time">Preferred Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <select
                    id="time"
                    value={form.time}
                    onChange={e => setForm(prev => ({ ...prev, time: e.target.value }))}
                    className="form-input pl-10"
                    required
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Expected Treatment / Service */}
            {treatments.length > 0 && (
              <div>
                <label className="form-label" htmlFor="treatment">Expected Treatment (Optional)</label>
                <select
                  id="treatment"
                  value={form.expectedTreatment}
                  onChange={e => setForm(prev => ({ ...prev, expectedTreatment: e.target.value }))}
                  className="form-input"
                >
                  <option value="">General Consultation / Not Sure</option>
                  {treatments.map(t => (
                    <option key={t.id} value={t.treatmentName}>
                      {t.treatmentName} {t.priceDisplay ? `(${t.priceDisplay})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reason for Visit */}
            <div>
              <label className="form-label" htmlFor="reason">Chief Complaint / Reason for Visit *</label>
              <textarea
                id="reason"
                rows={2}
                value={form.reason}
                onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g. Tooth sensitivity when drinking cold water, upper left molar pain"
                className="form-input"
                required
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="form-label" htmlFor="notes">Additional Notes for Doctor (Optional)</label>
              <input
                id="notes"
                type="text"
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g. Preferred morning slot, have prior dental X-rays"
                className="form-input"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary bg-teal-600 hover:bg-teal-700 flex-1 py-2.5 flex items-center justify-center gap-2"
              >
                {submitting ? <LoadingSpinner size="sm" /> : <><FileText className="h-4 w-4" /> Submit Request</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
