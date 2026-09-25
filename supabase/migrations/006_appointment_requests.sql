-- =============================================================
-- Migration 006: Patient Online Appointment Booking & Requests
-- DentalCare HMIS — Supabase PostgreSQL
-- =============================================================

-- 1. Allow 'requested' status in public.appointments
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('requested','scheduled','checked-in','waiting','in-consultation','completed','cancelled','no-show'));

-- 2. Allow authenticated patients to submit appointment requests
-- RLS ensures patient can only create requests for their own verified phone number
DROP POLICY IF EXISTS "appts_patient_create" ON public.appointments;
CREATE POLICY "appts_patient_create" ON public.appointments
  FOR INSERT WITH CHECK (
    get_my_role() = 'patient'
    AND patient_phone = (SELECT phone FROM public.users WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

-- 3. Staff can update any appointment (including confirm/reschedule/reject requests)
DROP POLICY IF EXISTS "appts_staff_update" ON public.appointments;
CREATE POLICY "appts_staff_update" ON public.appointments
  FOR UPDATE USING (get_my_role() IN ('admin','receptionist','doctor'));

-- 4. Patients can view their own appointments of all statuses (including requested)
DROP POLICY IF EXISTS "appts_patient_read" ON public.appointments;
CREATE POLICY "appts_patient_read" ON public.appointments
  FOR SELECT USING (
    patient_phone = (SELECT phone FROM public.users WHERE id = auth.uid())
  );
