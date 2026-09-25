import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Star, Send, ArrowLeft, CheckCircle, MessageSquare } from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const FEATURE_LIST = [
  'Patient Registration with OTP & Mobile UHID',
  'Patient Search by Name or Mobile',
  'Appointment Scheduling & Daily Queue Status',
  'Clinical Dental Consultation Documentation',
  'Tooth Finding & Dental Charting Table',
  'Medication Master & Prescription Builder',
  'Print / PDF Prescription Generation',
  'WhatsApp Sharing of Prescriptions',
  'Patient Portal (Self-Service View of Rx & History)',
  'Audit Logging for Compliance & Access Tracking',
]

export default function ClinicFeedback() {
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()

  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [problems, setProblems] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const toggleFeature = (feat: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feat) ? prev.filter(f => f !== feat) : [...prev, feat]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { error } = await supabase.from('clinic_feedback').insert({
        usability_rating: rating,
        feature_usefulness: selectedFeatures,
        problems_encountered: problems.trim() || null,
        suggestions: suggestions.trim() || null,
        submitted_by_uid: currentUser?.uid,
        submitted_by_role: userProfile?.role || 'reviewer',
        submitted_by_name: userProfile?.name || 'Clinic Reviewer',
      })
      if (error) throw error

      setSubmitted(true)
      toast.success('Thank you for the clinic review and feedback!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => navigate(-1)} className="btn-secondary text-xs">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="card p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-teal-50 text-teal-800 text-xs font-semibold mb-2">
              <MessageSquare className="h-3.5 w-3.5" /> Clinic Review & Evaluation Form
            </div>
            <h1 className="text-2xl font-bold text-gray-900">DentalCare HMIS Usability Review</h1>
            <p className="text-xs text-gray-500 mt-1">
              For clinic staff and doctors reviewing the digital patient record and prescription system.
            </p>
          </div>

          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Feedback Submitted Successfully</h2>
              <p className="text-xs text-gray-600 max-w-md mx-auto">
                Your feedback has been logged to the database. It will be used to document the initial review, identify workflow gaps, and finalize system optimizations.
              </p>
              <button onClick={() => navigate(-1)} className="btn-primary mt-4">
                Return to Application
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Usability rating */}
              <div>
                <label className="form-label text-sm font-semibold">
                  1. Overall Usability & Workflow Rating *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  How intuitive and effective is the system for dental clinic operations?
                </p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          (hoverRating || rating) >= star
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-gray-700 ml-2">
                    {rating === 5 ? 'Excellent (5/5)' :
                     rating === 4 ? 'Good (4/5)' :
                     rating === 3 ? 'Average (3/5)' :
                     rating === 2 ? 'Needs Improvement (2/5)' : 'Poor (1/5)'}
                  </span>
                </div>
              </div>

              {/* Feature usefulness */}
              <div>
                <label className="form-label text-sm font-semibold">
                  2. Which features did you find most useful?
                </label>
                <p className="text-xs text-gray-500 mb-2.5">Select all that apply:</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {FEATURE_LIST.map(feat => {
                    const checked = selectedFeatures.includes(feat)
                    return (
                      <label
                        key={feat}
                        onClick={() => toggleFeature(feat)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          checked
                            ? 'bg-teal-50/70 border-teal-500 text-teal-900 font-medium'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>{feat}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Problems encountered */}
              <div>
                <label className="form-label text-sm font-semibold">
                  3. Any friction or problems encountered during use?
                </label>
                <textarea
                  value={problems}
                  onChange={e => setProblems(e.target.value)}
                  rows={3}
                  className="form-input text-xs"
                  placeholder="e.g. Tooth numbering convention clarity, loading speed, mobile view adjustments..."
                />
              </div>

              {/* Suggestions */}
              <div>
                <label className="form-label text-sm font-semibold">
                  4. Suggestions & Additional Feature Requirements
                </label>
                <textarea
                  value={suggestions}
                  onChange={e => setSuggestions(e.target.value)}
                  rows={3}
                  className="form-input text-xs"
                  placeholder="e.g. Invoicing/billing integration, custom prescription letterhead, multilingual support..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-3 bg-teal-600 hover:bg-teal-700 text-sm font-bold flex items-center justify-center gap-2"
              >
                {submitting ? <LoadingSpinner size="sm" /> : (
                  <>
                    <Send className="h-4 w-4" /> Submit Clinic Evaluation
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
