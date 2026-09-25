import { Prescription } from '../../types'
import { formatDate } from '../../utils/dateUtils'
import { maskPhoneNumber } from '../../utils/phoneUtils'
import {
  CLINIC_NAME,
  CLINIC_ADDRESS,
  CLINIC_PHONE,
  CLINIC_EMAIL,
} from '../../utils/constants'
import { Stethoscope, Calendar } from 'lucide-react'

interface PrescriptionSheetProps {
  prescription: Prescription
  maskPatientPhone?: boolean
}

export default function PrescriptionSheet({
  prescription,
  maskPatientPhone = false,
}: PrescriptionSheetProps) {
  const displayPhone = maskPatientPhone
    ? maskPhoneNumber(prescription.patientPhone || prescription.uhid)
    : prescription.patientPhone || prescription.uhid

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-8 sm:p-12 print:border-none print:shadow-none print:p-0">
      {/* CLINIC HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-teal-600 pb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm">
            <Stethoscope className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{CLINIC_NAME}</h1>
            <p className="text-xs text-gray-500 font-medium">Digital Dental Healthcare & Oral Surgery</p>
            <p className="text-xs text-gray-400 mt-0.5">{CLINIC_ADDRESS}</p>
          </div>
        </div>
        <div className="text-left sm:text-right text-xs text-gray-500">
          <p className="font-semibold text-gray-800">Phone: {CLINIC_PHONE}</p>
          <p>Email: {CLINIC_EMAIL}</p>
          <p className="text-teal-700 font-bold mt-1">Rx ID: #{prescription.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {/* PATIENT & DOCTOR INFO STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-gray-100 text-xs">
        <div>
          <span className="text-gray-400 block font-medium">Patient Name:</span>
          <span className="font-bold text-gray-900 text-sm">{prescription.patientName}</span>
        </div>
        <div>
          <span className="text-gray-400 block font-medium">UHID / Mobile:</span>
          <span className="font-bold text-gray-900 font-mono">{displayPhone}</span>
        </div>
        <div>
          <span className="text-gray-400 block font-medium">Age / Gender:</span>
          <span className="font-medium text-gray-800">
            {prescription.patientAge ? `${prescription.patientAge} yrs` : 'N/A'} / {prescription.patientGender || 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-gray-400 block font-medium">Date:</span>
          <span className="font-bold text-gray-900">{formatDate(prescription.date)}</span>
        </div>
      </div>

      {/* DIAGNOSES */}
      <div className="py-4 border-b border-gray-100">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
          Diagnosis
        </span>
        <div className="flex flex-wrap gap-2">
          {prescription.diagnoses && prescription.diagnoses.length > 0 ? (
            prescription.diagnoses.map((d, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-teal-50 text-teal-800 rounded font-semibold text-xs border border-teal-100"
              >
                {d}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400 italic">Clinical Evaluation</span>
          )}
        </div>
      </div>

      {/* PRESCRIPTION TABLE (Rx) */}
      <div className="py-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl font-serif font-black text-teal-700">℞</span>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Prescribed Medications
          </span>
        </div>

        {prescription.medications && prescription.medications.length > 0 ? (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b text-gray-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3">Medication Name & Strength</th>
                  <th className="py-2.5 px-3">Route</th>
                  <th className="py-2.5 px-3">Dose</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Instructions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prescription.medications.map((m, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="py-3 px-3 text-center text-gray-400">{i + 1}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-gray-900 text-sm">{m.name}</p>
                      <p className="text-gray-500 text-xs">{m.strength || ''} {m.dosageForm ? `· ${m.dosageForm}` : ''}</p>
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-700">{m.route || 'Oral'}</td>
                    <td className="py-3 px-3 font-medium text-gray-800">{m.dose}</td>
                    <td className="py-3 px-3 font-semibold text-teal-800">{m.frequency}</td>
                    <td className="py-3 px-3 text-gray-800">{m.duration}</td>
                    <td className="py-3 px-3 text-gray-600 italic">{m.instructions || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic py-3">No oral medications prescribed.</p>
        )}
      </div>

      {/* CLINICAL ADVICE & FOLLOW-UP */}
      {(prescription.advice || prescription.followUpDate) && (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-2 mb-8">
          {prescription.advice && (
            <div>
              <span className="font-bold text-gray-700 block mb-0.5">Advice & Instructions:</span>
              <p className="text-gray-800 leading-relaxed">{prescription.advice}</p>
            </div>
          )}
          {prescription.followUpDate && (
            <div className="pt-2 border-t border-gray-200/60 flex items-center gap-2 text-teal-800 font-medium">
              <Calendar className="h-4 w-4" />
              <span>
                Next Follow-up Date: <strong>{formatDate(prescription.followUpDate)}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* DOCTOR SIGNATURE BLOCK */}
      <div className="flex justify-between items-end pt-8 border-t border-gray-200 mt-12">
        <div className="text-[11px] text-gray-400 max-w-xs">
          <p>Digital Prescription · {CLINIC_NAME}</p>
          <p className="mt-0.5">Retain this document for your medical records and follow-up consultations.</p>
        </div>
        <div className="text-right">
          <div className="h-10 border-b border-gray-400 w-48 mb-1 flex items-end justify-end">
            <span className="font-serif italic text-teal-800 text-sm mr-2 font-bold">
              Dr. {prescription.doctorName}
            </span>
          </div>
          <p className="font-bold text-gray-900 text-xs">Dr. {prescription.doctorName}</p>
          <p className="text-[11px] text-gray-500">
            {prescription.doctorRegistrationNumber
              ? `Reg. No: ${prescription.doctorRegistrationNumber}`
              : 'Attending Dental Surgeon'}
          </p>
        </div>
      </div>
    </div>
  )
}
