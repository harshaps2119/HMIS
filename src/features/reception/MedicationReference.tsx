import { useState, useEffect } from 'react'
import { getMedications } from '../../services/medicationService'
import { Medication } from '../../types'
import {
  MEDICATION_CATEGORIES,
  MEDICATION_SOURCE_DISCLAIMER,
} from '../../utils/medicationMasterData'
import { Pill, Search, AlertCircle, Info, Tag, CheckCircle2 } from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function MedicationReference() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch all medications (including inactive for master reference viewing)
        const list = await getMedications(false)
        setMedications(list)
      } catch (err) {
        console.error('Failed to load medication reference:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredMeds = medications.filter(med => {
    if (selectedCategory !== 'All Categories' && med.category !== selectedCategory) {
      return false
    }
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase().trim()
    const matchName = med.name.toLowerCase().includes(term)
    const matchGeneric = med.genericName ? med.genericName.toLowerCase().includes(term) : false
    const matchBrand = med.brandName ? med.brandName.toLowerCase().includes(term) : false
    const matchStrength = med.strength ? med.strength.toLowerCase().includes(term) : false
    const matchCategory = med.category.toLowerCase().includes(term)
    return matchName || matchGeneric || matchBrand || matchStrength || matchCategory
  })

  if (loading) return <LoadingSpinner className="py-16" />

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-100 text-teal-800">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Medication Reference Catalog</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Standard reference catalog of medications supplied by the clinic ({medications.length} items)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statutory Source Disclaimer */}
      <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-3">
        <Info className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-teal-950">Statutory Clinical Notice & Operational Boundary</p>
          <p className="leading-relaxed">{MEDICATION_SOURCE_DISCLAIMER}</p>
          <p className="text-[11px] text-teal-800 italic pt-1">
            Operational boundary: This reference catalog is available for staff informational purposes. Clinic receptionists must not prescribe or modify patient medication records.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by medicine name, generic composition, brand (e.g. Zerodol-SP), or strength..."
            className="form-input pl-9 text-xs w-full"
          />
        </div>
        <div className="w-full sm:w-64">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="form-input text-xs w-full"
          >
            {MEDICATION_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-4">Medicine</th>
                <th className="py-3 px-4">Generic / Composition</th>
                <th className="py-3 px-3">Strength</th>
                <th className="py-3 px-3">Dosage Form</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4">Reference Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMeds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    No medications found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredMeds.map((med, idx) => (
                  <tr key={med.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900">{med.name}</span>
                        {med.brandName && (
                          <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                            Brand: {med.brandName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-medium">
                      {med.genericName || '-'}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-teal-800">
                      {med.strength || '-'}
                    </td>
                    <td className="py-3 px-3 text-gray-700">{med.dosageForm}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-medium text-[11px]">
                        {med.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {med.active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 italic max-w-xs text-[11px]">
                      {med.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
