import { supabase } from '../lib/supabase'
import { Patient } from '../types'
import { normalizePhoneNumber } from '../utils/phoneUtils'

function mapPatientRow(row: Record<string, unknown>): Patient {
  const assignedId = (row.patient_id as string) || (row.uhid as string)
  return {
    id: row.id as string,
    patientId: assignedId,
    uhid: assignedId,
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
 * Retrieve patient by unique Patient ID (e.g. PDC-000001)
 */
export async function getPatientByPatientId(patientId: string): Promise<Patient | null> {
  const cleanId = patientId.trim().toUpperCase()
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .or(`patient_id.ilike.${cleanId},uhid.ilike.${cleanId}`)
    .limit(1)
  if (error) throw error
  if (!data || data.length === 0) return null
  return mapPatientRow(data[0])
}

/**
 * Flexible getter for either ID, Patient ID (PDC-...), or phone (preserves backwards compatibility)
 */
export async function getPatient(identifier: string): Promise<Patient | null> {
  if (!identifier) return null
  const clean = identifier.trim()
  if (clean.toUpperCase().startsWith('PDC') || clean.includes('-') && clean.length > 5 && !clean.startsWith('+')) {
    const byPatientId = await getPatientByPatientId(clean)
    if (byPatientId) return byPatientId
  }
  if (clean.startsWith('+') || /^\d+$/.test(clean)) {
    return await getPatientByPhone(clean)
  }
  const byId = await getPatientById(clean)
  if (byId) return byId
  return await getPatientByPhone(clean)
}

/**
 * Check if a patient already exists with this verified phone number
 */
export async function patientExists(phone: string): Promise<boolean> {
  const patient = await getPatientByPhone(phone)
  return patient !== null
}

export interface CreatePatientResult {
  id: string
  patientId: string
  uhid: string
}

/**
 * Retrieve patient by linked Supabase Auth user_id
 */
export async function getPatientByUserId(userId: string): Promise<Patient | null> {
  if (!userId) return null
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
  if (error) throw error
  if (!data || data.length === 0) return null
  return mapPatientRow(data[0])
}

/**
 * Create a new patient record with UUID primary key
 * and normalized verified phone as business UHID
 */
export async function createPatient(
  patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: string
): Promise<CreatePatientResult> {
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
    .select('id, patient_id, uhid')
    .single()

  if (error) throw error
  const finalPatientId = (data.patient_id as string) || (data.uhid as string) || data.id
  return {
    id: data.id,
    patientId: finalPatientId,
    uhid: (data.uhid as string) || finalPatientId,
  }
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
 * Search patients by permanent Patient ID (e.g. PDC-000001)
 */
export async function searchPatientsByPatientId(patientId: string): Promise<Patient[]> {
  const clean = patientId.trim().toUpperCase()
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .or(`patient_id.ilike.%${clean}%,uhid.ilike.%${clean}%`)
    .limit(10)
  if (error) throw error
  return (data || []).map(mapPatientRow)
}

/**
 * Unified patient search supporting Patient ID, Phone, or Name
 */
export async function searchPatients(query: string): Promise<Patient[]> {
  const clean = query.trim()
  if (!clean) return []
  if (clean.toUpperCase().startsWith('PDC') || (clean.includes('-') && !clean.startsWith('+'))) {
    return await searchPatientsByPatientId(clean)
  }
  const isPhone = /^\d/.test(clean.replace('+', ''))
  if (isPhone) {
    const normalized = normalizePhoneNumber(clean)
    return await searchPatientsByPhone(normalized)
  }
  return await searchPatientsByName(clean)
}

/**
 * Resolve a Patient ID (or email) to the patient's Supabase Auth email.
 * Used by Patient Login to allow logging in with Patient ID + password.
 */
export interface ResolvePatientLoginResult {
  found: boolean
  active?: boolean
  email?: string
  patientId?: string
  name?: string
  error?: string
}

export async function resolvePatientLogin(
  identifier: string
): Promise<ResolvePatientLoginResult> {
  const clean = identifier.trim()
  if (!clean) return { found: false, error: 'Identifier is required' }

  try {
    const { data, error } = await supabase.rpc('resolve_patient_login', {
      p_login_identifier: clean,
    })
    if (!error && data) {
      return {
        found: Boolean(data.found),
        active: data.active,
        email: data.email,
        patientId: data.patient_id,
        name: data.name,
        error: data.error,
      }
    }
  } catch {
    // If RPC is unavailable or not yet created, proceed to client fallback below
  }

  // Client fallback lookup
  try {
    const isId = clean.toUpperCase().startsWith('PDC') || clean.includes('-')
    const { data: patientRows } = await supabase
      .from('patients')
      .select('email, patient_id, uhid, name')
      .or(isId ? `patient_id.ilike.${clean.toUpperCase()},uhid.ilike.${clean.toUpperCase()}` : `email.ilike.${clean}`)
      .limit(1)

    if (patientRows && patientRows.length > 0 && patientRows[0].email) {
      return {
        found: true,
        active: true,
        email: patientRows[0].email,
        patientId: (patientRows[0].patient_id as string) || (patientRows[0].uhid as string),
        name: patientRows[0].name as string,
      }
    }
  } catch {
    // Fallback query failed
  }

  return { found: false, error: 'Patient ID not found' }
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
    patientId: (data?.patient_id as string) || (data?.uhid as string),
    uhid: (data?.patient_id as string) || (data?.uhid as string),
    phone: data?.phone as string,
    email: data?.email as string,
    name: data?.name as string,
  }
}
