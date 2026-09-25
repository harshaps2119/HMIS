-- =============================================================
-- Migration 008: Finalize supported patient self-registration
--
-- Removes the unsupported auth.users token-repair trigger. Supabase
-- Auth owns its internal token columns and email-confirmation behavior.
-- Configure email confirmation in Supabase Auth settings instead.
--
-- Keeps one idempotent AFTER INSERT trigger that creates the application
-- profile and phone-linked patient record for new self-registrations.
-- =============================================================

DROP TRIGGER IF EXISTS on_auth_user_before_insert ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_new_auth_user();

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

  -- Only valid normalized Indian mobile numbers become patient identities.
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Ensure supabase_auth_admin has permissions to execute trigger and write application records
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL   ON public.users    TO supabase_auth_admin;
GRANT ALL   ON public.patients TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO supabase_auth_admin;
