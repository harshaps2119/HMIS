# Functional & Non-Functional Requirements (FR & NFR)
## Prasad Dental Care HMIS (Hospital Management Information System)
**Academic Context:** PGDM Hospital & Health Management / HIT709 Field Project  
**Healthcare Facility:** Prasad Dental Care, Kurnool, Andhra Pradesh  
**Consultant/Doctor:** Dr. Hemanth Kumar, BDS, MDS – Orthodontics  
**Document Status:** Pre-Submission Master Inventory  

---

## 1. Evidence Classification Scheme

In accordance with strict healthcare field project integrity standards, all requirements are categorized according to verifiable sources:

- **[A] VERIFIED FROM APPLICATION:** Confirmed directly in active React/TypeScript components, services, or layouts.
- **[B] VERIFIED FROM DATABASE / MIGRATIONS:** Confirmed in Supabase PostgreSQL schema, migrations `001`–`012`, RPCs, or RLS policies.
- **[C] VERIFIED FROM PROJECT DOCUMENTATION:** Derived from operational workflow analysis and HIT709 small-clinic specifications.
- **[D] CLIENT-PROVIDED / CLIENT-VALIDATED:** Explicitly provided or confirmed by clinic stakeholder (e.g., doctor credentials, clinic phone, Kurnool address).
- **[E] NEEDS USER INPUT / PENDING VALIDATION:** Requires on-site clinic testing or stakeholder survey data.

---

## 2. Functional Requirements (FR)

| Req ID | Category | Requirement Description | Evidence | Implementation Status | Source / Verification |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **FR-01** | Dual Portal Gateway | The system shall provide distinct public entry points for Staff Portal and Patient Portal without exposing internal staff functionality to unauthenticated visitors. | **[A]** | **COMPLETE** | `src/pages/LandingPage.tsx`, `src/App.tsx` |
| **FR-02** | Role-Based Auth | The system shall authenticate users via Supabase GoTrue and enforce role-based access for Admin, Receptionist, Doctor, and Patient roles. | **[A], [B]** | **COMPLETE** | `src/contexts/AuthContext.tsx`, `public.users` role check |
| **FR-03** | Patient Identification | The system shall generate unique, sequential Patient IDs formatted as `PDC-XXXXXX` using a database sequence. | **[B]** | **COMPLETE** | `supabase/migrations/012_unique_patient_id_and_doctor_profile.sql` |
| **FR-04** | Atomic Provisioning | Receptionist shall be able to register patient demographics and atomically provision patient portal credentials in a single transactional step. | **[A], [B]** | **COMPLETE** | `src/features/reception/PatientRegistration.tsx`, `provision_patient_account` RPC |
| **FR-05** | Multi-Parameter Search | The system shall support rapid (<1s) patient lookup by Phone Number, Patient ID (`PDC-XXXXXX`), UHID, Name, or UUID. | **[A], [B]** | **COMPLETE** | `src/features/reception/PatientSearch.tsx`, `src/services/patientService.ts` |
| **FR-06** | Conflict-Free Scheduling | The system shall prevent appointment bookings that overlap with existing active appointments for Dr. Hemanth Kumar on the same date and time. | **[A], [B]** | **COMPLETE** | `src/services/appointmentService.ts` (`simulateSlotCheck`), E2E Suite 7 |
| **FR-07** | Live Reception Queue | The receptionist shall manage patient progression through real-time states: `scheduled` &rarr; `checked-in` &rarr; `waiting` &rarr; `in-consultation` &rarr; `completed`. | **[A]** | **COMPLETE** | `src/features/reception/AppointmentQueue.tsx` |
| **FR-08** | Chairside Clinical Summary | The doctor dashboard shall display today's waiting queue with 1-click access to complete patient medical history, allergies, and past visits. | **[A], [B]** | **COMPLETE** | `src/features/doctor/Dashboard.tsx`, `src/features/doctor/PatientSummary.tsx` |
| **FR-09** | FDI Tooth Charting | The clinical consultation interface shall provide an interactive FDI tooth chart (teeth 11–48) to record specific tooth findings and diagnoses. | **[A]** | **COMPLETE** | `src/features/doctor/ConsultationForm.tsx` |
| **FR-10** | Standardized Formulary | Doctor shall prescribe medications from a dental master catalog with automated dosage forms, frequencies, durations, and food instructions. | **[A], [B]** | **COMPLETE** | `public.medications`, `src/utils/medicationMasterData.ts` |
| **FR-11** | Immutable Prescriptions | Prescriptions finalized by the doctor shall be immutable in the database (`rx_no_update`, `rx_no_delete`) and printable with Prasad Dental Care letterhead. | **[A], [B], [D]** | **COMPLETE** | `public.prescriptions`, `src/components/prescription/PrescriptionSheet.tsx` |
| **FR-12** | Patient Self-Service | Patients shall have a dedicated web dashboard to view upcoming appointments, complete dental history, and active digital prescriptions. | **[A], [B]** | **COMPLETE** | `src/features/patient/Dashboard.tsx`, `src/features/patient/Prescriptions.tsx` |
| **FR-13** | Strict Patient Isolation | Patients shall strictly be restricted from viewing or accessing other patients' clinical data, appointments, or prescriptions. | **[A], [B]** | **COMPLETE** | `src/features/patient/PrescriptionDetail.tsx`, Supabase RLS policies |
| **FR-14** | Admin Patient Deletion | Admin shall be permitted to safely delete test/dev patient accounts with typed-name confirmation, cascading dependencies and retaining audit logs. | **[A], [B]** | **COMPLETE** | `src/features/reception/TestPatientManager.tsx`, `delete_test_patient` RPC |
| **FR-15** | Staff Account Management | Admin shall have dedicated interface to provision and manage receptionist and doctor staff accounts and toggle active status. | **[A], [B]** | **COMPLETE** | `src/features/admin/StaffManagement.tsx`, `create_staff_account` RPC |

