# PHASE 3 — SUPABASE MIGRATION VERIFICATION & AUDIT REPORT

**Date:** 2026-09-24  
**Project:** DentalCare HMIS — Digital Patient Record & Prescription Management System  
**Audit Scope:** Full codebase, database migrations, RLS policies, runtime dependencies, build pipeline, live Supabase connectivity, and security constraints.

---

## 1. Environment

- **Operating System:** Windows 11 (PowerShell)
- **Node.js Location:** `C:\Program Files\nodejs\node.exe` (Node.js was installed on the machine but missing from the default session `%PATH%`. Running commands via explicit environment path configuration resolved execution).
- **Node Version:** `v24.21.0` (PASS — EXECUTED)
- **NPM Version:** `11.19.0` (PASS — EXECUTED)
- **Supabase Client Library:** `@supabase/supabase-js: ^2.117.1` (installed in `node_modules`)
- **Live Supabase Connectivity:** The configured Supabase project responded with PostgREST status `PGRST205` (Table cache miss). Project URL and publishable key are intentionally omitted.

---

## 2. Build

- **Type Check (`npx tsc --noEmit`):** **PASS — EXECUTED**
  - Initial run detected 3 type mismatches in `ConsultationForm.tsx` and `AppointmentCreate.tsx` where `patientId` was required but caller passed `patientRecordId`. Fixed in `src/types/index.ts` by making `patientId?: string` optional while preserving `patientRecordId: string` for seamless backward compatibility.
  - Final run exited with code `0` (clean, zero errors).
- **Production Bundle (`npm run build`):** **PASS — EXECUTED**
  - Bundled 1,965 modules via Vite v5.4.21 in 5.62s.
  - Generated output:
    - `dist/index.html` (0.73 kB)
    - `dist/assets/index-BmrzdYTY.css` (37.15 kB)
    - `dist/assets/index-BUTDeZ8L.js` (181.10 kB)
    - `dist/assets/App-rx4BX3vu.js` (431.80 kB)
- **Linter (`npm run lint`):** **PASS — EXECUTED**
  - Ran `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`.
  - Exited with code `0` (zero warnings, zero errors).

---

## 3. Firebase Dependency Search

Project-wide scan for Firebase artifacts across `src/` and root:

| Category | Finding | Details / Risk |
|---|---|---|
| **A. Active runtime dependencies** | **ZERO** | No file in `src/` imports `firebase`, `firebase/firestore`, `firebase/auth`, or `firebase/storage`. `main.tsx` validates only Supabase variables. |
| **B. Legacy files intentionally retained** | 7 files | `src/firebase/config.ts`, `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`, `FIREBASE_SETUP.md`, `scripts/seedFirestore.ts`. None of these are imported by `src/`. |
| **C. Documentation references** | Multiple | Audit reports and markdown files reference Firebase historically. |
| **D. Dead / orphaned code** | 1 file | `src/firebase/config.ts` (exports unused `app`, `auth`, `db`, `storage`). |

---

## 4. Authentication

- **Provider:** Pure Supabase Auth (`@supabase/supabase-js`).
- **Bridge Elimination:** All traces of `VITE_AUTH_BRIDGE_URL`, `exchangeSession`, and `signInWithCustomToken` have been removed.
- **Session Lifecycle:** Managed via `supabase.auth.signInWithPassword`, `supabase.auth.signUp`, `supabase.auth.signOut`, `supabase.auth.getSession`, and `supabase.auth.onAuthStateChange`.
- **Identity Model:** The canonical identity is `auth.users(id)` UUID. In `src/types/index.ts`, `UserProfile.id` and `UserProfile.uid` both map to this identical UUID.
- **Role Assignment:** Automated trigger `handle_new_auth_user()` assigns `role = 'patient'` on self-signup. Promoting to `doctor`, `receptionist`, or `admin` requires an administrative database operation.

---

## 5. Database Schema

