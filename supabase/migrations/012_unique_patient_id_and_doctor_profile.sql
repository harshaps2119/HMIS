-- =============================================================
-- Migration 012: Unique Patient ID Architecture & Doctor Profile
-- Prasad Dental Care HMIS — Supabase PostgreSQL
-- =============================================================
-- 1. Creates concurrency-safe patient_id_seq sequence (starts at 1).
-- 2. Adds permanent patient_id column (PDC-000001 format) to public.patients
--    and public.users with UNIQUE constraints.
-- 3. Backfills existing patient records with sequential unique Patient IDs
--    ordered by creation timestamp, and synchronizes uhid with patient_id.
-- 4. Installs trg_assign_patient_id trigger on public.patients ensuring
--    all new patients automatically receive collision-safe Patient IDs.
-- 5. Upgrades provision_patient_account RPC to atomically assign and return
--    the unique Patient ID.
-- 6. Implements public.resolve_patient_login() RPC for Patient ID login.
-- 7. Provisions / reinforces Dr. Hemanth Kumar's doctor account with
--    Orthodontics specialization and GoTrue encrypted credentials.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: PATIENT ID SEQUENCE & FORMATTER
-- ─────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.patient_id_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.format_patient_id(seq_val bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'PDC-' || LPAD(seq_val::text, 6, '0');
$$;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: ALTER TABLES FOR PERMANENT PATIENT ID
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS patient_id text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS patient_id text;

-- ─────────────────────────────────────────────────────────────
-- STEP 3: MIGRATION & BACKFILL FOR EXISTING PATIENTS
-- Assigns sequential PDC-000001, PDC-000002... to existing patients
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
  v_next_id text;
  v_count bigint := 0;
BEGIN
  -- Process genuine patient records in order of registration
  FOR r IN (
    SELECT id, phone, email, name
    FROM public.patients
    WHERE patient_id IS NULL OR patient_id !~ '^PDC-[0-9]{6}$'
    ORDER BY created_at ASC
  ) LOOP
    v_next_id := public.format_patient_id(nextval('public.patient_id_seq'));
    v_count := v_count + 1;

    -- Update patient record
    UPDATE public.patients
    SET patient_id = v_next_id,
        uhid = v_next_id
    WHERE id = r.id;

    -- Update linked public.users profile if exists
    UPDATE public.users
    SET patient_id = v_next_id
    WHERE (phone = r.phone OR (r.email IS NOT NULL AND LOWER(email) = LOWER(r.email)))
      AND role = 'patient';
  END LOOP;
END;
$$;

-- Enforce UNIQUE constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patients_patient_id_key'
  ) THEN
    ALTER TABLE public.patients ADD CONSTRAINT patients_patient_id_key UNIQUE (patient_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_patient_id_key'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_patient_id_key UNIQUE (patient_id);
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- STEP 4: TRIGGER FOR AUTOMATIC PATIENT ID ASSIGNMENT
-- Guarantees atomic, collision-free generation for any insert
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_assign_patient_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.patient_id IS NULL OR TRIM(NEW.patient_id) = '' OR NEW.patient_id !~ '^PDC-[0-9]{6}$' THEN
    NEW.patient_id := public.format_patient_id(nextval('public.patient_id_seq'));
  END IF;

  NEW.patient_id := UPPER(TRIM(NEW.patient_id));
  -- Synchronize business UHID with Patient ID
  NEW.uhid := NEW.patient_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_patient_id ON public.patients;
CREATE TRIGGER trg_assign_patient_id
  BEFORE INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_assign_patient_id();

-- ─────────────────────────────────────────────────────────────
-- STEP 5: UPGRADE provision_patient_account RPC
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.provision_patient_account(
  p_name text,
  p_phone text,
  p_email text,
  p_password text,
  p_gender text DEFAULT 'Other',
  p_age integer DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_allergies text DEFAULT NULL,
  p_medical_history text DEFAULT NULL,
  p_emergency_contact text DEFAULT NULL,
  p_emergency_contact_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_caller_role text;
  v_normalized_phone text;
  v_user_id uuid;
  v_patient_id_text text;
  v_encrypted_pw text;
  v_existing_auth_id uuid;
  v_existing_user_id uuid;
  v_clean_email text;
  v_clean_name text;
BEGIN
  -- 1. Authorization: admin or receptionist only
  v_caller_role := get_my_role();
  IF v_caller_role NOT IN ('admin', 'receptionist') THEN
    RAISE EXCEPTION 'Unauthorized: Only clinic administrators and receptionists can provision patient portal accounts.';
  END IF;

  -- 2. Validate and sanitize name
  v_clean_name := TRIM(COALESCE(p_name, ''));
  IF v_clean_name = '' THEN
    RAISE EXCEPTION 'Patient name is required.';
  END IF;

  -- 3. Validate and normalize phone
  v_normalized_phone := TRIM(COALESCE(p_phone, ''));
  IF v_normalized_phone ~ '^[6-9][0-9]{9}$' THEN
    v_normalized_phone := '+91' || v_normalized_phone;
  ELSIF v_normalized_phone ~ '^91[6-9][0-9]{9}$' THEN
    v_normalized_phone := '+' || v_normalized_phone;
  END IF;

  IF v_normalized_phone !~ '^\+91[6-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'Invalid mobile number. Must be a valid 10-digit Indian mobile number.';
  END IF;

  -- 4. Validate email
  v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));
  IF v_clean_email = '' OR v_clean_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'A valid email address is required to provision a patient portal login.';
  END IF;

  -- 5. Validate password
  IF LENGTH(p_password) < 6 THEN
    RAISE EXCEPTION 'Initial password must be at least 6 characters.';
  END IF;

  -- 6. Check duplicates in auth.users
  SELECT id INTO v_existing_auth_id FROM auth.users WHERE LOWER(email) = v_clean_email;
  IF v_existing_auth_id IS NOT NULL THEN
    RAISE EXCEPTION 'An authentication account with email % already exists.', v_clean_email;
  END IF;

  -- 7. Check if phone is already used by an active patient
  SELECT id INTO v_existing_user_id FROM public.users WHERE phone = v_normalized_phone AND role = 'patient';
  IF v_existing_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'A portal account for mobile number % already exists.', v_normalized_phone;
  END IF;

  -- 8. Generate atomic Unique Patient ID
  v_patient_id_text := public.format_patient_id(nextval('public.patient_id_seq'));

  -- 9. Generate UUID and encrypted password
  v_user_id := gen_random_uuid();
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- 10. Insert into auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_clean_email,
    v_encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'name', v_clean_name,
      'phone', v_normalized_phone,
      'patient_id', v_patient_id_text,
      'provisioned_by_staff', true
    ),
    now(), now(), '', '', '', '', '', '', '', ''
  );

  -- 11. Insert matching identity for GoTrue
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email),
    'email', v_user_id::text, now(), now(), now()
  );

  -- 12. Upsert public.users profile
  INSERT INTO public.users (id, name, phone, role, email, active, patient_id)
  VALUES (v_user_id, v_clean_name, v_normalized_phone, 'patient', v_clean_email, true, v_patient_id_text)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    role = 'patient',
    email = EXCLUDED.email,
    active = true,
    patient_id = EXCLUDED.patient_id;

  -- 13. Upsert public.patients record
  INSERT INTO public.patients (
    uhid, patient_id, phone, name, email, gender, age, date_of_birth,
    address, allergies, medical_history, emergency_contact, emergency_contact_name, created_by
  ) VALUES (
    v_patient_id_text,
    v_patient_id_text,
    v_normalized_phone,
    v_clean_name,
    v_clean_email,
    COALESCE(p_gender, 'Other'),
    p_age,
    p_date_of_birth,
    p_address,
    p_allergies,
    p_medical_history,
    p_emergency_contact,
    p_emergency_contact_name,
    auth.uid()
  )
  ON CONFLICT (uhid) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    patient_id = EXCLUDED.patient_id,
    phone = EXCLUDED.phone,
    gender = EXCLUDED.gender,
    age = COALESCE(EXCLUDED.age, public.patients.age),
    date_of_birth = COALESCE(EXCLUDED.date_of_birth, public.patients.date_of_birth),
    address = COALESCE(EXCLUDED.address, public.patients.address);

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'patient_id', v_patient_id_text,
    'uhid', v_patient_id_text,
    'phone', v_normalized_phone,
    'email', v_clean_email,
    'name', v_clean_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_patient_account TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- STEP 6: RESOLVE PATIENT LOGIN IDENTIFIER RPC
