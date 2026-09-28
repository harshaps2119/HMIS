import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'
import {
  Stethoscope,
  ShieldCheck,
  UserCheck,
  Users,
  Calendar,
  FileText,
  ArrowRight,
  Phone,
  Clock,
  MapPin,
  Lock,
} from 'lucide-react'
import { CLINIC_NAME, CLINIC_ADDRESS, CLINIC_PHONE, CLINIC_EMAIL } from '../utils/constants'

const roleDashboard: Record<UserRole, string> = {
  receptionist: '/reception/dashboard',
  doctor: '/doctor/dashboard',
  patient: '/patient/dashboard',
  admin: '/reception/dashboard',
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { currentUser, userProfile, loading, isPasswordRecovery } = useAuth()

  // If in password recovery, redirect to /set-password, never to a dashboard
  useEffect(() => {
    if (isPasswordRecovery) {
      navigate('/set-password', { replace: true })
      return
    }
    if (!loading && currentUser && userProfile) {
      const target = roleDashboard[userProfile.role] || '/patient/dashboard'
      navigate(target, { replace: true })
    }
  }, [currentUser, userProfile, loading, isPasswordRecovery, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-sky-50 flex flex-col justify-between text-gray-800">
      {/* Top Header / Navigation Bar */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 p-1 flex items-center justify-center shrink-0 shadow-sm">
              <img src="/logo.jpg" alt={CLINIC_NAME} className="w-full h-full object-contain rounded-lg" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900 tracking-tight block leading-tight">
                {CLINIC_NAME}
              </span>
              <span className="text-xs text-teal-700 font-medium tracking-wide uppercase">
                Dr. Hemanth Kumar · BDS, MDS – Orthodontics
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs text-gray-500 font-medium">
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-teal-600" />
              <span>{CLINIC_PHONE}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-teal-600" />
              <span className="truncate max-w-[220px]">{CLINIC_ADDRESS}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hero & Portal Selection Area */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col justify-center">
        {/* Title Section */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100/80 text-teal-800 text-xs font-semibold mb-4 border border-teal-200">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
            <span>Secure Role-Based Health Records</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Welcome to <span className="text-teal-700">{CLINIC_NAME}</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">
            Choose how you want to continue. Please select the appropriate portal to sign in or register.
          </p>
        </div>

        {/* Portals Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
          {/* 1. STAFF PORTAL CARD */}
          <section
            aria-labelledby="staff-portal-title"
            className="group relative bg-white rounded-3xl p-7 sm:p-9 shadow-lg border border-gray-200/80 hover:border-teal-500/80 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute top-6 right-6">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                <Lock className="h-3 w-3 text-gray-500" />
                Clinic Staff
              </span>
            </div>

            <div>
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-teal-600 group-hover:text-white transition-all duration-300">
                <Stethoscope className="h-7 w-7" aria-hidden="true" />
              </div>

              <h2 id="staff-portal-title" className="text-2xl font-bold text-gray-900">
                Staff Portal
              </h2>

              <p className="mt-2 text-sm font-semibold text-teal-700">
                Administrator &bull; Doctor &bull; Receptionist
              </p>

              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                Dedicated management portal for clinic personnel. Manage patient registrations, appointment queues, clinical consultations, electronic prescriptions, and tariff masters.
              </p>

              <div className="mt-6 pt-6 border-t border-gray-100 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-gray-600">
                  <UserCheck className="h-4 w-4 text-teal-600 shrink-0" />
                  <span>Doctor consultation notes &amp; prescription issuance</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-gray-600">
                  <Calendar className="h-4 w-4 text-teal-600 shrink-0" />
                  <span>Reception queue management &amp; scheduling</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-gray-600">
                  <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0" />
                  <span>Admin tariffs, user roles &amp; audit trails</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                onClick={() => navigate('/login?portal=staff')}
                className="w-full py-3.5 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all group-hover:gap-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                <span>Continue to Staff Login</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <p className="mt-2 text-center text-xs text-gray-400">
                Staff credentials are provisioned by the Clinic Administrator
              </p>
            </div>
          </section>

          {/* 2. PATIENT PORTAL CARD */}
          <section
            aria-labelledby="patient-portal-title"
            className="group relative bg-white rounded-3xl p-7 sm:p-9 shadow-lg border border-gray-200/80 hover:border-cyan-500/80 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute top-6 right-6">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
                <Users className="h-3 w-3 text-cyan-600" />
                Patients &amp; Families
              </span>
            </div>

            <div>
              <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-cyan-600 group-hover:text-white transition-all duration-300">
                <Users className="h-7 w-7" aria-hidden="true" />
              </div>

              <h2 id="patient-portal-title" className="text-2xl font-bold text-gray-900">
                Patient Portal
              </h2>

              <p className="mt-2 text-sm font-semibold text-cyan-700">
                Registered Patients &bull; Clinic Care Access
              </p>

              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                Access your personalized dental care records anytime. View scheduled appointments, track treatment summaries, download valid prescriptions, or book a consultation request.
              </p>

              <div className="mt-6 pt-6 border-t border-gray-100 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-gray-600">
                  <Calendar className="h-4 w-4 text-cyan-600 shrink-0" />
                  <span>Book and review upcoming dental visits</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-gray-600">
                  <FileText className="h-4 w-4 text-cyan-600 shrink-0" />
                  <span>Instant access to active &amp; historical prescriptions</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-gray-600">
                  <Clock className="h-4 w-4 text-cyan-600 shrink-0" />
                  <span>Consultation diagnosis, tooth findings &amp; advice</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                onClick={() => navigate('/login?portal=patient')}
                className="w-full py-3.5 px-5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-semibold text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all group-hover:gap-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              >
                <span>Continue to Patient Login</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <p className="mt-2 text-center text-xs text-gray-400">
                Patient portal access is provided by clinic reception upon registration
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer Area */}
      <footer className="w-full border-t border-gray-200 bg-white/70 py-6 text-xs text-gray-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <p className="font-semibold text-gray-800">{CLINIC_NAME} &bull; Dr. Hemanth Kumar (BDS, MDS – Orthodontics)</p>
            <p className="text-gray-500 mt-0.5">
              {CLINIC_ADDRESS} &bull; Contact: {CLINIC_PHONE}
            </p>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Lock className="h-3.5 w-3.5 text-teal-600" />
            <span>Secured by Supabase Authentication</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
