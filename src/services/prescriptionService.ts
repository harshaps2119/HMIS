import { supabase } from '../lib/supabase'
import { Prescription, PrescriptionMedication } from '../types'
import { normalizePhoneNumber } from '../utils/phoneUtils'

function mapPrescriptionRow(row: Record<string, unknown>): Prescription {
  const id = row.id as string
  const patientId = row.patient_id as string
  return {
    id,
    consultationId: row.consultation_id as string,
    patientId,
    patientRecordId: patientId, // backwards compatibility
    patientPhone: row.patient_phone as string,
    uhid: (row.patient_phone as string) || '',
    patientName: row.patient_name as string,
    patientAge: (row.patient_age as number) ?? undefined,
    patientGender: (row.patient_gender as string) ?? undefined,
    doctorId: row.doctor_id as string,
    doctorName: row.doctor_name as string,
    doctorRegistrationNumber: (row.doctor_registration_number as string) ?? undefined,
    date: row.date as string,
    diagnoses: (row.diagnoses as string[]) || [],
    medications: (row.medications as PrescriptionMedication[]) || [],
    advice: (row.advice as string) ?? undefined,
    followUpDate: (row.follow_up_date as string) ?? undefined,
    createdAt: row.created_at as string,
  }
}

export async function createPrescription(
  data: Omit<Prescription, 'id' | 'createdAt'>
): Promise<string> {
  if (!data.medications || data.medications.length === 0) {
    throw new Error('Cannot generate an empty prescription. Add at least one medication.')
  }

  for (const m of data.medications) {
    if (!m.name || !m.dose || !m.frequency || !m.duration || !m.route) {
      throw new Error(`Incomplete medication entry: "${m.name || 'Unnamed'}". Dose, frequency, duration, and route are mandatory.`)
    }
  }

  const normalizedPhone = normalizePhoneNumber(data.patientPhone || data.uhid)
  const patientId = data.patientId || data.patientRecordId

  const { data: inserted, error } = await supabase
    .from('prescriptions')
    .insert({
      consultation_id: data.consultationId,
      patient_id: patientId,
      patient_phone: normalizedPhone,
      patient_name: data.patientName,
      patient_age: data.patientAge || null,
      patient_gender: data.patientGender || null,
      doctor_id: data.doctorId,
      doctor_name: data.doctorName,
      doctor_registration_number: data.doctorRegistrationNumber || null,
      date: data.date,
      diagnoses: data.diagnoses || [],
      medications: data.medications,
      advice: data.advice || null,
      follow_up_date: data.followUpDate || null,
    })
    .select('id')
    .single()

  if (error) throw error
  return inserted.id
}

export async function getPrescription(id: string): Promise<Prescription | null> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data ? mapPrescriptionRow(data) : null
}

/**
 * Retrieve patient prescriptions by phone or patientId.
 */
export async function getPatientPrescriptions(phoneOrRecordId: string): Promise<Prescription[]> {
  const normalized = normalizePhoneNumber(phoneOrRecordId)

  if (normalized.startsWith('+91') && normalized.length === 13) {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_phone', normalized)
      .order('date', { ascending: false })

    if (error) throw error
    return (data || []).map(mapPrescriptionRow)
  }

  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('patient_id', phoneOrRecordId)
    .order('date', { ascending: false })

  if (error) throw error
  return (data || []).map(mapPrescriptionRow)
}

export async function getConsultationPrescription(
  consultationId: string
): Promise<Prescription | null> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('consultation_id', consultationId)
    .limit(1)

  if (error) throw error
  if (!data || data.length === 0) return null
  return mapPrescriptionRow(data[0])
}
