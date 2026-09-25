import { supabase } from '../lib/supabase'
import { TreatmentItem } from '../types'
import { INITIAL_TREATMENT_MASTER } from '../utils/treatmentMasterData'

function mapTreatmentRow(row: Record<string, unknown>): TreatmentItem {
  return {
    id: row.id as string,
    treatmentName: row.treatment_name as string,
    category: row.category as string,
    minPrice: row.min_price as number,
    maxPrice: (row.max_price as number) ?? null,
    priceDisplay: row.price_display as string,
    active: Boolean(row.active),
    source: (row.source as string) || '',
    notes: (row.notes as string) ?? undefined,
    createdAt: (row.created_at as string) ?? undefined,
    updatedAt: (row.updated_at as string) ?? undefined,
  }
}

/**
 * Retrieve all active treatment master items.
 * Falls back to built-in reference chart if database is not yet populated.
 */
export async function getTreatments(): Promise<TreatmentItem[]> {
  try {
    const { data, error } = await supabase
      .from('treatments')
      .select('*')
      .eq('active', true)
      .order('category', { ascending: true })

    if (!error && data && data.length > 0) {
      return data.map(mapTreatmentRow)
    }
    if (error) {
      console.warn('Supabase treatments table query failed, falling back to reference chart:', error)
    }
  } catch (err) {
    console.warn('Database error when fetching treatments, falling back to reference chart:', err)
  }

  // Fallback to reference master data
  return INITIAL_TREATMENT_MASTER as TreatmentItem[]
}

/**
 * Filter treatments by search text and category
 */
export async function filterTreatments(
  searchTerm: string,
  category: string
): Promise<TreatmentItem[]> {
  const all = await getTreatments()
  const lowerSearch = searchTerm.trim().toLowerCase()

  return all.filter(item => {
    const matchesSearch =
      !lowerSearch ||
      item.treatmentName.toLowerCase().includes(lowerSearch) ||
      item.category.toLowerCase().includes(lowerSearch) ||
      (item.notes && item.notes.toLowerCase().includes(lowerSearch))

    const matchesCategory =
      !category || category === 'All Categories' || item.category === category

    return matchesSearch && matchesCategory
  })
}

/**
 * Admin action: Seed or create treatment item in Supabase
 */
export async function saveTreatmentItem(
  item: Omit<TreatmentItem, 'createdAt' | 'updatedAt'>
): Promise<void> {
  const { error } = await supabase
    .from('treatments')
    .upsert({
      id: item.id,
      treatment_name: item.treatmentName,
      category: item.category,
      min_price: item.minPrice,
      max_price: item.maxPrice,
      price_display: item.priceDisplay,
      active: item.active,
      source: item.source,
      notes: item.notes || null,
    })

  if (error) throw error
}

/**
 * Admin action: Deactivate a treatment item
 */
export async function toggleTreatmentActive(
  id: string,
  active: boolean
): Promise<void> {
  const { error } = await supabase
    .from('treatments')
    .update({ active })
    .eq('id', id)

  if (error) throw error
}
