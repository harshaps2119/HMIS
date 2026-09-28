# DentalCare HMIS — Supabase Migration Implementation Report

**Status:** Implementation Complete (Phase 2)  
**Date:** 2026-09-24  
**Target Architecture:** Supabase Auth + Supabase PostgreSQL (Free Tier)  
**Zero Firebase Runtime Dependencies in `src/`**

---

## 1. Executive Summary

The DentalCare HMIS application has been migrated from Firebase Firestore and Firebase Authentication to a Supabase-based architecture:

- **Authentication:** Pure Supabase Auth (`@supabase/supabase-js`) handles sign up, sign in, session persistence, and session restoration. The hybrid authentication bridge (`VITE_AUTH_BRIDGE_URL` + Firebase Custom Token exchange) has been completely removed.
- **Database:** Supabase PostgreSQL houses all clinical and operational records (`users`, `patients`, `appointments`, `consultations`, `prescriptions`, `medications`, `treatments`, `audit_logs`, `clinic_feedback`).
- **Authorization:** PostgreSQL Row Level Security (RLS) policies enforce least-privilege role-based access control. Security definer functions (`get_my_role()`) prevent recursive policy evaluations, and triggers prevent self-role escalation.
- **Prescriptions & Consultations:** Prescriptions are legally immutable (`allow update: false`, `allow delete: false`). Medications are stored as historical JSONB snapshots independent of the medication reference catalog. Finalized consultations cannot be altered.
- **Master Catalogs:** 21 canonical clinic reference medications and 33 Kurnool Dental Doctors Association tariff procedures are preserved and supported by static fallback logic in their respective services.

---

## 2. Architecture Comparison

| Architectural Aspect | Previous Architecture (Hybrid/Broken) | New Architecture (Supabase) |
|---|---|---|
| **Identity & Auth Provider** | Supabase Auth → Bridge URL → Firebase Auth Custom Token | Supabase Auth (`@supabase/supabase-js`) |
| **Auth Session Handling** | Dual session synchronization (Supabase + Firebase) | Single Supabase session with local storage persistence |
| **Database Engine** | Google Cloud Firestore (NoSQL Document Store) | Supabase PostgreSQL (Relational SQL Database) |
| **Data Schema & Relations** | Flat Firestore collections with denormalized strings | Relational tables with UUIDs, foreign keys, indexes, & triggers |
| **Role Authorization** | Firestore Security Rules (`firestore.rules`) | PostgreSQL Row Level Security (RLS) & security definer functions |
| **Role Escalation Protection**| Firestore rules checking write payloads | Database trigger (`prevent_role_escalation()`) |
| **Prescription Immutability** | Firestore rule `allow update, delete: if false` | RLS policies `rx_no_update`, `rx_no_delete` returning `false` |
| **File Storage** | Firebase Storage SDK imported (unused) | Removed (no file upload required by current app) |
| **Frontend Environment** | 6 `VITE_FIREBASE_*` keys + `VITE_AUTH_BRIDGE_URL` | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |

---

## 3. Database Schema Design

The authoritative relational schema is stored in `supabase/migrations/`:
1. `001_initial_schema.sql`: Table definitions, foreign key constraints, indexes, and triggers.
2. `002_rls.sql`: Row Level Security policies for all 9 tables.
3. `003_seed_reference_data.sql`: Seed data for the 21 medications and 33 treatments.

### Tables & Relationships

```
auth.users (Supabase Managed)
    │ (1:1)
    ▼
public.users (id = auth.users.id)
    │
    ├── (1:N) ──► patients (created_by)
    │                │
    │                ├── (1:N) ──► appointments (patient_id)
    │                │                │
    │                │                └── (0..1:1) ──► consultations (appointment_id)
    │                ├── (1:N) ─────────────────────────► consultations (patient_id)
    │                │                                       │
    │                │                                       └── (1:1) ──► prescriptions (consultation_id)
    │                └── (1:N) ──────────────────────────────────────────► prescriptions (patient_id)
    │
    ├── (1:N) ──► appointments (doctor_id, created_by)
    ├── (1:N) ──► consultations (doctor_id)
    ├── (1:N) ──► prescriptions (doctor_id)
    ├── (1:N) ──► audit_logs (user_id)
    └── (1:N) ──► clinic_feedback (submitted_by_uid)

Reference Tables (Independent):
- public.medications (Primary Key: text ID e.g. 'med_01')
- public.treatments  (Primary Key: text ID e.g. 'trt_01')
```

