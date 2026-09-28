-- =============================================================
-- Migration 010: Admin-Only Test Patient Deletion RPC
-- DentalCare HMIS — Supabase PostgreSQL
-- =============================================================
-- PURPOSE:
--   Provides a safe, ordered deletion procedure for test/development
--   patients. This is intentionally NOT a general-purpose deletion tool —
--   it is scoped to admin users and is designed for test data cleanup only.
--
-- SECURITY:
--   - SECURITY DEFINER: runs with elevated privileges to bypass the
--     prescription immutability RLS (rx_no_delete). This is intentional
--     and appropriate for admin-driven test data cleanup.
--   - Caller authorization is checked at the START of the function.
--     Only 'admin' role can execute.
--   - No service-role key is exposed to the frontend.
--   - auth.users deletion cascades to public.users and auth.identities.
--
-- WHAT IS DELETED:
--   prescriptions (bypassing immutable RLS — dev/test only)
--   consultations
--   appointments
--   public.patients
--   auth.users → cascades to public.users, auth.identities
--
-- WHAT IS INTENTIONALLY RETAINED:
--   public.audit_logs (append-only legal audit trail — never deleted)
--   Any audit_logs entries that reference this user remain intact.
--
-- RETURNS:
--   JSON object with counts of deleted records and the patient's
--   auth user id that was deleted.
-- =============================================================

