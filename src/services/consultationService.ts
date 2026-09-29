import { supabase } from '../lib/supabase'
import { Consultation, ToothFinding } from '../types'
import { normalizePhoneNumber } from '../utils/phoneUtils'

function mapConsultationRow(row: Record<string, unknown>): Consultation {
  const id = row.id as string
  const patientId = row.patient_id as string
  return {
    id,
    patientId,
    patientRecordId: patientId, // backwards compatibility
    patientPhone: row.patient_phone as string,
    uhid: (row.patient_phone as string) || '',
    patientName: row.patient_name as string,
    doctorId: row.doctor_id as string,
    doctorName: row.doctor_name as string,
    appointmentId: (row.appointment_id as string) ?? undefined,
    date: row.date as string,
    time: row.time as string,
    chiefComplaint: row.chief_complaint as string,
    historyOfPresentIllness: (row.history_of_present_illness as string) ?? undefined,
    clinicalExamination: (row.clinical_examination as string) ?? undefined,
    diagnoses: (row.diagnoses as string[]) || [],
    otherDiagnosis: (row.other_diagnosis as string) ?? undefined,
    toothFindings: (row.tooth_findings as ToothFinding[]) || [],
    treatmentPerformed: (row.treatment_performed as string) ?? undefined,
    treatmentPlan: (row.treatment_plan as string) ?? undefined,
    advice: (row.advice as string) ?? undefined,
    followUpRequired: Boolean(row.follow_up_required),
    followUpDate: (row.follow_up_date as string) ?? undefined,
    status: row.status as Consultation['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function createConsultation(
  data: Omit<Consultation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const normalizedPhone = normalizePhoneNumber(data.patientPhone || data.uhid)
  const patientId = data.patientId || data.patientRecordId

  const { data: inserted, error } = await supabase
    .from('consultations')
    .insert({
      patient_id: patientId,
      patient_phone: normalizedPhone,
      patient_name: data.patientName,
      doctor_id: data.doctorId,
      doctor_name: data.doctorName,
      appointment_id: data.appointmentId || null,
      date: data.date,
      time: data.time,
      chief_complaint: data.chiefComplaint,
      history_of_present_illness: data.historyOfPresentIllness || null,
      clinical_examination: data.clinicalExamination || null,
      diagnoses: data.diagnoses || [],
      other_diagnosis: data.otherDiagnosis || null,
      tooth_findings: data.toothFindings || [],
      treatment_performed: data.treatmentPerformed || null,
      treatment_plan: data.treatmentPlan || null,
      advice: data.advice || null,
      follow_up_required: data.followUpRequired || false,
      follow_up_date: data.followUpDate || null,
      status: data.status || 'draft',
    })
    .select('id')
    .single()

  if (error) throw error
  return inserted.id
}

export async function updateConsultation(
  id: string,
  updates: Partial<Consultation>
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (updates.chiefComplaint !== undefined) payload.chief_complaint = updates.chiefComplaint
  if (updates.historyOfPresentIllness !== undefined) payload.history_of_present_illness = updates.historyOfPresentIllness || null
  if (updates.clinicalExamination !== undefined) payload.clinical_examination = updates.clinicalExamination || null
  if (updates.diagnoses !== undefined) payload.diagnoses = updates.diagnoses
  if (updates.otherDiagnosis !== undefined) payload.other_diagnosis = updates.otherDiagnosis || null
  if (updates.toothFindings !== undefined) payload.tooth_findings = updates.toothFindings
  if (updates.treatmentPerformed !== undefined) payload.treatment_performed = updates.treatmentPerformed || null
  if (updates.treatmentPlan !== undefined) payload.treatment_plan = updates.treatmentPlan || null
  if (updates.advice !== undefined) payload.advice = updates.advice || null
  if (updates.followUpRequired !== undefined) payload.follow_up_required = updates.followUpRequired
  if (updates.followUpDate !== undefined) payload.follow_up_date = updates.followUpDate || null
  if (updates.status !== undefined) payload.status = updates.status

  const { error } = await supabase
    .from('consultations')
    .update(payload)
    .eq('id', id)

  if (error) throw error
}

export async function getConsultation(id: string): Promise<Consultation | null> {
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data ? mapConsultationRow(data) : null
}

/**
 * Retrieve patient consultations by phone or patientId (with optional phone/id fallback).
 */
export async function getPatientConsultations(
  phoneOrRecordId: string,
  phoneFallback?: string
): Promise<Consultation[]> {
  const normalized = normalizePhoneNumber(phoneOrRecordId)
  const isPhone = normalized.startsWith('+91') && normalized.length === 13

  let query = supabase.from('consultations').select('*')

  if (isPhone) {
    if (phoneFallback) {
      query = query.or(`patient_phone.eq.${normalized},patient_id.eq.${phoneFallback}`)
    } else {
      query = query.eq('patient_phone', normalized)
    }
  } else {
    const fallbackPhone = phoneFallback ? normalizePhoneNumber(phoneFallback) : ''
    if (fallbackPhone && fallbackPhone.startsWith('+91') && fallbackPhone.length === 13) {
      query = query.or(`patient_id.eq.${phoneOrRecordId},patient_phone.eq.${fallbackPhone}`)
    } else {
      query = query.eq('patient_id', phoneOrRecordId)
    }
  }

  const { data, error } = await query.order('date', { ascending: false })
  if (error) throw error

  // Deduplicate by consultation id
  const seen = new Set<string>()
  const list: Consultation[] = []
  for (const row of data || []) {
    const item = mapConsultationRow(row)
    if (!seen.has(item.id)) {
      seen.add(item.id)
      list.push(item)
    }
  }
  return list
}

export async function getDoctorConsultations(
  doctorId: string,
  date: string
): Promise<Consultation[]> {
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('date', date)

  if (error) throw error
  return (data || []).map(mapConsultationRow)
}

export async function getAllConsultations(limit = 50): Promise<Consultation[]> {
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map(mapConsultationRow)
}
