-- =============================================================
-- Migration 004: Link Online Patient Signups to public.patients
-- DentalCare HMIS — Supabase PostgreSQL
-- =============================================================

-- Update handle_new_auth_user trigger to:
-- 1. Read 'name' and 'phone' from auth metadata into public.users.
-- 2. Automatically link or create the corresponding record in public.patients.
-- 3. Avoid duplicates using the unique constraint on public.patients(uhid).

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
