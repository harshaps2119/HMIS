import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing SUPABASE_URL/SUPABASE_ANON_KEY (or VITE_ equivalents).')
  process.exit(2)
}

console.log('Testing Supabase project connectivity...')
const supabase = createClient(url, key)

async function testConnection() {
  try {
    const { data, error } = await supabase.from('medications').select('id, name').limit(1)
    if (error) {
      console.log('Connection test result: Table query returned error (Expected if schema not yet run in Dashboard):', error.message, error.code)
    } else {
      console.log('Connection test result: SUCCESS! Data received:', data)
    }
  } catch (err) {
    console.error('Connection test unexpected error:', err)
  }
}

testConnection()