---

## 4. Row Level Security (RLS) Specification

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | All authenticated users | Admin only | Self (blocked from role elevation by trigger) | Admin only |
| `patients` | Staff (`admin`, `doctor`, `receptionist`) OR Patient (matching verified phone) | Receptionist & Admin | Receptionist & Admin | Admin only |
| `appointments` | Staff OR Patient (matching phone) | Receptionist & Admin | Staff (`admin`, `doctor`, `receptionist`) | Admin only |
| `consultations` | Staff OR Patient (matching phone) | Doctor (only with `doctor_id = auth.uid()`) | Doctor (drafts only, `doctor_id = auth.uid()`) | Admin only |
| `prescriptions` | Staff OR Patient (matching phone) | Doctor (only with `doctor_id = auth.uid()`) | **BLOCKED (false)** | **BLOCKED (false)** |
| `medications` | Staff only (patients denied) | Admin only | Admin only | Admin only |
| `treatments` | Staff only (patients denied) | Admin only | Admin only | Admin only |
| `audit_logs` | Staff only | Authenticated (`user_id = auth.uid()`) | **BLOCKED (false)** | **BLOCKED (false)** |
| `clinic_feedback`| Staff only | Authenticated (`submitted_by_uid = auth.uid()`) | Admin only | Admin only |

---

## 5. Service Migration Inventory

All services in `src/services/` were migrated to Supabase queries:

| Service File | Previous Backend | Migrated Implementation |
|---|---|---|
| `src/services/authService.ts` | Supabase + Firebase Token Bridge | Pure Supabase Auth (`signInWithPassword`, `signUp`, `signOut`, `getSession`, `onAuthStateChange`) |
| `src/services/userService.ts` | Firestore `users` collection | Supabase `users` table queries & upserts |
| `src/services/patientService.ts` | Firestore `patients` collection | Supabase `patients` table with `ilike` search on name & phone |
| `src/services/appointmentService.ts`| Firestore `appointments` collection | Supabase `appointments` table with date & doctor queries |
| `src/services/consultationService.ts`| Firestore `consultations` collection| Supabase `consultations` table with JSONB tooth findings |
| `src/services/prescriptionService.ts`| Firestore `prescriptions` collection| Supabase `prescriptions` table with JSONB medication snapshots |
| `src/services/medicationService.ts` | Firestore `medications` collection | Supabase `medications` table with static master fallback |
| `src/services/treatmentService.ts` | Firestore `treatments` collection | Supabase `treatments` table with static master fallback |
| `src/services/auditService.ts` | Firestore `auditLogs` collection | Supabase `audit_logs` table insert |
| `src/features/feedback/ClinicFeedback.tsx` | Inline Firestore `addDoc` | Supabase `clinic_feedback` table insert |

---

## 6. Environment Variables

Only two client variables are needed in `.env`:

```env
# Supabase Configuration
VITE_SUPABASE_URL="<your Supabase project URL>"
VITE_SUPABASE_ANON_KEY="<your Supabase publishable key>"
```

No `service_role` key, database password, or auth bridge URL is exposed in the frontend.

---

## 7. Migration Verification & Next Steps

1. **SQL Schema Deployment:**
   - Execute `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor.
   - Execute `supabase/migrations/002_rls.sql` in Supabase SQL Editor.
   - Execute `supabase/migrations/003_seed_reference_data.sql` in Supabase SQL Editor.
2. **Initial Admin User Creation:**
   - In Supabase Dashboard → Authentication → Users, invite the clinic administrator email.
   - Run the initial role update in SQL Editor:
     ```sql
     UPDATE public.users SET role = 'admin', name = 'Clinic Admin', phone = '+918328456378' WHERE email = '<admin-email>';
     ```
3. **Decommissioning Firebase Files:**
   - `src/firebase/config.ts` and Firestore config files are kept intact in the repository for record-keeping and non-destructive transition. Once clinical testing in Supabase confirms 100% operational sign-off, they can be safely removed.
