import { useState, useEffect } from 'react'
import { getTreatments, filterTreatments } from '../../services/treatmentService'
import { TreatmentItem } from '../../types'
import {
  TREATMENT_CATEGORIES,
  TREATMENT_SOURCE_NOTE,
  GENERAL_DISCLAIMER_NOTE,
} from '../../utils/treatmentMasterData'
import { Search, Tag, AlertCircle, Info, Stethoscope } from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function TreatmentPriceReference() {
  const [treatments, setTreatments] = useState<TreatmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Categories')

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await filterTreatments(search, selectedCategory)
      setTreatments(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [search, selectedCategory])

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-50 text-teal-800 text-xs font-semibold mb-2">
            <Tag className="h-3.5 w-3.5" /> Reference Tariff Guide
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Treatment & Price Reference</h1>
          <p className="text-sm text-gray-500 mt-1">
            Reference charge ranges from Kurnool Dental Doctors Association for patient enquiry & scheduling
          </p>
        </div>
      </div>

      {/* Official Disclaimer Alert Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
        <div className="flex items-center gap-2 font-bold text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Important Reference Notice</span>
        </div>
        <p className="leading-relaxed">{TREATMENT_SOURCE_NOTE}</p>
        <p className="font-semibold text-amber-950 mt-1">{GENERAL_DISCLAIMER_NOTE}</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search treatment by procedure name or keywords..."
            className="form-input pl-9 text-sm w-full"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="form-input text-sm"
          >
            {TREATMENT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Treatment Master Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner className="py-16" />
        ) : treatments.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No treatments found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Treatment / Procedure</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Reference Price Range</th>
                  <th className="py-3.5 px-4">Clinical Notes</th>
                  <th className="py-3.5 px-4 w-24 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {treatments.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4 text-center text-gray-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900 text-sm">{t.treatmentName}</p>
                      <p className="text-[11px] text-gray-400">{t.source}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded bg-teal-50 text-teal-800 font-medium text-[11px] border border-teal-100">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-gray-900 text-sm bg-gray-100 px-2 py-0.5 rounded">
                        {t.priceDisplay}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs leading-relaxed">
                      {t.notes ? (
                        <span className="text-[11px] bg-blue-50/60 p-1.5 rounded text-blue-900 block border border-blue-100">
                          {t.notes}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
          <span>Showing {treatments.length} reference treatments</span>
          <span className="italic">Kurnool Dental Doctors Association Tariff Reference</span>
        </div>
      </div>
    </div>
  )
}
