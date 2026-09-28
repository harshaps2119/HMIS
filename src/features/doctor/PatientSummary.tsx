import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPatient } from '../../services/patientService'
import { getPatientConsultations } from '../../services/consultationService'
import { getPatientPrescriptions } from '../../services/prescriptionService'
import { Patient, Consultation, Prescription } from '../../types'
import { formatDate } from '../../utils/dateUtils'
import {
  ArrowLeft, Phone, AlertTriangle, Activity,
  FileText, Plus, CheckCircle, ExternalLink
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorState from '../../components/ui/ErrorState'

export default function DoctorPatientSummary() {
  const { patientRecordId } = useParams<{ patientRecordId: string }>()
  const navigate = useNavigate()

  const [patient, setPatient] = useState<Patient | null>(null)
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!patientRecordId) return
      try {
        const decodedId = decodeURIComponent(patientRecordId)
        const p = await getPatient(decodedId)
        if (!p) {
          setError('Patient not found in records.')
        } else {
          setPatient(p)
          const [consults, rxs] = await Promise.all([
            getPatientConsultations(p.phone || p.id),
            getPatientPrescriptions(p.phone || p.id),
          ])
          setConsultations(consults)
          setPrescriptions(rxs)
        }
      } catch (err) {
        setError('Failed to fetch patient history.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [patientRecordId])

  if (loading) return <LoadingSpinner className="py-16" />
  if (error || !patient) return <ErrorState message={error || 'Patient not found'} onRetry={() => navigate(-1)} />

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
            <p className="text-xs text-gray-500 font-mono">Patient ID: {patient.patientId || patient.uhid}</p>
          </div>
        </div>
        <button
          onClick={() =>
            navigate(
              `/doctor/consultations/new/walkin?patientRecordId=${encodeURIComponent(
                patient.id
              )}&patientName=${encodeURIComponent(
                patient.name
              )}&patientPhone=${encodeURIComponent(patient.phone)}`
            )
          }
          className="btn-primary bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> Start New Consultation
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Patient Clinical Profile */}
        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-14 h-14 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xl">
                {patient.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-bold text-gray-900">{patient.name}</h2>
                <p className="text-xs text-gray-500">
                  {patient.gender}
                  {patient.age ? ` · ${patient.age} yrs` : ''}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 font-mono">
                  <Phone className="h-3 w-3 text-gray-400" /> {patient.phone}
                </p>
              </div>
            </div>

            {/* Critical Alert: Allergies */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 mb-1.5">
                <AlertTriangle className="h-4 w-4" />
                <span>Known Allergies</span>
              </div>
              {patient.allergies ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 font-medium">
                  {patient.allergies}
                </div>
              ) : (
                <div className="p-2.5 bg-gray-50 rounded-lg text-xs text-gray-500 italic">
                  No drug or dental allergies recorded.
                </div>
              )}
            </div>

            {/* Medical History */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 mb-1.5">
                <Activity className="h-4 w-4" />
                <span>Systemic Medical History</span>
              </div>
              {patient.medicalHistory ? (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
                  {patient.medicalHistory}
                </div>
              ) : (
                <div className="p-2.5 bg-gray-50 rounded-lg text-xs text-gray-500 italic">
                  No systemic medical conditions noted.
                </div>
              )}
            </div>

            {patient.address && (
              <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span className="font-semibold text-gray-700">Address:</span> {patient.address}
              </div>
            )}
          </div>
        </div>

        {/* Right: Past Consultations & Treatments Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-teal-600" />
              Past Visits & Treatment History ({consultations.length})
            </h2>

            {consultations.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center italic">
                No past consultations recorded for this patient.
              </p>
            ) : (
              <div className="space-y-4">
                {consultations.map(consult => {
                  const matchingRx = prescriptions.find(r => r.consultationId === consult.id)
                  return (
                    <div
                      key={consult.id}
                      className="p-4 rounded-xl border border-gray-200 hover:border-teal-300 transition-all bg-white"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 mb-2 border-b border-gray-100">
                        <div>
                          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                            {formatDate(consult.date)}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">Dr. {consult.doctorName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/doctor/consultations/${consult.id}`)}
                            className="text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-1"
                          >
                            View Consultation <ExternalLink className="h-3 w-3" />
                          </button>
                          {matchingRx && (
                            <button
                              onClick={() => navigate(`/doctor/prescriptions/${matchingRx.id}`)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                            >
                              <FileText className="h-3 w-3" /> Rx
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="font-semibold text-gray-500">Chief Complaint:</p>
                          <p className="text-gray-900 mt-0.5 font-medium">{consult.chiefComplaint}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-500">Diagnosis:</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {consult.diagnoses?.map((d, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium"
                              >
                                {d}
                              </span>
                            ))}
                            {consult.otherDiagnosis && (
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                                {consult.otherDiagnosis}
                              </span>
                            )}
                          </div>
                        </div>

                        {consult.treatmentPerformed && (
                          <div className="sm:col-span-2 bg-gray-50 p-2.5 rounded-lg">
                            <p className="font-semibold text-gray-700">Treatment Performed:</p>
                            <p className="text-gray-800 mt-0.5">{consult.treatmentPerformed}</p>
                          </div>
                        )}

                        {consult.toothFindings && consult.toothFindings.length > 0 && (
                          <div className="sm:col-span-2">
                            <p className="font-semibold text-gray-500 mb-1">Tooth Findings:</p>
                            <div className="flex flex-wrap gap-2">
                              {consult.toothFindings.map((tf, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                >
                                  Tooth <strong>#{tf.toothNumber}</strong>: {tf.finding} ({tf.severity})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
