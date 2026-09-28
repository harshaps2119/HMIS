import { supabase } from '../lib/supabase'
import { logAction } from './auditService'
import { UserRole } from '../types'
import { CLINIC_CONFIG } from '../utils/constants'

export interface PatientIdEmailParams {
  patientName: string
  email: string
  patientId: string
  portalUrl?: string
  performedBy?: {
    userId: string
    userRole: UserRole
    userName: string
  }
}

export interface EmailSendResult {
  success: boolean
  error?: string
}

/**
 * Format the official Patient ID Welcome Email body according to clinic requirements.
 */
export function formatPatientIdEmailBody(patientName: string, patientId: string, portalUrl: string): string {
  return `Dear ${patientName},

Welcome to ${CLINIC_CONFIG.name}.

Your patient account has been successfully created.

Patient ID:
${patientId}

You will use this Patient ID to log in to the patient portal.

Patient Portal:
${portalUrl}

Please keep your Patient ID safe for future appointments and access to your health information.

Regards,
${CLINIC_CONFIG.doctor.name}
${CLINIC_CONFIG.name}
${CLINIC_CONFIG.address}
Contact: ${CLINIC_CONFIG.phone}`
}

/**
 * Send the official Patient ID Welcome Email.
 * Registration never fails if the email cannot be delivered.
 */
export async function sendPatientIdEmail(
  params: PatientIdEmailParams,
  isResend = false
): Promise<EmailSendResult> {
  const portalUrl = params.portalUrl || (typeof window !== 'undefined' ? `${window.location.origin}/login?portal=patient` : 'https://hmis-wine.vercel.app/login?portal=patient')
  const subject = `Welcome to ${CLINIC_CONFIG.name} – Your Patient ID`
  const body = formatPatientIdEmailBody(params.patientName, params.patientId, portalUrl)

  try {
    // 1. Attempt delivery via secure backend Resend API route if configured
    const response = await fetch('/api/send-patient-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: params.email,
        subject,
        body,
        patientName: params.patientName,
        patientId: params.patientId,
      }),
    }).catch(err => {
      return { ok: false, statusText: err instanceof Error ? err.message : 'Network error' } as Response
    })

    if (response.ok) {
      if (params.performedBy) {
        await logAction({
          userId: params.performedBy.userId,
          userRole: params.performedBy.userRole,
          userName: params.performedBy.userName,
          action: isResend ? 'patient_id_email_resent' : 'patient_id_email_sent',
          targetId: params.patientId,
          targetType: 'patient',
          description: `Delivered Patient ID email to ${params.email} via Resend service`,
        })
      }
      return { success: true }
    }

    // 2. Fallback: Attempt Supabase Auth's native password setup/recovery email
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/set-password?portal=patient` : portalUrl
      const { error: sbErr } = await supabase.auth.resetPasswordForEmail(params.email, {
        redirectTo: redirectUrl,
      })

      if (!sbErr) {
        if (params.performedBy) {
          await logAction({
            userId: params.performedBy.userId,
            userRole: params.performedBy.userRole,
            userName: params.performedBy.userName,
            action: isResend ? 'patient_id_email_resent' : 'patient_id_email_sent',
            targetId: params.patientId,
            targetType: 'patient',
            description: `Delivered password setup email to ${params.email} via Supabase Auth mailer`,
          })
        }
        return { success: true }
      }
    } catch {
      // Supabase native email failed
    }

    // 3. Informative error message guiding configuration
    const errorMsg = 'Email service unconfigured. Add RESEND_API_KEY in Vercel settings, or copy the login link directly via WhatsApp/Clipboard.'
    if (params.performedBy) {
      await logAction({
        userId: params.performedBy.userId,
        userRole: params.performedBy.userRole,
        userName: params.performedBy.userName,
        action: 'patient_id_email_failed',
        targetId: params.patientId,
        targetType: 'patient',
        description: `Failed to deliver Patient ID email to ${params.email}: ${errorMsg}`,
      })
    }
    return { success: false, error: errorMsg }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to send email.'
    return { success: false, error: errorMsg }
  }
}
