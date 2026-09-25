import { createClient } from '@supabase/supabase-js'

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
const missing = required.filter(name => !process.env[name])
if (missing.length) {
  console.error(`Live auth test blocked: missing ${missing.join(', ')}`)
  process.exit(2)
}

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const service = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

const accounts = [
  { name: 'Admin', email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD, role: 'admin' },
  { name: 'Doctor', email: process.env.E2E_DOCTOR_EMAIL, password: process.env.E2E_DOCTOR_PASSWORD, role: 'doctor' },
  { name: 'Rahul', email: process.env.E2E_RAHUL_EMAIL, password: process.env.E2E_RAHUL_PASSWORD, role: 'patient' },
  { name: 'Pooja', email: process.env.E2E_POOJA_EMAIL, password: process.env.E2E_POOJA_PASSWORD, role: 'patient' },
]
const missingAccounts = accounts.filter(account => !account.email || !account.password)
if (missingAccounts.length) {
  console.error(`Live auth test blocked: missing credentials for ${missingAccounts.map(account => account.name).join(', ')}`)
  process.exit(2)
}

let passed = 0
let failed = 0
const check = (condition, label) => {
  if (condition) { passed++; console.log(`[PASS] ${label}`) }
  else { failed++; console.error(`[FAIL] ${label}`) }
}

async function authenticatedClient(email, password) {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.user || !data.session) throw error || new Error('No authenticated session returned')
  return { client, user: data.user }
}

async function verifyAccount(account) {
  const { client, user } = await authenticatedClient(account.email, account.password)
  const { data: profile, error: profileError } = await client.from('users').select('id, role, active, phone').eq('id', user.id).single()
  check(!profileError && profile?.role === account.role && profile.active === true, `${account.name} auth and role profile`)
  if (account.role === 'patient') {
    const { data: patients, error: patientError } = await client.from('patients').select('id, phone, name').eq('phone', profile?.phone || '')
    check(!patientError && patients?.length === 1, `${account.name} patient record is phone-linked`)
    check(!patientError && !patients.some(patient => patient.email && patient.email !== account.email), `${account.name} patient query does not expose another email`) 
  }
  await client.auth.signOut()
}

async function main() {
  for (const account of accounts) await verifyAccount(account)

  const unique = Date.now().toString()
  const email = `e2e-patient-${unique}@example.com`
  const phone = `+919${unique.slice(-9)}`
  const signupClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: signup, error: signupError } = await signupClient.auth.signUp({
    email,
    password: process.env.E2E_NEW_PATIENT_PASSWORD || 'E2E-only-password-123!',
    options: { data: { name: 'E2E Patient', phone } },
  })
  check(!signupError && Boolean(signup.user) && Boolean(signup.session), 'New patient signup returns an authenticated session')
  if (signup.user) {
    const { data: profile } = await service.from('users').select('id, role, phone, active').eq('id', signup.user.id).single()
    const { data: patient } = await service.from('patients').select('id, uhid, phone, email').eq('phone', phone).single()
    check(profile?.role === 'patient' && profile?.active === true && profile?.phone === phone, 'New patient public.users linkage')
    check(patient?.uhid === phone && patient?.phone === phone && patient?.email === email, 'New patient public.patients linkage')
    await service.auth.admin.deleteUser(signup.user.id)
    check(true, 'New patient cleanup completed')
  }
  await signupClient.auth.signOut()

  console.log(`Live auth results: ${passed} passed, ${failed} failed`)
  if (failed) process.exit(1)
}

main().catch(error => {
  console.error(`Live auth test failed: ${error.message}`)
  process.exit(1)
})
