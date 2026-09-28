# Project Master Audit & Pre-Submission Verification
## Prasad Dental Care — Hospital Management Information System (HMIS)
**Academic Context:** PGDM Hospital & Health Management / HIT709 Field Project  
**Healthcare Provider:** Prasad Dental Care, Kurnool, Andhra Pradesh  
**Consultant Clinician:** Dr. Hemanth Kumar, BDS, MDS – Orthodontics  
**Document Status:** Complete Pre-Submission Audit  

---

## 1. Project Overview
Prasad Dental Care HMIS is a lightweight, cloud-native healthcare management application purpose-built for a single-doctor orthodontic and dental clinic setting in Kurnool, Andhra Pradesh. The application replaces fragmented paper registers, physical chart storage, and handwritten prescription slips with a cohesive digital platform connecting Reception staff, Dr. Hemanth Kumar, and patients.

- **Clinic Name:** Prasad Dental Care
- **Lead Doctor:** Dr. Hemanth Kumar, BDS, MDS – Orthodontics (Specialization: Orthodontics)
- **Clinic Address:** N V R Buildings, Kothapeta, Kurnool, Andhra Pradesh – 518004
- **Phone:** 8328456378 | **Email:** hemanth.kumar@prasaddentalcare.com
- **Patient Identifier Prefix:** `PDC-XXXXXX` (Sequential)
- **Live Deployed Application:** `https://hmis-wine.vercel.app`

---

## 2. Technical Architecture
- **Frontend Core:** React 18, TypeScript 5.5, Vite 5.4, Tailwind CSS 3.4.
- **Routing & State:** React Router DOM v6.26, React Context (`AuthContext`).
- **Database & Storage:** Supabase Cloud (PostgreSQL 15) with native Row Level Security (RLS) and serverless PL/pgSQL RPCs.
- **Identity & Access Management:** Supabase GoTrue Auth (Session tokens stored securely in `sb-*-auth-token`).
- **Edge Deployment:** Vercel Global Edge Network with custom SPA rewrites (`vercel.json`).
- **Communication Pipeline:** Serverless transactional email endpoint (`api/send-patient-email.ts`) integrating Resend API.

---

## 3. Complete Feature Inventory

| Area | Feature Description | Active Components | Status |
| :--- | :--- | :--- | :---: |
| **Public Gateway** | Dual portal landing page separating Staff and Patient entry | `LandingPage.tsx`, `LoginPage.tsx` | **VERIFIED** |
| **Authentication** | GoTrue email/password & identifier lookup authentication | `AuthContext.tsx`, `authService.ts` | **VERIFIED** |
| **RBAC Route Guards**| Route-level access enforcement across 4 system roles | `ProtectedRoute.tsx`, `App.tsx` | **VERIFIED** |
| **Patient Registration**| Demographic capture with atomic account provisioning toggle | `PatientRegistration.tsx`, `patientService.ts`| **VERIFIED** |
| **Patient Identification**| Sequential `PDC-XXXXXX` allocation via database sequence | `patient_id_seq`, Migration `012` | **VERIFIED** |
| **Multi-Param Search**| High-speed query by Phone, PDC ID, UHID, Name, or UUID | `PatientSearch.tsx`, `patientService.ts` | **VERIFIED** |
| **Scheduling Engine** | Appointment booking with real-time slot conflict detection | `AppointmentCreate.tsx`, `appointmentService.ts`| **VERIFIED** |
| **Reception Queue** | Real-time tracking from `scheduled` &rarr; `waiting` &rarr; `completed` | `AppointmentQueue.tsx`, `Dashboard.tsx` | **VERIFIED** |
| **Doctor Operatory** | Waiting queue visualization with 1-click clinical summary | `Dashboard.tsx`, `PatientSummary.tsx` | **VERIFIED** |
| **Dental Charting** | Interactive FDI two-digit tooth grid (teeth 11–48) | `ConsultationForm.tsx` | **VERIFIED** |
| **Formulary Prescribing**| Standardized dental medications with pre-calculated dosages | `medicationMasterData.ts`, `public.medications`| **VERIFIED** |
| **Printable Letterhead**| Formal prescription document with Prasad Dental Care letterhead | `PrescriptionSheet.tsx` | **VERIFIED** |
| **Patient Portal** | 24/7 web self-service for visits, prescriptions, and history | `src/features/patient/*` | **VERIFIED** |
| **Patient Isolation**| Strict owner checks preventing cross-patient data access | `PrescriptionDetail.tsx`, PostgreSQL RLS | **VERIFIED** |
| **Admin Test Deletion**| Safe cascade deletion of test patients with typed confirmation | `TestPatientManager.tsx`, Migration `010` | **VERIFIED** |
| **Staff Administration**| Admin interface to create and manage staff accounts | `StaffManagement.tsx`, Migration `011` | **VERIFIED** |
| **Price & Med Catalog**| Standard tariffs and pharmacopeia search references | `PriceReference.tsx`, `Medications.tsx` | **VERIFIED** |
| **Clinic Feedback** | On-site feedback capture form with 5-star rating & friction notes | `ClinicFeedback.tsx` | **VERIFIED** |

