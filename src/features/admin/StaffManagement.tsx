import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Users,
  UserPlus,
  Shield,
  Stethoscope,
  KeyRound,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  AlertCircle,
  X,
  RefreshCw,
  Send,
  Building2,
  Award,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import {
  getStaffMembers,
  provisionStaffAccount,
  toggleStaffStatus,
  ProvisionStaffParams,
} from '../../services/userService'
import { sendPasswordSetupEmail } from '../../services/authService'
import { logAction } from '../../services/auditService'
import { UserProfile, UserRole } from '../../types'
import { isValidIndianMobile, normalizePhoneNumber } from '../../utils/phoneUtils'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

interface FormData {
  name: string
  email: string
  phone: string
  role: 'admin' | 'doctor' | 'receptionist'
  specialization: string
  registrationNumber: string
  active: boolean
}

const initialForm: FormData = {
  name: '',
  email: '',
  phone: '',
  role: 'doctor',
  specialization: '',
  registrationNumber: '',
  active: true,
}

export default function StaffManagement() {
  const { currentUser, userProfile } = useAuth()
  const [staffList, setStaffList] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'doctor' | 'receptionist'>('all')

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [form, setForm] = useState<FormData>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Resending password email state tracking
  const [sendingEmailForUid, setSendingEmailForUid] = useState<string | null>(null)
  const [togglingUid, setTogglingUid] = useState<string | null>(null)

  const fetchStaff = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getStaffMembers()
      setStaffList(data)
    } catch (err: unknown) {
      console.error('Failed to fetch staff members:', err)
      setError(err instanceof Error ? err.message : 'Unable to load staff directory.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  const filteredStaff = staffList.filter(member => {
    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    const q = searchQuery.trim().toLowerCase()
    const matchesQuery =
      !q ||
      member.name.toLowerCase().includes(q) ||
      (member.email && member.email.toLowerCase().includes(q)) ||
      member.phone.includes(q)
    return matchesRole && matchesQuery
  })

  const handleOpenAddModal = () => {
    setForm(initialForm)
    setFormError('')
    setIsAddModalOpen(true)
  }

  const handleCloseAddModal = () => {
    if (submitting) return
    setIsAddModalOpen(false)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const cleanName = form.name.trim()
    const cleanEmail = form.email.trim().toLowerCase()
    const rawPhone = form.phone.trim()

    if (!cleanName) {
      setFormError('Full name is required.')
      return
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('A valid email address is required.')
      return
    }

    let normalizedPhone = ''
    if (rawPhone) {
      normalizedPhone = normalizePhoneNumber(rawPhone)
      if (!isValidIndianMobile(normalizedPhone)) {
        setFormError('Please enter a valid 10-digit Indian mobile number.')
        return
      }
    }

    setSubmitting(true)
    try {
      const params: ProvisionStaffParams = {
        name: cleanName,
        email: cleanEmail,
        role: form.role,
        phone: normalizedPhone,
        specialization: form.role === 'doctor' ? form.specialization.trim() : undefined,
        registrationNumber: form.role === 'doctor' ? form.registrationNumber.trim() : undefined,
        active: form.active,
      }

      // 1. Provision account in Supabase (auth.users + public.users)
      const result = await provisionStaffAccount(params)

      // 2. Send password setup/recovery email to staff member
      let emailSent = false
      try {
        await sendPasswordSetupEmail(
          cleanEmail,
          `${window.location.origin}/set-password?portal=staff`
        )
        emailSent = true
      } catch (emailErr) {
        console.warn('Password setup email delivery failed:', emailErr)
      }

      // 3. Log action to audit trail
      if (currentUser && userProfile) {
        await logAction({
          userId: currentUser.uid,
          userRole: userProfile.role,
          userName: userProfile.name,
          action: 'staff_created',
          targetId: result.userId,
          targetType: 'staff',
          description: `Admin created ${form.role} account: ${cleanName} (${cleanEmail})`,
        })
      }

      toast.success(
        emailSent
          ? `Staff account for ${cleanName} created! Password setup link sent to ${cleanEmail}.`
          : `Staff account for ${cleanName} created! (Please resend password email if needed).`
      )

      setIsAddModalOpen(false)
      await fetchStaff()
    } catch (err: unknown) {
      console.error('Failed to create staff account:', err)
      setFormError(err instanceof Error ? err.message : 'Failed to create staff account.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendPasswordReset = async (member: UserProfile) => {
    if (!member.email) {
      toast.error('This staff member has no email address on record.')
      return
    }

    setSendingEmailForUid(member.id)
    try {
      await sendPasswordSetupEmail(
        member.email,
        `${window.location.origin}/set-password?portal=staff`
      )
      toast.success(`Password setup instructions sent to ${member.email}`)
    } catch (err: unknown) {
      console.error('Password reset email failed:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to send password setup email.')
    } finally {
      setSendingEmailForUid(null)
    }
  }

  const handleToggleStatus = async (member: UserProfile) => {
    if (member.id === currentUser?.uid) {
      toast.error('You cannot deactivate your own administrative account.')
      return
    }

    const nextStatus = !member.active
    const actionLabel = nextStatus ? 'activate' : 'deactivate'

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${member.name}'s account?`)) {
      return
    }

    setTogglingUid(member.id)
    try {
      await toggleStaffStatus(member.id, nextStatus)

      if (currentUser && userProfile) {
        await logAction({
          userId: currentUser.uid,
          userRole: userProfile.role,
          userName: userProfile.name,
          action: 'staff_updated',
          targetId: member.id,
          targetType: 'staff',
          description: `Admin ${actionLabel}d ${member.role} account: ${member.name}`,
        })
      }

      toast.success(`Account for ${member.name} ${nextStatus ? 'activated' : 'deactivated'}.`)
      await fetchStaff()
    } catch (err: unknown) {
      console.error('Failed to toggle status:', err)
      toast.error(err instanceof Error ? err.message : `Failed to ${actionLabel} account.`)
    } finally {
      setTogglingUid(null)
    }
  }

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <Shield className="h-3 w-3" />
            Admin
          </span>
        )
      case 'doctor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Stethoscope className="h-3 w-3" />
            Doctor
          </span>
        )
      case 'receptionist':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Building2 className="h-3 w-3" />
            Receptionist
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            {role}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Staff Account Management</h1>
              <p className="text-sm text-gray-500">
                Manage clinic administrators, doctors, and receptionist user accounts
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="btn-primary inline-flex items-center gap-2 shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Staff</p>
            <p className="text-xl font-bold text-gray-900">{staffList.length}</p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Administrators</p>
            <p className="text-xl font-bold text-purple-900">
              {staffList.filter(s => s.role === 'admin').length}
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Doctors</p>
            <p className="text-xl font-bold text-blue-900">
              {staffList.filter(s => s.role === 'doctor').length}
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Receptionists</p>
            <p className="text-xl font-bold text-emerald-900">
              {staffList.filter(s => s.role === 'receptionist').length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">Role:</span>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(['all', 'admin', 'doctor', 'receptionist'] as const).map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                  roleFilter === role
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <button
            onClick={fetchStaff}
            title="Refresh directory"
            className="p-2 ml-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-xs text-gray-500">Loading staff directory...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-800">Error loading staff accounts</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
            <button onClick={fetchStaff} className="btn-secondary mt-4 text-xs">
              Retry
            </button>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold">No staff members found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery || roleFilter !== 'all'
                ? 'Try adjusting your search criteria or role filters.'
                : 'Get started by creating your first staff member.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Staff Member</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Contact</th>
                  <th className="px-6 py-3.5">Professional Info</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStaff.map(member => {
                  const isCurrent = member.id === currentUser?.uid
                  return (
                    <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white font-bold flex items-center justify-center shrink-0 shadow-sm text-sm">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                              <span>{member.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-teal-100 text-teal-800 font-semibold px-1.5 py-0.2 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 font-mono text-[11px]">
                              ID: {member.id.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">{getRoleBadge(member.role)}</td>

                      <td className="px-6 py-4 space-y-1">
                        {member.email ? (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span>{member.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No email</span>
                        )}
                        {member.phone ? (
                          <div className="flex items-center gap-1.5 text-gray-600 font-mono text-[11px]">
                            <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span>{member.phone}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No phone</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {member.role === 'doctor' ? (
                          <div className="space-y-0.5">
                            {member.specialization && (
                              <p className="text-gray-900 font-medium">{member.specialization}</p>
                            )}
                            {member.registrationNumber && (
                              <p className="text-gray-500 text-[11px] flex items-center gap-1 font-mono">
                                <Award className="h-3 w-3 text-amber-500 shrink-0" />
                                <span>Reg: {member.registrationNumber}</span>
                              </p>
                            )}
                            {!member.specialization && !member.registrationNumber && (
                              <span className="text-gray-400 italic">General Dental Practitioner</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {member.active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            <XCircle className="h-3 w-3 text-gray-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleSendPasswordReset(member)}
                            disabled={sendingEmailForUid === member.id || !member.email}
                            title="Send secure password setup / recovery email"
                            className="btn-secondary text-xs py-1.5 px-2.5 inline-flex items-center gap-1.5"
                          >
                            {sendingEmailForUid === member.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                <Send className="h-3.5 w-3.5 text-teal-600" />
                                <span>Reset Link</span>
                              </>
                            )}
                          </button>

                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(member)}
                              disabled={togglingUid === member.id}
                              className={`text-xs py-1.5 px-2.5 rounded-lg font-semibold transition-colors border ${
                                member.active
                                  ? 'border-red-200 text-red-700 hover:bg-red-50'
                                  : 'border-green-200 text-green-700 hover:bg-green-50'
                              }`}
                            >
                              {togglingUid === member.id ? (
                                <LoadingSpinner size="sm" />
                              ) : member.active ? (
                                'Deactivate'
                              ) : (
                                'Activate'
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Add Clinic Staff Member</h3>
                  <p className="text-xs text-purple-200">
                    Provisions Supabase Auth credentials & profile record
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseAddModal}
                disabled={submitting}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="form-label text-xs" htmlFor="staff-name">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="staff-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Dr. Ananya Reddy or Ravi Varma"
                  className="form-input text-xs"
                  autoFocus
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="form-label text-xs" htmlFor="staff-role">
                  Clinic Role <span className="text-red-500">*</span>
                </label>
                <select
                  id="staff-role"
                  value={form.role}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      role: e.target.value as 'admin' | 'doctor' | 'receptionist',
                    }))
                  }
                  className="form-input text-xs"
                >
                  <option value="doctor">Doctor (Consultations, Prescriptions, Diagnosis)</option>
                  <option value="receptionist">Receptionist (Appointments, Patient Registration, Queue)</option>
                  <option value="admin">Administrator (Full clinic, staff, and pricing management)</option>
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Role permissions are strictly enforced at the database level by PostgreSQL RLS.
                </p>
              </div>

              {/* Email Address */}
              <div>
                <label className="form-label text-xs" htmlFor="staff-email">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    id="staff-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="staff.name@dentalcare.com"
                    className="form-input pl-9 text-xs"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  A secure password-setup email will automatically be sent to this address.
                </p>
              </div>

              {/* Phone Number */}
              <div>
                <label className="form-label text-xs" htmlFor="staff-phone">
                  Mobile Number (Optional)
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-600 text-xs">
                    +91
                  </span>
                  <input
                    id="staff-phone"
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    placeholder="9876543210"
                    className="form-input rounded-l-none text-xs"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Conditional Doctor Fields */}
              {form.role === 'doctor' && (
                <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-3">
                  <div className="flex items-center gap-1.5 text-blue-900 font-semibold text-xs">
                    <Stethoscope className="h-4 w-4 text-blue-700" />
                    <span>Doctor Credentials (Appears on Prescriptions)</span>
                  </div>

                  <div>
                    <label className="form-label text-xs text-blue-900" htmlFor="doctor-specialization">
                      Specialization / Title
                    </label>
                    <input
                      id="doctor-specialization"
                      type="text"
                      value={form.specialization}
                      onChange={e => setForm(prev => ({ ...prev, specialization: e.target.value }))}
                      placeholder="e.g. Endodontist & Cosmetic Dentist"
                      className="form-input text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="form-label text-xs text-blue-900" htmlFor="doctor-reg">
                      Dental Council Registration Number
                    </label>
                    <input
                      id="doctor-reg"
                      type="text"
                      value={form.registrationNumber}
                      onChange={e => setForm(prev => ({ ...prev, registrationNumber: e.target.value }))}
                      placeholder="e.g. AP-DCI-48291"
                      className="form-input text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  id="staff-active"
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm(prev => ({ ...prev, active: e.target.checked }))}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                />
                <label htmlFor="staff-active" className="text-xs font-medium text-gray-700">
                  Account is active immediately upon creation
                </label>
              </div>

              {/* Security info box */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-2 text-gray-600 text-[11px]">
                <KeyRound className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                <span>
                  No temporary password is shown. The staff member will receive an official Supabase recovery link to configure their private password.
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  disabled={submitting}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary bg-purple-700 hover:bg-purple-800 text-xs inline-flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Provisioning Staff...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Create Account & Send Setup Link</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
