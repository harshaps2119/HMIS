import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getPatientPrescriptions } from '../../services/prescriptionService'
import { Prescription } from '../../types'
import { formatDate } from '../../utils/dateUtils'
import { FileText, Download, Calendar, User, Eye, Pill } from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'

export default function PatientPrescriptions() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const identifier = userProfile?.phone || userProfile?.patientId
      if (!identifier) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const list = await getPatientPrescriptions(identifier)
        setPrescriptions(list || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userProfile])

  if (loading) return <LoadingSpinner className="py-16" />

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Prescriptions</h1>
        <p className="text-xs text-gray-500 mt-1">
          Access and download your digital prescriptions issued by the clinic
        </p>
      </div>

      {prescriptions.length === 0 ? (
        <div className="card p-12">
          <EmptyState
            icon={FileText}
            title="No prescriptions yet"
            description="Prescriptions finalized by your doctor will be stored here permanently."
          />
        </div>
      ) : (
        <div className="grid gap-4">
          {prescriptions.map(rx => (
            <div
              key={rx.id}
              className="card p-6 hover:border-teal-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-100">
                    {formatDate(rx.date)}
                  </span>
                  <span className="text-xs text-gray-500">Dr. {rx.doctorName}</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {rx.diagnoses.join(', ') || 'Dental Treatment'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-teal-700 mt-1">
                    <Pill className="h-3.5 w-3.5" />
                    <span>{rx.medications.length} medication{rx.medications.length === 1 ? '' : 's'} prescribed</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {rx.medications.map((m, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[11px]">
                      {m.name} ({m.strength})
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex sm:flex-col gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/patient/prescriptions/${rx.id}`)}
                  className="btn-primary bg-teal-600 hover:bg-teal-700 text-xs py-2 px-4 flex items-center justify-center gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" /> View / Print (PDF)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
