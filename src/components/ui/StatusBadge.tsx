import { AppointmentStatus } from '../../types'

const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  requested: { label: 'Requested (Pending)', className: 'bg-amber-100 text-amber-800 border border-amber-200' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-800' },
  'checked-in': { label: 'Checked In', className: 'bg-purple-100 text-purple-800' },
  waiting: { label: 'Waiting', className: 'bg-yellow-100 text-yellow-800' },
  'in-consultation': { label: 'In Consultation', className: 'bg-orange-100 text-orange-800' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
  'no-show': { label: 'No Show', className: 'bg-gray-100 text-gray-600' },
}

interface StatusBadgeProps {
  status: AppointmentStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`badge ${config.className}`}>{config.label}</span>
  )
}