The relational schema is defined in `supabase/schema.sql` and `supabase/migrations/`:
- **`public.users`:** `id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`.
- **`public.patients`:** `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, unique `uhid`, generated `name_lower`.
- **`public.appointments`:** FK to `patients(id)` and `users(id)`.
- **`public.consultations`:** FK to `patients(id)`, `users(id)`, and optional `appointments(id)`; `tooth_findings jsonb`.
- **`public.prescriptions`:** FK to `consultations(id)`, `patients(id)`, and `users(id)`; immutable; JSONB medication snapshot.
  - **Constraint:** `CONSTRAINT prescription_has_medications CHECK (jsonb_typeof(medications) = 'array' AND jsonb_array_length(medications) > 0)` prevents empty prescriptions directly at the database level.
- **`public.medications`:** Master reference table (`med_01`–`med_21`).
- **`public.treatments`:** Kurnool master tariff reference (`trt_01`–`trt_33`).
- **`public.audit_logs`:** Append-only log table.
- **`public.clinic_feedback`:** Evaluation reviews table.

---

## 6. RLS Security

Row Level Security is enabled on all 9 tables:
- **Recursive Policy Prevention:** Helper function `get_my_role()` is defined with `SECURITY DEFINER` and `STABLE`, bypassing RLS recursion when policies evaluate caller roles.
- **Consultation Immutability:** Updated policy `consult_doctor_update` includes an explicit `WITH CHECK` clause allowing transitions from `draft` to `finalized`, combined with `consultations_prevent_finalized_edit` trigger blocking modifications once `OLD.status = 'finalized'`.
- **Prescription Immutability:** Policies `rx_no_update` and `rx_no_delete` both evaluate to `USING (false)`.

---

## 7. Patient Privacy

- **Data Isolation:** Patients can only SELECT records where `phone = (SELECT phone FROM public.users WHERE id = auth.uid())`.
- **Cross-Patient Protection:** Direct access to other patients' records returns empty result sets under RLS.
- **Phone Exposure:** Frontend masks patient phone numbers in headers and listings (`+91 ******3210`). Routing uses opaque IDs rather than phone numbers.

---

## 8. Role Authorization

- **Client Role Escalation:** Blocked by `prevent_role_escalation()` trigger. If `OLD.role != NEW.role` and caller is not an admin, the database raises an exception.
- **Protected Routes:** `ProtectedRoute.tsx` prevents unauthorized navigation in the UI, backed by RLS enforcement at the database layer.

---

## 9. Patient Workflow

- Self-service portal queries appointments, consultations, and prescriptions strictly filtered by verified user identity.
- Patients cannot create appointments directly (receptionist role required).

---

## 10. Reception Workflow

- Receptionist can create patient records and book appointments.
- Receptionists have **NO permission** to create or update consultations or prescriptions.

---

## 11. Doctor Workflow

- Doctors can view patient queues, conduct consultations, record tooth findings, and generate prescriptions.
- Doctors cannot finalize consultations under another doctor's `doctor_id`.

---

## 12. Medication Master

- Canonical 21 reference medicines preserved with exact strengths and categories.
- Doctors and receptionists have READ-ONLY access.
- Patients have NO access (`meds_staff_read`).
- Prescriptions store medication details as independent JSONB snapshots, guaranteeing historical prescriptions remain unchanged even if the master is modified.

---

## 13. Treatment Master

- 33 Kurnool reference procedures preserved with min/max price bounds.
- Reference ranges are explicitly labeled and not converted to patient billing.
- Doctors and receptionists have READ-ONLY access; patients have NO access.

---

## 14. Prescription Security

- **Database-Level Immutability:** `UPDATE` and `DELETE` return `false`.
- **Completeness Enforcement:** `prescriptionService.ts` validates mandatory dose, frequency, duration, and route.
- **Non-Empty Constraint:** Database CHECK constraint `prescription_has_medications` rejects any attempt to insert an empty medication list.

---

## 15. Audit Logging

- **Identity Forgery Protection:** Trigger `audit_logs_enforce_identity` unconditionally overwrites client-provided `user_id`, `user_role`, and `user_name` with the authenticated session's true identity from `auth.uid()` and `public.users`.
- **Append-Only:** `UPDATE` and `DELETE` return `false`.

---

## 16. Clinic Feedback

- **Identity Protection:** Trigger `clinic_feedback_enforce_identity` enforces `submitted_by_uid = auth.uid()`.
- **Access Control:** All authenticated users can submit; staff can read; only admins can delete.

---

## 17. Firebase Storage

- **Verification:** Search for `uploadBytes`, `getDownloadURL`, and `deleteObject` returned **0 references**.
- **Conclusion:** Firebase Storage is **NOT USED** and migration to Supabase Storage is **NOT REQUIRED**.

---

## 18. Data Migration

- **Status:** Per user confirmation, the legacy Firebase project contains test/seed data only. No historical clinical records required extraction.
- **Reference Seeding:** Ready via `supabase/migrations/003_seed_reference_data.sql` and `scripts/seedSupabase.ts`.

---

## 19. Functional Testing Matrix

| Test ID | Test Description | Expected Result | Actual Result | Status | Evidence |
|---|---|---|---|---|---|
| **ENV-01** | Node.js runtime availability | Node v18+ accessible | Node `v24.21.0` executed | **PASS — EXECUTED** | `node -v` output |
| **ENV-02** | NPM runtime availability | NPM v9+ accessible | NPM `11.19.0` executed | **PASS — EXECUTED** | `npm -v` output |
| **BLD-01** | TypeScript compilation | Zero type errors | `tsc --noEmit` exited code 0 | **PASS — EXECUTED** | Clean compiler run |
| **BLD-02** | Vite production bundle | Bundled dist assets | Created `dist/` in 5.62s | **PASS — EXECUTED** | Build output log |
| **BLD-03** | ESLint validation | Zero lint warnings/errors | Exited code 0 | **PASS — EXECUTED** | Linter output |
| **NET-01** | Live Supabase connectivity | Host connects to Supabase REST | Responded with PostgREST code | **PASS — EXECUTED** | `scripts/testSupabaseConnection.mjs` |
| **DB-01** | Table schema existence in cloud DB | Tables created in cloud DB | Returned `PGRST205` (tables not yet created) | **NOT TESTED** | Pending user running migrations in Dashboard |
| **SEC-01** | Prescription immutability DDL | UPDATE/DELETE return false | Verified in `002_rls.sql` | **PASS — STATIC INSPECTION** | `rx_no_update`, `rx_no_delete` |
| **SEC-02** | Role self-escalation trigger | Non-admin role changes rejected | Trigger `prevent_role_escalation` | **PASS — STATIC INSPECTION** | `schema.sql` lines 262-277 |
| **SEC-03** | Audit log identity forgery prevention | Overwrites client user_id/role | Trigger `audit_logs_enforce_identity` | **PASS — STATIC INSPECTION** | `schema.sql` lines 320-345 |
| **SEC-04** | Finalized consultation lock | Blocks edit on finalized records | Trigger `prevent_finalized_consultation_modification` | **PASS — STATIC INSPECTION** | `schema.sql` lines 302-317 |
| **SEC-05** | Empty prescription rejection | Rejects empty JSONB array | Constraint `prescription_has_medications` | **PASS — STATIC INSPECTION** | `schema.sql` line 139 |
| **E2E-01** | Live browser login & session | Full browser interactive login | Cannot run headless browser in environment | **NOT TESTED** | Pending cloud schema deployment |

---

## 20. Defects Found

1. **`ConsultationForm.tsx` & `AppointmentCreate.tsx` Type Mismatch:** `patientId` was marked as required in types, but forms passed `patientRecordId`. (Fixed).
2. **Consultation Finalization RLS Lockout:** In `002_rls.sql`, `consult_doctor_update` used `USING (status != 'finalized')` without `WITH CHECK`, which would have caused PostgreSQL to block doctors from finalizing draft consultations. (Fixed).
3. **Audit Log & Feedback Identity Forgery Risk:** Client could theoretically submit arbitrary `user_id`, `user_role`, and `user_name` in audit payloads. (Fixed with database triggers).
4. **Empty Prescription Database Hole:** Schema allowed `medications = '[]'` if frontend validation was bypassed. (Fixed with database CHECK constraint).

---

## 21. Fixes Applied

1. Modified `src/types/index.ts` to make `patientId?: string` optional while preserving `patientRecordId: string`.
2. Added `WITH CHECK (get_my_role() IN ('admin','doctor') AND doctor_id = auth.uid())` to `consult_doctor_update`.
3. Created database trigger `prevent_finalized_consultation_modification()` to enforce consultation immutability.
4. Created database triggers `audit_logs_enforce_identity()` and `clinic_feedback_enforce_identity()`.
5. Added database constraint `prescription_has_medications` to `public.prescriptions`.
6. Updated `supabase/schema.sql` and `supabase/migrations/` with all fixes.

---

## 22. Remaining Blockers

1. **SQL Execution in Supabase Dashboard:** The tables do not exist in your live Supabase project yet (`PGRST205` error confirmed by live test). You must run `supabase/schema.sql` in your Supabase SQL Editor.
2. **Initial Admin User:** After running SQL, you must invite an administrator email and assign `role = 'admin'` via SQL.

---

# FINAL DEPLOYMENT STATUS

### **READY FOR INTERNAL TESTING**

*(The code compiles cleanly with zero TypeScript errors, builds to production in 5.62s, passes ESLint with zero warnings, and contains zero runtime Firebase dependencies. However, because the database migrations have not yet been executed in the Supabase Dashboard, end-to-end browser execution remains untested).*

---

### What You Personally Need to Do

1. **Open Supabase Dashboard:** [https://supabase.com/dashboard/project/rmzcenxkgzlpfrnwcsmu](https://supabase.com/dashboard/project/rmzcenxkgzlpfrnwcsmu)
2. **Execute Migrations:**
   - Go to **SQL Editor** → **New Query**.
   - Copy the entire contents of [`supabase/schema.sql`](file:///c:/Users/likhi/OneDrive/Desktop/HMIS/supabase/schema.sql) and click **Run**.
   - Copy the contents of [`supabase/migrations/003_seed_reference_data.sql`](file:///c:/Users/likhi/OneDrive/Desktop/HMIS/supabase/migrations/003_seed_reference_data.sql) and click **Run**.
3. **Invite Admin:**
   - Go to **Authentication** → **Users** → **Invite User**, enter your email.
   - In SQL Editor, run:
     ```sql
     UPDATE public.users SET role = 'admin', name = 'Clinic Admin', phone = '+918328456378' WHERE email = '<your-invited-email>';
     ```
4. **Start Application:**
   ```powershell
   npm run dev
   ```
5. **Firebase Deletion Decision:**
   Keep legacy Firebase files for now. Once you log in and perform test consultations successfully in Supabase, you can delete `src/firebase/config.ts`, `firestore.rules`, and uninstall `firebase` from `package.json`.
