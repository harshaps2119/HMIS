-- =============================================================
-- Migration 011: Staff & Admin Account Management
-- DentalCare HMIS — Supabase PostgreSQL
-- =============================================================
-- 1. Updates handle_new_auth_user trigger to recognize admin-provisioned
--    staff accounts and avoid creating unwanted patient records for staff.
-- 2. Grants admin full RLS permissions on public.users.
-- 3. Provides secure admin-only RPC: provision_staff_account().
--    - Callable ONLY by admin.
--    - Creates auth.users, auth.identities, and public.users with
--      the selected staff role ('admin', 'doctor', 'receptionist').
--    - Generates a secure random GoTrue encrypted password so no
--      plaintext password is ever stored or exposed.
--    - Prevents duplicate accounts for the same email or phone.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: REINFORCE public.users RLS FOR ADMIN MANAGEMENT
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_admin_insert" ON public.users;
DROP POLICY IF EXISTS "users_admin_delete" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;

CREATE POLICY "users_admin_all" ON public.users
  FOR ALL USING (get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- STEP 2: UPDATE handle_new_auth_user TRIGGER
-- Prevents staff accounts from being automatically inserted into
-- public.patients, and preserves their designated staff role.
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
  v_role text;
  v_is_staff boolean;
BEGIN
  v_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), 'New User');
  v_phone := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''), '');
  v_role := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 'patient');
  v_is_staff := COALESCE((NEW.raw_user_meta_data->>'provisioned_by_admin')::boolean, false);

  -- Only admin-provisioned users can receive staff roles via auth metadata
  IF v_role NOT IN ('admin', 'doctor', 'receptionist') OR NOT v_is_staff THEN
    v_role := 'patient';
  END IF;

  IF v_phone !~ '^\+91[6-9][0-9]{9}$' THEN
    v_phone := '';
  END IF;

  INSERT INTO public.users (id, name, phone, role, email, active)
  VALUES (NEW.id, v_name, v_phone, v_role, NEW.email, true)
  ON CONFLICT (id) DO UPDATE SET
    name = CASE WHEN public.users.name = 'New User' THEN EXCLUDED.name ELSE public.users.name END,
    phone = CASE WHEN public.users.phone = '' THEN EXCLUDED.phone ELSE public.users.phone END,
    email = COALESCE(public.users.email, EXCLUDED.email),
    role = CASE WHEN v_is_staff THEN v_role ELSE public.users.role END;

  -- Only create a clinical patient record if this is genuinely a patient
  IF v_role = 'patient' AND v_phone <> '' THEN
    INSERT INTO public.patients (uhid, phone, name, email, gender, created_by)
    VALUES (v_phone, v_phone, v_name, NEW.email, 'Other', NEW.id)
    ON CONFLICT (uhid) DO UPDATE SET
      email = COALESCE(public.patients.email, EXCLUDED.email),
      name = CASE WHEN public.patients.name = 'New User' THEN EXCLUDED.name ELSE public.patients.name END;
  END IF;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- STEP 3: ADMIN-ONLY STAFF PROVISIONING RPC
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.provision_staff_account(
  p_name text,
  p_email text,
  p_role text,
  p_phone text DEFAULT '',
  p_specialization text DEFAULT NULL,
  p_registration_number text DEFAULT NULL,
  p_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_caller_role text;
  v_clean_name text;
  v_clean_email text;
  v_normalized_phone text;
  v_user_id uuid;
  v_random_password text;
  v_encrypted_pw text;
  v_existing_auth_id uuid;
  v_existing_user_id uuid;
BEGIN
  -- 1. Authorization check: MUST be admin
  v_caller_role := get_my_role();
  IF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only clinic administrators can provision staff accounts. Current role: %', v_caller_role;
  END IF;

  -- 2. Validate and sanitize name
  v_clean_name := TRIM(COALESCE(p_name, ''));
  IF v_clean_name = '' THEN
    RAISE EXCEPTION 'Staff member name is required.';
  END IF;

  -- 3. Validate role
  IF p_role NOT IN ('admin', 'doctor', 'receptionist') THEN
    RAISE EXCEPTION 'Invalid staff role: %. Role must be one of: admin, doctor, receptionist.', p_role;
  END IF;

  -- 4. Validate email
  v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));
  IF v_clean_email = '' OR v_clean_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'A valid email address is required to create a staff account.';
  END IF;

  -- 5. Prevent duplicate email in auth.users
  SELECT id INTO v_existing_auth_id FROM auth.users WHERE LOWER(email) = v_clean_email;
  IF v_existing_auth_id IS NOT NULL THEN
    RAISE EXCEPTION 'An authentication account with email % already exists.', v_clean_email;
  END IF;

  -- 6. Prevent duplicate email in public.users
  SELECT id INTO v_existing_user_id FROM public.users WHERE LOWER(email) = v_clean_email;
  IF v_existing_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'A user profile with email % already exists.', v_clean_email;
  END IF;

  -- 7. Normalize phone if provided
  v_normalized_phone := TRIM(COALESCE(p_phone, ''));
  IF v_normalized_phone <> '' THEN
    IF v_normalized_phone ~ '^[6-9][0-9]{9}$' THEN
      v_normalized_phone := '+91' || v_normalized_phone;
    ELSIF v_normalized_phone ~ '^91[6-9][0-9]{9}$' THEN
      v_normalized_phone := '+' || v_normalized_phone;
    END IF;

    IF v_normalized_phone !~ '^\+91[6-9][0-9]{9}$' THEN
      RAISE EXCEPTION 'Invalid mobile number. Must be a valid 10-digit Indian mobile number.';
    END IF;

    -- Check if phone is already used by an active staff member
    SELECT id INTO v_existing_user_id
    FROM public.users
    WHERE phone = v_normalized_phone AND active = true AND role IN ('admin', 'doctor', 'receptionist');
    IF v_existing_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'A staff member with mobile number % already exists.', v_normalized_phone;
    END IF;
  END IF;

  -- 8. Generate UUID and random strong temporary password
  v_user_id := gen_random_uuid();
  v_random_password := encode(extensions.gen_random_bytes(32), 'hex');
  v_encrypted_pw := extensions.crypt(v_random_password, extensions.gen_salt('bf'));

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
    jsonb_build_object(
      'name', v_clean_name,
      'phone', v_normalized_phone,
      'role', p_role,
      'provisioned_by_admin', true
    ),
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
  INSERT INTO public.users (
    id,
    name,
    phone,
    role,
    email,
    specialization,
    registration_number,
    active
  ) VALUES (
    v_user_id,
    v_clean_name,
    v_normalized_phone,
    p_role,
    v_clean_email,
    NULLIF(TRIM(COALESCE(p_specialization, '')), ''),
    NULLIF(TRIM(COALESCE(p_registration_number, '')), ''),
    p_active
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    specialization = EXCLUDED.specialization,
    registration_number = EXCLUDED.registration_number,
    active = EXCLUDED.active;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'name', v_clean_name,
    'email', v_clean_email,
    'role', p_role,
    'phone', v_normalized_phone,
    'active', p_active
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_staff_account TO authenticated;
