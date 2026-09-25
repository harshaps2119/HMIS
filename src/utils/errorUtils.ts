export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>
    const msg = (typeof err.message === 'string' ? err.message : '') ||
                (typeof err.error_description === 'string' ? err.error_description : '') ||
                ''
    const lower = msg.toLowerCase()
    if (lower.includes('network')) return 'Network error. Please check your internet connection.'
    if (lower.includes('permission denied') || lower.includes('policy') || lower.includes('unauthorized')) {
      return msg || 'You do not have permission to perform this action.'
    }
    if (lower.includes('duplicate key') || lower.includes('already exists')) {
      return msg || 'This record already exists.'
    }
    if (lower.includes('foreign key')) return 'Referenced record was not found.'
    if (msg) return msg
  }
  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred. Please try again.'
  }
  return 'An unexpected error occurred. Please try again.'
}

// Backwards compatibility alias
export const getFirebaseErrorMessage = getErrorMessage
