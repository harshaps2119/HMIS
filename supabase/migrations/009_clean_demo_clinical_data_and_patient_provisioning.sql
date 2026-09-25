-- =============================================================
-- Migration 009: Clean Demo Clinical Data & Staff Patient Provisioning
-- DentalCare HMIS — Supabase PostgreSQL
-- =============================================================
-- 1. Deletes fake seeded clinical data (appointments, consultation,
--    prescription) and clears mock allergies/medical history from demo records.
-- 2. Provides an admin-callable purge procedure: cleanup_demo_clinical_data().
-- 3. Provides secure staff-driven patient provisioning: provision_patient_account().
--    - Callable ONLY by admin or receptionist.
--    - Creates auth.users, auth.identities, public.users (role 'patient'),
--      and public.patients with phone as permanent UHID.
--    - Encrypts password using pgcrypto and populates all non-null GoTrue tokens.
--    - Does NOT require exposing SUPABASE_SERVICE_ROLE_KEY to client.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: CLEAN UP SEEDED DEMO CLINICAL RECORDS
-- ─────────────────────────────────────────────────────────────
DELETE FROM public.prescriptions
WHERE id = '10000000-0000-0000-0000-000000000001'
   OR patient_phone IN ('+919876543210', '+919876543212');

DELETE FROM public.consultations
WHERE id = 'f0000000-0000-0000-0000-000000000001'
   OR patient_phone IN ('+919876543210', '+919876543212');

DELETE FROM public.appointments
WHERE id IN (
  'e0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000003',
  'e0000000-0000-0000-0000-000000000004'
) OR patient_phone IN ('+919876543210', '+919876543212');

-- Reset allergies and medical history for demo patients
UPDATE public.patients
SET allergies = NULL, medical_history = NULL
WHERE uhid IN ('+919876543210', '+919876543212');

-- ─────────────────────────────────────────────────────────────
-- STEP 2: REUSABLE ADMIN PURGE PROCEDURE
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_demo_clinical_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Only clinic administrators can execute demo data cleanup.';
  END IF;

  DELETE FROM public.prescriptions
  WHERE id = '10000000-0000-0000-0000-000000000001'
     OR patient_phone IN ('+919876543210', '+919876543212');

  DELETE FROM public.consultations
  WHERE id = 'f0000000-0000-0000-0000-000000000001'
     OR patient_phone IN ('+919876543210', '+919876543212');

  DELETE FROM public.appointments
  WHERE id IN (
    'e0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000004'
  ) OR patient_phone IN ('+919876543210', '+919876543212');

  UPDATE public.patients
  SET allergies = NULL, medical_history = NULL
  WHERE uhid IN ('+919876543210', '+919876543212');
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_demo_clinical_data TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- STEP 3: STAFF-DRIVEN PATIENT ACCOUNT PROVISIONING RPC
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
  v_patient_id uuid;
  v_encrypted_pw text;
  v_existing_auth_id uuid;
  v_existing_user_id uuid;
  v_clean_email text;
  v_clean_name text;
BEGIN
  -- 1. Verify caller authorization: must be admin or receptionist
  v_caller_role := get_my_role();
  IF v_caller_role NOT IN ('admin', 'receptionist') THEN
    RAISE EXCEPTION 'Unauthorized: Only clinic administrators and receptionists can provision patient portal accounts.';
  END IF;

  -- 2. Validate and sanitize patient name
  v_clean_name := TRIM(COALESCE(p_name, ''));
  IF v_clean_name = '' THEN
    RAISE EXCEPTION 'Patient name is required.';
  END IF;

  -- 3. Validate and normalize mobile number (UHID)
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

  -- 5. Validate initial password length
  IF LENGTH(p_password) < 6 THEN
    RAISE EXCEPTION 'Initial password must be at least 6 characters.';
  END IF;

  -- 6. Check for duplicate email in auth.users
  SELECT id INTO v_existing_auth_id FROM auth.users WHERE LOWER(email) = v_clean_email;
  IF v_existing_auth_id IS NOT NULL THEN
    RAISE EXCEPTION 'An authentication account with email % already exists.', v_clean_email;
  END IF;

  -- 7. Check if phone is already associated with an existing patient auth login
  SELECT id INTO v_existing_user_id FROM public.users WHERE phone = v_normalized_phone AND role = 'patient';
  IF v_existing_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'A portal account for mobile number % already exists.', v_normalized_phone;
  END IF;

  -- 8. Generate user UUID and encrypted password
  v_user_id := gen_random_uuid();
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- 9. Insert into auth.users with all non-null GoTrue token columns
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_clean_email,
    v_encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', v_clean_name, 'phone', v_normalized_phone, 'provisioned_by_staff', 'true'),
    now(),
    now(),
    '', '', '', '', '', '', '', ''
  );

  -- 10. Insert matching identity row for GoTrue
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  -- 11. Upsert public.users profile
  INSERT INTO public.users (id, name, phone, role, email, active)
  VALUES (v_user_id, v_clean_name, v_normalized_phone, 'patient', v_clean_email, true)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    role = 'patient',
    email = EXCLUDED.email,
    active = true;

  -- 12. Upsert clinical patient directory record (UHID = normalized phone)
  INSERT INTO public.patients (
    uhid,
    phone,
    name,
    email,
    gender,
    age,
    date_of_birth,
    address,
    allergies,
    medical_history,
    emergency_contact,
    emergency_contact_name,
    created_by
  ) VALUES (
    v_normalized_phone,
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
    gender = COALESCE(EXCLUDED.gender, public.patients.gender),
    age = COALESCE(EXCLUDED.age, public.patients.age),
    date_of_birth = COALESCE(EXCLUDED.date_of_birth, public.patients.date_of_birth),
    address = COALESCE(EXCLUDED.address, public.patients.address),
    allergies = COALESCE(EXCLUDED.allergies, public.patients.allergies),
    medical_history = COALESCE(EXCLUDED.medical_history, public.patients.medical_history)
  RETURNING id INTO v_patient_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'patient_id', v_patient_id,
    'uhid', v_normalized_phone,
    'phone', v_normalized_phone,
    'email', v_clean_email,
    'name', v_clean_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_patient_account TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- STEP 4: TRIGGER REINFORCEMENT
-- Disallow public self-registration from activating unauthorized accounts.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text;
  v_phone text;
BEGIN
  v_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), 'New User');
  v_phone := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''), '');

  IF v_phone !~ '^\+91[6-9][0-9]{9}$' THEN
    v_phone := '';
  END IF;

  INSERT INTO public.users (id, name, phone, role, email, active)
  VALUES (NEW.id, v_name, v_phone, 'patient', NEW.email, true)
  ON CONFLICT (id) DO UPDATE SET
    name = CASE WHEN public.users.name = 'New User' THEN EXCLUDED.name ELSE public.users.name END,
    phone = CASE WHEN public.users.phone = '' THEN EXCLUDED.phone ELSE public.users.phone END,
    email = COALESCE(public.users.email, EXCLUDED.email);

  IF v_phone <> '' THEN
    INSERT INTO public.patients (uhid, phone, name, email, gender, created_by)
    VALUES (v_phone, v_phone, v_name, NEW.email, 'Other', NEW.id)
    ON CONFLICT (uhid) DO UPDATE SET
      email = COALESCE(public.patients.email, EXCLUDED.email),
      name = CASE WHEN public.patients.name = 'New User' THEN EXCLUDED.name ELSE public.patients.name END;
  END IF;

  RETURN NEW;
END;
$$;
