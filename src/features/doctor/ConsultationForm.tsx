import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { getPatientById, getPatientByPhone } from '../../services/patientService'
import { updateAppointmentStatus } from '../../services/appointmentService'
import { createConsultation } from '../../services/consultationService'
import { createPrescription } from '../../services/prescriptionService'
import { getMedications, searchMedicationsMaster } from '../../services/medicationService'
import { getTreatments } from '../../services/treatmentService'
import { logAction } from '../../services/auditService'
import {
  Patient, ToothFinding, PrescriptionMedication, Medication, TreatmentItem
} from '../../types'
import {
  DENTAL_DIAGNOSES, TREATMENT_TYPES, DOSE_FREQUENCIES,
  DOSE_DURATIONS, TOOTH_FINDINGS
} from '../../utils/constants'
import {
  TREATMENT_SOURCE_NOTE, GENERAL_DISCLAIMER_NOTE
} from '../../utils/treatmentMasterData'
import {
  FREQUENCY_OPTIONS,
  ROUTE_OPTIONS,
  DURATION_OPTIONS,
  MEDICATION_CATEGORIES,
  INITIAL_MEDICATION_MASTER,
  MEDICATION_SOURCE_DISCLAIMER,
} from '../../utils/medicationMasterData'
import { getFirebaseErrorMessage } from '../../utils/errorUtils'
import { normalizePhoneNumber } from '../../utils/phoneUtils'
import {
  ArrowLeft, Plus, Trash2, CheckCircle, FileText,
  AlertTriangle, Stethoscope, Pill, Tag, X, Info, Search
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Modal from '../../components/ui/Modal'

export default function ConsultationForm() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()

  const patientRecordIdParam = searchParams.get('patientRecordId') || searchParams.get('patientId') || ''
  const patientNameParam = searchParams.get('patientName') || ''
  const patientPhoneParam = searchParams.get('patientPhone') || ''

  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [medicationList, setMedicationList] = useState<Medication[]>(INITIAL_MEDICATION_MASTER as Medication[])
  const [treatmentsList, setTreatmentsList] = useState<TreatmentItem[]>([])
  const [tariffModalOpen, setTariffModalOpen] = useState(false)

  // Clinical Consultation Form State
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState('')
  const [clinicalExamination, setClinicalExamination] = useState('')
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([])
  const [otherDiagnosis, setOtherDiagnosis] = useState('')

  // Dental Examination Table (Tooth Findings)
  const [toothFindings, setToothFindings] = useState<ToothFinding[]>([
    { toothNumber: '', finding: 'Dental Caries', severity: 'Moderate', notes: '' },
  ])

  // Treatment State
  const [treatmentPerformed, setTreatmentPerformed] = useState('')
  const [treatmentPlan, setTreatmentPlan] = useState('')
  const [advice, setAdvice] = useState('')
  const [followUpRequired, setFollowUpRequired] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')

  // Prescription Builder State
  const [prescriptions, setPrescriptions] = useState<PrescriptionMedication[]>([])
  const [builderMode, setBuilderMode] = useState<'idle' | 'search' | 'configure' | 'custom'>('idle')

  // Master search & filter state
  const [medSearchTerm, setMedSearchTerm] = useState('')
  const [medCategoryFilter, setMedCategoryFilter] = useState<string>('All Categories')

  // Master medication configuration (EMPTY defaults — Doctor MUST specify)
  const [selectedMasterMed, setSelectedMasterMed] = useState<Medication | null>(null)
  const [configuredDose, setConfiguredDose] = useState('')
  const [configuredFrequency, setConfiguredFrequency] = useState('')
  const [configuredDuration, setConfiguredDuration] = useState('')
  const [configuredRoute, setConfiguredRoute] = useState('')
  const [configuredInstructions, setConfiguredInstructions] = useState('')

  // Custom medication entry (EMPTY defaults — Doctor MUST specify)
  const [customMedName, setCustomMedName] = useState('')
  const [customStrength, setCustomStrength] = useState('')
  const [customDosageForm, setCustomDosageForm] = useState('Tablet')
  const [customDose, setCustomDose] = useState('')
  const [customFrequency, setCustomFrequency] = useState('')
  const [customDuration, setCustomDuration] = useState('')
  const [customRoute, setCustomRoute] = useState('Oral')
  const [customInstructions, setCustomInstructions] = useState('')

  // Load Patient, Medications, and Treatments Master
  useEffect(() => {
    const init = async () => {
      try {
        if (patientRecordIdParam) {
          const p = await getPatientById(patientRecordIdParam)
          if (p) {
            setPatient(p)
          } else if (patientPhoneParam) {
            const byPhone = await getPatientByPhone(patientPhoneParam)
            if (byPhone) setPatient(byPhone)
          }
        } else if (patientPhoneParam) {
          const byPhone = await getPatientByPhone(patientPhoneParam)
          if (byPhone) setPatient(byPhone)
        }

        const [masterMeds, masterTreatments] = await Promise.all([
          getMedications(true),
          getTreatments(),
        ])
        setMedicationList(masterMeds.length > 0 ? masterMeds : (INITIAL_MEDICATION_MASTER as Medication[]))
        if (masterTreatments.length > 0) setTreatmentsList(masterTreatments)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [patientRecordIdParam, patientPhoneParam])

  // Tooth finding handlers
  const addToothFinding = () => {
    setToothFindings(prev => [
      ...prev,
      { toothNumber: '', finding: 'Dental Caries', severity: 'Moderate', notes: '' },
    ])
  }

  const updateToothFinding = (index: number, field: keyof ToothFinding, value: string) => {
    setToothFindings(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const removeToothFinding = (index: number) => {
    setToothFindings(prev => prev.filter((_, i) => i !== index))
  }

  // Diagnosis toggle
  const toggleDiagnosis = (diag: string) => {
    setSelectedDiagnoses(prev =>
      prev.includes(diag) ? prev.filter(d => d !== diag) : [...prev, diag]
    )
  }

  // Prescription builder handlers
  const handleOpenMasterSearch = () => {
    setBuilderMode('search')
    setMedSearchTerm('')
    setMedCategoryFilter('All Categories')
  }

  const handlePickMasterMed = (med: Medication) => {
    setSelectedMasterMed(med)
    // Clear all fields — Doctor MUST independently choose
    setConfiguredDose('')
    setConfiguredFrequency('')
    setConfiguredDuration('')
    const defaultRoute =
      med.dosageForm.toLowerCase().includes('mouthwash') ? 'Mouthwash' :
      med.dosageForm.toLowerCase().includes('gel') || med.dosageForm.toLowerCase().includes('paste') ? 'Topical' :
      'Oral'
    setConfiguredRoute(defaultRoute)
    setConfiguredInstructions('')
    setBuilderMode('configure')
  }

  const handleAddConfiguredMed = () => {
    if (!selectedMasterMed) return
    if (!configuredDose.trim()) {
      toast.error('Please specify the dose (e.g. 1 tablet, 500 mg, 10 ml)')
      return
    }
    if (!configuredFrequency.trim()) {
      toast.error('Please select the frequency')
      return
    }
    if (!configuredDuration.trim()) {
      toast.error('Please specify the duration (e.g. 5 days, Single dose)')
      return
    }
    if (!configuredRoute.trim()) {
      toast.error('Please select the route')
      return
    }

    const displayName = selectedMasterMed.brandName
      ? `${selectedMasterMed.brandName} (${selectedMasterMed.genericName})`
      : selectedMasterMed.name

    setPrescriptions(prev => [
      ...prev,
      {
        medicationId: selectedMasterMed.id,
        name: displayName,
        genericName: selectedMasterMed.genericName,
        brandName: selectedMasterMed.brandName,
        strength: selectedMasterMed.strength || '',
        dosageForm: selectedMasterMed.dosageForm,
        dose: configuredDose.trim(),
        frequency: configuredFrequency.trim(),
        duration: configuredDuration.trim(),
        route: configuredRoute.trim(),
        instructions: configuredInstructions.trim() || undefined,
        isCustom: false,
      }
    ])
    setBuilderMode('idle')
    setSelectedMasterMed(null)
  }

  const handleOpenCustomMed = () => {
    setCustomMedName('')
    setCustomStrength('')
    setCustomDosageForm('Tablet')
    setCustomDose('')
    setCustomFrequency('')
    setCustomDuration('')
    setCustomRoute('Oral')
    setCustomInstructions('')
    setBuilderMode('custom')
  }

  const handleAddCustomMed = () => {
    if (!customMedName.trim()) {
      toast.error('Please enter the medication name')
      return
    }
    if (!customDose.trim()) {
      toast.error('Please specify the dose')
      return
    }
    if (!customFrequency.trim()) {
      toast.error('Please select the frequency')
      return
    }
    if (!customDuration.trim()) {
      toast.error('Please specify the duration')
      return
    }
    if (!customRoute.trim()) {
      toast.error('Please select the route')
      return
    }

    setPrescriptions(prev => [
      ...prev,
      {
        medicationId: `custom_${Date.now()}`,
        name: customMedName.trim(),
        strength: customStrength.trim() || 'Custom',
        dosageForm: customDosageForm.trim() || 'Other',
        dose: customDose.trim(),
        frequency: customFrequency.trim(),
        duration: customDuration.trim(),
        route: customRoute.trim(),
        instructions: customInstructions.trim() || undefined,
        isCustom: true,
      }
    ])
    setBuilderMode('idle')
  }

  const handleRemoveMedication = (index: number) => {
    setPrescriptions(prev => prev.filter((_, i) => i !== index))
  }

  // Filter master medicines for live search
  const filteredMasterMeds = medicationList.filter(med => {
    if (medCategoryFilter !== 'All Categories' && med.category !== medCategoryFilter) {
      return false
    }
    if (!medSearchTerm.trim()) return true
    const term = medSearchTerm.toLowerCase().trim()
    const matchName = med.name.toLowerCase().includes(term)
    const matchGeneric = med.genericName ? med.genericName.toLowerCase().includes(term) : false
    const matchBrand = med.brandName ? med.brandName.toLowerCase().includes(term) : false
    const matchStrength = med.strength ? med.strength.toLowerCase().includes(term) : false
    const matchCategory = med.category.toLowerCase().includes(term)
    return matchName || matchGeneric || matchBrand || matchStrength || matchCategory
  })

  // Finalize consultation
  const handleFinalize = async () => {
    if (!chiefComplaint.trim()) {
      toast.error('Chief complaint is required')
      return
    }
    if (selectedDiagnoses.length === 0 && !otherDiagnosis.trim()) {
      toast.error('Please specify at least one diagnosis')
      return
    }

    // Validate that each prescribed medication has required fields
    for (const rx of prescriptions) {
      if (!rx.name || !rx.dose || !rx.frequency || !rx.duration || !rx.route) {
        toast.error(`Incomplete medication entry: ${rx.name || 'Unnamed'}. Dose, frequency, duration, and route are required.`)
        return
      }
    }

    setSaving(true)
    try {
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      const normalizedPhone = normalizePhoneNumber(patient?.phone || patientPhoneParam || '')
      const patientRecId = patient?.id || patientRecordIdParam

      // Clean tooth findings
      const validToothFindings = toothFindings.filter(tf => tf.toothNumber.trim() !== '')

      // 1. Create Consultation Document (Enforces doctorId == request.auth.uid)
      const consultId = await createConsultation({
        patientRecordId: patientRecId,
        patientPhone: normalizedPhone,
        uhid: normalizedPhone,
        patientName: patient?.name || patientNameParam,
        doctorId: currentUser?.uid || '',
        doctorName: userProfile?.name || 'Doctor',
        appointmentId: appointmentId !== 'walkin' ? appointmentId : undefined,
        date: dateStr,
        time: timeStr,
        chiefComplaint,
        historyOfPresentIllness,
        clinicalExamination,
        diagnoses: selectedDiagnoses,
        otherDiagnosis: otherDiagnosis.trim() || undefined,
        toothFindings: validToothFindings,
        treatmentPerformed,
        treatmentPlan,
        advice,
        followUpRequired,
        followUpDate: followUpRequired ? followUpDate : undefined,
        status: 'finalized',
      })

      // 2. Prescription Creation (DECOUPLED AS REQUIRED BY PRIORITY 5):
      // Only generate prescription document if doctor actually prescribed oral medications.
      // Distinguishes "Consultation completed — no medication prescribed" from "Prescription generated".
      let rxId = ''
      if (prescriptions.length > 0) {
        rxId = await createPrescription({
          consultationId: consultId,
          patientRecordId: patientRecId,
          patientPhone: normalizedPhone,
          uhid: normalizedPhone,
          patientName: patient?.name || patientNameParam,
          patientAge: patient?.age,
          patientGender: patient?.gender,
          doctorId: currentUser?.uid || '',
          doctorName: userProfile?.name || 'Doctor',
          doctorRegistrationNumber: userProfile?.registrationNumber,
          date: dateStr,
          diagnoses: otherDiagnosis.trim()
            ? [...selectedDiagnoses, otherDiagnosis.trim()]
            : selectedDiagnoses,
          medications: prescriptions,
          advice,
          followUpDate: followUpRequired ? followUpDate : undefined,
        })
      }

      // 3. Mark appointment completed if tied to an active appointment
      if (appointmentId && appointmentId !== 'walkin') {
        await updateAppointmentStatus(appointmentId, 'completed')
      }

      // 4. Append-Only Audit Logging
      if (currentUser && userProfile) {
        await logAction({
          userId: currentUser.uid,
          userRole: userProfile.role,
          userName: userProfile.name,
          action: 'consultation_finalized',
          targetId: consultId,
          targetType: 'consultation',
          description: `Consultation completed for ${patient?.name || patientNameParam}${
            rxId ? ` with prescription (${prescriptions.length} meds)` : ' (no medication prescribed)'
          }`,
        })

        if (rxId) {
          await logAction({
            userId: currentUser.uid,
            userRole: userProfile.role,
            userName: userProfile.name,
            action: 'prescription_generated',
            targetId: rxId,
            targetType: 'prescription',
            description: `Prescription generated with ${prescriptions.length} medications`,
          })
        }
      }

      if (rxId) {
        toast.success('Consultation finalized & prescription generated!')
        navigate(`/doctor/prescriptions/${rxId}`)
      } else {
        toast.success('Consultation completed successfully (No medication prescribed)')
        navigate(`/doctor/consultations/${consultId}`)
      }
    } catch (err) {
      toast.error(getFirebaseErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner className="py-16" />

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Clinical Consultation</h1>
            <p className="text-xs text-gray-500">
              Patient: <strong className="text-gray-800">{patient?.name || patientNameParam}</strong> ·{' '}
              <span className="font-mono">UHID: {patient?.uhid || patientPhoneParam}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Reference Tariff Helper Modal Trigger */}
          <button
            type="button"
            onClick={() => setTariffModalOpen(true)}
            className="btn-secondary text-xs text-teal-800 border-teal-200 hover:bg-teal-50 flex items-center gap-1.5"
            title="View Kurnool Dental Doctors Association Reference Tariff"
          >
            <Tag className="h-3.5 w-3.5 text-teal-600" /> View Reference Tariff
          </button>

          {patient?.allergies && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 border border-red-300 rounded-lg text-xs font-bold text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span>Allergy: {patient.allergies}</span>
            </div>
          )}
        </div>
      </div>

      {/* Reference Tariff Guide Modal for Doctors */}
      <Modal
        isOpen={tariffModalOpen}
        onClose={() => setTariffModalOpen(false)}
        title="Reference Tariff Guide (Kurnool Dental Doctors Association)"
        size="lg"
      >
        <div className="space-y-3">
          <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-900 border border-amber-200">
            <p className="font-semibold">{TREATMENT_SOURCE_NOTE}</p>
            <p className="mt-1 text-[11px] text-amber-950 font-medium">{GENERAL_DISCLAIMER_NOTE}</p>
          </div>
          <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b text-gray-600 font-semibold sticky top-0">
                <tr>
                  <th className="p-2.5">Procedure</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Reference Charge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {treatmentsList.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="p-2 font-medium text-gray-900">{t.treatmentName}</td>
                    <td className="p-2 text-gray-500">{t.category}</td>
                    <td className="p-2 font-mono font-bold text-teal-800">{t.priceDisplay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-400 italic">
            This reference guide is for informational tariff benchmarking and does not generate bills.
          </p>
        </div>
      </Modal>

      {/* SECTION 1: Chief Complaint & History */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-teal-800 flex items-center gap-2">
          <Stethoscope className="h-4 w-4" /> 1. Chief Complaint & Clinical History
        </h2>

        <div>
          <label className="form-label">Chief Complaint *</label>
          <textarea
            value={chiefComplaint}
            onChange={e => setChiefComplaint(e.target.value)}
            rows={2}
            className="form-input"
            placeholder="e.g. Severe tooth pain in lower right molar (36) since 3 days, continuous throbbing ache..."
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">History of Present Illness (HPI)</label>
            <textarea
              value={historyOfPresentIllness}
              onChange={e => setHistoryOfPresentIllness(e.target.value)}
              rows={2}
              className="form-input"
              placeholder="Onset, duration, severity, radiation, aggravating/relieving factors..."
            />
          </div>
          <div>
            <label className="form-label">Clinical Examination Findings</label>
            <textarea
              value={clinicalExamination}
              onChange={e => setClinicalExamination(e.target.value)}
              rows={2}
              className="form-input"
              placeholder="Soft tissue, percussion sensitivity, palpation, lymphadenopathy..."
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Dental Tooth Examination (FDI Notation) */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-teal-800">
            2. Dental Tooth Examination
          </h2>
          <button
            type="button"
            onClick={addToothFinding}
            className="btn-secondary text-xs flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add Tooth Finding
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
              <tr>
                <th className="py-2 px-3 w-28">Tooth # (FDI)</th>
                <th className="py-2 px-3 w-48">Finding</th>
                <th className="py-2 px-3 w-32">Severity</th>
                <th className="py-2 px-3">Clinical Notes</th>
                <th className="py-2 px-2 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {toothFindings.map((tf, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={tf.toothNumber}
                      onChange={e => updateToothFinding(idx, 'toothNumber', e.target.value)}
                      placeholder="e.g. 36"
                      className="form-input text-xs py-1"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={tf.finding}
                      onChange={e => updateToothFinding(idx, 'finding', e.target.value)}
                      className="form-input text-xs py-1"
                    >
                      {TOOTH_FINDINGS.map(f => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={tf.severity}
                      onChange={e =>
                        updateToothFinding(
                          idx,
                          'severity',
                          e.target.value as 'Mild' | 'Moderate' | 'Severe'
                        )
                      }
                      className="form-input text-xs py-1"
                    >
                      <option>Mild</option>
                      <option>Moderate</option>
                      <option>Severe</option>
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={tf.notes || ''}
                      onChange={e => updateToothFinding(idx, 'notes', e.target.value)}
                      placeholder="e.g. Deep occlusal caries, tender to percussion"
                      className="form-input text-xs py-1"
                    />
                  </td>
                  <td className="py-2 px-2 text-center">
                    {toothFindings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeToothFinding(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Diagnosis Selection */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-teal-800">
          3. Diagnosis *
        </h2>
        <div className="flex flex-wrap gap-2">
          {DENTAL_DIAGNOSES.map(diag => {
            const isSelected = selectedDiagnoses.includes(diag)
            return (
              <button
                key={diag}
                type="button"
                onClick={() => toggleDiagnosis(diag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400'
                }`}
              >
                {isSelected && '✓ '} {diag}
              </button>
            )
          })}
        </div>

        <div>
          <label className="form-label text-xs">Other / Additional Diagnosis</label>
          <input
            type="text"
            value={otherDiagnosis}
            onChange={e => setOtherDiagnosis(e.target.value)}
            placeholder="Specific clinical diagnosis or differential..."
            className="form-input text-sm"
          />
        </div>
      </div>

      {/* SECTION 4: Treatment Details */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-teal-800">
          4. Treatment & Procedures
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Treatment Performed Today</label>
            <select
              className="form-input mb-2 text-sm"
              onChange={e => {
                if (e.target.value) {
                  setTreatmentPerformed(prev => (prev ? `${prev}, ${e.target.value}` : e.target.value))
                }
              }}
            >
              <option value="">-- Select from common dental procedures --</option>
              {TREATMENT_TYPES.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <textarea
              value={treatmentPerformed}
              onChange={e => setTreatmentPerformed(e.target.value)}
              rows={2}
              className="form-input"
              placeholder="e.g. Access cavity preparation Tooth 36 under LA (Lignox 2%). Canals extirpated..."
            />
          </div>

          <div>
            <label className="form-label">Future Treatment Plan</label>
            <textarea
              value={treatmentPlan}
              onChange={e => setTreatmentPlan(e.target.value)}
              rows={4}
              className="form-input"
              placeholder="e.g. Next sitting: Biomechanical canal preparation and obturation. Crown prep in week 3..."
            />
          </div>
        </div>

        <div>
          <label className="form-label">Clinical Advice & Patient Instructions</label>
          <textarea
            value={advice}
            onChange={e => setAdvice(e.target.value)}
            rows={2}
            className="form-input"
            placeholder="e.g. Warm saline gargles 3x daily. Avoid chewing hard food on right side..."
          />
        </div>

        {/* Follow Up */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={followUpRequired}
              onChange={e => setFollowUpRequired(e.target.checked)}
              className="h-4 w-4 text-teal-600 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-800">Follow-up Required</span>
          </label>

          {followUpRequired && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 font-medium">Follow-up Date:</label>
              <input
                type="date"
                value={followUpDate}
                onChange={e => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="form-input text-xs py-1"
                required={followUpRequired}
              />
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5: Prescription Builder */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-teal-800 flex items-center gap-2">
              <Pill className="h-4 w-4" /> 5. Prescription Builder (Rx)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Prescribe medications using the clinic master catalog or custom entries. If no medications are required, leave empty and finalize consultation.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 self-start sm:self-auto">
            {prescriptions.length} medicine{prescriptions.length === 1 ? '' : 's'} added
          </span>
        </div>

        {/* Existing Prescriptions Table */}
        {prescriptions.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-500 border border-gray-200">
            No medications added. Finalizing will record the consultation without generating an empty prescription.
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b text-gray-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3">Medication Name</th>
                  <th className="py-2.5 px-3">Strength & Form</th>
                  <th className="py-2.5 px-3">Route</th>
                  <th className="py-2.5 px-3">Dose</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Instructions</th>
                  <th className="py-2.5 px-2 text-center">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prescriptions.map((rx, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-2 px-3 text-center text-gray-400">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900">{rx.name}</span>
                        {rx.isCustom && (
                          <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                            Custom
                          </span>
                        )}
                      </div>
                      {rx.genericName && rx.name !== rx.genericName && (
                        <p className="text-[11px] text-gray-500">{rx.genericName}</p>
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {rx.strength || '-'} {rx.dosageForm ? `· ${rx.dosageForm}` : ''}
                    </td>
                    <td className="py-2 px-3 font-medium text-gray-700">{rx.route}</td>
                    <td className="py-2 px-3 font-medium text-gray-800">{rx.dose}</td>
                    <td className="py-2 px-3 text-teal-800 font-semibold">{rx.frequency}</td>
                    <td className="py-2 px-3 text-gray-800">{rx.duration}</td>
                    <td className="py-2 px-3 text-gray-500 italic">{rx.instructions || '-'}</td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove medication"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Builder Mode: Search Panel */}
        {builderMode === 'search' && (
          <div className="card p-5 bg-teal-50/40 border border-teal-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-teal-100">
              <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
                <Search className="h-4 w-4 text-teal-700" /> Search Medication Master
              </div>
              <button
                type="button"
                onClick={() => setBuilderMode('idle')}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Disclaimer notice */}
            <p className="text-[11px] text-teal-800 bg-teal-100/70 p-2.5 rounded-lg border border-teal-200">
              <span className="font-semibold">Clinical Note:</span> {MEDICATION_SOURCE_DISCLAIMER}
            </p>

            {/* Search inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2 relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={medSearchTerm}
                  onChange={e => setMedSearchTerm(e.target.value)}
                  placeholder="Type generic, brand name, strength (e.g. Amox, Zerodol, Paracetamol)..."
                  className="form-input pl-9 text-xs"
                  autoFocus
                />
              </div>
              <div>
                <select
                  value={medCategoryFilter}
                  onChange={e => setMedCategoryFilter(e.target.value)}
                  className="form-input text-xs"
                >
                  {MEDICATION_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Results list */}
            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-teal-100 rounded-lg bg-white shadow-inner">
              {filteredMasterMeds.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  No matching medications found. You can add a custom medicine using <strong>&quot;+ Add Other Medication&quot;</strong> below.
                </div>
              ) : (
                filteredMasterMeds.map(med => (
                  <div
                    key={med.id}
                    onClick={() => handlePickMasterMed(med)}
                    className="p-3 hover:bg-teal-50/70 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900">{med.name}</span>
                        {med.brandName && (
                          <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                            Brand: {med.brandName}
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded">
                          {med.strength}
                        </span>
                      </div>
                      {med.genericName && (
                        <p className="text-[11px] text-gray-500 mt-0.5">{med.genericName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <span className="text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {med.dosageForm}
                      </span>
                      <span className="text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {med.category}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setBuilderMode('idle')}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Close Search
              </button>
            </div>
          </div>
        )}

        {/* Builder Mode: Configure Selected Master Medication */}
        {builderMode === 'configure' && selectedMasterMed && (
          <div className="card p-5 bg-white border-2 border-teal-500 rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-700 block">
                  Prescribe Selected Medication
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-0.5">
                  {selectedMasterMed.name} — {selectedMasterMed.strength}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                  <span>Generic: <strong>{selectedMasterMed.genericName || selectedMasterMed.name}</strong></span>
                  <span>· Form: <strong>{selectedMasterMed.dosageForm}</strong></span>
                  <span>· Category: <strong>{selectedMasterMed.category}</strong></span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBuilderMode('idle')}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Reference notes if present */}
            {selectedMasterMed.notes && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Reference Note from Clinic List:</p>
                  <p className="mt-0.5">{selectedMasterMed.notes}</p>
                </div>
              </div>
            )}

            {/* Prescription input fields (EMPTY by default — Doctor chooses) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              {/* Dose */}
              <div>
                <label className="form-label text-xs font-semibold">Dose *</label>
                <input
                  type="text"
                  value={configuredDose}
                  onChange={e => setConfiguredDose(e.target.value)}
                  placeholder="e.g. 1 tablet, 10 ml"
                  className="form-input text-xs"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {['1 tablet', '1 capsule', '2 tablets', '10 ml', '5 ml'].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setConfiguredDose(d)}
                      className="text-[10px] text-gray-600 bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="form-label text-xs font-semibold">Frequency *</label>
                <select
                  value={configuredFrequency}
                  onChange={e => setConfiguredFrequency(e.target.value)}
                  className="form-input text-xs"
                >
                  <option value="">-- Select Frequency --</option>
                  {FREQUENCY_OPTIONS.map(f => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="form-label text-xs font-semibold">Duration *</label>
                <input
                  type="text"
                  value={configuredDuration}
                  onChange={e => setConfiguredDuration(e.target.value)}
                  placeholder="e.g. 5 days, Single dose"
                  className="form-input text-xs"
                />
                <div className="flex flex-wrap gap-1 mt-1">
                  {['3 days', '5 days', '7 days', 'Single dose', 'As directed'].map(dur => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setConfiguredDuration(dur)}
                      className="text-[10px] text-gray-600 bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded"
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>

              {/* Route */}
              <div>
                <label className="form-label text-xs font-semibold">Route *</label>
                <select
                  value={configuredRoute}
                  onChange={e => setConfiguredRoute(e.target.value)}
                  className="form-input text-xs"
                >
                  <option value="">-- Select Route --</option>
                  {ROUTE_OPTIONS.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Special Instructions */}
            <div>
              <label className="form-label text-xs font-semibold">Special Instructions (Optional)</label>
              <input
                type="text"
                value={configuredInstructions}
                onChange={e => setConfiguredInstructions(e.target.value)}
                placeholder="e.g. Take after food, Rinse and spit, Apply locally to affected gums..."
                className="form-input text-xs"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['Use after food', 'Before food', 'Rinse and spit', 'Apply locally', 'As directed'].map(ins => (
                  <button
                    key={ins}
                    type="button"
                    onClick={() => setConfiguredInstructions(ins)}
                    className="text-[10px] text-teal-800 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-100"
                  >
                    {ins}
                  </button>
                ))}
              </div>
            </div>

            {/* Configure Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setBuilderMode('idle')}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddConfiguredMed}
                className="btn-primary text-xs py-1.5 px-4 bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add to Prescription
              </button>
            </div>
          </div>
        )}

        {/* Builder Mode: Custom Medication Entry */}
        {builderMode === 'custom' && (
          <div className="card p-5 bg-amber-50/40 border-2 border-amber-400 rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 block">
                  Custom Prescription Entry
                </span>
                <h3 className="text-sm font-bold text-gray-900 mt-0.5">
                  + Add Other Medication (Not in Master)
                </h3>
                <p className="text-[11px] text-gray-500">
                  Manually document medicines outside the standard clinic reference catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBuilderMode('idle')}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="form-label text-xs font-semibold">Medication Name *</label>
                <input
                  type="text"
                  value={customMedName}
                  onChange={e => setCustomMedName(e.target.value)}
                  placeholder="e.g. Linezolid, Clindamycin"
                  className="form-input text-xs"
                  autoFocus
                />
              </div>
              <div>
                <label className="form-label text-xs font-semibold">Strength</label>
                <input
                  type="text"
                  value={customStrength}
                  onChange={e => setCustomStrength(e.target.value)}
                  placeholder="e.g. 600 mg, 150 mg/5ml"
                  className="form-input text-xs"
                />
              </div>
              <div>
                <label className="form-label text-xs font-semibold">Dosage Form</label>
                <select
                  value={customDosageForm}
                  onChange={e => setCustomDosageForm(e.target.value)}
                  className="form-input text-xs"
                >
                  {['Tablet', 'Capsule', 'Syrup', 'Ointment', 'Gel', 'Mouthwash', 'Drops', 'Other'].map(f => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="form-label text-xs font-semibold">Dose *</label>
                <input
                  type="text"
                  value={customDose}
                  onChange={e => setCustomDose(e.target.value)}
                  placeholder="e.g. 1 tablet"
                  className="form-input text-xs"
                />
              </div>
              <div>
                <label className="form-label text-xs font-semibold">Frequency *</label>
                <select
                  value={customFrequency}
                  onChange={e => setCustomFrequency(e.target.value)}
                  className="form-input text-xs"
                >
                  <option value="">-- Select Frequency --</option>
                  {FREQUENCY_OPTIONS.map(f => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label text-xs font-semibold">Duration *</label>
                <input
                  type="text"
                  value={customDuration}
                  onChange={e => setCustomDuration(e.target.value)}
                  placeholder="e.g. 5 days, Single dose"
                  className="form-input text-xs"
                />
              </div>
              <div>
                <label className="form-label text-xs font-semibold">Route *</label>
                <select
                  value={customRoute}
                  onChange={e => setCustomRoute(e.target.value)}
                  className="form-input text-xs"
                >
                  <option value="">-- Select Route --</option>
                  {ROUTE_OPTIONS.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label text-xs font-semibold">Special Instructions (Optional)</label>
              <input
                type="text"
                value={customInstructions}
                onChange={e => setCustomInstructions(e.target.value)}
                placeholder="e.g. Take after food, Apply topically..."
                className="form-input text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
              <button
                type="button"
                onClick={() => setBuilderMode('idle')}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomMed}
                className="btn-primary text-xs py-1.5 px-4 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Add Custom Medication
              </button>
            </div>
          </div>
        )}

        {/* Action Trigger Buttons (When idle) */}
        {builderMode === 'idle' && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleOpenMasterSearch}
              className="btn-primary text-xs bg-teal-600 hover:bg-teal-700 py-2 px-4 flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Medication
            </button>
            <button
              type="button"
              onClick={handleOpenCustomMed}
              className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5 text-gray-700 hover:bg-gray-50 border-gray-300"
            >
              <Plus className="h-4 w-4 text-gray-500" /> Add Other Medication
            </button>
          </div>
        )}
      </div>

      {/* FINAL ACTION BAR */}
      <div className="card p-6 bg-gray-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-white">
            {prescriptions.length > 0
              ? 'Finalize Clinical Consultation & Issue Prescription'
              : 'Finalize Clinical Consultation (No Medications Prescribed)'}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {prescriptions.length > 0
              ? 'This permanently seals the consultation and creates an immutable digital prescription.'
              : 'This permanently seals the consultation record without creating an empty prescription.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border border-gray-700 text-sm font-medium hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFinalize}
            disabled={saving}
            className="btn-primary bg-teal-500 hover:bg-teal-600 text-white font-bold"
          >
            {saving ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />{' '}
                {prescriptions.length > 0 ? 'Finalize & Generate Rx' : 'Finalize Consultation'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
