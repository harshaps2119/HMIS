import { supabase } from '../lib/supabase'
import { Medication } from '../types'
import {
  INITIAL_MEDICATION_MASTER,
} from '../utils/medicationMasterData'

function mapMedicationRow(row: Record<string, unknown>): Medication {
  return {
    id: row.id as string,
    name: row.name as string,
    genericName: (row.generic_name as string) ?? undefined,
    brandName: (row.brand_name as string) ?? undefined,
    strength: (row.strength as string) ?? undefined,
    dosageForm: row.dosage_form as string,
    category: row.category as string,
    combination: Boolean(row.combination),
    active: Boolean(row.active),
    source: (row.source as string) || '',
    notes: (row.notes as string) ?? undefined,
    createdAt: (row.created_at as string) ?? undefined,
    updatedAt: (row.updated_at as string) ?? undefined,
  }
}

/**
 * Retrieve all medications.
 * Falls back to INITIAL_MEDICATION_MASTER (21 reference medicines) if database table is not seeded.
 */
export async function getMedications(activeOnly = true): Promise<Medication[]> {
  try {
    let query = supabase.from('medications').select('*').order('name', { ascending: true })
    if (activeOnly) {
      query = query.eq('active', true)
    }

    const { data, error } = await query
    if (!error && data && data.length > 0) {
      return data.map(mapMedicationRow)
    }
    if (error) {
      console.warn('Supabase medications table query failed; falling back to reference master:', error)
    }
  } catch (err) {
    console.warn('Database error when fetching medications; falling back to reference master:', err)
  }

  // Fallback to clinic reference list
  return (activeOnly
    ? INITIAL_MEDICATION_MASTER.filter(m => m.active)
    : INITIAL_MEDICATION_MASTER) as Medication[]
}

/**
 * Search medication master supporting:
 * - generic name
 * - brand / reference name (e.g. Zerodol-SP)
 * - combination name
 * - strength
 * - category
 *
 * Inactive medicines are excluded from search results for new prescriptions.
 */
export async function searchMedicationsMaster(
  searchTerm: string,
  category = 'All Categories',
  activeOnly = true
): Promise<Medication[]> {
  const allMeds = await getMedications(activeOnly)
  const term = searchTerm.trim().toLowerCase()

  return allMeds.filter(med => {
    // Category filter
    if (category !== 'All Categories' && med.category !== category) {
      return false
    }

    if (!term) return true

    // Multi-attribute search
    const matchName = med.name.toLowerCase().includes(term)
    const matchGeneric = med.genericName ? med.genericName.toLowerCase().includes(term) : false
    const matchBrand = med.brandName ? med.brandName.toLowerCase().includes(term) : false
    const matchStrength = med.strength ? med.strength.toLowerCase().includes(term) : false
    const matchCategory = med.category.toLowerCase().includes(term)

    return matchName || matchGeneric || matchBrand || matchStrength || matchCategory
  })
}

/**
 * Search medications (alias for backward compatibility)
 */
export async function searchMedications(searchTerm: string): Promise<Medication[]> {
  return searchMedicationsMaster(searchTerm, 'All Categories', true)
}

/**
 * Admin: Add new medication to master catalog
 */
export async function addMedication(
  data: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const { data: inserted, error } = await supabase
    .from('medications')
    .insert({
      id: `med_${Date.now()}`,
      name: data.name,
      generic_name: data.genericName || null,
      brand_name: data.brandName || null,
      strength: data.strength || null,
      dosage_form: data.dosageForm,
      category: data.category,
      combination: data.combination || false,
      active: data.active ?? true,
      source: data.source || 'Clinic supplied reference list',
      notes: data.notes || null,
    })
    .select('id')
    .single()

  if (error) throw error
  return inserted.id
}

/**
 * Admin: Toggle medication active/inactive status
 * (Deactivated medications remain in historical prescriptions, but hidden from search)
 */
export async function toggleMedicationStatus(id: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('medications')
    .update({ active })
    .eq('id', id)

  if (error) throw error
}
