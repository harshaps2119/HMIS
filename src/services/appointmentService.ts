import { supabase } from '../lib/supabase'
import { Appointment, AppointmentStatus } from '../types'
import { normalizePhoneNumber } from '../utils/phoneUtils'

function mapAppointmentRow(row: Record<string, unknown>): Appointment {
  const id = row.id as string
  const patientId = row.patient_id as string
  return {
    id,
    patientId,
    patientRecordId: patientId, // backwards compatibility alias
    patientPhone: row.patient_phone as string,
    uhid: (row.patient_phone as string) || '',
    patientName: row.patient_name as string,
    doctorId: row.doctor_id as string,
    doctorName: row.doctor_name as string,
    date: row.date as string,
    time: row.time as string,
    visitType: row.visit_type as Appointment['visitType'],
    reason: row.reason as string,
    expectedTreatment: (row.expected_treatment as string) ?? undefined,
    expectedTreatmentPrice: (row.expected_treatment_price as string) ?? undefined,
    status: row.status as AppointmentStatus,
    notes: (row.notes as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: row.created_by as string,
  }
}

/**
 * PART 7: Slot Conflict Detection & Deduplication
 * Checks if a doctor already has an active appointment at a specific date and time.
 * Active statuses that occupy the slot: 'scheduled', 'checked-in', 'waiting', 'in-consultation'.
 */
export async function checkSlotAvailability(
  doctorId: string,
  date: string,
  time: string,
  excludeAppointmentId?: string
): Promise<{ available: boolean; conflictReason?: string }> {
  try {
    let query = supabase
      .from('appointments')
      .select('id, doctor_name, patient_name, time, status')
      .eq('doctor_id', doctorId)
      .eq('date', date)
      .eq('time', time)
      .in('status', ['scheduled', 'checked-in', 'waiting', 'in-consultation'])

    if (excludeAppointmentId) {
      query = query.neq('id', excludeAppointmentId)
    }

    const { data, error } = await query

    if (error) throw error

    if (data && data.length > 0) {
      const conflict = data[0]
      return {
        available: false,
        conflictReason: `Slot conflict: Dr. ${conflict.doctor_name || 'the doctor'} already has a ${conflict.status} appointment with ${conflict.patient_name || 'another patient'} at ${time} on ${date}.`,
      }
    }

    return { available: true }
  } catch (err) {
    console.error('Slot availability check error:', err)
    return { available: true }
  }
}

export async function createAppointment(
  data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: string
): Promise<string> {
  // Deduplication / Slot Conflict Check
  const slotCheck = await checkSlotAvailability(data.doctorId, data.date, data.time)
  if (!slotCheck.available) {
    throw new Error(slotCheck.conflictReason || 'This time slot is already booked for the selected doctor.')
  }

  const normalizedPhone = normalizePhoneNumber(data.patientPhone || data.uhid)
  const patientId = data.patientId || data.patientRecordId

  const { data: inserted, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: patientId,
      patient_phone: normalizedPhone,
      patient_name: data.patientName,
      doctor_id: data.doctorId,
      doctor_name: data.doctorName,
      date: data.date,
      time: data.time,
      visit_type: data.visitType,
      reason: data.reason,
      expected_treatment: data.expectedTreatment || null,
      expected_treatment_price: data.expectedTreatmentPrice || null,
      status: data.status || 'scheduled',
      notes: data.notes || null,
      created_by: createdBy,
    })
    .select('id')
    .single()

  if (error) throw error
  return inserted.id
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data ? mapAppointmentRow(data) : null
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)

  if (error) throw error
}

export async function getTodaysAppointments(date: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('date', date)
    .order('time', { ascending: true })

  if (error) throw error
  return (data || []).map(mapAppointmentRow)
}

export async function getTodaysAppointmentsByDoctor(
  doctorId: string,
  date: string
): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('date', date)
    .order('time', { ascending: true })

  if (error) throw error
  return (data || []).map(mapAppointmentRow)
}

export async function getActiveAppointmentsByDoctor(
  doctorId: string
): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('doctor_id', doctorId)
    .in('status', ['scheduled', 'checked-in', 'waiting', 'in-consultation'])
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  if (error) throw error
  return (data || []).map(mapAppointmentRow)
}

export async function getAllActiveAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .in('status', ['scheduled', 'checked-in', 'waiting', 'in-consultation'])
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  if (error) throw error
  return (data || []).map(mapAppointmentRow)
}

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('date', date)
    .order('time', { ascending: true })

  if (error) throw error
  return (data || []).map(mapAppointmentRow)
}

export async function getRecentAppointments(limit = 20): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: false })
    .order('time', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map(mapAppointmentRow)
}

/**
 * Retrieve appointments for a patient by phone or patientId.
 */
export async function getPatientAppointments(phoneOrRecordId: string): Promise<Appointment[]> {
  const normalized = normalizePhoneNumber(phoneOrRecordId)

  if (normalized.startsWith('+91') && normalized.length === 13) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_phone', normalized)
      .order('date', { ascending: false })

    if (error) throw error
    return (data || []).map(mapAppointmentRow)
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', phoneOrRecordId)
    .order('date', { ascending: false })

  if (error) throw error
  return (data || []).map(mapAppointmentRow)
}

/**
 * PART 9: Centralized Appointment Limit Architecture
 * Extensible service abstraction for clinic/doctor daily appointment limits.
 * Currently returns allowed: true (unconstrained), but provides a single central
 * place to introduce doctor_id, date, maximum_appointments limits in the future.
 */
