import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getConsultation } from '../../services/consultationService'
import { getConsultationPrescription } from '../../services/prescriptionService'
import { Consultation, Prescription } from '../../types'
import { formatDate } from '../../utils/dateUtils'
import {
  ArrowLeft, FileText, CheckCircle, Calendar, User, Stethoscope, Clock
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorState from '../../components/ui/ErrorState'

export default function ConsultationView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [prescription, setPrescription] = useState<Prescription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const c = await getConsultation(id)
        setConsultation(c)
        if (c) {
          const rx = await getConsultationPrescription(c.id)
          setPrescription(rx)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <LoadingSpinner className="py-16" />
  if (!consultation) return <ErrorState message="Consultation not found" onRetry={() => navigate(-1)} />

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Consultation Record</h1>
            <p className="text-xs text-gray-500">
              {formatDate(consultation.date)} · Dr. {consultation.doctorName}
            </p>
          </div>
        </div>

        {prescription && (
          <button
            onClick={() => navigate(`/doctor/prescriptions/${prescription.id}`)}
            className="btn-primary bg-teal-600 hover:bg-teal-700 text-xs"
          >
            <FileText className="h-4 w-4" /> View Prescription
          </button>
        )}
      </div>

      <div className="card p-6 space-y-6">
        {/* Header summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-gray-900">{consultation.patientName}</p>
              <p className="text-xs text-gray-500">UHID: {consultation.uhid}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(consultation.date)}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {consultation.time}</span>
          </div>
        </div>

        {/* Chief Complaint */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Chief Complaint</h3>
          <p className="text-sm font-semibold text-gray-900 bg-gray-50 p-3 rounded-lg">{consultation.chiefComplaint}</p>
        </div>

        {/* Clinical History & Examination */}
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {consultation.historyOfPresentIllness && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">History of Present Illness</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-xs leading-relaxed">{consultation.historyOfPresentIllness}</p>
            </div>
          )}
          {consultation.clinicalExamination && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Clinical Examination</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-xs leading-relaxed">{consultation.clinicalExamination}</p>
            </div>
          )}
        </div>

        {/* Diagnoses */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Diagnosis</h3>
          <div className="flex flex-wrap gap-2">
            {consultation.diagnoses?.map((d, i) => (
              <span key={i} className="px-3 py-1 bg-teal-50 text-teal-800 rounded-lg text-xs font-bold border border-teal-200">
                ✓ {d}
              </span>
            ))}
            {consultation.otherDiagnosis && (
              <span className="px-3 py-1 bg-teal-50 text-teal-800 rounded-lg text-xs font-bold border border-teal-200">
                ✓ {consultation.otherDiagnosis}
              </span>
            )}
          </div>
        </div>

        {/* Tooth Findings */}
        {consultation.toothFindings && consultation.toothFindings.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tooth Findings</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b text-gray-600 font-semibold">
                  <tr>
                    <th className="py-2 px-3">Tooth #</th>
                    <th className="py-2 px-3">Finding</th>
                    <th className="py-2 px-3">Severity</th>
                    <th className="py-2 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {consultation.toothFindings.map((tf, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-bold text-gray-900">#{tf.toothNumber}</td>
                      <td className="py-2 px-3">{tf.finding}</td>
                      <td className="py-2 px-3">{tf.severity}</td>
                      <td className="py-2 px-3 text-gray-500">{tf.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Treatment & Advice */}
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {consultation.treatmentPerformed && (
            <div className="bg-green-50/70 p-4 rounded-xl border border-green-100">
              <h3 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-1">Treatment Performed</h3>
              <p className="text-xs text-green-900">{consultation.treatmentPerformed}</p>
            </div>
          )}
          {consultation.treatmentPlan && (
            <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100">
              <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Treatment Plan</h3>
              <p className="text-xs text-blue-900">{consultation.treatmentPlan}</p>
            </div>
          )}
        </div>

        {consultation.advice && (
          <div className="bg-yellow-50/60 p-4 rounded-xl border border-yellow-100">
            <h3 className="text-xs font-bold text-yellow-800 uppercase tracking-wider mb-1">Clinical Advice</h3>
            <p className="text-xs text-yellow-900">{consultation.advice}</p>
          </div>
        )}

        {consultation.followUpRequired && (
          <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-700 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-teal-600" />
            <span>Follow-up scheduled on: <strong>{consultation.followUpDate ? formatDate(consultation.followUpDate) : 'As advised'}</strong></span>
          </div>
        )}
      </div>
    </div>
  )
}
