export const DENTAL_DIAGNOSES = [
  'Dental Caries',
  'Gingivitis',
  'Periodontitis',
  'Pulpitis',
  'Dental Abscess',
  'Tooth Fracture',
  'Tooth Sensitivity',
  'Impacted Tooth',
  'Missing Tooth',
  'Malocclusion',
  'Bruxism',
  'Oral Ulcer',
  'Dry Socket',
  'Temporomandibular Joint Disorder',
]

export const TREATMENT_TYPES = [
  'Consultation',
  'Scaling & Polishing',
  'Dental Filling',
  'Root Canal Treatment',
  'Extraction',
  'Crown',
  'Bridge',
  'Implant',
  'Dental Cleaning',
  'Bleaching / Whitening',
  'Orthodontic Treatment',
  'Denture Fitting',
  'Follow-up',
  'Other',
]

export const DOSE_FREQUENCIES = [
  'Once daily',
  'Twice daily (BD)',
  'Three times daily (TDS)',
  'Four times daily (QID)',
  'Every 4 hours',
  'Every 6 hours',
  'Every 8 hours',
  'At night (HS)',
  'As needed (SOS)',
  'Once only',
]

export const DOSE_DURATIONS = [
  '1 day',
  '2 days',
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '1 month',
  'Continue as directed',
]

export const TOOTH_FINDINGS = [
  'Dental Caries',
  'Restoration',
  'Missing',
  'Crown',
  'Root Canal Treated',
  'Fracture',
  'Mobility',
  'Periapical Pathology',
  'Calculus',
  'Staining',
  'Normal',
]

export const CLINIC_NAME = import.meta.env.VITE_CLINIC_NAME || 'Prasad Dental Care'
export const CLINIC_ADDRESS = import.meta.env.VITE_CLINIC_ADDRESS || 'N V R Buildings, Kothapeta, Kurnool, Andhra Pradesh – 518004'
export const CLINIC_PHONE = import.meta.env.VITE_CLINIC_PHONE || '8328456378'
export const CLINIC_EMAIL = import.meta.env.VITE_CLINIC_EMAIL || 'hemanth.kumar@prasaddentalcare.com'

export const DEFAULT_DOCTOR_NAME = 'Dr. Hemanth Kumar'
export const DEFAULT_DOCTOR_QUALIFICATIONS = 'BDS, MDS – Orthodontics'
export const DEFAULT_DOCTOR_SPECIALIZATION = 'Orthodontics'
export const DEFAULT_DOCTOR_PHONE = '8328456378'
export const DEFAULT_DOCTOR_EMAIL = 'hemanth.kumar@prasaddentalcare.com'
export const PATIENT_ID_PREFIX = 'PDC'

export const CLINIC_CONFIG = {
  name: CLINIC_NAME,
  address: CLINIC_ADDRESS,
  phone: CLINIC_PHONE,
  email: CLINIC_EMAIL,
  logo: '/logo.jpg',
  doctor: {
    name: DEFAULT_DOCTOR_NAME,
    qualifications: DEFAULT_DOCTOR_QUALIFICATIONS,
    specialization: DEFAULT_DOCTOR_SPECIALIZATION,
    phone: DEFAULT_DOCTOR_PHONE,
    email: DEFAULT_DOCTOR_EMAIL,
  },
  patientIdPrefix: PATIENT_ID_PREFIX,
} as const

