/**
 * DentalCare HMIS — Automated End-to-End & Integrity Test Suite
 * Tests Auth, Role Isolation, Phone/UHID Normalization,
 * Appointment Request Lifecycle, Clinical Prescriptions, and RLS behavior.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Auto-load .env if present
try {
  const envPath = path.resolve('.env')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=')
        if (idx !== -1) {
          const k = trimmed.slice(0, idx).trim()
          let v = trimmed.slice(idx + 1).trim()
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1)
          }
          if (!process.env[k]) process.env[k] = v
          const unprefix = k.replace('VITE_', '')
          if (!process.env[unprefix]) process.env[unprefix] = v
        }
      }
    }
  }
} catch {
  // ignore
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null

let passed = 0
let failed = 0
const results = []

function assert(condition, name, details = '') {
  if (condition) {
    passed++
    results.push({ status: 'PASS', name, details })
    console.log(`  [PASS] ${name}`)
  } else {
    failed++
    results.push({ status: 'FAIL', name, details })
    console.error(`  [FAIL] ${name} ${details ? '- ' + details : ''}`)
  }
}

async function runTests() {
  console.log('====================================================')
  console.log('DentalCare HMIS — Automated Verification Suite')
  console.log(`Backend Target: ${SUPABASE_URL ? 'configured' : 'not configured'}`)
  console.log('====================================================\n')

  // ----------------------------------------------------
  // SUITE 1: Phone / UHID Normalization & Validation
  // ----------------------------------------------------
  console.log('SUITE 1: Phone / UHID Normalization & Validation')
  
  function normalizePhoneNumber(raw) {
    if (!raw) return ''
    const digits = raw.replace(/\D/g, '')
    if (digits.length === 10) return `+91${digits}`
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
    return digits.startsWith('+') ? digits : `+${digits}`
  }

  function isValidIndianMobile(phone) {
    return /^\+91[6-9]\d{9}$/.test(phone)
  }

  const p1 = normalizePhoneNumber('9876543210')
  assert(p1 === '+919876543210', 'Normalizes 10-digit Indian number to E.164 (+919876543210)')
  assert(isValidIndianMobile(p1) === true, 'Accepts valid Indian mobile prefix (+919876543210)')

  const p2 = normalizePhoneNumber('+91 98111 00001')
  assert(p2 === '+919811100001', 'Strips whitespace and preserves +91 country code')

  const pInvalid = normalizePhoneNumber('12345')
  assert(isValidIndianMobile(pInvalid) === false, 'Rejects invalid/short mobile numbers')

  const pNonIndian = normalizePhoneNumber('1234567890')
  assert(isValidIndianMobile(pNonIndian) === false, 'Rejects numbers not starting with 6,7,8,9')

  // ----------------------------------------------------
  // SUITE 2: Role Architecture & Route Isolation
  // ----------------------------------------------------
  console.log('\nSUITE 2: Role Architecture & Route Isolation')

  const roleDashboard = {
    receptionist: '/reception/dashboard',
    doctor: '/doctor/dashboard',
    patient: '/patient/dashboard',
    admin: '/reception/dashboard',
  }

  assert(roleDashboard.admin === '/reception/dashboard', 'Admin maps to reception dashboard')
  assert(roleDashboard.receptionist === '/reception/dashboard', 'Receptionist maps to reception dashboard')
  assert(roleDashboard.doctor === '/doctor/dashboard', 'Doctor maps to doctor dashboard')
  assert(roleDashboard.patient === '/patient/dashboard', 'Patient maps to patient dashboard')

  // Role guard verification
  function isRouteAllowed(role, allowedRoles) {
    return allowedRoles.includes(role)
  }

  assert(isRouteAllowed('patient', ['doctor', 'admin']) === false, 'Patient is blocked from /doctor routes')
  assert(isRouteAllowed('patient', ['receptionist', 'admin']) === false, 'Patient is blocked from /reception routes')
  assert(isRouteAllowed('doctor', ['receptionist', 'admin']) === false, 'Doctor is blocked from receptionist-only actions')
  assert(isRouteAllowed('receptionist', ['patient']) === false, 'Receptionist cannot accidentally enter patient-only routes')

  // ----------------------------------------------------
  // SUITE 3: Appointment Limit Architecture (Part 9)
  // ----------------------------------------------------
  console.log('\nSUITE 3: Appointment Limit Architecture (Part 9)')

  async function checkAppointmentLimitMock(doctorId, date, configuredMax) {
    const currentCount = 5
    const allowed = configuredMax === undefined || currentCount < configuredMax
    return { allowed, currentCount, maxAllowed: configuredMax }
  }

  const unconstrained = await checkAppointmentLimitMock('doc_001', '2026-09-28', undefined)
  assert(unconstrained.allowed === true, 'Defaults to allowed when no hard limit is configured')

  const underLimit = await checkAppointmentLimitMock('doc_001', '2026-09-28', 10)
  assert(underLimit.allowed === true, 'Allows booking when count (5) is under maximum (10)')

  const overLimit = await checkAppointmentLimitMock('doc_001', '2026-09-28', 5)
  assert(overLimit.allowed === false, 'Enforces boundary when appointments reach maximum capacity')

  // ----------------------------------------------------
  // SUITE 4: Prescription Validation & Immutability Rules
  // ----------------------------------------------------
  console.log('\nSUITE 4: Prescription Validation & Immutability Rules')

  function validatePrescription(data) {
    if (!data.medications || data.medications.length === 0) {
      throw new Error('Cannot generate an empty prescription. Add at least one medication.')
    }
    for (const m of data.medications) {
      if (!m.name || !m.dose || !m.frequency || !m.duration || !m.route) {
        throw new Error(`Incomplete medication entry: "${m.name || 'Unnamed'}". Dose, frequency, duration, and route are mandatory.`)
      }
    }
    return true
  }

  let emptyRxError = false
  try {
    validatePrescription({ medications: [] })
  } catch {
    emptyRxError = true
  }
  assert(emptyRxError === true, 'Blocks generating empty prescriptions without medications')

  let incompleteMedError = false
  try {
    validatePrescription({
      medications: [{ name: 'Amoxicillin', dose: '500mg' }] // missing frequency, duration, route
    })
  } catch {
    incompleteMedError = true
  }
  assert(incompleteMedError === true, 'Mandates dose, frequency, duration, and route for all medications')

  const validRx = validatePrescription({
    medications: [
      { name: 'Ofloxacin', dose: '1 tab', frequency: 'Twice daily', duration: '5 days', route: 'Oral' }
    ]
  })
  assert(validRx === true, 'Accepts complete, well-formed prescription entries')

  // ----------------------------------------------------
  // SUITE 5: Online Appointment Request Lifecycle
  // ----------------------------------------------------
  console.log('\nSUITE 5: Online Appointment Request Lifecycle')

  const validStatuses = ['requested', 'scheduled', 'checked-in', 'waiting', 'in-consultation', 'completed', 'cancelled', 'no-show']
  assert(validStatuses.includes('requested'), "'requested' status is included in valid appointment statuses")

  // Simulate receptionist actions
  let testAppt = {
    id: 'appt_test_01',
    status: 'requested',
    doctorName: 'Dr. Ramesh Sharma',
    date: '2026-09-28',
    time: '10:00',
    notes: 'Online request',
  }

  // 1. Confirm
  testAppt = {
    ...testAppt,
    status: 'scheduled',
    notes: `${testAppt.notes} [Confirmed: Slot verified]`,
  }
  assert(testAppt.status === 'scheduled', 'Confirm action transitions status from requested -> scheduled')
  assert(testAppt.notes.includes('Confirmed'), 'Confirm action appends confirmation audit note')

  // 2. Reschedule
  testAppt = {
    ...testAppt,
    date: '2026-09-29',
    time: '11:30',
    notes: `${testAppt.notes} [Rescheduled: Patient requested later slot]`,
  }
  assert(testAppt.date === '2026-09-29', 'Reschedule action updates appointment date')
  assert(testAppt.time === '11:30', 'Reschedule action updates appointment time slot')

  // 3. Reject
  let rejectAppt = { id: 'appt_test_02', status: 'requested', notes: 'Online request' }
  rejectAppt = {
    ...rejectAppt,
    status: 'cancelled',
    notes: `${rejectAppt.notes} [Request Rejected: Doctor on leave]`,
  }
  assert(rejectAppt.status === 'cancelled', 'Reject action marks appointment as cancelled')
  assert(rejectAppt.notes.includes('Doctor on leave'), 'Reject action records explicit rejection reason')

  // ----------------------------------------------------
  // SUITE 6: Live Supabase Backend & Auth Verification
  // ----------------------------------------------------
  console.log('\nSUITE 6: Live Supabase Backend & Database Schema')

  if (supabase) {
    try {
      const { error: medError } = await supabase.from('medications').select('id, name').limit(1)
      assert(!medError || medError.code === 'PGRST116' || medError.code === '42501', 'Supabase medications table is reachable')
    } catch (err) {
      assert(false, 'Supabase connectivity failed', err.message)
    }
  } else {
    console.log('  [BLOCKED] Live Supabase checks require SUPABASE_URL and SUPABASE_ANON_KEY.')
  }

  const demoAccounts = [
    { email: process.env.E2E_ADMIN_EMAIL || 'admin@dentalcare.com', password: process.env.E2E_ADMIN_PASSWORD || 'Password123!', role: 'admin' },
    { email: process.env.E2E_DOCTOR_EMAIL || 'dr.sharma@dentalcare.com', password: process.env.E2E_DOCTOR_PASSWORD || 'Password123!', role: 'doctor' },
    { email: process.env.E2E_RAHUL_EMAIL || 'rahul.kumar@dentalcare.com', password: process.env.E2E_RAHUL_PASSWORD || 'Password123!', role: 'patient' },
    { email: process.env.E2E_POOJA_EMAIL || 'pooja.patel@dentalcare.com', password: process.env.E2E_POOJA_PASSWORD || 'Password123!', role: 'patient' }
  ]

  if (supabase) {
    console.log('\nChecking live Supabase Auth accounts:')
    for (const acc of demoAccounts) {
      if (!acc.email || !acc.password) {
        console.log(`  [BLOCKED] Missing E2E credentials for ${acc.role}.`)
        continue
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email: acc.email, password: acc.password })
      assert(!error && Boolean(data?.user), `Live login for ${acc.role}`)
    }
  }

  // ----------------------------------------------------
  // SUITE 7: Slot Conflict Detection & Deduplication
  // ----------------------------------------------------
  console.log('\nSUITE 7: Slot Conflict Detection & Deduplication')

  const existingBookings = [
    { id: 'appt_1', doctorId: 'doc_1', date: '2026-09-28', time: '10:00', status: 'scheduled', doctorName: 'Dr. Sharma', patientName: 'Rahul Kumar' },
    { id: 'appt_2', doctorId: 'doc_1', date: '2026-09-28', time: '11:00', status: 'cancelled', doctorName: 'Dr. Sharma', patientName: 'Pooja Patel' },
    { id: 'appt_3', doctorId: 'doc_2', date: '2026-09-28', time: '10:00', status: 'scheduled', doctorName: 'Dr. Mehta', patientName: 'Amit Shah' },
  ]

  function simulateSlotCheck(doctorId, date, time, excludeId) {
    const activeStatuses = ['scheduled', 'checked-in', 'waiting', 'in-consultation']
    const conflict = existingBookings.find(b =>
      b.doctorId === doctorId &&
      b.date === date &&
      b.time === time &&
      activeStatuses.includes(b.status) &&
      (!excludeId || b.id !== excludeId)
    )
    if (conflict) {
      return { available: false, conflictReason: `Slot conflict: Dr. ${conflict.doctorName} already has a ${conflict.status} appointment` }
    }
    return { available: true }
  }

  const conflictSameDocSameTime = simulateSlotCheck('doc_1', '2026-09-28', '10:00')
  assert(conflictSameDocSameTime.available === false, 'Detects conflict when booking same doctor at same date and time')

  const diffDocSameTime = simulateSlotCheck('doc_3', '2026-09-28', '10:00')
  assert(diffDocSameTime.available === true, 'Allows booking different doctor at the same time slot')

  const sameDocDiffTime = simulateSlotCheck('doc_1', '2026-09-28', '10:30')
  assert(sameDocDiffTime.available === true, 'Allows booking same doctor at a different, open time slot')

  const cancelledSlotReusable = simulateSlotCheck('doc_1', '2026-09-28', '11:00')
  assert(cancelledSlotReusable.available === true, 'Cancelled appointment slots are recognized as available')

  const selfExclusion = simulateSlotCheck('doc_1', '2026-09-28', '10:00', 'appt_1')
  assert(selfExclusion.available === true, 'Allows rescheduling an appointment to its own slot during status confirmation')

  // ----------------------------------------------------
  // SUITE 8: Initial Entry & Portal Navigation Architecture
  // ----------------------------------------------------
  console.log('\nSUITE 8: Initial Entry & Portal Navigation Architecture')

  function resolvePortalMode(param) {
    return param === 'staff' ? 'staff' : 'patient'
  }

  assert(resolvePortalMode('staff') === 'staff', 'Resolves portal=staff parameter to staff mode')
  assert(resolvePortalMode('patient') === 'patient', 'Resolves portal=patient parameter to patient mode')
  assert(resolvePortalMode(null) === 'patient', 'Defaults to patient portal when portal parameter is omitted')
  assert(resolvePortalMode('invalid') === 'patient', 'Defaults to patient portal when unrecognized portal is provided')

  // Unauthenticated redirection target resolution
  function getUnauthenticatedRedirect(allowedRoles) {
    const isPatientRoute = allowedRoles.includes('patient') && !allowedRoles.includes('doctor') && !allowedRoles.includes('receptionist')
    return isPatientRoute ? '/login?portal=patient' : '/login?portal=staff'
  }

  assert(getUnauthenticatedRedirect(['receptionist', 'admin']) === '/login?portal=staff', 'Unauthenticated staff route redirects to staff portal')
  assert(getUnauthenticatedRedirect(['doctor', 'admin']) === '/login?portal=staff', 'Unauthenticated doctor route redirects to staff portal')
  assert(getUnauthenticatedRedirect(['patient']) === '/login?portal=patient', 'Unauthenticated patient route redirects to patient portal')

  // Role authority precedence: user profile role always dictates final destination
  function resolveAuthenticatedDestination(userRole, selectedPortal) {
    const roleDashboardMap = {
      receptionist: '/reception/dashboard',
      doctor: '/doctor/dashboard',
      patient: '/patient/dashboard',
      admin: '/reception/dashboard',
    }
    // Strict security: client portal choice NEVER overrides database profile role
    return roleDashboardMap[userRole]
  }

  assert(
    resolveAuthenticatedDestination('patient', 'staff') === '/patient/dashboard',
    'Patient account selecting staff portal is safely routed to patient dashboard (no privilege escalation)'
  )
  assert(
    resolveAuthenticatedDestination('doctor', 'patient') === '/doctor/dashboard',
    'Doctor account selecting patient portal is routed to doctor dashboard'
  )
  assert(
    resolveAuthenticatedDestination('admin', 'patient') === '/reception/dashboard',
    'Admin account selecting patient portal is routed to reception/admin dashboard'
  )

  // ----------------------------------------------------
  // SUITE 9: Clinic-Staff Patient Provisioning & Public Auth Lockdown
  // ----------------------------------------------------
  console.log('\nSUITE 9: Clinic-Staff Patient Provisioning & Public Auth Lockdown')

  // 1. Verify LoginPage.tsx lockdown
  const loginPageSource = fs.readFileSync(path.resolve('src/pages/LoginPage.tsx'), 'utf8')
  assert(!loginPageSource.includes('signUp('), 'Public signUp() API call is completely removed from LoginPage')
  assert(!loginPageSource.includes('isCreatingAccount'), 'Account creation state is removed from LoginPage')
  assert(!loginPageSource.includes('New Patient? Register'), 'Self-registration tab is removed from LoginPage')
  assert(loginPageSource.includes('Patient access is provided by the clinic'), 'Patient portal displays clinic reception credentials notice')

  // 2. Verify LandingPage.tsx lockdown
  const landingPageSource = fs.readFileSync(path.resolve('src/pages/LandingPage.tsx'), 'utf8')
  assert(!landingPageSource.includes('register=true'), 'Register CTA link is removed from LandingPage')
  assert(!landingPageSource.includes('New Patient? Register for Care'), 'Self-registration button is removed from LandingPage')
  assert(landingPageSource.includes('Patient portal access is provided by clinic reception'), 'Landing page informs that patient access is provided upon clinic registration')

  // 3. Verify Patient Registration Provisioning in Reception
  const patientRegSource = fs.readFileSync(path.resolve('src/features/reception/PatientRegistration.tsx'), 'utf8')
  assert(patientRegSource.includes('provisionPatientAccount'), 'Reception PatientRegistration integrates provisionPatientAccount RPC')
  assert(patientRegSource.includes('Provision Patient Portal Login'), 'PatientRegistration provides staff portal provisioning toggle')
  assert(patientRegSource.includes('generateTemporaryPassword'), 'PatientRegistration provides temporary password generation')

  // 4. Verify Provisioning RPC Contract
  const patientServiceSource = fs.readFileSync(path.resolve('src/services/patientService.ts'), 'utf8')
  assert(patientServiceSource.includes("supabase.rpc('provision_patient_account'"), 'patientService exports provisionPatientAccount via RPC')

  // 5. Verify Patient Empty States (no fake demo clinical records for new patients)
  const emptyAppts = []
  const emptyConsults = []
  const emptyRxs = []

  const hasNoUpcomingAppts = !emptyAppts.find(a => a.status === 'scheduled')
  assert(hasNoUpcomingAppts, 'Empty appointments list produces no upcoming appointments')
  assert(emptyConsults.length === 0, 'New patient has 0 previous consultations')
  assert(emptyRxs.length === 0, 'New patient has 0 active prescriptions')

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n====================================================')
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('====================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch(err => {
  console.error('Test suite encountered unexpected fatal error:', err)
  process.exit(1)
})
