-- =============================================================
-- Migration 003: Seed Reference Data
-- 21 medications + 33 treatments from master data files
-- Run AFTER 002_rls.sql
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- MEDICATIONS (21 entries — clinic-supplied reference list)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.medications (id, name, generic_name, brand_name, strength, dosage_form, category, combination, active, source, notes)
VALUES
  ('med_01', 'Amoxicillin', 'Amoxicillin', NULL, '250 mg', 'Tablet/Capsule', 'Antibiotic', false, true, 'Clinic supplied reference list', NULL),
  ('med_02', 'Amoxicillin', 'Amoxicillin', NULL, '500 mg', 'Tablet/Capsule', 'Antibiotic', false, true, 'Clinic supplied reference list', NULL),
  ('med_03', 'Cefixime', 'Cefixime', NULL, '200 mg', 'Tablet', 'Antibiotic', false, true, 'Clinic supplied reference list', NULL),
  ('med_04', 'Ofloxacin', 'Ofloxacin', NULL, '200 mg', 'Tablet', 'Antibiotic', false, true, 'Clinic supplied reference list', NULL),
  ('med_05', 'Amoxicillin + Potassium Clavulanate', 'Amoxicillin + Potassium Clavulanate', NULL, '375 mg', 'Tablet', 'Antibiotic combination', true, true, 'Clinic supplied reference list', NULL),
  ('med_06', 'Amoxicillin + Potassium Clavulanate', 'Amoxicillin + Potassium Clavulanate', NULL, '625 mg', 'Tablet', 'Antibiotic combination', true, true, 'Clinic supplied reference list', NULL),
  ('med_07', 'Dispersible Amoxicillin + Potassium Clavulanate', 'Amoxicillin + Potassium Clavulanate', NULL, '228.5 mg', 'Dispersible formulation', 'Antibiotic combination', true, true, 'Clinic supplied reference list', NULL),
  ('med_08', 'Paracetamol', 'Paracetamol', NULL, '500 mg', 'Tablet', 'Analgesic / Antipyretic', false, true, 'Clinic supplied reference list', NULL),
  ('med_09', 'Paracetamol', 'Paracetamol', NULL, '650 mg', 'Tablet', 'Analgesic / Antipyretic', false, true, 'Clinic supplied reference list', NULL),
  ('med_10', 'Aceclofenac + Paracetamol', 'Aceclofenac + Paracetamol', NULL, '425 mg', 'Tablet', 'Analgesic combination', true, true, 'Clinic supplied reference list', NULL),
  ('med_11', 'Tramadol Hydrochloride + Paracetamol', 'Tramadol Hydrochloride + Paracetamol', NULL, '362.5 mg', 'Tablet', 'Analgesic combination', true, true, 'Clinic supplied reference list', NULL),
  ('med_12', 'Ibuprofen + Paracetamol', 'Ibuprofen + Paracetamol', NULL, '725 mg', 'Tablet', 'Analgesic combination', true, true, 'Clinic supplied reference list', NULL),
  ('med_13', 'Ibuprofen + Paracetamol', 'Ibuprofen + Paracetamol', NULL, '225 mg', 'Dispersible tablet', 'Analgesic combination', true, true, 'Clinic supplied reference list', NULL),
  ('med_14', 'Diclofenac Sodium + Paracetamol', 'Diclofenac Sodium + Paracetamol', NULL, '375 mg', 'Tablet', 'Analgesic combination', true, true, 'Clinic supplied reference list', NULL),
  ('med_15', 'Aceclofenac + Paracetamol + Chlorzoxazone', 'Aceclofenac + Paracetamol + Chlorzoxazone', NULL, '675 mg', 'Tablet', 'Analgesic / Muscle relaxant combination', true, true, 'Clinic supplied reference list', NULL),
  ('med_16', 'Zerodol-SP', 'Aceclofenac + Serratiopeptidase + Paracetamol', 'Zerodol-SP', 'Combination', 'Tablet', 'Analgesic / Anti-inflammatory combination', true, true, 'Clinic supplied reference list', 'Reference brand: Zerodol-SP. Primary generic composition: Aceclofenac + Serratiopeptidase + Paracetamol.'),
  ('med_17', 'Rabeprazole + Domperidone', 'Rabeprazole + Domperidone', NULL, '30 mg', 'Capsule/Tablet', 'Gastrointestinal', true, true, 'Clinic supplied reference list', NULL),
  ('med_18', 'Chlorhexidine Mouthwash', 'Chlorhexidine Gluconate', NULL, '0.2% w/v', 'Mouthwash', 'Oral antiseptic', false, true, 'Clinic supplied reference list', NULL),
  ('med_19', 'Chlorhexidine Gluconate + Metronidazole + Lignocaine Gel', 'Chlorhexidine Gluconate + Metronidazole + Lignocaine', NULL, 'Topical formulation', 'Gel', 'Oral/dental topical preparation', true, true, 'Clinic supplied reference list', 'Reference note from clinic list: "2–3 times a day". This is a reference note only; doctor must independently specify patient frequency.'),
  ('med_20', 'Povidone Iodine', 'Povidone Iodine', NULL, '2% w/v', 'Liquid/Gargle', 'Antiseptic', false, true, 'Clinic supplied reference list', NULL),
  ('med_21', 'Non-Fluorinated Dental Paste', 'Non-Fluorinated Dental Paste', NULL, 'Standard paste', 'Dental Paste', 'Oral care', false, true, 'Clinic supplied reference list', NULL)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- TREATMENTS (33 entries — Kurnool Dental Doctors Association)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.treatments (id, treatment_name, category, min_price, max_price, price_display, active, source, notes)
