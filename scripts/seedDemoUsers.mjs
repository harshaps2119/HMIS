import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.DEMO_USER_PASSWORD
if (!url || !serviceRoleKey || !password) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DEMO_USER_PASSWORD.')
  process.exit(2)
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
const users = [
  { email: 'admin@dentalcare.com', name: 'Clinic Admin', phone: '+919822200001' },
  { email: 'dr.sharma@dentalcare.com', name: 'Dr. Ramesh Sharma', phone: '+919811100001' },
  { email: 'rahul.kumar@dentalcare.com', name: 'Rahul Kumar', phone: '+919876543210' },
  { email: 'pooja.patel@dentalcare.com', name: 'Pooja Patel', phone: '+919876543212' },
]

for (const user of users) {
  const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const match = existing.users.find(candidate => candidate.email?.toLowerCase() === user.email)
  const result = match
    ? await supabase.auth.admin.updateUserById(match.id, { password, email_confirm: true, user_metadata: user })
    : await supabase.auth.admin.createUser({ email: user.email, password, email_confirm: true, user_metadata: user })
  if (result.error) throw result.error
  console.log(`Prepared demo Auth user: ${user.email}`)
}
console.log('Demo Auth users prepared. Run migration 005 for application demo data.')
