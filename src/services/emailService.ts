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
    // Attempt delivery via secure backend API route if configured
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
      // Network/route error — backend endpoint may not be active in dev/test
      return { ok: false, statusText: err instanceof Error ? err.message : 'Network error' } as Response
    })

    if (!response.ok) {
      const errorMsg = `Email service unavailable or unconfigured (${response.status || 'offline'}).`
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
    }

    if (params.performedBy) {
      await logAction({
        userId: params.performedBy.userId,
        userRole: params.performedBy.userRole,
        userName: params.performedBy.userName,
        action: isResend ? 'patient_id_email_resent' : 'patient_id_email_sent',
        targetId: params.patientId,
        targetType: 'patient',
        description: `${isResend ? 'Resent' : 'Sent'} Patient ID (${params.patientId}) welcome email to ${params.email}`,
      })
    }

    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unexpected email delivery failure'
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
  }
}