VALUES
  -- Consultation & Diagnostics
  ('trt_01', 'Consultation',  'Consultation & Diagnostics', 200,  300,  '₹200–₹300',  true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_02', 'Dental X-Ray', 'Consultation & Diagnostics', 200,  300,  '₹200–₹300',  true, 'Kurnool Dental Doctors Association reference chart', NULL),
  -- Extraction
  ('trt_03', 'Simple Extraction',                   'Extraction', 1000,  1500,  '₹1,000–₹1,500',  true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_04', 'Fracture of Tough Tooth While Extraction', 'Extraction', 2000, 3000, '₹2,000–₹3,000', true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_05', 'Wisdom Tooth Extraction',              'Extraction', 2000,  3000,  '₹2,000–₹3,000',  true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_06', 'Impacted Wisdom Tooth',                'Extraction', 4000,  7000,  '₹4,000–₹7,000',  true, 'Kurnool Dental Doctors Association reference chart', NULL),
  -- Filling
  ('trt_07', 'Permanent Filling — GIC Cement',                   'Filling', 900,  1500, '₹900–₹1,500',  true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_08', 'Permanent Filling — Composite / Silver Cement',    'Filling', 1500, 3000, '₹1,500–₹3,000', true, 'Kurnool Dental Doctors Association reference chart', NULL),
  -- Cleaning
  ('trt_09', 'Scaling or Cleaning', 'Cleaning', 1200, 3000, '₹1,200–₹3,000', true, 'Kurnool Dental Doctors Association reference chart', NULL),
  -- Root Canal / Restorative
  ('trt_10', 'Root Canal Treatment', 'Root Canal / Restorative', 4000, 6000, '₹4,000–₹6,000', true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_11', 'Post and Core',        'Root Canal / Restorative', 3500, 5000, '₹3,500–₹5,000', true, 'Kurnool Dental Doctors Association reference chart', NULL),
  -- Crowns
  ('trt_12', 'Zirconia Crown',       'Crowns', 9000,  15000, '₹9,000–₹15,000', true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_13', 'Metal Ceramic Crown',  'Crowns', 4000,  6000,  '₹4,000–₹6,000',  true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_14', 'DMLS Crown',           'Crowns', 6000,  9000,  '₹6,000–₹9,000',  true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_15', 'Ceramic Facing Crown', 'Crowns', 2500,  3500,  '₹2,500–₹3,500',  true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_16', 'Metal Crown',          'Crowns', 2000,  3000,  '₹2,000–₹3,000',  true, 'Kurnool Dental Doctors Association reference chart', NULL),
  -- Dentures
  ('trt_17', 'Removable Partial Denture (1 Tooth)', 'Dentures', 1000,  1500,  '₹1,000–₹1,500',   true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_18', 'Complete Denture',                    'Dentures', 20000, 60000, '₹20,000–₹60,000', true, 'Kurnool Dental Doctors Association reference chart', NULL),
  -- Orthodontics
  ('trt_19', 'Metal Braces',                          'Orthodontics', 40000,  60000,  '₹40,000–₹60,000',    true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_20', 'Ceramic Braces',                        'Orthodontics', 50000,  70000,  '₹50,000–₹70,000',    true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_21', 'Self-Ligating Ceramic / Metal Braces',  'Orthodontics', 80000,  100000, '₹80,000–₹1,00,000',  true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_22', 'Fixed Retainer',                        'Orthodontics', 6000,   8000,   '₹6,000–₹8,000',      true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_23', 'Removable Retainer',                    'Orthodontics', 4000,   6000,   '₹4,000–₹6,000',      true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_24', 'Aligners / Lingual Orthodontics',       'Orthodontics', 150000, NULL,   '₹1,50,000+',         true, 'Kurnool Dental Doctors Association reference chart', NULL),
  -- Periodontal / Surgical
  ('trt_25', 'Full Mouth Flap Surgery', 'Periodontal / Surgical', 19000, 30000, '₹19,000–₹30,000', true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_26', 'Laser Flap Surgery',      'Periodontal / Surgical', 35000, 50000, '₹35,000–₹50,000', true, 'Kurnool Dental Doctors Association reference chart', NULL),
  -- Implant / Other Procedures
  ('trt_27', 'Single Implant',                          'Implant / Other Procedures', 25000,  50000, '₹25,000–₹50,000',  true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_28', 'Apicectomy Per Tooth',                    'Implant / Other Procedures', 4000,   7000,  '₹4,000–₹7,000',    true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_29', 'Myofunctional Therapy',                   'Implant / Other Procedures', 15000,  30000, '₹15,000–₹30,000',  true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_30', 'Pulp Therapy & Stainless Steel Crown',    'Implant / Other Procedures', 6000,   8000,  '₹6,000–₹8,000',    true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_31', 'Space Maintainers',                       'Implant / Other Procedures', 3000,   5000,  '₹3,000–₹5,000',    true, 'Kurnool Dental Doctors Association reference chart', NULL),
  ('trt_32', 'Minor Surgeries',                         'Implant / Other Procedures', 5000,   9000,  '₹5,000–₹9,000',    true, 'Kurnool Dental Doctors Association reference chart', 'Includes procedures such as Operculectomy, Frenectomy, Crown Lengthening, Mucogingival procedures.'),
  ('trt_33', 'Direct Composite Veneers and Polishing',  'Implant / Other Procedures', 3000,   4000,  '₹3,000–₹4,000',    true, 'Kurnool Dental Doctors Association reference chart', NULL)
ON CONFLICT (id) DO NOTHING;
