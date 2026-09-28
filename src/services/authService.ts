import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/**
 * Canonical authenticated user representation.
 * uid = Supabase auth.users UUID — used as PK in public.users table.
 */
export interface AuthUser {
  uid: string
  email: string | undefined
  phone: string | undefined
}

function mapUser(user: User): AuthUser {
  return {
    uid: user.id,
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
  }
}

function logAuthFailure(operation: string, error: unknown) {
  if (!import.meta.env.DEV) return
  const authError = error as { name?: string; message?: string; status?: number; code?: string; details?: string; hint?: string }
  console.error(`[AUTH] ${operation} failed`, {
    name: authError?.name,
    message: authError?.message,
    status: authError?.status,
    code: authError?.code,
    details: authError?.details,
    hint: authError?.hint,
  })
}

/**
 * Sign in with email and password via Supabase Auth.
 * No Firebase bridge. No custom token exchange.
 */
export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    logAuthFailure('signInWithPassword', error)
    throw error
  }
  if (!data.user || !data.session) throw new Error('Authentication did not return a valid session.')
  return mapUser(data.user)
}

/**
 * Public self-registration is disabled in Prasad Dental Care HMIS.
 * Patient accounts are provisioned exclusively by clinic staff (Admin/Receptionist)
 * through the secure provisionPatientAccount procedure.
 */
export async function signUp(): Promise<never> {
  throw new Error('Public self-registration is disabled. Patient access is provisioned exclusively by clinic reception.')
}

/**
 * Sign out of Supabase Auth session.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Send a Supabase Auth recovery email — used by clinic staff to provision a patient.
 * redirectTo must be the /set-password URL.
 */
export async function sendPasswordSetupEmail(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

/**
 * Send a Supabase Auth password-reset email — patient-facing self-service.
 * redirectTo must be the /set-password URL so the recovery flow lands there.
 */
export async function sendPasswordResetEmail(email: string, redirectTo: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

/**
 * Set a new password from a recovery session created by Supabase Auth.
 */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

/**
 * Restore an existing session (called on app mount).
 * Returns null if no valid session exists.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session) return null
  return mapUser(data.session.user)
}

/**
 * Subscribe to auth state changes (login, logout, token refresh).
 * Returns an unsubscribe function.
 */
export function subscribeToAuthState(callback: (user: AuthUser | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ? mapUser(session.user) : null)
  })
  return () => data.subscription.unsubscribe()
}

/**
 * Subscribe to auth state changes, exposing the raw event name alongside the user.
 * Use this in PasswordSetupPage to detect the PASSWORD_RECOVERY event specifically.
 * The PASSWORD_RECOVERY event fires when Supabase processes the recovery token
 * from the URL hash (#access_token=...&type=recovery) and establishes a
 * temporary recovery session. Without waiting for this event, calling updateUser()
 * may fail because no recovery session exists yet.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToAuthStateWithEvent(
  callback: (event: string, user: AuthUser | null) => void
): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session ? mapUser(session.user) : null)
  })
  return () => data.subscription.unsubscribe()
}

/**
 * Map Supabase auth errors to user-friendly messages.
 */
export function getAuthErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('database error querying schema')) return 'The authentication database is misconfigured. Please contact the administrator.'
  if (message.includes('rate limit') || message.includes('too many requests') || message.includes('over_email_send_rate_limit')) return 'Too many signup emails were requested. Disable email confirmation for development or wait before trying again.'
  if (message.includes('invalid login credentials')) return 'Incorrect email or password.'
  if (message.includes('email not confirmed')) return 'Please confirm your email address before signing in.'
  if (message.includes('user already registered')) return 'This email address is already registered.'
  if (message.includes('password should be at least')) return 'Password must be at least 6 characters.'
  if (message.includes('invalid email')) return 'Enter a valid email address.'
  if (message.includes('network')) return 'Network error. Please check your internet connection.'
  if (message.includes('session')) return 'Your session has expired. Please sign in again.'
  if (message.includes('permission')) return 'You do not have permission to perform this action.'
  if (message.includes('user not found')) return 'No account found with this email address.'
  return error instanceof Error ? error.message : 'Authentication failed. Please try again.'
}