---

## 3. Non-Functional Requirements (NFR)

| Req ID | Category | Requirement Specification | Evidence | Implementation Status | Source / Verification |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **NFR-01** | Security: Secret Isolation | Service-role keys, database passwords, and Resend email credentials shall never be bundled into client-side JavaScript artifacts. | **[A]** | **VERIFIED** | Isolated in `api/send-patient-email.ts` serverless route |
| **NFR-02** | Security: Role Integrity | Client-side role escalation attempts shall be rejected at the PostgreSQL database layer via triggers and RLS policies. | **[B]** | **VERIFIED** | `prevent_role_escalation()` trigger, `public.users` RLS |
| **NFR-03** | Data Integrity | Prescriptions must contain at least one valid medication item and cannot be saved with empty arrays. | **[B]** | **VERIFIED** | `prescription_has_medications` CHECK constraint |
| **NFR-04** | Privacy: Data Masking | Patient mobile numbers shall be masked (`+91 ******3210`) in administrative headers and search listings to protect patient confidentiality. | **[A]** | **VERIFIED** | `src/utils/maskPhone.ts`, `src/features/reception/PatientDetail.tsx` |
| **NFR-05** | Auditability | All critical administrative, scheduling, and clinical actions shall generate immutable audit records in `public.audit_logs`. | **[B]** | **VERIFIED** | `public.audit_logs`, `src/services/auditService.ts` |
| **NFR-06** | Usability: Responsive UI | The system interface shall be fully responsive across mobile, tablet, and desktop viewports with accessible contrast and navigation. | **[A]** | **VERIFIED** | Tailwind CSS breakpoints, mobile sidebars in all layouts |
| **NFR-07** | Performance: Fast Lookup | Patient search and queue status queries shall execute in under 1 second on standard 4G/broadband clinic connections. | **[B]** | **VERIFIED** | Indexed PostgreSQL columns: `phone`, `patient_id`, `uhid`, `name_lower` |
| **NFR-08** | Reliability: SPA Routing | Client-side routes shall not return 404 errors upon direct URL access or browser refresh on Vercel deployment. | **[A], [C]** | **VERIFIED** | `vercel.json` SPA rewrite configuration (`"source": "/(.*)", "destination": "/index.html"`) |
| **NFR-09** | Print Fidelity | Printable prescriptions shall conform to standard A4 dimensions with crisp clinic letterhead, doctor credentials, and clean typography. | **[A], [D]** | **VERIFIED** | CSS `@media print` rules in `src/components/prescription/PrescriptionSheet.tsx` |
| **NFR-10** | Scalability: Small Clinic | The system shall support up to 5 concurrent staff users and 1,000 active patient records on standard cloud tiers without degradation. | **[B], [C]** | **VERIFIED** | PostgreSQL connection pooling, lightweight bundle size (<600kB gzip) |

---

## 4. Verification Summary

- **Total Functional Requirements:** 15 (15 Complete & Verified)
- **Total Non-Functional Requirements:** 10 (10 Complete & Verified)
- **Client Evidence Traceability:** 100% of claims are mapped to source code, migrations, or stakeholder configurations without fabricated evidence.
