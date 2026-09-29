import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPrescription } from '../../services/prescriptionService'
import { getPatientByUserId } from '../../services/patientService'
import { useAuth } from '../../contexts/AuthContext'
import { Prescription } from '../../types'
import { ArrowLeft, Printer, AlertCircle } from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorState from '../../components/ui/ErrorState'
import PrescriptionSheet from '../../components/prescription/PrescriptionSheet'
import { normalizePhoneNumber } from '../../utils/phoneUtils'

export default function PatientPrescriptionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()

  const [prescription, setPrescription] = useState<Prescription | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const rx = await getPrescription(id)
        if (!rx) {
          setPrescription(null)
        } else {
          const isStaff = Boolean(
            userProfile?.role && ['admin', 'doctor', 'receptionist'].includes(userProfile.role)
          )

          let isAllowed = isStaff
          if (!isAllowed) {
            const matchesPhone = Boolean(
              userProfile?.phone &&
              rx.patientPhone &&
              normalizePhoneNumber(rx.patientPhone) === normalizePhoneNumber(userProfile.phone)
            )
            const matchesPatientId = Boolean(
              userProfile?.patientId &&
              (rx.uhid === userProfile.patientId || (rx as any).patientId === userProfile.patientId)
            )
            if (matchesPhone || matchesPatientId) {
              isAllowed = true
            } else if (currentUser?.uid) {
              const p = await getPatientByUserId(currentUser.uid)
              if (p) {
                const pPhoneMatches = Boolean(
                  p.phone && rx.patientPhone && normalizePhoneNumber(rx.patientPhone) === normalizePhoneNumber(p.phone)
                )
                const pIdMatches = Boolean(
                  p.id && (rx.patientId === p.id || (rx as any).patientRecordId === p.id)
                )
                if (pPhoneMatches || pIdMatches) isAllowed = true
              }
            }
          }

          if (userProfile && !isAllowed) {
            // Security isolation check: Patient can only view their own prescription
            setAccessDenied(true)
          } else {
            setPrescription(rx)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, userProfile])

  if (loading) return <LoadingSpinner className="py-16" />

  if (accessDenied) {
    return (
      <div className="card p-8 max-w-lg mx-auto text-center space-y-4 my-12">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Access Denied</h2>
        <p className="text-xs text-gray-500">
          This prescription belongs to another patient. You do not have permission to view this record.
        </p>
        <button onClick={() => navigate('/patient/dashboard')} className="btn-primary text-xs">
          Return to Dashboard
        </button>
      </div>
    )
  }

  if (!prescription) {
    return <ErrorState message="Prescription record not found" onRetry={() => navigate(-1)} />
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between print:hidden">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Back to Prescriptions
        </button>
        <button
          onClick={() => window.print()}
          className="btn-primary bg-teal-600 hover:bg-teal-700"
        >
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      {/* Shared Prescription Sheet with Phone Masked for Patient Privacy */}
      <PrescriptionSheet prescription={prescription} maskPatientPhone={true} />
    </div>
  )
}