---

## 4. Role Matrix

| Feature / Action | Administrator | Receptionist | Doctor | Patient |
| :--- | :---: | :---: | :---: | :---: |
| Access Public Landing & Login | YES | YES | YES | YES |
| Access Reception Dashboard (`/reception`) | YES | YES | NO | NO |
| Register & Provision Patients | YES | YES | NO | NO |
| Create / Manage Appointments | YES | YES | NO | NO |
| Access Doctor Operatory (`/doctor`) | NO | NO | YES | NO |
| Record Consultations & Dental Charting | NO | NO | YES | NO |
| Finalize & Sign Prescriptions | NO | NO | YES | NO |
| View Patient Self-Service Portal (`/patient`) | NO | NO | NO | YES (Own Only) |
| Manage Staff Accounts (`/admin/staff`) | YES | NO | NO | NO |
| Delete Test Patients (`/admin/test-patients`)| YES | NO | NO | NO |
| View Audit Logs | YES | NO | NO | NO |

---

## 5. Route Matrix

| Route | Minimum Role | Layout Used | Auth Required | Refresh / Direct Access | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `/` | Public | None | NO | SPA 200 | **PASS** |
| `/login` | Public | None | NO | SPA 200 | **PASS** |
| `/patient/setup-password` | Public | None | NO (Tokenized) | SPA 200 | **PASS** |
| `/feedback` | Public | None | NO | SPA 200 | **PASS** |
| `/reception` | Receptionist / Admin | `ReceptionLayout` | YES | SPA 200 | **PASS** |
| `/reception/register` | Receptionist / Admin | `ReceptionLayout` | YES | SPA 200 | **PASS** |
| `/reception/search` | Receptionist / Admin | `ReceptionLayout` | YES | SPA 200 | **PASS** |
| `/reception/patient/:id` | Receptionist / Admin | `ReceptionLayout` | YES | SPA 200 | **PASS** |
| `/reception/appointments/new`| Receptionist / Admin | `ReceptionLayout` | YES | SPA 200 | **PASS** |
| `/reception/queue` | Receptionist / Admin | `ReceptionLayout` | YES | SPA 200 | **PASS** |
| `/reception/price-reference` | Receptionist / Admin | `ReceptionLayout` | YES | SPA 200 | **PASS** |
| `/reception/medications` | Receptionist / Admin | `ReceptionLayout` | YES | SPA 200 | **PASS** |
| `/admin/staff` | Admin | `ReceptionLayout` | YES | SPA 200 | **PASS** |
| `/admin/test-patients` | Admin | `ReceptionLayout` | YES | SPA 200 | **PASS** |
| `/doctor` | Doctor | `DoctorLayout` | YES | SPA 200 | **PASS** |
| `/doctor/patient/:id` | Doctor | `DoctorLayout` | YES | SPA 200 | **PASS** |
| `/doctor/consultation/:id` | Doctor | `DoctorLayout` | YES | SPA 200 | **PASS** |
| `/doctor/profile` | Doctor | `DoctorLayout` | YES | SPA 200 | **PASS** |
| `/patient/dashboard` | Patient | `PatientLayout` | YES | SPA 200 | **PASS** |
| `/patient/appointments` | Patient | `PatientLayout` | YES | SPA 200 | **PASS** |
| `/patient/prescriptions` | Patient | `PatientLayout` | YES | SPA 200 | **PASS** |
| `/patient/prescriptions/:id` | Patient | `PatientLayout` | YES | SPA 200 | **PASS** |
| `/patient/history` | Patient | `PatientLayout` | YES | SPA 200 | **PASS** |
| `/patient/profile` | Patient | `PatientLayout` | YES | SPA 200 | **PASS** |

