import { format, parseISO, isToday, isFuture, isPast } from 'date-fns'

export function formatDate(date: string | Date): string {
  if (typeof date === 'string') {
    return format(parseISO(date), 'dd MMM yyyy')
  }
  return format(date, 'dd MMM yyyy')
}

export function formatDateTime(date: string | Date): string {
  if (typeof date === 'string') {
    return format(parseISO(date), 'dd MMM yyyy, hh:mm a')
  }
  return format(date, 'dd MMM yyyy, hh:mm a')
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${minutes} ${period}`
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function isAppointmentToday(date: string): boolean {
  return isToday(parseISO(date))
}

export function isAppointmentFuture(date: string): boolean {
  return isFuture(parseISO(date))
}

export function isAppointmentPast(date: string): boolean {
  return isPast(parseISO(date))
}
