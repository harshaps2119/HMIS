import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../services/authService'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Users, Calendar, Tag, Pill,
  LogOut, Menu, X, Stethoscope, ChevronDown, UserCog, Trash2,
} from 'lucide-react'
import { CLINIC_CONFIG } from '../utils/constants'

const navLinks = [
  { to: '/reception/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/reception/patients', icon: Users, label: 'Patients' },
  { to: '/reception/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/reception/treatments', icon: Tag, label: 'Price Reference' },
  { to: '/reception/medications', icon: Pill, label: 'Medications' },
]

const adminLinks = [
  { to: '/admin/staff', icon: UserCog, label: 'Staff Accounts' },
  { to: '/admin/test-patients', icon: Trash2, label: 'Test Patients' },
]

export default function ReceptionLayout() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login?portal=staff')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  const isAdmin = userProfile?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30 transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 p-1 flex items-center justify-center shrink-0 shadow-sm">
            <img src={CLINIC_CONFIG.logo} alt={CLINIC_CONFIG.name} className="w-full h-full object-contain rounded-lg" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{CLINIC_CONFIG.name}</p>
            <p className="text-xs text-gray-500">{isAdmin ? 'Clinic Administration' : 'Reception'}</p>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-link ${
                  isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="pt-4 pb-1">
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-purple-700">
                  Admin Tools
                </p>
              </div>
              {adminLinks.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `sidebar-link ${
                      isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                    }`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5 shrink-0 text-purple-600" />
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="sidebar-link sidebar-link-inactive w-full text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <h1 className="text-sm font-semibold text-gray-500 lg:hidden">{CLINIC_CONFIG.name}</h1>

          <div className="flex items-center gap-3 ml-auto">
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary-700">
                    {userProfile?.name?.charAt(0) || 'R'}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">{userProfile?.name || 'Receptionist'}</p>
                  <p className="text-xs text-gray-500 capitalize">{userProfile?.role}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
