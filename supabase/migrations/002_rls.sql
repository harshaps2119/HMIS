-- =============================================================
-- Migration 002: Row Level Security Policies
-- DentalCare HMIS — Supabase PostgreSQL
-- Run AFTER 001_initial_schema.sql
-- =============================================================

-- Enable RLS on every table
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_feedback ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────────────────────
-- All authenticated users can read user profiles
-- (needed for doctor name lists, appointment booking, etc.)
DROP POLICY IF EXISTS "users_authenticated_read" ON public.users;
CREATE POLICY "users_authenticated_read" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can update their own profile; role changes blocked by trigger
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin can create new user profiles (staff accounts)
DROP POLICY IF EXISTS "users_admin_insert" ON public.users;
CREATE POLICY "users_admin_insert" ON public.users
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

-- Admin can delete users
DROP POLICY IF EXISTS "users_admin_delete" ON public.users;
CREATE POLICY "users_admin_delete" ON public.users
  FOR DELETE USING (get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- patients
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "patients_staff_read" ON public.patients;
CREATE POLICY "patients_staff_read" ON public.patients
  FOR SELECT
  USING (get_my_role() IN ('admin','doctor','receptionist'));

DROP POLICY IF EXISTS "patients_self_read" ON public.patients;
CREATE POLICY "patients_self_read" ON public.patients
  FOR SELECT
  USING (
    phone = (SELECT phone FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "patients_staff_create" ON public.patients;
CREATE POLICY "patients_staff_create" ON public.patients
  FOR INSERT WITH CHECK (get_my_role() IN ('admin','receptionist'));

DROP POLICY IF EXISTS "patients_staff_update" ON public.patients;
CREATE POLICY "patients_staff_update" ON public.patients
  FOR UPDATE USING (get_my_role() IN ('admin','receptionist'));

DROP POLICY IF EXISTS "patients_admin_delete" ON public.patients;
CREATE POLICY "patients_admin_delete" ON public.patients
  FOR DELETE USING (get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- appointments
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "appts_staff_read" ON public.appointments;
CREATE POLICY "appts_staff_read" ON public.appointments
  FOR SELECT
  USING (get_my_role() IN ('admin','doctor','receptionist'));

DROP POLICY IF EXISTS "appts_patient_read" ON public.appointments;
CREATE POLICY "appts_patient_read" ON public.appointments
  FOR SELECT
  USING (
    patient_phone = (SELECT phone FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "appts_receptionist_create" ON public.appointments;
CREATE POLICY "appts_receptionist_create" ON public.appointments
  FOR INSERT WITH CHECK (get_my_role() IN ('admin','receptionist'));

-- Receptionist AND doctor can update (status changes)
DROP POLICY IF EXISTS "appts_staff_update" ON public.appointments;
CREATE POLICY "appts_staff_update" ON public.appointments
  FOR UPDATE USING (get_my_role() IN ('admin','receptionist','doctor'));

DROP POLICY IF EXISTS "appts_admin_delete" ON public.appointments;
CREATE POLICY "appts_admin_delete" ON public.appointments
  FOR DELETE USING (get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- consultations
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "consult_staff_read" ON public.consultations;
CREATE POLICY "consult_staff_read" ON public.consultations
  FOR SELECT
  USING (get_my_role() IN ('admin','doctor','receptionist'));

DROP POLICY IF EXISTS "consult_patient_read" ON public.consultations;
CREATE POLICY "consult_patient_read" ON public.consultations
  FOR SELECT
  USING (
    patient_phone = (SELECT phone FROM public.users WHERE id = auth.uid())
  );

-- Doctor creates consultation; doctor_id must be the caller
DROP POLICY IF EXISTS "consult_doctor_create" ON public.consultations;
CREATE POLICY "consult_doctor_create" ON public.consultations
  FOR INSERT WITH CHECK (
    get_my_role() IN ('admin','doctor')
    AND doctor_id = auth.uid()
  );

-- Doctor can update only their own DRAFT consultations
-- Finalized consultations are immutable
DROP POLICY IF EXISTS "consult_doctor_update" ON public.consultations;
CREATE POLICY "consult_doctor_update" ON public.consultations
  FOR UPDATE
  USING (
    get_my_role() IN ('admin','doctor')
    AND doctor_id = auth.uid()
    AND status != 'finalized'
  )
  WITH CHECK (
    get_my_role() IN ('admin','doctor')
    AND doctor_id = auth.uid()
  );

DROP POLICY IF EXISTS "consult_admin_delete" ON public.consultations;
CREATE POLICY "consult_admin_delete" ON public.consultations
  FOR DELETE USING (get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- prescriptions  (IMMUTABLE)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "rx_staff_read" ON public.prescriptions;
CREATE POLICY "rx_staff_read" ON public.prescriptions
  FOR SELECT
  USING (get_my_role() IN ('admin','doctor','receptionist'));

DROP POLICY IF EXISTS "rx_patient_read" ON public.prescriptions;
CREATE POLICY "rx_patient_read" ON public.prescriptions
  FOR SELECT
  USING (
    patient_phone = (SELECT phone FROM public.users WHERE id = auth.uid())
  );

-- Doctor creates; doctor_id must match caller
DROP POLICY IF EXISTS "rx_doctor_create" ON public.prescriptions;
CREATE POLICY "rx_doctor_create" ON public.prescriptions
  FOR INSERT WITH CHECK (
    get_my_role() IN ('admin','doctor')
    AND doctor_id = auth.uid()
  );

-- IMMUTABLE: no update or delete ever
DROP POLICY IF EXISTS "rx_no_update" ON public.prescriptions;
CREATE POLICY "rx_no_update" ON public.prescriptions FOR UPDATE USING (false);

DROP POLICY IF EXISTS "rx_no_delete" ON public.prescriptions;
CREATE POLICY "rx_no_delete" ON public.prescriptions FOR DELETE USING (false);

-- ─────────────────────────────────────────────────────────────
-- medications  (staff read-only; admin manages)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "meds_staff_read" ON public.medications;
CREATE POLICY "meds_staff_read" ON public.medications
  FOR SELECT
  USING (get_my_role() IN ('admin','doctor','receptionist'));
-- Patients have NO access to medication master

DROP POLICY IF EXISTS "meds_admin_insert" ON public.medications;
CREATE POLICY "meds_admin_insert" ON public.medications
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "meds_admin_update" ON public.medications;
CREATE POLICY "meds_admin_update" ON public.medications
  FOR UPDATE USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "meds_admin_delete" ON public.medications;
CREATE POLICY "meds_admin_delete" ON public.medications
  FOR DELETE USING (get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- treatments  (staff read-only; admin manages)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "treatments_staff_read" ON public.treatments;
CREATE POLICY "treatments_staff_read" ON public.treatments
  FOR SELECT
  USING (get_my_role() IN ('admin','doctor','receptionist'));
-- Patients have NO access to internal treatment master

DROP POLICY IF EXISTS "treatments_admin_insert" ON public.treatments;
CREATE POLICY "treatments_admin_insert" ON public.treatments
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "treatments_admin_update" ON public.treatments;
CREATE POLICY "treatments_admin_update" ON public.treatments
  FOR UPDATE USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "treatments_admin_delete" ON public.treatments;
CREATE POLICY "treatments_admin_delete" ON public.treatments
  FOR DELETE USING (get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- audit_logs  (APPEND-ONLY)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "audit_staff_read" ON public.audit_logs;
CREATE POLICY "audit_staff_read" ON public.audit_logs
  FOR SELECT
  USING (get_my_role() IN ('admin','doctor','receptionist'));

-- Any authenticated user inserts only their own audit entries
DROP POLICY IF EXISTS "audit_insert_own" ON public.audit_logs;
CREATE POLICY "audit_insert_own" ON public.audit_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- APPEND-ONLY: no update or delete
DROP POLICY IF EXISTS "audit_no_update" ON public.audit_logs;
CREATE POLICY "audit_no_update" ON public.audit_logs FOR UPDATE USING (false);

DROP POLICY IF EXISTS "audit_no_delete" ON public.audit_logs;
CREATE POLICY "audit_no_delete" ON public.audit_logs FOR DELETE USING (false);

-- ─────────────────────────────────────────────────────────────
-- clinic_feedback
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "feedback_create" ON public.clinic_feedback;
CREATE POLICY "feedback_create" ON public.clinic_feedback
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND submitted_by_uid = auth.uid());

DROP POLICY IF EXISTS "feedback_staff_read" ON public.clinic_feedback;
CREATE POLICY "feedback_staff_read" ON public.clinic_feedback
  FOR SELECT USING (get_my_role() IN ('admin','doctor','receptionist'));

DROP POLICY IF EXISTS "feedback_admin_update" ON public.clinic_feedback;
CREATE POLICY "feedback_admin_update" ON public.clinic_feedback
  FOR UPDATE USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "feedback_admin_delete" ON public.clinic_feedback;
CREATE POLICY "feedback_admin_delete" ON public.clinic_feedback
  FOR DELETE USING (get_my_role() = 'admin');
