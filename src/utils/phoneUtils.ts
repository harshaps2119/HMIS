/**
 * Standard Phone Utilities for DentalCare HMIS
 *
 * All patient phone numbers / UHIDs must strictly conform to E.164 format:
 * +91XXXXXXXXXX (10-digit Indian mobile with +91 country prefix, no spaces or hyphens)
 */

/**
 * Normalizes any Indian phone number input into standard E.164 format (+91XXXXXXXXXX)
 * Rejects invalid length or non-numeric garbage.
 */
export function normalizePhoneNumber(input: string): string {
  if (!input) return ''
  // Strip all non-digit characters
  const digits = input.replace(/\D/g, '')

  // 12 digits starting with 91 -> +91XXXXXXXXXX
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`
  }

  // 10 digits -> +91XXXXXXXXXX
  if (digits.length === 10) {
    return `+91${digits}`
  }

  // 11 digits starting with 0 (e.g. 09876543210) -> +91XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`
  }

  // If already prefixed with + and valid
  if (input.startsWith('+') && digits.length >= 10) {
    return `+${digits}`
  }

  return `+${digits}`
}

/**
 * Validates whether a phone number is a valid 10-digit Indian mobile number
 */
export function isValidIndianMobile(input: string): boolean {
  const normalized = normalizePhoneNumber(input)
  // Must match +91 followed by 6, 7, 8, or 9 and 9 more digits
  return /^\+91[6-9]\d{9}$/.test(normalized)
}

/**
 * Masks a phone number for privacy display:
 * +919876543210 -> +91 ******3210
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return ''
  const normalized = normalizePhoneNumber(phone)
  if (normalized.length >= 13) {
    const prefix = normalized.slice(0, 3) // '+91'
    const last4 = normalized.slice(-4)    // '3210'
    return `${prefix} ******${last4}`
  }
  // Fallback for unexpected formats
  return phone.replace(/.(?=.{4})/g, '*')
}
