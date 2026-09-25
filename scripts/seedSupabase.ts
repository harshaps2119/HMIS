/**
 * DentalCare HMIS — Supabase Database Seeding Script
 * Seeds reference data (medications and treatments) directly into Supabase.
 *
 * Usage:
 *   npx tsx scripts/seedSupabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import { INITIAL_MEDICATION_MASTER } from '../src/utils/medicationMasterData'
import { INITIAL_TREATMENT_MASTER } from '../src/utils/treatmentMasterData'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  console.log('Seeding Supabase database...')
  console.log(`Target: ${supabaseUrl}`)

  // 1. Seed Medications
  console.log(`\nSeeding ${INITIAL_MEDICATION_MASTER.length} medications...`)
  const medicationRows = INITIAL_MEDICATION_MASTER.map(m => ({
    id: m.id,
    name: m.name,
    generic_name: m.genericName || null,
    brand_name: m.brandName || null,
    strength: m.strength || null,
    dosage_form: m.dosageForm,
    category: m.category,
    combination: m.combination || false,
    active: m.active ?? true,
    source: m.source || 'Clinic supplied reference list',
    notes: m.notes || null,
  }))

  const { error: medError } = await supabase
    .from('medications')
    .upsert(medicationRows, { onConflict: 'id' })

  if (medError) {
    console.error('Error seeding medications:', medError.message)
  } else {
    console.log('Successfully seeded medications!')
  }

  // 2. Seed Treatments
  console.log(`\nSeeding ${INITIAL_TREATMENT_MASTER.length} treatments...`)
  const treatmentRows = INITIAL_TREATMENT_MASTER.map(t => ({
    id: t.id,
    treatment_name: t.treatmentName,
    category: t.category,
    min_price: t.minPrice,
    max_price: t.maxPrice,
    price_display: t.priceDisplay,
    active: t.active ?? true,
    source: t.source || 'Kurnool Dental Doctors Association reference chart',
    notes: t.notes || null,
  }))

  const { error: treatError } = await supabase
    .from('treatments')
    .upsert(treatmentRows, { onConflict: 'id' })

  if (treatError) {
    console.error('Error seeding treatments:', treatError.message)
  } else {
    console.log('Successfully seeded treatments!')
  }

  console.log('\nSeeding completed.')
}

seed().catch(err => {
  console.error('Seed script failed:', err)
  process.exit(1)
})
