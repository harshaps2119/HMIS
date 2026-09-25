# DentalCare HMIS — Build Tasks

## Phase 1 — Project Scaffold
- [x] Initialize Vite + React + TypeScript project (`package.json`, `vite.config.ts`, `tsconfig.json`)
- [x] Dependencies specified (Tailwind, Firebase, Router, Lucide, Date-fns)
- [x] Configure Tailwind CSS (`tailwind.config.js`, `postcss.config.js`, `src/index.css`)
- [x] Create `.env.example` and `.gitignore`
- [x] Project directory structure established

## Phase 2 — Firebase & Types
- [x] `src/firebase/config.ts` (Firebase app, auth, db, storage)
- [x] `src/firebase/auth.ts` (Phone Auth, OTP send/verify, recaptcha setup)
- [x] `src/types/index.ts` (UserProfile, Patient, Appointment, Consultation, Prescription, ToothFinding, Medication, AuditLog)

## Phase 3 — Services
- [x] `src/services/auditService.ts` (append-only audit log)
- [x] `src/services/userService.ts` (profiles & doctor queries)
- [x] `src/services/patientService.ts` (CRUD, phone search, name search)
- [x] `src/services/appointmentService.ts` (CRUD, daily queue, doctor queue)
- [x] `src/services/consultationService.ts` (clinical records & patient consultations)
- [x] `src/services/prescriptionService.ts` (permanent Rx generation & query)
- [x] `src/services/medicationService.ts` (medication master query & search)

## Phase 4 — Auth & Context
- [x] `src/contexts/AuthContext.tsx` (state listener, role loader, provider)
- [x] `src/pages/LoginPage.tsx` (unified phone OTP sign-in with role-based routing)

## Phase 5 — Routing & Layouts
- [x] `src/App.tsx` (complete route definition with guards)
- [x] `src/components/routing/ProtectedRoute.tsx` (RBAC access guard)
- [x] `src/layouts/ReceptionLayout.tsx` (reception sidebar & header)
- [x] `src/layouts/DoctorLayout.tsx` (doctor sidebar & header)
- [x] `src/layouts/PatientLayout.tsx` (patient portal sidebar & header)

## Phase 6 — Shared UI Components
- [x] `src/components/ui/LoadingSpinner.tsx`
- [x] `src/components/ui/EmptyState.tsx`
- [x] `src/components/ui/ErrorState.tsx`
- [x] `src/components/ui/StatusBadge.tsx`
- [x] `src/components/ui/Modal.tsx`
- [x] `src/components/ui/ConfirmDialog.tsx`
- [x] `src/components/ui/SearchInput.tsx`
- [x] `src/components/ui/Card.tsx`
- [x] `src/utils/dateUtils.ts`
- [x] `src/utils/errorUtils.ts`
- [x] `src/utils/constants.ts`

## Phase 7 — Receptionist Module
- [x] `src/features/reception/Dashboard.tsx` (Daily metrics, quick actions, today's queue)
- [x] `src/features/reception/PatientRegistration.tsx` (OTP verification, phone = UHID, full demographics)
- [x] `src/features/reception/PatientSearch.tsx` (Live name and UHID search)
- [x] `src/features/reception/PatientDetail.tsx` (Demographics, allergies, appointment history)
- [x] `src/features/reception/AppointmentCreate.tsx` (Doctor, date, time, visit type, notes)
- [x] `src/features/reception/AppointmentQueue.tsx` (Real-time status transitions: check-in, waiting, consultation)

## Phase 8 — Doctor Module
- [x] `src/features/doctor/Dashboard.tsx` (Assigned queue, status counters, patient record lookup)
- [x] `src/features/doctor/PatientSummary.tsx` (Demographics, allergy warnings, systemic history, past visits)
- [x] `src/features/doctor/ConsultationForm.tsx` (Chief complaint, FDI tooth findings, diagnoses, Rx builder)
- [x] `src/features/doctor/ConsultationView.tsx` (Clinical evaluation review)
- [x] `src/features/doctor/PrescriptionView.tsx` (Official Rx document, print/PDF layout, WhatsApp share)

## Phase 9 — Patient Portal
- [x] `src/features/patient/Dashboard.tsx` (Greeting with UHID, upcoming appointment, latest consultation, active Rx)
- [x] `src/features/patient/Appointments.tsx` (Upcoming, past, cancelled appointment tabs)
- [x] `src/features/patient/TreatmentHistory.tsx` (Chronological clinical timeline with tooth findings & notes)
- [x] `src/features/patient/Prescriptions.tsx` (Prescription list with medicine counts & direct actions)
- [x] `src/features/patient/PrescriptionDetail.tsx` (Strict patient isolation verification & print layout)

## Phase 10 — Feedback & Admin
- [x] `src/features/feedback/ClinicFeedback.tsx` (1-5 Star rating, feature usefulness, friction notes, suggestions)

## Phase 11 — Security Rules & Indexes
- [x] `firestore.rules` (Strict RBAC, patient data isolation, doctor-only clinical writes, append-only audit)
- [x] `firestore.indexes.json` (Composite indexes for appointments, consultations, prescriptions)
- [x] `firebase.json` (Hosting & rules deployment configuration)
- [x] `.firebaserc` (Project alias)

## Phase 12 — Seed Script & Docs
- [x] `scripts/seedFirestore.ts` (3 doctors, 2 receptionists, 10 patients, 20 appointments, clinical records, medications)
- [x] `FIREBASE_SETUP.md` (Complete 10-step configuration guide with test OTP credentials)
- [x] `README.md` (Project overview, architecture, test verification scenarios, privacy notice)
