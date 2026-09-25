-- =============================================================
-- Migration 007: Fix Auth NULL Tokens + Ensure identities
-- =============================================================
-- ROOT CAUSE: Auth users inserted via raw SQL INSERT into auth.users
-- leave token columns as NULL. GoTrue's Go scanner maps these to
-- non-nullable string fields and panics → HTTP 500
-- "Database error querying schema" on every signIn attempt.
--
-- This migration:
-- 1. Patches all existing auth.users rows: sets NULL tokens → ''
-- 2. Confirms all existing users' emails
-- 3. Adds missing auth.identities rows (provider=email)
-- 4. Installs the app-level AFTER INSERT trigger (handle_new_auth_user)
--    that auto-creates public.users + public.patients for new signups
--
-- NOTE: The BEFORE INSERT trigger (auto_confirm_new_auth_user) is
-- intentionally NOT installed here — Migration 008 correctly removed it.
-- Email confirmation for NEW signups should be disabled in
-- Supabase Dashboard → Authentication → Providers → Email
-- (toggle off "Confirm email").
--
-- Safe, idempotent. Run once in Supabase SQL Editor.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: FIX NULL TOKENS IN ALL EXISTING auth.users ROWS
-- This patches the rows seeded by 005_demo_seed_data.sql which
-- did raw INSERT without specifying token columns (they defaulted to NULL).
-- ─────────────────────────────────────────────────────────────
UPDATE auth.users
SET
  email_confirmed_at       = COALESCE(email_confirmed_at, now()),
  confirmation_token       = COALESCE(confirmation_token, ''),
  recovery_token           = COALESCE(recovery_token, ''),
  email_change_token_new   = COALESCE(email_change_token_new, ''),
  email_change             = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change             = COALESCE(phone_change, ''),
  phone_change_token       = COALESCE(phone_change_token, ''),
  reauthentication_token   = COALESCE(reauthentication_token, '')
WHERE
  confirmation_token IS NULL
  OR recovery_token IS NULL
  OR email_change_token_new IS NULL
  OR email_change IS NULL
  OR email_change_token_current IS NULL
  OR phone_change IS NULL
  OR phone_change_token IS NULL
  OR reauthentication_token IS NULL
  OR email_confirmed_at IS NULL;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: ENSURE auth.identities ROWS EXIST FOR ALL USERS
-- GoTrue requires each user to have a matching identity row.
-- ─────────────────────────────────────────────────────────────
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.id,
  json_build_object('sub', u.id::text, 'email', u.email)::jsonb,
  'email',
  u.id::text,
  now(),
  now(),
  now()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i
  WHERE i.user_id = u.id AND i.provider = 'email'
)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- STEP 3: INSTALL/UPDATE THE APPLICATION AFTER INSERT TRIGGER
-- Creates public.users + public.patients automatically when
-- Supabase Auth creates a new user (self-registration).
-- This is the ONLY trigger on auth.users in the final system.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name  text;
  v_phone text;
BEGIN
  v_name  := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), 'New User');
  v_phone := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''), '');

  -- Validate phone: only normalized Indian mobile numbers (+91XXXXXXXXXX)
  IF v_phone !~ '^\+91[6-9][0-9]{9}$' THEN
    v_phone := '';
  END IF;

  -- Create the application user profile
  INSERT INTO public.users (id, name, phone, role, email, active)
  VALUES (NEW.id, v_name, v_phone, 'patient', NEW.email, true)
  ON CONFLICT (id) DO UPDATE SET
    name  = CASE WHEN public.users.name  = 'New User' THEN EXCLUDED.name  ELSE public.users.name  END,
    phone = CASE WHEN public.users.phone = ''         THEN EXCLUDED.phone ELSE public.users.phone END,
    email = COALESCE(public.users.email, EXCLUDED.email);

  -- Create the clinical patient record (only when valid phone provided)
  IF v_phone <> '' THEN
    INSERT INTO public.patients (uhid, phone, name, email, gender, created_by)
    VALUES (v_phone, v_phone, v_name, NEW.email, 'Other', NEW.id)
    ON CONFLICT (uhid) DO UPDATE SET
      email = COALESCE(public.patients.email, EXCLUDED.email),
      name  = CASE WHEN public.patients.name = 'New User' THEN EXCLUDED.name ELSE public.patients.name END;
  END IF;

  RETURN NEW;
END;
$$;

-- Remove old versions of this trigger and reinstall cleanly
DROP TRIGGER IF EXISTS on_auth_user_created     ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_before_insert ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Ensure supabase_auth_admin can execute the trigger function
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL   ON public.users    TO supabase_auth_admin;
GRANT ALL   ON public.patients TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO supabase_auth_admin;
