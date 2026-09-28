// ─────────────────────────────────────────────────────────────
// Prasad Dental Care HMIS — Application Types
// Supabase PostgreSQL backend (no Firebase Timestamp dependency)
// ─────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'receptionist' | 'doctor' | 'patient'

export interface UserProfile {
  id: string          // Supabase auth UUID (PK of public.users)
  uid: string         // Alias for id — backwards compatibility
  name: string
  phone: string
  role: UserRole
  email?: string
  specialization?: string
  registrationNumber?: string
  active: boolean
  createdAt: string   // ISO 8601 timestamptz from Postgres
  patientId?: string  // Unique Patient ID (e.g. PDC-000001)
}

/**
 * PATIENT IDENTITY MODEL:
 * - id: UUID primary key in patients table
 * - patientId: Permanent Unique Patient ID (PDC-XXXXXX)
 * - uhid: Business Unique Health Identifier (synonymous with patientId)
 * - phone: Normalized verified mobile number (+91XXXXXXXXXX)
 */
export interface Patient {
  id: string          // UUID from patients table
  patientId?: string  // Permanent Unique Patient ID (PDC-XXXXXX)
  uhid: string        // Synonymous with patientId
  phone: string       // Normalized verified mobile number (+91XXXXXXXXXX)
  name: string
  nameLower?: string  // Generated column in Postgres
  dateOfBirth?: string
  age?: number
  gender: 'Male' | 'Female' | 'Other'
  address?: string
  email?: string
  allergies?: string
  medicalHistory?: string
  emergencyContact?: string
  emergencyContactName?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export type AppointmentStatus =
  | 'requested'
  | 'scheduled'
  | 'checked-in'
  | 'waiting'
  | 'in-consultation'
  | 'completed'
  | 'cancelled'
  | 'no-show'

export type VisitType = 'new-consultation' | 'follow-up' | 'emergency' | 'procedure'

export interface Appointment {
  id: string
  patientId?: string       // FK → patients.id
  patientRecordId: string  // Alias for patientId (backwards compat)
  patientPhone: string
  uhid: string
  patientName: string
  doctorId: string         // FK → users.id
  doctorName: string
  date: string             // YYYY-MM-DD
  time: string             // HH:MM
  visitType: VisitType
  reason: string
  expectedTreatment?: string
  expectedTreatmentPrice?: string
  status: AppointmentStatus
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface ToothFinding {
  toothNumber: string
  finding: string
  severity: 'Mild' | 'Moderate' | 'Severe'
  notes?: string
}

export interface Consultation {
  id: string
  patientId?: string       // FK → patients.id
  patientRecordId: string  // Alias for patientId (backwards compat)
  patientPhone: string
  uhid: string
  patientName: string
  doctorId: string
  doctorName: string
  appointmentId?: string
  date: string
  time: string
  chiefComplaint: string
  historyOfPresentIllness?: string
  clinicalExamination?: string
  diagnoses: string[]
  otherDiagnosis?: string
  toothFindings: ToothFinding[]
  treatmentPerformed?: string
  treatmentPlan?: string
  advice?: string
  followUpRequired: boolean
  followUpDate?: string
  status: 'draft' | 'finalized'
  createdAt: string
  updatedAt: string
}

export interface PrescriptionMedication {
  medicationId?: string
  name: string
  genericName?: string
  brandName?: string
  strength?: string
  dosageForm?: string
  dose: string
  frequency: string
  duration: string
  route: string           // Oral, Topical, Mouthwash, Other
  instructions?: string
  isCustom?: boolean
}

export interface Prescription {
  id: string
  consultationId: string
  patientId?: string       // FK → patients.id
  patientRecordId: string  // Alias for patientId (backwards compat)
  patientPhone: string
  uhid: string
  patientName: string
  patientAge?: number
  patientGender?: string
  doctorId: string
  doctorName: string
  doctorRegistrationNumber?: string
  date: string
  diagnoses: string[]
  medications: PrescriptionMedication[]
  advice?: string
  followUpDate?: string
  createdAt: string
}

export interface Medication {
  id: string
  name: string
  genericName?: string
  brandName?: string
  strength?: string
  dosageForm: string
  category: string
  combination: boolean
  active: boolean
  source: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * TREATMENT & PRICE MASTER DATA MODEL
 * Represents reference tariff ranges from Kurnool Dental Doctors Association.
 */
export interface TreatmentItem {
  id: string
  treatmentName: string
  category: string
  minPrice: number
  maxPrice: number | null  // null for unbounded e.g. "1,50,000+"
  priceDisplay: string
  active: boolean
  source: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export type AuditAction =
  | 'patient_registered'
  | 'patient_updated'
  | 'patient_verified'
  | 'patient_deleted'
  | 'staff_created'
  | 'staff_updated'
  | 'appointment_created'
  | 'appointment_updated'
  | 'consultation_created'
  | 'consultation_finalized'
  | 'prescription_generated'
  | 'prescription_viewed'
  | 'prescription_share_initiated'
  | 'user_login'
  | 'user_logout'
  | 'patient_id_generated'
  | 'patient_id_email_sent'
  | 'patient_id_email_failed'
  | 'patient_id_email_resent'

export interface AuditLog {
  id: string
  userId: string
  userRole: UserRole
  userName: string
  action: AuditAction
  targetId: string
  targetType: string
  description?: string
  timestamp: string    // mapped from created_at
}

export interface ClinicFeedback {
  id: string
  usabilityRating: number
  featureUsefulness: string[]
  problemsEncountered: string
  suggestions: string
  submittedByUid: string
  submittedByRole: string
  submittedByName: string
  submittedAt: string
}
