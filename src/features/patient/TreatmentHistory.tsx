import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getPatientConsultations } from '../../services/consultationService'
import { getPatient, getPatientByUserId } from '../../services/patientService'
import { Consultation, Patient } from '../../types'
import { formatDate } from '../../utils/dateUtils'
import {
  Clock, CheckCircle, Calendar, User, Stethoscope, ChevronDown, ChevronUp
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'

export default function PatientTreatmentHistory() {
  const { currentUser, userProfile } = useAuth()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const identifier = userProfile?.phone || userProfile?.patientId
      setLoading(true)
      try {
        let p: Patient | null = null
        if (identifier) {
          p = await getPatient(identifier)
        }
        if (!p && currentUser?.uid) {
          p = await getPatientByUserId(currentUser.uid)
        }

        const lookupId = p?.id || identifier || ''
        const contactPhone = p?.phone || userProfile?.phone || ''

        if (lookupId) {
          const list = await getPatientConsultations(lookupId, contactPhone)
          setConsultations(list)
        } else {
          setConsultations([])
        }
      } catch (err) {
        console.error('Failed to load consultation history:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentUser, userProfile])

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  if (loading) return <LoadingSpinner className="py-16" />

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Treatment & Visit History</h1>
        <p className="text-xs text-gray-500 mt-1">
          Chronological record of your clinical dental consultations and procedures performed
        </p>
      </div>

      {consultations.length === 0 ? (
        <div className="card p-12">
          <EmptyState
            icon={Clock}
            title="No treatment records"
            description="Your consultation and clinical treatment records will appear here after your visits."
          />
        </div>
      ) : (
        <div className="relative border-l-2 border-teal-200 ml-4 pl-6 space-y-6">
          {consultations.map(consult => {
            const isExpanded = expandedId === consult.id
            return (
              <div key={consult.id} className="relative group">
                {/* Timeline dot */}
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-teal-600 border-4 border-white shadow-sm" />

                <div className="card p-6 hover:border-teal-300 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                    <div>
                      <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded mr-2">
                        {formatDate(consult.date)}
                      </span>
                      <span className="text-xs text-gray-500">Dr. {consult.doctorName}</span>
                    </div>
                    <button
                      onClick={() => toggleExpand(consult.id)}
                      className="text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-1 self-start sm:self-auto"
                    >
                      {isExpanded ? 'Less details' : 'View details'}
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mt-3 text-xs">
                    <div>
                      <p className="font-semibold text-gray-500">Diagnoses:</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {consult.diagnoses?.map((d, i) => (
                          <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded font-medium">
                            {d}
                          </span>
                        ))}
                        {consult.otherDiagnosis && (
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded font-medium">
                            {consult.otherDiagnosis}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-500">Treatment Performed:</p>
                      <p className="text-gray-900 mt-1 font-medium">
                        {consult.treatmentPerformed || 'Clinical Consultation & Evaluation'}
                      </p>
                    </div>
                  </div>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 text-xs">
                      <div>
                        <p className="font-semibold text-gray-500">Chief Complaint:</p>
                        <p className="text-gray-800 mt-0.5 bg-gray-50 p-2.5 rounded-lg">{consult.chiefComplaint}</p>
                      </div>

                      {consult.toothFindings && consult.toothFindings.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-500 mb-1">Tooth Examination:</p>
                          <div className="flex flex-wrap gap-2">
                            {consult.toothFindings.map((tf, i) => (
                              <span key={i} className="p-2 bg-gray-50 border rounded text-gray-700">
                                Tooth <strong>#{tf.toothNumber}</strong>: {tf.finding} ({tf.severity})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {consult.advice && (
                        <div>
                          <p className="font-semibold text-gray-500">Clinical Advice:</p>
                          <p className="text-gray-800 mt-0.5 bg-yellow-50/70 p-2.5 rounded-lg border border-yellow-100">{consult.advice}</p>
                        </div>
                      )}

                      {consult.followUpDate && (
                        <div className="flex items-center gap-2 text-teal-700 font-medium">
                          <Calendar className="h-4 w-4" />
                          <span>Follow-up scheduled on: {formatDate(consult.followUpDate)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