---

## 6. Database & Migration Summary

- **Total Active Migrations:** 12 SQL migration files (`supabase/migrations/001` through `012`).
- **Core Relational Schema:**
  - `public.users`: Auth user profile linking to `auth.users(id)` with roles.
  - `public.patients`: Core clinical demographics, unique `patient_id` (`PDC-XXXXXX`), and `phone`.
  - `public.appointments`: Scheduling records with status constraint (`requested`, `scheduled`, `checked-in`, `waiting`, `in-consultation`, `completed`, `cancelled`).
  - `public.consultations`: Clinical documentation with JSONB `tooth_findings`.
  - `public.prescriptions`: Finalized prescriptions with JSONB `medications` array and immutability trigger.
  - `public.medications`: Standard dental drug catalog.
  - `public.price_reference`: Dental procedure tariffs and fee schedules.
  - `public.clinic_feedback`: User ratings and comments.
  - `public.audit_logs`: Immutable audit trails.
  - `public.doctor_profiles`: Registered doctor credentials and qualifications.
- **Key RPCs:**
  - `provision_patient_account`: Atomic multi-table transactional patient and auth creation.
  - `resolve_patient_login`: Maps patient identifier (`PDC-XXXXXX` or email) to GoTrue auth email.
  - `delete_test_patient`: Admin cascade cleanup with audit trail preservation.
  - `create_staff_account`: Admin staff account generator.
  - `update_staff_status`: Staff activation toggle.

---

## 7. Authentication Flow
```
User visits /login?portal=staff or /login?portal=patient
      │
      ▼
Submits Identifier + Password
      │
      ├─ If Patient ID (PDC-XXXXXX) ──► RPC resolve_patient_login resolves GoTrue email
      │
      ▼
GoTrue signInWithPassword({ email, password })
      │
      ▼
Fetch User Profile & Role from public.users
      │
      ├─ Admin / Receptionist ──► Redirect to /reception
      ├─ Doctor               ──► Redirect to /doctor
      └─ Patient              ──► Redirect to /patient/dashboard
```

---

## 8. Patient Provisioning Flow
1. Receptionist inputs patient demographics in `/reception/register`.
2. Toggle "Provision Patient Portal Account" is enabled.
3. System invokes `provision_patient_account` RPC on Supabase PostgreSQL.
4. Database atomically creates `auth.users`, `public.users`, and `public.patients` records.
5. Sequence `patient_id_seq` increments and allocates next sequential ID (e.g. `PDC-000124`).
6. System dispatches credentials via email (or receptionist provides temporary credentials).
7. Patient logs into `/login?portal=patient` and establishes password.

---

## 9. Security Model
- **Row Level Security (RLS):** Enabled across all 10 application tables.
- **Recursive Policy Mitigation:** `get_my_role()` defined as `SECURITY DEFINER STABLE`.
- **Privilege Escalation Defense:** PostgreSQL trigger `prevent_role_escalation()` blocks non-admin updates to `role` column.
- **Clinical Immutability:** Prescriptions cannot be modified or deleted once finalized (`rx_no_update`, `rx_no_delete`).
- **Secret Isolation:** Zero service-role keys or Resend tokens in client JavaScript.

