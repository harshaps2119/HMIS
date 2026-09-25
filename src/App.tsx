import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/routing/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'

// Reception
import ReceptionLayout from './layouts/ReceptionLayout'
import ReceptionDashboard from './features/reception/Dashboard'
import PatientRegistration from './features/reception/PatientRegistration'
import PatientSearch from './features/reception/PatientSearch'
import PatientDetail from './features/reception/PatientDetail'
import AppointmentCreate from './features/reception/AppointmentCreate'
import AppointmentQueue from './features/reception/AppointmentQueue'
import TreatmentPriceReference from './features/reception/TreatmentPriceReference'
import MedicationReference from './features/reception/MedicationReference'

// Doctor
import DoctorLayout from './layouts/DoctorLayout'
import DoctorDashboard from './features/doctor/Dashboard'
import DoctorPatientSummary from './features/doctor/PatientSummary'
import ConsultationForm from './features/doctor/ConsultationForm'
import ConsultationView from './features/doctor/ConsultationView'
import PrescriptionView from './features/doctor/PrescriptionView'

// Patient
import PatientLayout from './layouts/PatientLayout'
import PatientDashboard from './features/patient/Dashboard'
import PatientAppointments from './features/patient/Appointments'
import PatientHistory from './features/patient/TreatmentHistory'
import PatientPrescriptions from './features/patient/Prescriptions'
import PatientPrescriptionDetail from './features/patient/PrescriptionDetail'

// Feedback
import ClinicFeedback from './features/feedback/ClinicFeedback'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Reception Routes */}
        <Route path="/reception" element={
          <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
            <ReceptionLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/reception/dashboard" replace />} />
          <Route path="dashboard" element={<ReceptionDashboard />} />
          <Route path="patients" element={<PatientSearch />} />
          <Route path="patients/register" element={<PatientRegistration />} />
          <Route path="patients/:patientRecordId" element={<PatientDetail />} />
          <Route path="appointments" element={<AppointmentQueue />} />
          <Route path="appointments/new" element={<AppointmentCreate />} />
          <Route path="treatments" element={<TreatmentPriceReference />} />
          <Route path="medications" element={<MedicationReference />} />
        </Route>

        {/* Doctor Routes */}
        <Route path="/doctor" element={
          <ProtectedRoute allowedRoles={['doctor', 'admin']}>
            <DoctorLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/doctor/dashboard" replace />} />
          <Route path="dashboard" element={<DoctorDashboard />} />
          <Route path="patients" element={<PatientSearch />} />
          <Route path="patients/:patientRecordId" element={<DoctorPatientSummary />} />
          <Route path="consultations/new/:appointmentId" element={<ConsultationForm />} />
          <Route path="consultations/:id" element={<ConsultationView />} />
          <Route path="prescriptions/:id" element={<PrescriptionView />} />
        </Route>

        {/* Patient Routes */}
        <Route path="/patient" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <PatientLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/patient/dashboard" replace />} />
          <Route path="dashboard" element={<PatientDashboard />} />
          <Route path="appointments" element={<PatientAppointments />} />
          <Route path="history" element={<PatientHistory />} />
          <Route path="prescriptions" element={<PatientPrescriptions />} />
          <Route path="prescriptions/:id" element={<PatientPrescriptionDetail />} />
        </Route>

        {/* Feedback (Authenticated staff and patients) */}
        <Route path="/feedback" element={
          <ProtectedRoute allowedRoles={['receptionist', 'doctor', 'patient', 'admin']}>
            <ClinicFeedback />
          </ProtectedRoute>
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
