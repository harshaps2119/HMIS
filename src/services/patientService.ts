import { supabase } from '../lib/supabase'
import { Patient } from '../types'
import { normalizePhoneNumber } from '../utils/phoneUtils'

function mapPatientRow(row: Record<string, unknown>): Patient {
  return {
    id: row.id as string,
    uhid: row.uhid as string,
    phone: row.phone as string,
    name: row.name as string,
    nameLower: (row.name_lower as string) ?? undefined,
    dateOfBirth: (row.date_of_birth as string) ?? undefined,
    age: (row.age as number) ?? undefined,
    gender: row.gender as Patient['gender'],
    address: (row.address as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    allergies: (row.allergies as string) ?? undefined,
    medicalHistory: (row.medical_history as string) ?? undefined,
    emergencyContact: (row.emergency_contact as string) ?? undefined,
    emergencyContactName: (row.emergency_contact_name as string) ?? undefined,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

/**
 * Retrieve patient by internal technical document ID (patientRecordId / UUID)
 */
export async function getPatientById(id: string): Promise<Patient | null> {
  if (!id) return null
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data ? mapPatientRow(data) : null
}

/**
 * Retrieve patient by verified mobile number (UHID)
 */
export async function getPatientByPhone(phone: string): Promise<Patient | null> {
  const normalized = normalizePhoneNumber(phone)
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('phone', normalized)
    .limit(1)
  if (error) throw error
  if (!data || data.length === 0) return null
  return mapPatientRow(data[0])
}

/**
 * Flexible getter for either ID or phone (preserves backwards compatibility)
 */
export async function getPatient(idOrPhone: string): Promise<Patient | null> {
  if (!idOrPhone) return null
  if (idOrPhone.startsWith('+') || /^\d+$/.test(idOrPhone)) {
    return await getPatientByPhone(idOrPhone)
  }
  const byId = await getPatientById(idOrPhone)
  if (byId) return byId
  return await getPatientByPhone(idOrPhone)
}

/**
 * Check if a patient already exists with this verified phone number
 */
export async function patientExists(phone: string): Promise<boolean> {
  const patient = await getPatientByPhone(phone)
  return patient !== null
}

/**
 * Create a new patient record with UUID primary key
 * and normalized verified phone as business UHID
 */
export async function createPatient(
  patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: string
): Promise<string> {
  const normalized = normalizePhoneNumber(patientData.phone || patientData.uhid)
  const exists = await patientExists(normalized)
  if (exists) {
    throw new Error('A patient with this verified mobile number already exists.')
  }

  const { data, error } = await supabase
    .from('patients')
    .insert({
      uhid: normalized,
      phone: normalized,
      name: patientData.name.trim(),
      date_of_birth: patientData.dateOfBirth || null,
      age: patientData.age || null,
      gender: patientData.gender,
      address: patientData.address || null,
      email: patientData.email || null,
      allergies: patientData.allergies || null,
      medical_history: patientData.medicalHistory || null,
      emergency_contact: patientData.emergencyContact || null,
      emergency_contact_name: patientData.emergencyContactName || null,
      created_by: createdBy,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

/**
 * Update patient demographic information by internal UUID
 */
export async function updatePatient(
  id: string,
  updates: Partial<Patient>
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name.trim()
  if (updates.phone !== undefined) {
    const normalized = normalizePhoneNumber(updates.phone)
    payload.phone = normalized
    payload.uhid = normalized
  }
  if (updates.dateOfBirth !== undefined) payload.date_of_birth = updates.dateOfBirth || null
  if (updates.age !== undefined) payload.age = updates.age || null
  if (updates.gender !== undefined) payload.gender = updates.gender
  if (updates.address !== undefined) payload.address = updates.address || null
  if (updates.email !== undefined) payload.email = updates.email || null
  if (updates.allergies !== undefined) payload.allergies = updates.allergies || null
  if (updates.medicalHistory !== undefined) payload.medical_history = updates.medicalHistory || null
  if (updates.emergencyContact !== undefined) payload.emergency_contact = updates.emergencyContact || null
  if (updates.emergencyContactName !== undefined) payload.emergency_contact_name = updates.emergencyContactName || null

  const { error } = await supabase
    .from('patients')
    .update(payload)
    .eq('id', id)

  if (error) throw error
}

/**
 * Search patients by mobile / UHID
 */
export async function searchPatientsByPhone(phone: string): Promise<Patient[]> {
  const normalized = normalizePhoneNumber(phone)
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .ilike('phone', `%${normalized}%`)
    .limit(10)
  if (error) throw error
  return (data || []).map(mapPatientRow)
}

/**
 * Search patients by name (case-insensitive substring/prefix search)
 */
export async function searchPatientsByName(name: string): Promise<Patient[]> {
  const searchLower = name.trim().toLowerCase()
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .ilike('name', `%${searchLower}%`)
    .limit(10)
  if (error) throw error
  return (data || []).map(mapPatientRow)
}

/**
 * Retrieve recently registered patients
 */
export async function getRecentPatients(limitCount = 5): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limitCount)
  if (error) throw error
  return (data || []).map(mapPatientRow)
}

export interface ProvisionPatientParams {
  name: string
  phone: string
  email: string
  password: string
  gender?: 'Male' | 'Female' | 'Other'
  age?: number
  dateOfBirth?: string
  address?: string
  allergies?: string
  medicalHistory?: string
  emergencyContact?: string
  emergencyContactName?: string
}

export interface ProvisionPatientResult {
  success: boolean
  userId: string
  patientId: string
  uhid: string
  phone: string
  email: string
  name: string
}

/**
 * Provision a complete patient clinic profile and Patient Portal login credentials.
 * Must be executed by an authenticated staff member ('admin' or 'receptionist').
 */
export async function provisionPatientAccount(
  params: ProvisionPatientParams
): Promise<ProvisionPatientResult> {
  const normalized = normalizePhoneNumber(params.phone)
  const { data, error } = await supabase.rpc('provision_patient_account', {
    p_name: params.name.trim(),
    p_phone: normalized,
    p_email: params.email.trim().toLowerCase(),
    p_password: params.password,
    p_gender: params.gender || 'Other',
    p_age: params.age ?? null,
    p_date_of_birth: params.dateOfBirth || null,
    p_address: params.address?.trim() || null,
    p_allergies: params.allergies?.trim() || null,
    p_medical_history: params.medicalHistory?.trim() || null,
    p_emergency_contact: params.emergencyContact?.trim() || null,
    p_emergency_contact_name: params.emergencyContactName?.trim() || null,
  })

  if (error) throw error
  return {
    success: Boolean(data?.success),
    userId: data?.user_id as string,
    patientId: data?.patient_id as string,
    uhid: data?.uhid as string,
    phone: data?.phone as string,
    email: data?.email as string,
    name: data?.name as string,
  }
}
