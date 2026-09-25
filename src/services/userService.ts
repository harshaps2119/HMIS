import { supabase } from '../lib/supabase'
import { UserProfile } from '../types'

// ─────────────────────────────────────────────────────────────
// Helpers: map Postgres snake_case → TypeScript camelCase
// ─────────────────────────────────────────────────────────────
function mapUserRow(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    uid: row.id as string,  // backwards compat alias
    name: row.name as string,
    phone: row.phone as string,
    role: row.role as UserProfile['role'],
    email: (row.email as string) ?? undefined,
    specialization: (row.specialization as string) ?? undefined,
    registrationNumber: (row.registration_number as string) ?? undefined,
    active: row.active as boolean,
    createdAt: row.created_at as string,
  }
}

/**
 * Get user profile by Supabase auth UUID.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null // no rows — user has no profile yet
    if (import.meta.env.DEV) console.error('[getUserProfile] query failed:', error.message, error.code)
    throw error
  }
  return data ? mapUserRow(data) : null
}

/**
 * Create a user profile row.
 * Called after Supabase Auth signup (trigger also creates a default row,
 * but this allows explicitly setting additional fields).
 */
export async function createUserProfile(
  profile: Omit<UserProfile, 'createdAt'>
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .upsert({
      id: profile.uid,
      name: profile.name,
      phone: profile.phone,
      role: profile.role,
      email: profile.email ?? null,
      specialization: profile.specialization ?? null,
      registration_number: profile.registrationNumber ?? null,
      active: profile.active,
    })
  if (error) throw error
}

/**
 * Update user profile fields (name, phone, etc).
 * Role changes are blocked by the prevent_role_escalation trigger for non-admins.
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.phone !== undefined) payload.phone = updates.phone
  if (updates.email !== undefined) payload.email = updates.email
  if (updates.specialization !== undefined) payload.specialization = updates.specialization
  if (updates.registrationNumber !== undefined) payload.registration_number = updates.registrationNumber
  if (updates.active !== undefined) payload.active = updates.active
  if (updates.role !== undefined) payload.role = updates.role

  const { error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', uid)
  if (error) throw error
}

/**
 * Retrieve all active doctors for appointment booking dropdowns.
 */
export async function getDoctors(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'doctor')
    .eq('active', true)
  if (error) throw error
  return (data ?? []).map(mapUserRow)
}

/**
 * Retrieve patient user account in public.users by normalized phone.
 */
export async function getPatientUserByPhone(phone: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .eq('role', 'patient')
    .limit(1)
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data && data.length > 0 ? mapUserRow(data[0]) : null
}
