import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../services/authService'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Calendar, Clock, FileText, LogOut, Menu, X, Stethoscope,
} from 'lucide-react'
import { CLINIC_CONFIG } from '../utils/constants'
import { maskPhone } from '../utils/maskPhone'

const navLinks = [
  { to: '/patient/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/patient/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/patient/history', icon: Clock, label: 'Treatment History' },
  { to: '/patient/prescriptions', icon: FileText, label: 'Prescriptions' },
]

export default function PatientLayout() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login?portal=patient')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
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
            <p className="text-xs text-gray-500">Patient Portal</p>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          {navLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'bg-teal-600 text-white' : 'sidebar-link-inactive'}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
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
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <h1 className="text-sm font-semibold text-gray-500 lg:hidden">{CLINIC_CONFIG.name}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{userProfile?.name || 'Patient'}</p>
              <p className="text-xs text-gray-500">{userProfile?.phone ? maskPhone(userProfile.phone) : ''}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-teal-700">
                {userProfile?.name?.charAt(0) || 'P'}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
