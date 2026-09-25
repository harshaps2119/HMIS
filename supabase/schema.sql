-- ============================================================
-- DentalCare HMIS — Supabase PostgreSQL Schema
-- Run this entire file in Supabase Dashboard → SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SECTION 1: HELPER FUNCTIONS
-- ────────────────────────────────────────────────────────────

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- SECTION 2: TABLES
-- Create in FK-dependency order
-- ────────────────────────────────────────────────────────────

-- 2.1 USERS
-- id = Supabase auth.users UUID (no separate auth_uid needed)
CREATE TABLE IF NOT EXISTS public.users (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  phone               text NOT NULL,
  role                text NOT NULL DEFAULT 'patient'
                          CHECK (role IN ('admin','receptionist','doctor','patient')),
  email               text,
  specialization      text,
  registration_number text,
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.users IS 'Staff and patient auth profiles with roles';

-- Security-definer function: returns the current user's role
-- (bypasses RLS on users table to avoid infinite recursion)
-- Defined after public.users because the function reads that table.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2.2 PATIENTS
CREATE TABLE IF NOT EXISTS public.patients (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uhid                    text UNIQUE NOT NULL,  -- E.164 phone = business UHID
  phone                   text NOT NULL,
  name                    text NOT NULL,
  name_lower              text GENERATED ALWAYS AS (lower(trim(name))) STORED,
  date_of_birth           date,
  age                     integer,
  gender                  text CHECK (gender IN ('Male','Female','Other')),
  address                 text,
  email                   text,
  allergies               text,
  medical_history         text,
  emergency_contact       text,
  emergency_contact_name  text,
  created_by              uuid NOT NULL REFERENCES public.users(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.patients IS 'Patient demographic records';
COMMENT ON COLUMN public.patients.uhid IS 'Business UHID = normalized E.164 mobile number';

-- 2.3 APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                uuid NOT NULL REFERENCES public.patients(id),
  patient_phone             text NOT NULL,
  patient_name              text NOT NULL,
  doctor_id                 uuid NOT NULL REFERENCES public.users(id),
  doctor_name               text NOT NULL,
  date                      date NOT NULL,
  time                      text NOT NULL,   -- HH:MM
  visit_type                text NOT NULL
                                CHECK (visit_type IN ('new-consultation','follow-up','emergency','procedure')),
  reason                    text NOT NULL,
  expected_treatment        text,
  expected_treatment_price  text,
  status                    text NOT NULL DEFAULT 'scheduled'
                                CHECK (status IN ('requested','scheduled','checked-in','waiting','in-consultation','completed','cancelled','no-show')),
  notes                     text,
  created_by                uuid NOT NULL REFERENCES public.users(id),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.appointments IS 'Patient appointment scheduling';

-- 2.4 CONSULTATIONS
CREATE TABLE IF NOT EXISTS public.consultations (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                  uuid NOT NULL REFERENCES public.patients(id),
  patient_phone               text NOT NULL,
  patient_name                text NOT NULL,
  doctor_id                   uuid NOT NULL REFERENCES public.users(id),
  doctor_name                 text NOT NULL,
  appointment_id              uuid REFERENCES public.appointments(id),
  date                        date NOT NULL,
  time                        text NOT NULL,
  chief_complaint             text NOT NULL,
  history_of_present_illness  text,
  clinical_examination        text,
  diagnoses                   text[] NOT NULL DEFAULT '{}',
  other_diagnosis             text,
  tooth_findings              jsonb NOT NULL DEFAULT '[]',  -- ToothFinding[]
  treatment_performed         text,
  treatment_plan              text,
  advice                      text,
  follow_up_required          boolean NOT NULL DEFAULT false,
  follow_up_date              date,
  status                      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','finalized')),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.consultations IS 'Clinical consultation records';

-- 2.5 PRESCRIPTIONS (immutable — no updated_at)
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id             uuid NOT NULL REFERENCES public.consultations(id),
  patient_id                  uuid NOT NULL REFERENCES public.patients(id),
  patient_phone               text NOT NULL,
  patient_name                text NOT NULL,
  patient_age                 integer,
  patient_gender              text,
  doctor_id                   uuid NOT NULL REFERENCES public.users(id),
  doctor_name                 text NOT NULL,
  doctor_registration_number  text,
  date                        date NOT NULL,
  diagnoses                   text[] NOT NULL DEFAULT '{}',
  medications                 jsonb NOT NULL DEFAULT '[]',  -- PrescriptionMedication[] snapshot
  advice                      text,
  follow_up_date              date,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prescription_has_medications CHECK (jsonb_typeof(medications) = 'array' AND jsonb_array_length(medications) > 0)
  -- Deliberately no updated_at: prescriptions are permanent legal records
);
COMMENT ON TABLE public.prescriptions IS 'Immutable prescription documents';

-- 2.6 MEDICATIONS MASTER
CREATE TABLE IF NOT EXISTS public.medications (
  id          text PRIMARY KEY,   -- 'med_01' ... 'med_21'
  name        text NOT NULL,
  generic_name text,
  brand_name  text,
  strength    text,
  dosage_form text NOT NULL,
  category    text NOT NULL,
  combination boolean NOT NULL DEFAULT false,
  active      boolean NOT NULL DEFAULT true,
  source      text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.medications IS '21-entry dental medication reference catalog';

-- 2.7 TREATMENTS MASTER (Kurnool Tariff Reference)
CREATE TABLE IF NOT EXISTS public.treatments (
  id              text PRIMARY KEY,   -- 'trt_01' ... 'trt_33'
  treatment_name  text NOT NULL,
  category        text NOT NULL,
  min_price       integer NOT NULL,
  max_price       integer,            -- NULL = unbounded (e.g. 1,50,000+)
  price_display   text NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  source          text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.treatments IS '33-entry Kurnool Dental Doctors Association tariff reference';

-- 2.8 AUDIT LOGS (append-only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id),
  user_role   text NOT NULL,
  user_name   text NOT NULL,
  action      text NOT NULL,
  target_id   text NOT NULL,
  target_type text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
  -- No updated_at: audit logs are append-only
);
COMMENT ON TABLE public.audit_logs IS 'Append-only tamper-proof action audit trail';

-- 2.9 CLINIC FEEDBACK
CREATE TABLE IF NOT EXISTS public.clinic_feedback (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usability_rating      integer NOT NULL CHECK (usability_rating BETWEEN 1 AND 5),
  feature_usefulness    text[] NOT NULL DEFAULT '{}',
  problems_encountered  text,
  suggestions           text,
  submitted_by_uid      uuid NOT NULL REFERENCES public.users(id),
  submitted_by_role     text NOT NULL,
  submitted_by_name     text NOT NULL,
  submitted_at          timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- SECTION 3: INDEXES
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_patients_phone      ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name_lower ON public.patients(name_lower);
CREATE INDEX IF NOT EXISTS idx_patients_uhid       ON public.patients(uhid);

CREATE INDEX IF NOT EXISTS idx_appts_date          ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appts_doctor_date   ON public.appointments(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_appts_patient       ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appts_phone         ON public.appointments(patient_phone);

CREATE INDEX IF NOT EXISTS idx_consult_patient     ON public.consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consult_doctor      ON public.consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consult_date        ON public.consultations(date);
CREATE INDEX IF NOT EXISTS idx_consult_phone       ON public.consultations(patient_phone);

CREATE INDEX IF NOT EXISTS idx_rx_patient          ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_rx_doctor           ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_rx_consult          ON public.prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_rx_phone            ON public.prescriptions(patient_phone);

CREATE INDEX IF NOT EXISTS idx_medications_active  ON public.medications(active);
CREATE INDEX IF NOT EXISTS idx_treatments_active   ON public.treatments(active);

CREATE INDEX IF NOT EXISTS idx_audit_user          ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action        ON public.audit_logs(action);

-- ────────────────────────────────────────────────────────────
-- SECTION 4: TRIGGERS
-- ────────────────────────────────────────────────────────────

-- Auto-update updated_at
CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER consultations_updated_at
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER treatments_updated_at
  BEFORE UPDATE ON public.treatments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Prevent role self-escalation (non-admin cannot change own role)
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS trigger AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role
     AND OLD.id = auth.uid()
     AND get_my_role() != 'admin'
  THEN
    RAISE EXCEPTION 'You are not authorized to change your own role.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER users_prevent_role_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- Auto-create users row on Supabase Auth signup (always assigns 'patient' role)
-- and automatically links/creates corresponding record in public.patients if phone is supplied
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger AS $$
DECLARE
  v_name text;
  v_phone text;
BEGIN
  v_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), 'New User');
  v_phone := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''), '');

  -- 1. Insert or update public.users record
  INSERT INTO public.users (id, name, phone, role, email, active)
  VALUES (
    NEW.id,
    v_name,
    v_phone,
    'patient',   -- ALWAYS patient on self-signup; admin must manually promote staff
    NEW.email,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = CASE WHEN public.users.name = 'New User' AND v_name <> 'New User' THEN v_name ELSE public.users.name END,
    phone = CASE WHEN public.users.phone = '' AND v_phone <> '' THEN v_phone ELSE public.users.phone END,
    email = COALESCE(public.users.email, EXCLUDED.email);

  -- 2. If phone is provided, link or create record in public.patients
  IF v_phone <> '' THEN
    INSERT INTO public.patients (
      uhid,
      phone,
      name,
      email,
      gender,
      created_by
    )
    VALUES (
      v_phone,
      v_phone,
      v_name,
      NEW.email,
      'Other',
      NEW.id
    )
    ON CONFLICT (uhid) DO UPDATE
    SET
      email = COALESCE(public.patients.email, EXCLUDED.email),
      name = CASE WHEN public.patients.name = 'New User' AND v_name <> 'New User' THEN v_name ELSE public.patients.name END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- Prevent modifying finalized consultations
CREATE OR REPLACE FUNCTION prevent_finalized_consultation_modification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status = 'finalized' AND get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Finalized consultations are permanent medical records and cannot be modified.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consultations_prevent_finalized_edit ON public.consultations;
CREATE TRIGGER consultations_prevent_finalized_edit
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION prevent_finalized_consultation_modification();

-- Enforce authentic caller identity on audit_logs
CREATE OR REPLACE FUNCTION audit_logs_enforce_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user public.users%ROWTYPE;
BEGIN
  NEW.user_id = auth.uid();
  SELECT * INTO v_user FROM public.users WHERE id = auth.uid();
  IF FOUND THEN
    NEW.user_role = v_user.role;
    NEW.user_name = v_user.name;
  ELSE
    NEW.user_role = 'patient';
    NEW.user_name = 'User';
  END IF;
  NEW.created_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_identity_trigger ON public.audit_logs;
CREATE TRIGGER audit_logs_identity_trigger
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_enforce_identity();

-- Enforce authentic caller identity on clinic_feedback
CREATE OR REPLACE FUNCTION clinic_feedback_enforce_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user public.users%ROWTYPE;
BEGIN
  NEW.submitted_by_uid = auth.uid();
  SELECT * INTO v_user FROM public.users WHERE id = auth.uid();
  IF FOUND THEN
    NEW.submitted_by_role = v_user.role;
    NEW.submitted_by_name = v_user.name;
  ELSE
    NEW.submitted_by_role = 'patient';
    NEW.submitted_by_name = 'Clinic User';
  END IF;
  NEW.submitted_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clinic_feedback_identity_trigger ON public.clinic_feedback;
CREATE TRIGGER clinic_feedback_identity_trigger
  BEFORE INSERT ON public.clinic_feedback
  FOR EACH ROW EXECUTE FUNCTION clinic_feedback_enforce_identity();

-- ────────────────────────────────────────────────────────────
-- SECTION 5: ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_feedback ENABLE ROW LEVEL SECURITY;

-- ── users ───────────────────────────────────────────────────
-- All authenticated users can read (needed for doctor lists etc.)
CREATE POLICY "users_authenticated_read" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can update their own profile (role change blocked by trigger)
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Admin can do everything
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL USING (get_my_role() = 'admin');

-- ── patients ────────────────────────────────────────────────
-- Staff reads all patients
CREATE POLICY "patients_staff_read" ON public.patients
  FOR SELECT USING (get_my_role() IN ('admin','doctor','receptionist'));

-- Patient reads own record (matched by phone in users table)
CREATE POLICY "patients_self_read" ON public.patients
  FOR SELECT USING (
    phone = (SELECT phone FROM public.users WHERE id = auth.uid())
  );

-- Receptionist/admin creates patients
CREATE POLICY "patients_staff_create" ON public.patients
  FOR INSERT WITH CHECK (get_my_role() IN ('admin','receptionist'));

-- Receptionist/admin updates patients
CREATE POLICY "patients_staff_update" ON public.patients
  FOR UPDATE USING (get_my_role() IN ('admin','receptionist'));

-- Only admin deletes
CREATE POLICY "patients_admin_delete" ON public.patients
  FOR DELETE USING (get_my_role() = 'admin');

-- ── appointments ────────────────────────────────────────────
CREATE POLICY "appts_staff_read" ON public.appointments
  FOR SELECT USING (get_my_role() IN ('admin','doctor','receptionist'));

CREATE POLICY "appts_patient_read" ON public.appointments
  FOR SELECT USING (
    patient_phone = (SELECT phone FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "appts_receptionist_write" ON public.appointments
  FOR INSERT WITH CHECK (get_my_role() IN ('admin','receptionist'));

-- Patient can create appointment requests with their own phone
CREATE POLICY "appts_patient_create" ON public.appointments
  FOR INSERT WITH CHECK (
    get_my_role() = 'patient'
    AND patient_phone = (SELECT phone FROM public.users WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "appts_staff_update" ON public.appointments
  FOR UPDATE USING (get_my_role() IN ('admin','receptionist','doctor'));

CREATE POLICY "appts_admin_delete" ON public.appointments
  FOR DELETE USING (get_my_role() = 'admin');

-- ── consultations ───────────────────────────────────────────
CREATE POLICY "consult_staff_read" ON public.consultations
  FOR SELECT USING (get_my_role() IN ('admin','doctor','receptionist'));

CREATE POLICY "consult_patient_read" ON public.consultations
  FOR SELECT USING (
    patient_phone = (SELECT phone FROM public.users WHERE id = auth.uid())
  );

-- Doctor creates consultation; doctor_id must be themselves
CREATE POLICY "consult_doctor_create" ON public.consultations
  FOR INSERT WITH CHECK (
    get_my_role() IN ('admin','doctor')
    AND doctor_id = auth.uid()
  );

-- Doctor updates only their own draft consultations
CREATE POLICY "consult_doctor_update" ON public.consultations
  FOR UPDATE USING (
    get_my_role() IN ('admin','doctor')
    AND doctor_id = auth.uid()
    AND status != 'finalized'
  )
  WITH CHECK (
    get_my_role() IN ('admin','doctor')
    AND doctor_id = auth.uid()
  );

CREATE POLICY "consult_admin_delete" ON public.consultations
  FOR DELETE USING (get_my_role() = 'admin');

-- ── prescriptions ───────────────────────────────────────────
CREATE POLICY "rx_staff_read" ON public.prescriptions
  FOR SELECT USING (get_my_role() IN ('admin','doctor','receptionist'));

CREATE POLICY "rx_patient_read" ON public.prescriptions
  FOR SELECT USING (
    patient_phone = (SELECT phone FROM public.users WHERE id = auth.uid())
  );

-- Doctor creates; doctor_id must match caller
CREATE POLICY "rx_doctor_create" ON public.prescriptions
  FOR INSERT WITH CHECK (
    get_my_role() IN ('admin','doctor')
    AND doctor_id = auth.uid()
  );

-- IMMUTABLE: no update or delete ever
CREATE POLICY "rx_no_update" ON public.prescriptions FOR UPDATE USING (false);
CREATE POLICY "rx_no_delete" ON public.prescriptions FOR DELETE USING (false);

-- ── medications ─────────────────────────────────────────────
CREATE POLICY "meds_staff_read" ON public.medications
  FOR SELECT USING (get_my_role() IN ('admin','doctor','receptionist'));

CREATE POLICY "meds_admin_write" ON public.medications
  FOR ALL USING (get_my_role() = 'admin');

-- ── treatments ──────────────────────────────────────────────
CREATE POLICY "treatments_staff_read" ON public.treatments
  FOR SELECT USING (get_my_role() IN ('admin','doctor','receptionist'));

CREATE POLICY "treatments_admin_write" ON public.treatments
  FOR ALL USING (get_my_role() = 'admin');

-- ── audit_logs ──────────────────────────────────────────────
-- Staff reads audit logs
CREATE POLICY "audit_staff_read" ON public.audit_logs
  FOR SELECT USING (get_my_role() IN ('admin','doctor','receptionist'));

-- Any authenticated user can insert their own audit entry
CREATE POLICY "audit_insert_own" ON public.audit_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- APPEND-ONLY: no update or delete
CREATE POLICY "audit_no_update" ON public.audit_logs FOR UPDATE USING (false);
CREATE POLICY "audit_no_delete" ON public.audit_logs FOR DELETE USING (false);

-- ── clinic_feedback ─────────────────────────────────────────
CREATE POLICY "feedback_authenticated_create" ON public.clinic_feedback
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "feedback_staff_read" ON public.clinic_feedback
  FOR SELECT USING (get_my_role() IN ('admin','doctor','receptionist'));

CREATE POLICY "feedback_admin_manage" ON public.clinic_feedback
  FOR ALL USING (get_my_role() = 'admin');

-- ────────────────────────────────────────────────────────────
-- SECTION 6: ADMIN USER SETUP
-- After running this schema, invite your admin user via
-- Supabase Dashboard → Authentication → Users → Invite User
-- Then run the following (replace values):
--
-- UPDATE public.users
-- SET name = 'Admin Name', phone = '+91XXXXXXXXXX', role = 'admin'
-- WHERE id = '<auth-uid-from-dashboard>';
-- ────────────────────────────────────────────────────────────