-- Resolves Patient ID (PDC-000001) or Email to Supabase Auth login email
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_patient_login(p_login_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_clean_ident text;
  v_user_record RECORD;
BEGIN
  v_clean_ident := TRIM(COALESCE(p_login_identifier, ''));
  IF v_clean_ident = '' THEN
    RETURN jsonb_build_object('found', false, 'error', 'Identifier is required');
  END IF;

  -- 1. Direct match on public.users by patient_id or email
  SELECT id, email, name, role, active, patient_id
  INTO v_user_record
  FROM public.users
  WHERE (UPPER(COALESCE(patient_id, '')) = UPPER(v_clean_ident)
         OR LOWER(COALESCE(email, '')) = LOWER(v_clean_ident))
    AND role = 'patient'
  LIMIT 1;

  IF v_user_record.id IS NOT NULL THEN
    IF NOT v_user_record.active THEN
      RETURN jsonb_build_object('found', true, 'active', false, 'error', 'Account is deactivated');
    END IF;

    RETURN jsonb_build_object(
      'found', true,
      'active', true,
      'email', v_user_record.email,
      'patient_id', v_user_record.patient_id,
      'name', v_user_record.name
    );
  END IF;

  -- 2. Fallback check on public.patients
  SELECT p.email, p.patient_id, p.name, u.active, u.id as user_id
  INTO v_user_record
  FROM public.patients p
  LEFT JOIN public.users u ON (u.phone = p.phone OR (p.email IS NOT NULL AND LOWER(u.email) = LOWER(p.email))) AND u.role = 'patient'
  WHERE UPPER(COALESCE(p.patient_id, '')) = UPPER(v_clean_ident)
     OR UPPER(COALESCE(p.uhid, '')) = UPPER(v_clean_ident)
     OR LOWER(COALESCE(p.email, '')) = LOWER(v_clean_ident)
  LIMIT 1;

  IF v_user_record.email IS NOT NULL THEN
    RETURN jsonb_build_object(
      'found', true,
      'active', COALESCE(v_user_record.active, true),
      'email', v_user_record.email,
      'patient_id', v_user_record.patient_id,
      'name', v_user_record.name
    );
  END IF;

  RETURN jsonb_build_object('found', false, 'error', 'No patient account found with this identifier');
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_patient_login(text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- STEP 7: DOCTOR ACCOUNT: DR. HEMANTH KUMAR
-- Provisions / updates doctor profile in auth.users and public.users
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_dr_id uuid := 'd0000000-0000-0000-0000-000000000002';
  v_existing_auth_id uuid;
  v_encrypted_pw text;
BEGIN
  -- Check if already exists by email
  SELECT id INTO v_existing_auth_id
  FROM auth.users
  WHERE LOWER(email) = 'hemanth.kumar@prasaddentalcare.com';

  IF v_existing_auth_id IS NOT NULL THEN
    v_dr_id := v_existing_auth_id;
  END IF;

  -- Encrypt password: 'Prasad@2026' using GoTrue Blowfish
  v_encrypted_pw := extensions.crypt('Prasad@2026', extensions.gen_salt('bf'));

  -- Upsert auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_dr_id,
    'authenticated',
    'authenticated',
    'hemanth.kumar@prasaddentalcare.com',
    v_encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'name', 'Dr. Hemanth Kumar',
      'phone', '+918328456378',
      'role', 'doctor',
      'specialization', 'Orthodontics',
      'provisioned_by_admin', true
    ),
    now(), now(), '', '', '', '', '', '', '', ''
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = now(),
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

  -- Upsert auth.identities
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_dr_id, v_dr_id,
    jsonb_build_object('sub', v_dr_id::text, 'email', 'hemanth.kumar@prasaddentalcare.com'),
    'email', v_dr_id::text, now(), now(), now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data;

  -- Upsert public.users profile
  INSERT INTO public.users (
    id, name, phone, role, email, specialization, active
  ) VALUES (
    v_dr_id,
    'Dr. Hemanth Kumar',
    '+918328456378',
    'doctor',
    'hemanth.kumar@prasaddentalcare.com',
    'Orthodontics',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    role = 'doctor',
    email = EXCLUDED.email,
    specialization = 'Orthodontics',
    active = true;
END;
$$;
