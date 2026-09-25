import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPrescription } from '../../services/prescriptionService'
import { logAction } from '../../services/auditService'
import { useAuth } from '../../contexts/AuthContext'
import { Prescription } from '../../types'
import { formatDate } from '../../utils/dateUtils'
import { CLINIC_NAME } from '../../utils/constants'
import { ArrowLeft, Printer, Share2 } from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorState from '../../components/ui/ErrorState'
import PrescriptionSheet from '../../components/prescription/PrescriptionSheet'
import toast from 'react-hot-toast'

export default function PrescriptionView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()

  const [prescription, setPrescription] = useState<Prescription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      try {
        const rx = await getPrescription(id)
        setPrescription(rx)
        if (rx && currentUser && userProfile) {
          await logAction({
            userId: currentUser.uid,
            userRole: userProfile.role,
            userName: userProfile.name,
            action: 'prescription_viewed',
            targetId: rx.id,
            targetType: 'prescription',
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, currentUser, userProfile])

  const handlePrint = () => {
    window.print()
  }

  const handleShareWhatsApp = async () => {
    if (!prescription) return

    // Extract clean digits for wa.me link
    const cleanPhone = (prescription.patientPhone || prescription.uhid).replace(/\D/g, '')
    const msg = encodeURIComponent(
      `Hello ${prescription.patientName},\n\nYour prescription from ${CLINIC_NAME} dated ${formatDate(prescription.date)} has been finalized.\n\nDoctor: Dr. ${prescription.doctorName}\nDiagnoses: ${prescription.diagnoses.join(', ')}\nMedications: ${prescription.medications.length} prescribed.\n\nYou can view and print your full digital prescription by logging into your patient portal with your mobile number: ${prescription.patientPhone}.\n\nTake care,\n${CLINIC_NAME}`
    )

    const waUrl = `https://wa.me/${cleanPhone}?text=${msg}`

    if (currentUser && userProfile) {
      // Audit log accurately records share initiation (deep link opening)
      await logAction({
        userId: currentUser.uid,
        userRole: userProfile.role,
        userName: userProfile.name,
        action: 'prescription_share_initiated',
        targetId: prescription.id,
        targetType: 'prescription',
        description: `Prescription share initiated via WhatsApp shortcut to ${prescription.patientPhone}`,
      })
    }

    toast.success('Opening WhatsApp to share prescription notice...')
    window.open(waUrl, '_blank')
  }

  if (loading) return <LoadingSpinner className="py-16" />
  if (!prescription) return <ErrorState message="Prescription record not found" onRetry={() => navigate(-1)} />

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Controls (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleShareWhatsApp}
            className="btn-secondary text-green-700 hover:bg-green-50 border-green-300"
            title="Opens WhatsApp with pre-filled prescription message (shortcut)"
          >
            <Share2 className="h-4 w-4 text-green-600" /> Share via WhatsApp
          </button>
          <button
            onClick={handlePrint}
            className="btn-primary bg-teal-600 hover:bg-teal-700"
          >
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Shared Prescription Document Sheet */}
      <PrescriptionSheet prescription={prescription} maskPatientPhone={false} />
    </div>
  )
}
