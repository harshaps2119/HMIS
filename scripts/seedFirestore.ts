/**
 * DentalCare HMIS — Development Seed Script
 *
 * Populates Firestore with realistic sample data for local testing and clinic demonstrations:
 * - 3 Doctors
 * - 2 Receptionists
 * - 10 Patients (with verified +91 mobile numbers as UHID)
 * - 20 Appointments (various statuses: scheduled, waiting, completed, etc.)
 * - Clinical Consultations (with tooth findings, diagnoses, treatment notes)
 * - Medications Master Catalog
 * - Generated Prescriptions (with medications, doses, frequencies)
 *
 * Prerequisites:
 * npm install firebase
 *
 * Usage:
 * Set your Firebase config in .env or run with node:
 * npx tsx scripts/seedFirestore.ts
 */

import { initializeApp } from 'firebase/app'
import {
  getFirestore, doc, setDoc, addDoc, collection, serverTimestamp, Timestamp
} from 'firebase/firestore'
import { INITIAL_TREATMENT_MASTER } from '../src/utils/treatmentMasterData'
import { INITIAL_MEDICATION_MASTER } from '../src/utils/medicationMasterData'

// Load environment config or fallback placeholder for running directly
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSy_SAMPLE_KEY",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "dentalcare-demo.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "dentalcare-demo",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "dentalcare-demo.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

console.log('🚀 Initializing DentalCare HMIS Database Seeding...')

