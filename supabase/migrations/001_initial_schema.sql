-- =============================================================
-- Migration 001: Initial Schema
-- DentalCare HMIS — Supabase PostgreSQL
-- Run via: Supabase Dashboard → SQL Editor
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- HELPER: auto-update updated_at
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- TABLE: users
-- id = Supabase auth.users UUID (no separate auth_uid column)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  phone               text NOT NULL DEFAULT '',
  role                text NOT NULL DEFAULT 'patient'
                          CHECK (role IN ('admin','receptionist','doctor','patient')),
  email               text,
  specialization      text,
  registration_number text,
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE  public.users IS 'Application user profiles (staff + patients). id = Supabase auth UUID.';
COMMENT ON COLUMN public.users.role IS 'Role enforced by RLS. Never set from client input directly.';

-- ─────────────────────────────────────────────────────────────
-- HELPER: role lookup (security-definer avoids RLS recursion)
-- Defined after public.users because the function reads that table.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

-- ─────────────────────────────────────────────────────────────
-- TABLE: patients
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patients (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uhid                    text UNIQUE NOT NULL,
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
COMMENT ON TABLE  public.patients IS 'Patient demographic records.';
COMMENT ON COLUMN public.patients.uhid IS 'Business UHID = normalized E.164 mobile (+91XXXXXXXXXX).';
COMMENT ON COLUMN public.patients.name_lower IS 'Generated column for case-insensitive prefix search.';

CREATE INDEX IF NOT EXISTS idx_patients_phone      ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name_lower ON public.patients(name_lower);
CREATE INDEX IF NOT EXISTS idx_patients_uhid       ON public.patients(uhid);

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: appointments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                uuid NOT NULL REFERENCES public.patients(id),
  patient_phone             text NOT NULL,
  patient_name              text NOT NULL,
  doctor_id                 uuid NOT NULL REFERENCES public.users(id),
  doctor_name               text NOT NULL,
  date                      date NOT NULL,
  time                      text NOT NULL,
  visit_type                text NOT NULL
                                CHECK (visit_type IN ('new-consultation','follow-up','emergency','procedure')),
  reason                    text NOT NULL,
  expected_treatment        text,
  expected_treatment_price  text,
  status                    text NOT NULL DEFAULT 'scheduled'
                                CHECK (status IN ('scheduled','checked-in','waiting','in-consultation','completed','cancelled','no-show')),
  notes                     text,
  created_by                uuid NOT NULL REFERENCES public.users(id),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.appointments IS 'Patient appointment scheduling.';

CREATE INDEX IF NOT EXISTS idx_appts_date        ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appts_doctor_date ON public.appointments(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_appts_patient     ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appts_phone       ON public.appointments(patient_phone);

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: consultations
-- ─────────────────────────────────────────────────────────────
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
  tooth_findings              jsonb NOT NULL DEFAULT '[]',
  treatment_performed         text,
  treatment_plan              text,
  advice                      text,
  follow_up_required          boolean NOT NULL DEFAULT false,
  follow_up_date              date,
  status                      text NOT NULL DEFAULT 'draft'
                                  CHECK (status IN ('draft','finalized')),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE  public.consultations IS 'Clinical consultation records.';
COMMENT ON COLUMN public.consultations.tooth_findings IS 'JSONB array of ToothFinding objects.';

CREATE INDEX IF NOT EXISTS idx_consult_patient ON public.consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consult_doctor  ON public.consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consult_date    ON public.consultations(date);
CREATE INDEX IF NOT EXISTS idx_consult_phone   ON public.consultations(patient_phone);

CREATE TRIGGER consultations_updated_at
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: prescriptions  (immutable — no updated_at)
-- ─────────────────────────────────────────────────────────────
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
  medications                 jsonb NOT NULL DEFAULT '[]',
  advice                      text,
  follow_up_date              date,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prescription_has_medications CHECK (jsonb_typeof(medications) = 'array' AND jsonb_array_length(medications) > 0)
  -- Deliberately no updated_at: prescriptions are permanent legal records
);
COMMENT ON TABLE  public.prescriptions IS 'Immutable prescription documents.';
COMMENT ON COLUMN public.prescriptions.medications IS 'JSONB snapshot of PrescriptionMedication[]. Independent of medication master.';

CREATE INDEX IF NOT EXISTS idx_rx_patient  ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_rx_doctor   ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_rx_consult  ON public.prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_rx_phone    ON public.prescriptions(patient_phone);

-- ─────────────────────────────────────────────────────────────
-- TABLE: medications  (reference catalog)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medications (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  generic_name text,
  brand_name   text,
  strength     text,
  dosage_form  text NOT NULL,
  category     text NOT NULL,
  combination  boolean NOT NULL DEFAULT false,
  active       boolean NOT NULL DEFAULT true,
  source       text,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.medications IS '21-entry dental medication reference catalog.';

CREATE INDEX IF NOT EXISTS idx_medications_active ON public.medications(active);

CREATE TRIGGER medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: treatments  (Kurnool tariff reference)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.treatments (
  id              text PRIMARY KEY,
  treatment_name  text NOT NULL,
  category        text NOT NULL,
  min_price       integer NOT NULL,
  max_price       integer,
  price_display   text NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  source          text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE  public.treatments IS '33-entry Kurnool Dental Doctors Association tariff reference.';
COMMENT ON COLUMN public.treatments.max_price IS 'NULL means unbounded (e.g. 1,50,000+).';

CREATE INDEX IF NOT EXISTS idx_treatments_active ON public.treatments(active);

CREATE TRIGGER treatments_updated_at
  BEFORE UPDATE ON public.treatments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: audit_logs  (append-only)
-- ─────────────────────────────────────────────────────────────
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
);
COMMENT ON TABLE public.audit_logs IS 'Append-only tamper-proof action audit trail.';

CREATE INDEX IF NOT EXISTS idx_audit_user   ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);

-- ─────────────────────────────────────────────────────────────
-- TABLE: clinic_feedback
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: auto-create users row on Supabase Auth signup
-- Always assigns role = 'patient'. Admin promotes staff manually.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
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
    'patient',
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
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: prevent role self-escalation
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role
     AND OLD.id = auth.uid()
     AND get_my_role() != 'admin'
  THEN
    RAISE EXCEPTION 'You are not authorized to change your own role.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_prevent_role_escalation ON public.users;
CREATE TRIGGER users_prevent_role_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: prevent modifying finalized consultations
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: enforce authentic caller identity on audit_logs
-- Overwrites client user_id, user_role, user_name with actual session
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: enforce authentic caller identity on clinic_feedback
-- ─────────────────────────────────────────────────────────────
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

