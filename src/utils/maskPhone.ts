import { maskPhoneNumber } from './phoneUtils'

/**
 * Convenience export for masking phone numbers:
 * +919876543210 -> +91 ******3210
 */
export function maskPhone(phone: string): string {
  return maskPhoneNumber(phone)
}

export default maskPhone
