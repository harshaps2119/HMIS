import { supabase } from '../lib/supabase'
import { AuditAction, UserRole } from '../types'

interface LogActionParams {
  userId: string
  userRole: UserRole
  userName: string
  action: AuditAction
  targetId: string
  targetType: string
  description?: string
}

export async function logAction(params: LogActionParams): Promise<void> {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: params.userId,
      user_role: params.userRole,
      user_name: params.userName,
      action: params.action,
      target_id: params.targetId,
      target_type: params.targetType,
      description: params.description || null,
    })
    if (error) {
      console.error('Audit log failed:', error)
    }
  } catch (error) {
    // Audit logging failure should not break the main flow
    console.error('Audit log failed:', error)
  }
}