export async function checkAppointmentLimit(
  doctorId: string,
  date: string
): Promise<{ allowed: boolean; currentCount: number; maxAllowed?: number; message?: string }> {
  try {
    const { count, error } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', doctorId)
      .eq('date', date)
      .in('status', ['scheduled', 'checked-in', 'waiting', 'in-consultation'])

    if (error) throw error

    const currentCount = count || 0
    const maxAllowed = undefined // Placeholder for future configured daily limit (e.g. 25)

    return {
      allowed: maxAllowed === undefined || currentCount < maxAllowed,
      currentCount,
      maxAllowed,
    }
  } catch (err) {
    console.error('Failed to check appointment limit:', err)
    return { allowed: true, currentCount: 0 }
  }
}

/**
 * Patient-initiated Appointment Request.
 * Creates an appointment with status = 'requested'.
 */
export async function requestPatientAppointment(
  data: {
    patientId: string
    patientPhone: string
    patientName: string
    doctorId: string
    doctorName: string
    date: string
    time: string
    visitType: Appointment['visitType']
    reason: string
    expectedTreatment?: string
    notes?: string
  },
  createdBy: string
): Promise<string> {
  const normalizedPhone = normalizePhoneNumber(data.patientPhone)

  // Verify limit abstraction before requesting
  const limitCheck = await checkAppointmentLimit(data.doctorId, data.date)
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.message || 'The selected doctor has reached the appointment capacity for this date.')
  }

  // Deduplication / Slot Conflict Check
  const slotCheck = await checkSlotAvailability(data.doctorId, data.date, data.time)
  if (!slotCheck.available) {
    throw new Error(slotCheck.conflictReason || 'This time slot is already booked for the selected doctor.')
  }

  const { data: inserted, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: data.patientId,
      patient_phone: normalizedPhone,
      patient_name: data.patientName,
      doctor_id: data.doctorId,
      doctor_name: data.doctorName,
      date: data.date,
      time: data.time,
      visit_type: data.visitType,
      reason: data.reason,
      expected_treatment: data.expectedTreatment || null,
      status: 'requested',
      notes: data.notes || 'Online appointment request pending clinic confirmation.',
      created_by: createdBy,
    })
    .select('id')
    .single()

  if (error) throw error
  return inserted.id
}

/**
 * Retrieve all pending appointment requests for receptionist review.
 */
export async function getAppointmentRequests(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('status', 'requested')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(mapAppointmentRow)
}

/**
 * Confirm a patient's appointment request (Receptionist action).
 * Assigns confirmed doctor, date, time, and transitions status to 'scheduled'.
 */
export async function confirmAppointmentRequest(
  appointmentId: string,
  assignment?: {
    doctorId?: string
    doctorName?: string
    date?: string
    time?: string
    notes?: string
  }
): Promise<void> {
  // Check slot availability
  let docId = assignment?.doctorId
  let apptDate = assignment?.date
  let apptTime = assignment?.time

  if (!docId || !apptDate || !apptTime) {
    const { data: existing } = await supabase
      .from('appointments')
      .select('doctor_id, date, time')
      .eq('id', appointmentId)
      .single()

    if (existing) {
      docId = docId || (existing.doctor_id as string)
      apptDate = apptDate || (existing.date as string)
      apptTime = apptTime || (existing.time as string)
    }
  }

  if (docId && apptDate && apptTime) {
    const slotCheck = await checkSlotAvailability(docId, apptDate, apptTime, appointmentId)
    if (!slotCheck.available) {
      throw new Error(slotCheck.conflictReason || 'Cannot confirm request: slot is already booked for this doctor.')
    }
  }

  const payload: Record<string, unknown> = {
    status: 'scheduled',
  }
  if (assignment?.doctorId) payload.doctor_id = assignment.doctorId
  if (assignment?.doctorName) payload.doctor_name = assignment.doctorName
  if (assignment?.date) payload.date = assignment.date
  if (assignment?.time) payload.time = assignment.time
  if (assignment?.notes) payload.notes = assignment.notes

  const { error } = await supabase
    .from('appointments')
    .update(payload)
    .eq('id', appointmentId)

  if (error) throw error
}

/**
 * Reschedule an appointment request or existing appointment.
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newTime: string,
  rescheduleReason?: string
): Promise<void> {
  const { data: existing, error: fetchErr } = await supabase
    .from('appointments')
    .select('doctor_id, notes')
    .eq('id', appointmentId)
    .single()

  if (fetchErr) throw fetchErr

  if (existing?.doctor_id) {
    const slotCheck = await checkSlotAvailability(existing.doctor_id as string, newDate, newTime, appointmentId)
    if (!slotCheck.available) {
      throw new Error(slotCheck.conflictReason || 'Cannot reschedule: selected slot is already booked for this doctor.')
    }
  }

  const noteSuffix = rescheduleReason ? ` [Rescheduled: ${rescheduleReason}]` : ' [Rescheduled]'
  const currentNotes = (existing?.notes as string) || ''
  const updatedNotes = currentNotes + noteSuffix

  const { error } = await supabase
    .from('appointments')
    .update({
      date: newDate,
      time: newTime,
      status: 'scheduled',
      notes: updatedNotes,
    })
    .eq('id', appointmentId)

  if (error) throw error
}

/**
 * Reject a patient's appointment request.
 * Sets status to 'cancelled' and records the rejection reason.
 */
export async function rejectAppointmentRequest(
  appointmentId: string,
  rejectionReason: string
): Promise<void> {
  const { data: existing } = await supabase
    .from('appointments')
    .select('notes')
    .eq('id', appointmentId)
    .single()

  const currentNotes = existing?.notes || ''
  const updatedNotes = `${currentNotes} [Request Rejected: ${rejectionReason}]`.trim()

  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      notes: updatedNotes,
    })
    .eq('id', appointmentId)

  if (error) throw error
}
