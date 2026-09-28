-- =============================================================
-- Migration 013: Fix Patient Trigger & Workflow Deduplication
-- 1. Updates handle_new_user() trigger so staff patient provisioning
--    never creates duplicate patient records.
-- 2. Deduplicates existing duplicate patient rows (pointing appointments
--    to canonical records).
-- 3. Ensures Dr. Hemanth Kumar is active and has correct profile.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: UPGRADE handle_new_user() TRIGGER FUNCTION
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_name text;
  v_phone text;
  v_role text;
  v_is_staff boolean;
  v_is_provisioned_by_staff boolean;
BEGIN
  v_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), 'New User');
  v_phone := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''), '');
  v_role := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 'patient');
  v_is_staff := COALESCE((NEW.raw_user_meta_data->>'provisioned_by_admin')::boolean, false);
  v_is_provisioned_by_staff := COALESCE((NEW.raw_user_meta_data->>'provisioned_by_staff')::boolean, false);

  -- Only admin-provisioned users can receive staff roles via auth metadata
  IF v_role NOT IN ('admin', 'doctor', 'receptionist') OR NOT v_is_staff THEN
    v_role := 'patient';
  END IF;

  IF v_phone !~ '^\+91[6-9][0-9]{9}$' THEN
    v_phone := '';
  END IF;

  -- 1. Upsert public.users profile
  INSERT INTO public.users (id, name, phone, role, email, active)
  VALUES (NEW.id, v_name, v_phone, v_role, NEW.email, true)
  ON CONFLICT (id) DO UPDATE SET
    name = CASE WHEN public.users.name = 'New User' THEN EXCLUDED.name ELSE public.users.name END,
    phone = CASE WHEN public.users.phone = '' THEN EXCLUDED.phone ELSE public.users.phone END,
    email = COALESCE(public.users.email, EXCLUDED.email),
    role = CASE WHEN v_is_staff THEN v_role ELSE public.users.role END;

  -- 2. Clinical patient record creation:
  -- Do NOT insert if provisioned by staff (provision_patient_account handles full demographics atomically)
  IF v_role = 'patient' AND v_phone <> '' AND NOT v_is_provisioned_by_staff THEN
    -- Check if patient already exists by phone or email
    IF NOT EXISTS (
      SELECT 1 FROM public.patients
      WHERE phone = v_phone OR (NEW.email IS NOT NULL AND LOWER(email) = LOWER(NEW.email))
    ) THEN
      INSERT INTO public.patients (phone, name, email, gender, created_by)
      VALUES (v_phone, v_name, NEW.email, 'Other', NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: DEDUPLICATE EXISTING PATIENT ROWS
-- Merges duplicate rows sharing the same phone into the canonical row.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  rec RECORD;
  v_canonical_id uuid;
  v_canonical_patient_id text;
  v_dup_id uuid;
BEGIN
  FOR rec IN (
    SELECT phone
    FROM public.patients
    WHERE phone IS NOT NULL AND phone <> ''
    GROUP BY phone
    HAVING COUNT(*) > 1
  ) LOOP
    -- Select the canonical record (preferring one with PDC- format)
    SELECT id, patient_id INTO v_canonical_id, v_canonical_patient_id
    FROM public.patients
    WHERE phone = rec.phone
    ORDER BY (patient_id ~ '^PDC-[0-9]{6}$') DESC, created_at DESC
    LIMIT 1;

    -- Re-link any appointments pointing to duplicates of this phone to the canonical ID
    UPDATE public.appointments
    SET patient_id = v_canonical_id::text
    WHERE patient_phone = rec.phone AND patient_id <> v_canonical_id::text;

    -- Delete the duplicate rows
    DELETE FROM public.patients
    WHERE phone = rec.phone AND id <> v_canonical_id;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- STEP 3: REINFORCE ATTENDING DOCTOR STATUS (DR. HEMANTH KUMAR)
-- ─────────────────────────────────────────────────────────────
UPDATE public.users
SET active = true, role = 'doctor', specialization = 'Orthodontics'
WHERE email = 'hemanth.kumar@prasaddentalcare.com';