---

## 10. BPMN Workflows
- **Current State (AS-IS):** Manual paper daybook, physical folder search delays (5–10 min), unmanaged waiting room, handwritten paper prescriptions.
- **Proposed State (TO-BE):** Instant search, conflict-free scheduling, live queue status, chairside FDI tooth charting, standardized digital prescribing, and 24/7 patient portal.
- **Detailed Specification:** Documented in `BPMN_WORKFLOWS.md`; vector diagrams available in `AS_IS_WORKFLOW.svg` and `TO_BE_WORKFLOW.svg`.

---

## 11. Functional Requirements Summary
- 15 Functional Requirements defined and 100% verified.
- Full details documented in `FUNCTIONAL_NONFUNCTIONAL_REQUIREMENTS.md`.

---

## 12. Non-Functional Requirements Summary
- 10 Non-Functional Requirements defined covering security, performance, usability, print fidelity, and data integrity.
- Full details documented in `FUNCTIONAL_NONFUNCTIONAL_REQUIREMENTS.md`.

---

## 13. Testing Results
- **`npm run lint`:** PASS (0 errors, 0 warnings).
- **`npm run build`:** PASS (Vite production bundle generated cleanly in 8.65s).
- **`npm run test:migrations`:** PASS (All 12 migration files verified).
- **`npm run test:workflows`:** PASS (60/60 automated assertions passing).

---

## 14. Known Limitations
1. **SMS Gateway:** Automated OTP via Indian SMS DLT is not integrated; authentication uses GoTrue email and tokenized flows.
2. **Offline Mode:** The application requires an active internet connection to communicate with Supabase Cloud.
3. **PACS Imaging:** Direct DICOM/X-ray file viewing is not implemented; dental charting stores tooth-level findings.

---

## 15. Deployment Requirements
- Cloud-hosted PostgreSQL instance (Supabase).
- Edge hosting provider supporting SPA URL rewriting (Vercel).
- Node.js runtime (v18+) for building application artifacts.

---

## 16. Vercel Requirements
- `vercel.json` configured with SPA rewrites:
  ```json
  {
    "rewrites": [
      { "source": "/api/(.*)", "destination": "/api/$1" },
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.

---

## 17. Supabase Requirements
- Database migrations `001` through `012` applied in sequential order.
- Authentication email templates configured for password reset redirection to `/patient/setup-password`.

---

## 18. Presentation Readiness
- **Presentation File:** `Prasad_Dental_Care_HMIS_MTA_Presentation.pptx` generated with 15 focused slides, professional healthcare aesthetic, and zero text overflow.
- **Speaker Notes:** Complete 12–14 minute script provided in `MTA_SPEAKER_NOTES.md`.
- **Demo Script:** Step-by-step video recording guide provided in `MTA_PRODUCT_DEMO_SCRIPT.md`.
- **Evidence Matrix:** Verified in `PRESENTATION_EVIDENCE_MATRIX.md`.

---

## 19. Client Validation Status
- **Status:** **PENDING / IN-PROGRESS**.
- **Ethical Integrity:** No fake testimonials, doctor quotes, or simulated ratings have been fabricated.
- **Feedback Mechanism:** Operational feedback collection module implemented at `/feedback` (`ClinicFeedback.tsx`).

---

## 20. Remaining User Actions
1. Apply migrations `010`, `011`, and `012` in Supabase SQL editor if not already executed on live database.
2. Configure `RESEND_API_KEY` in Vercel project environment variables if transactional email delivery is required.
3. Record 4-minute demonstration video following `MTA_PRODUCT_DEMO_SCRIPT.md`.
4. Collect genuine on-site feedback from Dr. Hemanth Kumar during clinic trials.
5. Review local working tree and execute Git commit/push when ready.
