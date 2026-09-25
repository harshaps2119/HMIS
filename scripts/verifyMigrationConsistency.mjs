import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const migrationDir = path.join(root, 'supabase', 'migrations')
const migrationFiles = fs.readdirSync(migrationDir).filter(file => file.endsWith('.sql')).sort()
const read = file => fs.readFileSync(path.join(migrationDir, file), 'utf8')
const failures = []
const assert = (condition, message) => { if (!condition) failures.push(message) }

const migration005 = read('005_demo_seed_data.sql')
const migration007 = read('007_fix_auth_identities.sql')
const migration008 = read('008_finalize_patient_auth.sql')
const migration009 = read('009_clean_demo_clinical_data_and_patient_provisioning.sql')

assert(!migration005.match(/INSERT\s+INTO\s+auth\.users/i), '005 must not insert directly into auth.users')
assert(!migration005.match(/INSERT\s+INTO\s+auth\.identities/i), '005 must not insert directly into auth.identities')
assert(!migration005.match(/encrypted_password|confirmation_token|recovery_token/i), '005 must not write GoTrue-managed credential/token columns')
assert(!migration005.match(/INSERT\s+INTO\s+public\.appointments/i), '005 must not insert fake demo appointments')
assert(!migration005.match(/INSERT\s+INTO\s+public\.consultations/i), '005 must not insert fake demo consultations')
assert(!migration005.match(/INSERT\s+INTO\s+public\.prescriptions/i), '005 must not insert fake demo prescriptions')
assert(migration007.includes('CREATE OR REPLACE FUNCTION public.handle_new_auth_user()'), '007 must define the signup profile trigger function')
assert(!migration007.match(/CREATE\s+TRIGGER\s+on_auth_user_before_insert/i), '007 must not install the obsolete BEFORE INSERT auth trigger')
assert(migration008.includes('DROP TRIGGER IF EXISTS on_auth_user_before_insert ON auth.users'), '008 must remove any obsolete BEFORE INSERT auth trigger')
assert((migration008.match(/CREATE TRIGGER on_auth_user_created/g) || []).length === 1, '008 must define exactly one AFTER INSERT auth trigger')
assert(migration008.includes('SECURITY DEFINER'), 'Signup trigger must remain SECURITY DEFINER')
assert(migration008.includes("SET search_path = public, pg_temp"), 'Signup trigger must pin a safe search_path')
assert(!migration008.match(/patients\.user_id|user_id\s*=\s*auth\.uid\(\)/i), 'Auth repair must not introduce patients.user_id')
assert(migration009.includes('CREATE OR REPLACE FUNCTION public.provision_patient_account'), '009 must define provision_patient_account')
assert(migration009.includes("NOT IN ('admin', 'receptionist')"), '009 must enforce staff authorization for provisioning')
assert(migration009.includes('SECURITY DEFINER'), '009 provisioning must be SECURITY DEFINER')
assert(!migration009.match(/patients\.user_id|user_id\s*=\s*auth\.uid\(\)/i), '009 must not introduce patients.user_id')

console.log(`Scanned migrations: ${migrationFiles.join(', ')}`)
if (failures.length) {
  failures.forEach(failure => console.error(`[FAIL] ${failure}`))
  process.exit(1)
}
console.log('Migration consistency: PASS')