CREATE OR REPLACE FUNCTION public.delete_test_patient(
  p_patient_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_role          text;
  v_patient              public.patients%ROWTYPE;
  v_auth_user_id         uuid;
  v_deleted_prescriptions integer := 0;
  v_deleted_consultations integer := 0;
  v_deleted_appointments  integer := 0;
BEGIN
  -- ── 1. AUTHORIZATION CHECK ─────────────────────────────────
  -- Only admins may delete patient records for any reason.
  v_caller_role := get_my_role();
  IF v_caller_role <> 'admin' THEN
    RAISE EXCEPTION
      'Unauthorized: Only clinic administrators can delete patient records. '
      'Current role: %', v_caller_role;
  END IF;

  -- ── 2. LOCATE THE PATIENT ──────────────────────────────────
  SELECT * INTO v_patient
  FROM public.patients
  WHERE id = p_patient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Patient not found with id: %', p_patient_id;
  END IF;

  -- ── 3. FIND THE LINKED auth.users ACCOUNT ─────────────────
  -- The link between public.patients and auth.users is through
  -- phone equality: public.users.phone = public.patients.phone (= UHID)
  -- and public.users.id = auth.users.id (via FK).
  SELECT u.id INTO v_auth_user_id
  FROM public.users u
  WHERE u.phone = v_patient.phone
    AND u.role = 'patient'
  LIMIT 1;

  -- ── 4. DELETE PRESCRIPTIONS ────────────────────────────────
  -- NOTE: The client-side RLS policy rx_no_delete (FOR DELETE USING (false))
  -- prevents any client from deleting prescriptions. This SECURITY DEFINER
  -- function bypasses that RLS for admin-driven test data cleanup only.
  -- Prescriptions must be deleted before consultations due to the FK:
  --   prescriptions.consultation_id → consultations.id
  DELETE FROM public.prescriptions
  WHERE patient_id = p_patient_id;
  GET DIAGNOSTICS v_deleted_prescriptions = ROW_COUNT;

  -- ── 5. DELETE CONSULTATIONS ────────────────────────────────
  DELETE FROM public.consultations
  WHERE patient_id = p_patient_id;
  GET DIAGNOSTICS v_deleted_consultations = ROW_COUNT;

  -- ── 6. DELETE APPOINTMENTS ─────────────────────────────────
  DELETE FROM public.appointments
  WHERE patient_id = p_patient_id;
  GET DIAGNOSTICS v_deleted_appointments = ROW_COUNT;

  -- ── 7. DELETE public.patients ──────────────────────────────
  DELETE FROM public.patients
  WHERE id = p_patient_id;

  -- ── 8. DELETE auth.users ───────────────────────────────────
  -- Cascades automatically to:
  --   public.users      (FK: public.users.id → auth.users.id ON DELETE CASCADE)
  --   auth.identities   (managed by GoTrue cascade)
  -- audit_logs are NOT deleted — they are retained intentionally.
  IF v_auth_user_id IS NOT NULL THEN
    DELETE FROM auth.users
    WHERE id = v_auth_user_id;
  END IF;

  -- ── 9. RETURN DELETION SUMMARY ─────────────────────────────
  RETURN jsonb_build_object(
    'success',                  true,
    'patient_id',               p_patient_id,
    'patient_name',             v_patient.name,
    'patient_uhid',             v_patient.uhid,
    'auth_user_deleted',        v_auth_user_id IS NOT NULL,
    'auth_user_id',             v_auth_user_id,
    'deleted_prescriptions',    v_deleted_prescriptions,
    'deleted_consultations',    v_deleted_consultations,
    'deleted_appointments',     v_deleted_appointments,
    'audit_logs_retained',      true,
    'note',                     'Test patient deleted. Audit logs retained intentionally.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'delete_test_patient failed: % — %', SQLERRM, SQLSTATE;
END;
$$;

-- Grant execute to authenticated users — the function itself enforces admin-only.
-- Non-admin callers will receive an authorization error from inside the function.
GRANT EXECUTE ON FUNCTION public.delete_test_patient(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- COMPANION: Patient lookup / inspection RPC (no side effects, read-only)
-- Returns a patient's full profile + related record counts for display
-- before confirming deletion.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.inspect_patient_for_deletion(
  p_patient_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_role           text;
  v_patient               public.patients%ROWTYPE;
  v_auth_user_id          uuid;
  v_public_user           public.users%ROWTYPE;
  v_appointment_count     integer;
  v_consultation_count    integer;
  v_prescription_count    integer;
  v_audit_log_count       integer;
BEGIN
  -- Authorization: admin or receptionist may inspect
  v_caller_role := get_my_role();
  IF v_caller_role NOT IN ('admin', 'receptionist') THEN
    RAISE EXCEPTION
      'Unauthorized: Only clinic administrators and receptionists can inspect patient records.';
  END IF;

  -- Locate patient
  SELECT * INTO v_patient
  FROM public.patients
  WHERE id = p_patient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Patient not found with id: %', p_patient_id;
  END IF;

  -- Find linked auth/public user by phone
  SELECT * INTO v_public_user
  FROM public.users
  WHERE phone = v_patient.phone AND role = 'patient'
  LIMIT 1;

  v_auth_user_id := v_public_user.id;

  -- Count related clinical records
  SELECT COUNT(*) INTO v_appointment_count
  FROM public.appointments WHERE patient_id = p_patient_id;

  SELECT COUNT(*) INTO v_consultation_count
  FROM public.consultations WHERE patient_id = p_patient_id;

  SELECT COUNT(*) INTO v_prescription_count
  FROM public.prescriptions WHERE patient_id = p_patient_id;

  -- Count audit logs by the linked auth user
  v_audit_log_count := 0;
  IF v_auth_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_audit_log_count
    FROM public.audit_logs WHERE user_id = v_auth_user_id;
  END IF;

  RETURN jsonb_build_object(
    'patient_id',          v_patient.id,
    'uhid',                v_patient.uhid,
    'name',                v_patient.name,
    'phone',               v_patient.phone,
    'email',               v_patient.email,
    'gender',              v_patient.gender,
    'created_at',          v_patient.created_at,
    'has_portal_account',  v_auth_user_id IS NOT NULL,
    'auth_user_id',        v_auth_user_id,
    'public_user_email',   v_public_user.email,
    'appointment_count',   v_appointment_count,
    'consultation_count',  v_consultation_count,
    'prescription_count',  v_prescription_count,
    'audit_log_count',     v_audit_log_count,
    'can_delete',          v_caller_role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.inspect_patient_for_deletion(uuid) TO authenticated;
