-- =============================================================
-- Migration 005: Demo application data
--
-- Auth users must be created through Supabase Auth (see
-- scripts/seedDemoUsers.mjs). This migration never writes auth.users,
-- auth.identities, passwords, or GoTrue-managed token columns.
-- Run after creating the four demo Auth users and after migrations 001-004.
-- =============================================================

DO $$
DECLARE
  v_admin_id uuid;
  v_doctor_id uuid;
  v_patient1_id uuid;
  v_patient2_id uuid;
  v_patient1_record_id uuid;
  v_patient2_record_id uuid;
  v_appt1_id uuid := 'e0000000-0000-0000-0000-000000000001';
  v_appt2_id uuid := 'e0000000-0000-0000-0000-000000000002';
  v_appt3_id uuid := 'e0000000-0000-0000-0000-000000000003';
  v_appt4_id uuid := 'e0000000-0000-0000-0000-000000000004';
  v_consult_id uuid := 'f0000000-0000-0000-0000-000000000001';
  v_rx_id uuid := '10000000-0000-0000-0000-000000000001';
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@dentalcare.com';
  SELECT id INTO v_doctor_id FROM auth.users WHERE email = 'dr.sharma@dentalcare.com';
  SELECT id INTO v_patient1_id FROM auth.users WHERE email = 'rahul.kumar@dentalcare.com';
  SELECT id INTO v_patient2_id FROM auth.users WHERE email = 'pooja.patel@dentalcare.com';

  IF v_admin_id IS NULL OR v_doctor_id IS NULL OR v_patient1_id IS NULL OR v_patient2_id IS NULL THEN
    RAISE EXCEPTION 'Create all four demo Auth users through Supabase Auth or scripts/seedDemoUsers.mjs before running migration 005.';
  END IF;

  INSERT INTO public.users (id, name, phone, role, email, active)
  VALUES
    (v_admin_id, 'Clinic Admin', '+919822200001', 'admin', 'admin@dentalcare.com', true),
    (v_doctor_id, 'Dr. Ramesh Sharma', '+919811100001', 'doctor', 'dr.sharma@dentalcare.com', true),
    (v_patient1_id, 'Rahul Kumar', '+919876543210', 'patient', 'rahul.kumar@dentalcare.com', true),
    (v_patient2_id, 'Pooja Patel', '+919876543212', 'patient', 'pooja.patel@dentalcare.com', true)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    active = EXCLUDED.active;

  SELECT id INTO v_patient1_record_id FROM public.patients WHERE uhid = '+919876543210';
  IF v_patient1_record_id IS NULL THEN
    INSERT INTO public.patients (uhid, phone, name, date_of_birth, age, gender, email, created_by, allergies, medical_history)
    VALUES ('+919876543210', '+919876543210', 'Rahul Kumar', '1992-05-14', 34, 'Male', 'rahul.kumar@dentalcare.com', v_admin_id, NULL, NULL)
    RETURNING id INTO v_patient1_record_id;
  ELSE
    UPDATE public.patients
    SET name = 'Rahul Kumar', email = 'rahul.kumar@dentalcare.com', allergies = NULL, medical_history = NULL
    WHERE id = v_patient1_record_id;
  END IF;

  SELECT id INTO v_patient2_record_id FROM public.patients WHERE uhid = '+919876543212';
  IF v_patient2_record_id IS NULL THEN
    INSERT INTO public.patients (uhid, phone, name, date_of_birth, age, gender, email, created_by, allergies, medical_history)
    VALUES ('+919876543212', '+919876543212', 'Pooja Patel', '1998-11-20', 28, 'Female', 'pooja.patel@dentalcare.com', v_admin_id, NULL, NULL)
    RETURNING id INTO v_patient2_record_id;
  ELSE
    UPDATE public.patients
    SET name = 'Pooja Patel', email = 'pooja.patel@dentalcare.com', allergies = NULL, medical_history = NULL
    WHERE id = v_patient2_record_id;
  END IF;
END $$;