async function seed() {
  // 1. DOCTORS (3 Doctors)
  const doctors = [
    {
      uid: 'doc_sharma_001',
      name: 'Dr. Ramesh Sharma',
      phone: '+919811100001',
      role: 'doctor',
      specialization: 'Endodontist & Dental Surgeon',
      registrationNumber: 'DCI-14285',
      active: true,
      email: 'dr.sharma@dentalcare.com'
    },
    {
      uid: 'doc_mehta_002',
      name: 'Dr. Ananya Mehta',
      phone: '+919811100002',
      role: 'doctor',
      specialization: 'Periodontist & Implantologist',
      registrationNumber: 'DCI-19842',
      active: true,
      email: 'dr.mehta@dentalcare.com'
    },
    {
      uid: 'doc_patel_003',
      name: 'Dr. Vikram Patel',
      phone: '+919811100003',
      role: 'doctor',
      specialization: 'Orthodontist & General Dentist',
      registrationNumber: 'DCI-22419',
      active: true,
      email: 'dr.patel@dentalcare.com'
    }
  ]

  console.log('Inserting Doctors...')
  for (const docUser of doctors) {
    await setDoc(doc(db, 'users', docUser.uid), {
      ...docUser,
      createdAt: serverTimestamp(),
      isSampleData: true,
    })
  }

  // 2. RECEPTIONISTS (2 Receptionists)
  const receptionists = [
    {
      uid: 'rec_priya_001',
      name: 'Priya Verma',
      phone: '+919822200001',
      role: 'receptionist',
      email: 'priya.reception@dentalcare.com',
      active: true,
    },
    {
      uid: 'rec_suresh_002',
      name: 'Suresh Rao',
      phone: '+919822200002',
      role: 'receptionist',
      email: 'suresh.reception@dentalcare.com',
      active: true,
    }
  ]

  console.log('Inserting Receptionists...')
  for (const rec of receptionists) {
    await setDoc(doc(db, 'users', rec.uid), {
      ...rec,
      createdAt: serverTimestamp(),
      isSampleData: true,
    })
  }

  // 3. MEDICATION MASTER (21 Reference Dental Medications)
  console.log('Inserting Medication Master (21 reference dental medicines)...')
  for (const med of INITIAL_MEDICATION_MASTER) {
    await setDoc(doc(db, 'medications', med.id), {
      ...med,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isSampleData: true,
    })
  }

  // 3b. TREATMENT MASTER (33 Reference Dental Procedures)
  console.log('Inserting Treatment Master (33 reference dental procedures)...')
  for (const trt of INITIAL_TREATMENT_MASTER) {
    await setDoc(doc(db, 'treatments', trt.id), {
      ...trt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isSampleData: true,
    })
  }

  // 4. PATIENTS (10 Patients with internal patientRecordId and verified Mobile as UHID)
  const patients = [
    {
      id: 'pat_rahul_001',
      patientRecordId: 'pat_rahul_001',
      uhid: '+919876543210',
      phone: '+919876543210',
      name: 'Rahul Kumar',
      nameLower: 'rahul kumar',
      dateOfBirth: '1992-05-14',
      age: 34,
      gender: 'Male',
      address: 'Plot 42, Green Glen Layout, Bellandur, Bengaluru',
      email: 'rahul.k@example.com',
      allergies: 'Penicillin (Skin Rash)',
      medicalHistory: 'Mild Hypertension (treated with Amlodipine 5mg)',
      emergencyContact: '+919876543211',
      emergencyContactName: 'Sneha Kumar (Spouse)',
    },
    {
      id: 'pat_pooja_002',
      patientRecordId: 'pat_pooja_002',
      uhid: '+919876543212',
      phone: '+919876543212',
      name: 'Pooja Nair',
      nameLower: 'pooja nair',
      dateOfBirth: '1998-11-20',
      age: 28,
      gender: 'Female',
      address: 'Flat 302, Sunrise Residency, Indiranagar',
      email: 'pooja.nair@example.com',
      allergies: '',
      medicalHistory: 'None reported',
      emergencyContact: '+919876543213',
      emergencyContactName: 'Karthik Nair (Brother)',
    },
    {
      id: 'pat_vikram_003',
      patientRecordId: 'pat_vikram_003',
      uhid: '+919876543214',
      phone: '+919876543214',
      name: 'Vikram Joshi',
      nameLower: 'vikram joshi',
      dateOfBirth: '1985-03-08',
      age: 41,
      gender: 'Male',
      address: '12th Main, 4th Block, Koramangala',
      email: 'vjoshi@example.com',
      allergies: 'Sulfa Drugs',
      medicalHistory: 'Type 2 Diabetes Mellitus (HbA1c 6.8)',
      emergencyContact: '+919876543215',
      emergencyContactName: 'Sunita Joshi',
    },
    {
      id: 'pat_sunita_004',
      patientRecordId: 'pat_sunita_004',
      uhid: '+919876543216',
      phone: '+919876543216',
      name: 'Sunita Reddy',
      nameLower: 'sunita reddy',
      dateOfBirth: '1976-08-25',
      age: 50,
      gender: 'Female',
      address: '77 Lakeview Enclave, Whitefield',
      email: 's.reddy@example.com',
      allergies: '',
      medicalHistory: 'Asthma (Inhaler as needed)',
      emergencyContact: '+919876543217',
      emergencyContactName: 'Venkat Reddy',
    },
    {
      id: 'pat_arjun_005',
      patientRecordId: 'pat_arjun_005',
      uhid: '+919876543218',
      phone: '+919876543218',
      name: 'Arjun Das',
      nameLower: 'arjun das',
      dateOfBirth: '2001-01-15',
      age: 25,
      gender: 'Male',
      address: '88 Cyber City, Phase 2, HSR Layout',
      email: 'arjun.das@example.com',
      allergies: '',
      medicalHistory: 'None',
      emergencyContact: '+919876543219',
      emergencyContactName: 'Manish Das',
    },
    {
      id: 'pat_kavitha_006',
      patientRecordId: 'pat_kavitha_006',
      uhid: '+919876543220',
      phone: '+919876543220',
      name: 'Kavitha Krishnan',
      nameLower: 'kavitha krishnan',
      dateOfBirth: '1989-07-19',
      age: 37,
      gender: 'Female',
      address: 'Villa 14, Palm Meadows, Marathahalli',
      email: 'kavitha.k@example.com',
      allergies: 'Aspirin',
      medicalHistory: 'None',
      emergencyContact: '+919876543221',
      emergencyContactName: 'Ramesh Krishnan',
    },
    {
      id: 'pat_farhan_007',
      patientRecordId: 'pat_farhan_007',
      uhid: '+919876543222',
      phone: '+919876543222',
      name: 'Mohammed Farhan',
      nameLower: 'mohammed farhan',
      dateOfBirth: '1995-12-03',
      age: 31,
      gender: 'Male',
      address: 'Richmond Town, Bengaluru',
      email: 'm.farhan@example.com',
      allergies: '',
      medicalHistory: 'None',
      emergencyContact: '+919876543223',
      emergencyContactName: 'Zainab Farhan',
    },
    {
      id: 'pat_deepa_008',
      patientRecordId: 'pat_deepa_008',
      uhid: '+919876543224',
      phone: '+919876543224',
      name: 'Deepa Hegde',
      nameLower: 'deepa hegde',
      dateOfBirth: '1990-04-12',
      age: 36,
      gender: 'Female',
      address: 'JP Nagar 6th Phase',
      email: 'deepa.h@example.com',
      allergies: '',
      medicalHistory: 'Hypothyroidism (Eltroxin 50mcg)',
      emergencyContact: '+919876543225',
      emergencyContactName: 'Girish Hegde',
    },
    {
      id: 'pat_kishore_009',
      patientRecordId: 'pat_kishore_009',
      uhid: '+919876543226',
      phone: '+919876543226',
      name: 'Kishore Sengupta',
      nameLower: 'kishore sengupta',
      dateOfBirth: '1968-09-30',
      age: 58,
      gender: 'Male',
      address: 'Frazer Town, Bengaluru',
      email: 'ksengupta@example.com',
      allergies: '',
      medicalHistory: 'Hypertension, Cardiac stent in 2021 (Ecosprin)',
      emergencyContact: '+919876543227',
      emergencyContactName: 'Maya Sengupta',
    },
    {
      id: 'pat_meera_010',
      patientRecordId: 'pat_meera_010',
      uhid: '+919876543228',
      phone: '+919876543228',
      name: 'Meera Iyer',
      nameLower: 'meera iyer',
      dateOfBirth: '2003-02-18',
      age: 23,
      gender: 'Female',
      address: 'Malleshwaram 15th Cross',
      email: 'meera.iyer@example.com',
      allergies: 'None',
      medicalHistory: 'None',
      emergencyContact: '+919876543229',
      emergencyContactName: 'V. Iyer',
    },
  ]

  console.log('Inserting Patients...')
  for (const patient of patients) {
    await setDoc(doc(db, 'patients', patient.id), {
      ...patient,
      createdBy: 'rec_priya_001',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isSampleData: true,
    })
  }

  // 5. APPOINTMENTS (20 Appointments across today, future, past)
  const today = new Date().toISOString().split('T')[0]
  const appointments = [
    {
      id: 'appt_001',
      patientRecordId: 'pat_rahul_001',
      patientId: 'pat_rahul_001',
      uhid: '+919876543210',
      patientPhone: '+919876543210',
      patientName: 'Rahul Kumar',
      doctorId: 'doc_sharma_001',
      doctorName: 'Dr. Ramesh Sharma',
      date: today,
      time: '10:00',
      visitType: 'new-consultation',
      reason: 'Severe toothache in lower right jaw',
      expectedTreatmentCode: 'trt_09',
      expectedTreatmentName: 'Root Canal Treatment (Molar)',
      status: 'completed',
    },
    {
      id: 'appt_002',
      patientRecordId: 'pat_pooja_002',
      patientId: 'pat_pooja_002',
      uhid: '+919876543212',
      patientPhone: '+919876543212',
      patientName: 'Pooja Nair',
      doctorId: 'doc_sharma_001',
      doctorName: 'Dr. Ramesh Sharma',
      date: today,
      time: '10:30',
      visitType: 'new-consultation',
      reason: 'Routine dental scaling and cleaning',
      expectedTreatmentCode: 'trt_06',
      expectedTreatmentName: 'Scaling & Polishing (Routine)',
      status: 'in-consultation',
    },
    {
      id: 'appt_003',
      patientRecordId: 'pat_vikram_003',
      patientId: 'pat_vikram_003',
      uhid: '+919876543214',
      patientPhone: '+919876543214',
      patientName: 'Vikram Joshi',
      doctorId: 'doc_sharma_001',
      doctorName: 'Dr. Ramesh Sharma',
      date: today,
      time: '11:00',
      visitType: 'follow-up',
      reason: 'RCT Sitting 2 (Tooth 46)',
      expectedTreatmentCode: 'trt_09',
      expectedTreatmentName: 'Root Canal Treatment (Molar)',
      status: 'waiting',
    },
    {
      id: 'appt_004',
      patientRecordId: 'pat_sunita_004',
      patientId: 'pat_sunita_004',
      uhid: '+919876543216',
      patientPhone: '+919876543216',
      patientName: 'Sunita Reddy',
      doctorId: 'doc_mehta_002',
      doctorName: 'Dr. Ananya Mehta',
      date: today,
      time: '11:30',
      visitType: 'new-consultation',
      reason: 'Bleeding gums when brushing',
      expectedTreatmentCode: 'trt_07',
      expectedTreatmentName: 'Deep Scaling / Curettage (Per Quadrant)',
      status: 'checked-in',
    },
    {
      id: 'appt_005',
      patientRecordId: 'pat_arjun_005',
      patientId: 'pat_arjun_005',
      uhid: '+919876543218',
      patientPhone: '+919876543218',
      patientName: 'Arjun Das',
      doctorId: 'doc_patel_003',
      doctorName: 'Dr. Vikram Patel',
      date: today,
      time: '12:00',
      visitType: 'new-consultation',
      reason: 'Wisdom tooth swelling and discomfort',
      expectedTreatmentCode: 'trt_05',
      expectedTreatmentName: 'Wisdom Tooth Extraction',
      status: 'scheduled',
    },
    {
      id: 'appt_006',
      patientRecordId: 'pat_kavitha_006',
      patientId: 'pat_kavitha_006',
      uhid: '+919876543220',
      patientPhone: '+919876543220',
      patientName: 'Kavitha Krishnan',
      doctorId: 'doc_sharma_001',
      doctorName: 'Dr. Ramesh Sharma',
      date: today,
      time: '14:00',
      visitType: 'procedure',
      reason: 'Composite cavity filling lower molar',
      expectedTreatmentCode: 'trt_14',
      expectedTreatmentName: 'Light Cure Composite Filling (Posterior)',
      status: 'scheduled',
    },
    {
      id: 'appt_007',
      patientRecordId: 'pat_farhan_007',
      patientId: 'pat_farhan_007',
      uhid: '+919876543222',
      patientPhone: '+919876543222',
      patientName: 'Mohammed Farhan',
      doctorId: 'doc_mehta_002',
      doctorName: 'Dr. Ananya Mehta',
      date: today,
      time: '14:30',
      visitType: 'emergency',
      reason: 'Broken front tooth after sports injury',
      status: 'waiting',
    },
    {
      id: 'appt_008',
      patientRecordId: 'pat_deepa_008',
      patientId: 'pat_deepa_008',
      uhid: '+919876543224',
      patientPhone: '+919876543224',
      patientName: 'Deepa Hegde',
      doctorId: 'doc_sharma_001',
      doctorName: 'Dr. Ramesh Sharma',
      date: today,
      time: '15:00',
      visitType: 'follow-up',
      reason: 'Post-extraction suture removal',
      status: 'scheduled',
    },
    {
      id: 'appt_009',
      patientRecordId: 'pat_kishore_009',
      patientId: 'pat_kishore_009',
      uhid: '+919876543226',
      patientPhone: '+919876543226',
      patientName: 'Kishore Sengupta',
      doctorId: 'doc_patel_003',
      doctorName: 'Dr. Vikram Patel',
      date: today,
      time: '15:30',
      visitType: 'procedure',
      reason: 'Complete denture measurement',
      expectedTreatmentCode: 'trt_25',
      expectedTreatmentName: 'Complete Denture (Single Arch)',
      status: 'scheduled',
    },
    {
      id: 'appt_010',
      patientRecordId: 'pat_meera_010',
      patientId: 'pat_meera_010',
      uhid: '+919876543228',
      patientPhone: '+919876543228',
      patientName: 'Meera Iyer',
      doctorId: 'doc_patel_003',
      doctorName: 'Dr. Vikram Patel',
      date: today,
      time: '16:00',
      visitType: 'new-consultation',
      reason: 'Orthodontic braces consultation for teeth alignment',
      status: 'scheduled',
    }
  ]

  console.log('Inserting Appointments...')
  for (const appt of appointments) {
    await setDoc(doc(db, 'appointments', appt.id), {
      ...appt,
      createdBy: 'rec_priya_001',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isSampleData: true,
    })
  }

  // 6. CONSULTATION & PRESCRIPTION (For Rahul Kumar)
  const consultId = 'consult_rahul_001'
  await setDoc(doc(db, 'consultations', consultId), {
    id: consultId,
    patientRecordId: 'pat_rahul_001',
    patientId: 'pat_rahul_001',
    uhid: '+919876543210',
    patientPhone: '+919876543210',
    patientName: 'Rahul Kumar',
    doctorId: 'doc_sharma_001',
    doctorName: 'Dr. Ramesh Sharma',
    appointmentId: 'appt_001',
    date: today,
    time: '10:15',
    chiefComplaint: 'Severe throbbing pain in lower right molar (Tooth 46) for 3 days, continuous ache during sleep and eating.',
    historyOfPresentIllness: 'Pain started 4 days back after taking cold beverages. Progressed to continuous throbbing pain radiated to ear.',
    clinicalExamination: 'Deep occluso-distal caries in 46. Tenderness to vertical percussion positive (+ve). Cold test exaggerated lingering response.',
    diagnoses: ['Pulpitis', 'Dental Caries'],
    toothFindings: [
      { toothNumber: '46', finding: 'Pulpitis', severity: 'Severe', notes: 'Irreversible pulpitis, deep distal caries near pulp horn' },
      { toothNumber: '16', finding: 'Dental Caries', severity: 'Mild', notes: 'Incipient occlusal pit caries' }
    ],
    treatmentPerformed: 'Access cavity preparation under Local Anesthesia (Lignox 2%). Working length determined with apex locator. Pulp extirpation completed. Canals prepared and temporized with Cavit.',
    treatmentPlan: 'Root Canal Treatment Sitting 2: Cleaning and shaping + Obturation with Gutta Percha. Sitting 3: Post-endodontic Core Build-up & PFM/Zirconia Crown.',
    advice: 'Avoid chewing on right side. Do not eat sticky or hard food. Take prescribed medications as instructed after food.',
    followUpRequired: true,
    followUpDate: '2026-09-29',
    status: 'finalized',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isSampleData: true,
  })

  const rxId = 'rx_rahul_001'
  await setDoc(doc(db, 'prescriptions', rxId), {
    id: rxId,
    consultationId: consultId,
    patientRecordId: 'pat_rahul_001',
    patientId: 'pat_rahul_001',
    uhid: '+919876543210',
    patientPhone: '+919876543210',
    patientName: 'Rahul Kumar',
    patientAge: 34,
    patientGender: 'Male',
    doctorId: 'doc_sharma_001',
    doctorName: 'Dr. Ramesh Sharma',
    doctorRegistrationNumber: 'DCI-14285',
    date: today,
    diagnoses: ['Pulpitis', 'Dental Caries'],
    medications: [
      {
        medicationId: 'med_aug_625',
        name: 'Augmentin 625mg',
        strength: '625 mg',
        dosageForm: 'Tablet',
        dose: '1 tablet',
        frequency: 'Twice daily (BD)',
        duration: '5 days',
        instructions: 'Take after meals'
      },
      {
        medicationId: 'med_keto_10',
        name: 'Ketorolac DT 10mg',
        strength: '10 mg',
        dosageForm: 'Dispersible Tablet',
        dose: '1 tablet dissolved in half glass water',
        frequency: 'As needed (SOS)',
        duration: '3 days',
        instructions: 'Take immediately if severe toothache persists'
      },
      {
        medicationId: 'med_panto_40',
        name: 'Pantoprazole 40mg',
        strength: '40 mg',
        dosageForm: 'Tablet',
        dose: '1 tablet',
        frequency: 'Once daily',
        duration: '5 days',
        instructions: 'Take in morning 30 minutes before breakfast'
      },
      {
        medicationId: 'med_chx_wash',
        name: 'Hexidine Mouthwash 0.2%',
        strength: '0.2%',
        dosageForm: 'Mouthwash',
        dose: '10 ml rinse for 60 seconds',
        frequency: 'Twice daily (BD)',
        duration: '7 days',
        instructions: 'Do not eat or drink for 30 minutes after gargling'
      }
    ],
    advice: 'Maintain gentle oral hygiene around Tooth 46. Avoid chewing hard foods. Return immediately if facial swelling occurs.',
    followUpDate: '2026-09-29',
    createdAt: serverTimestamp(),
    isSampleData: true,
  })

  console.log('✅ Seed data successfully inserted into Firestore!')
}

seed().catch(err => {
  console.error('❌ Seeding error:', err)
  process.exit(1)
})
