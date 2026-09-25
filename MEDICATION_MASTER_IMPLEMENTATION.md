# DENTALCARE HMIS — MEDICATION MASTER & PRESCRIPTION SELECTION IMPLEMENTATION

**Module:** Medication Master Catalog & Clinical Prescription Workflow  
**Document:** `MEDICATION_MASTER_IMPLEMENTATION.md`  
**Date:** September 23, 2026  
**Status:** Implemented & Verified  

---

## 1. EXECUTIVE SUMMARY

The DentalCare HMIS Medication Master is a reference formulary designed to assist dental clinicians with structured, rapid medication documentation while maintaining strict clinical prescribing boundaries.

### Core Architecture Highlights
- **Reference Catalog:** 21 dental medications transcribed directly from the clinic-supplied reference list across 4 clinical domains.
- **Strict Clinical Boundary:** The system **never** automatically prescribes, infers doses, or recommends medicines based on diagnoses. The treating clinician is exclusively responsible for determining dose, frequency, duration, route, and instructions.
- **Comprehensive Search:** Doctors can search by generic chemical composition, reference brand name (e.g. *Zerodol-SP*), combination names, strength, and therapeutic category.
- **Controlled Yet Flexible Inputs:** Controlled dropdowns for clinical frequencies and routes, combined with free-form inputs for special instructions.
- **Custom / Other Medication Support:** Clinicians can document unlisted or specialized medicines via the "+ Add Other Medication" pathway.
- **Immutable Historical Snapshots:** When a prescription is generated, a complete snapshot of all medication attributes is written directly into the prescription document. Deactivating or modifying a master medication never alters historical records.
- **Role-Based Access Control:** Doctors and Receptionists have read-only access; Patients have no direct access to the master; Admins have configuration and deactivation authority.

---

## 2. TRANSCRIBED MEDICATION REFERENCE CATALOG

The 21 reference medications below are preserved exactly as supplied from the clinic reference chart.

### I. Antibiotics
1. **Amoxicillin — 250 mg**  
   - *Dosage Form:* Tablet/Capsule  
   - *Category:* Antibiotic  
   - *Combination:* No  

2. **Amoxicillin — 500 mg**  
   - *Dosage Form:* Tablet/Capsule  
   - *Category:* Antibiotic  
   - *Combination:* No  

3. **Cefixime — 200 mg**  
   - *Dosage Form:* Tablet  
   - *Category:* Antibiotic  
   - *Combination:* No  

4. **Ofloxacin — 200 mg**  
   - *Dosage Form:* Tablet  
   - *Category:* Antibiotic  
   - *Combination:* No  

5. **Amoxicillin + Potassium Clavulanate — 375 mg**  
   - *Dosage Form:* Tablet  
   - *Category:* Antibiotic combination  
   - *Combination:* Yes  

6. **Amoxicillin + Potassium Clavulanate — 625 mg**  
   - *Dosage Form:* Tablet  
   - *Category:* Antibiotic combination  
   - *Combination:* Yes  

7. **Dispersible Amoxicillin + Potassium Clavulanate — 228.5 mg**  
   - *Dosage Form:* Dispersible formulation  
   - *Category:* Antibiotic combination  
   - *Combination:* Yes  

### II. Analgesics / Pain Management
8. **Paracetamol — 500 mg**  
   - *Dosage Form:* Tablet  
   - *Category:* Analgesic / Antipyretic  
   - *Combination:* No  

9. **Paracetamol — 650 mg**  
   - *Dosage Form:* Tablet  
   - *Category:* Analgesic / Antipyretic  
   - *Combination:* No  

10. **Aceclofenac + Paracetamol — 425 mg**  
    - *Dosage Form:* Tablet  
    - *Category:* Analgesic combination  
    - *Combination:* Yes  

11. **Tramadol Hydrochloride + Paracetamol — 362.5 mg**  
    - *Dosage Form:* Tablet  
    - *Category:* Analgesic combination  
    - *Combination:* Yes  

12. **Ibuprofen + Paracetamol — 725 mg**  
    - *Dosage Form:* Tablet  
    - *Category:* Analgesic combination  
    - *Combination:* Yes  

13. **Ibuprofen + Paracetamol — 225 mg**  
    - *Dosage Form:* Dispersible tablet  
    - *Category:* Analgesic combination  
    - *Combination:* Yes  

14. **Diclofenac Sodium + Paracetamol — 375 mg**  
    - *Dosage Form:* Tablet  
    - *Category:* Analgesic combination  
    - *Combination:* Yes  

15. **Aceclofenac + Paracetamol + Chlorzoxazone — 675 mg**  
    - *Dosage Form:* Tablet  
    - *Category:* Analgesic / Muscle relaxant combination  
    - *Combination:* Yes  

16. **Aceclofenac + Serratiopeptidase + Paracetamol (Zerodol-SP)**  
    - *Dosage Form:* Tablet  
    - *Brand Reference:* Zerodol-SP  
    - *Category:* Analgesic / Anti-inflammatory combination  
    - *Combination:* Yes  
    - *Note:* Primary generic composition preserved while supporting search by brand name "Zerodol-SP".  

### III. Gastrointestinal
17. **Rabeprazole + Domperidone — 30 mg**  
    - *Dosage Form:* Capsule/Tablet  
    - *Category:* Gastrointestinal  
    - *Combination:* Yes  

### IV. Antiseptics / Oral Care
18. **Chlorhexidine Mouthwash — 0.2% w/v**  
    - *Dosage Form:* Mouthwash  
    - *Category:* Oral antiseptic  
    - *Combination:* No  

19. **Chlorhexidine Gluconate + Metronidazole + Lignocaine Gel**  
    - *Dosage Form:* Gel  
    - *Category:* Oral/dental topical preparation  
    - *Combination:* Yes  
    - *Reference Note:* The clinic reference noted "2–3 times a day". In accordance with clinical safety guidelines, this is stored strictly as a reference informational note and is **never** auto-populated into a prescription. The doctor must independently select the frequency.  

20. **Povidone Iodine — 2% w/v**  
    - *Dosage Form:* Liquid/Gargle  
    - *Category:* Antiseptic  
    - *Combination:* No  

21. **Non-Fluorinated Dental Paste**  
    - *Dosage Form:* Dental Paste  
    - *Category:* Oral care  
    - *Combination:* No  

---

## 3. DOCTOR PRESCRIPTION WORKFLOW

### Interactive Builder States
The prescription section in [`ConsultationForm.tsx`](file:///c:/Users/likhi/OneDrive/Desktop/HMIS/src/features/doctor/ConsultationForm.tsx) supports 4 explicit operating states:

1. **`idle` Mode:**
   - Displays the current prescription table (with `#`, `Name`, `Strength & Form`, `Route`, `Dose`, `Frequency`, `Duration`, `Instructions`, and `Remove`).
   - If empty, displays notice: *"No medications added. Finalizing will record the consultation without generating an empty prescription."*
   - Two distinct triggers:
     - `[ + Add Medication ]`
     - `[ + Add Other Medication ]`

2. **`search` Mode:**
   - In-line live search filter supporting real-time query across generic names, brand names, strengths, and categories.
   - Category dropdown filter (e.g. *Antibiotics*, *Analgesic combination*, etc.).
   - Interactive search results with clear visual differentiation between generic chemical components and brand references.

3. **`configure` Mode (Selected Master Medication):**
   - Displays selected medication details (Name, Strength, Dosage Form, Generic Name, Category).
   - If reference notes exist (such as for *Chlorhexidine + Metronidazole + Lignocaine Gel*), displays them in an informational alert box.
   - **All prescription inputs start completely blank**:
     - **Dose:** Free text input with quick helper buttons (`1 tablet`, `1 capsule`, `2 tablets`, `10 ml`, `5 ml`).
     - **Frequency:** Controlled dropdown (`Once daily`, `Twice daily`, `Three times daily`, `Four times daily`, `Every 6 hours`, `Every 8 hours`, `Every 12 hours`, `At bedtime`, `As directed`, `Other`).
     - **Duration:** Free text input with quick presets (`3 days`, `5 days`, `7 days`, `Single dose`, `As directed`).
     - **Route:** Controlled dropdown (`Oral`, `Topical`, `Mouthwash`, `Other`).
     - **Special Instructions:** Free text field with quick suggestion chips (`Use after food`, `Before food`, `Rinse and spit`, `Apply locally`, `As directed`).

4. **`custom` Mode (Other / Custom Medication):**
   - Allows clinician to document medicines not present in the reference catalog.
   - Captures: `Medication Name`, `Strength`, `Dosage Form`, `Dose`, `Frequency`, `Duration`, `Route`, `Special Instructions`.
   - Tags item as `isCustom: true` in prescription data.

---

## 4. VALIDATION & SECURITY RULES

### Client & Service Level Validation
1. **No Incomplete Medication Records:** Every medication row in a prescription must have non-empty `name`, `dose`, `frequency`, `duration`, and `route`.
2. **Consultation Without Medication:** Finalizing a consultation without any medication records `No medication prescribed` in consultation history and generates **no** prescription document.
3. **Prescription Immutability:** Prescriptions cannot be modified once generated.
4. **Database-Level Protection:** Database CHECK constraint `prescription_has_medications` guarantees that no prescription can be inserted with an empty medications array.

### Supabase Row Level Security (RLS) for `public.medications`
```sql
-- Clinic staff (Doctors, Receptionists, Admins) can read the medication master
CREATE POLICY "meds_staff_read" ON public.medications
  FOR SELECT USING (get_my_role() IN ('admin','doctor','receptionist'));

-- Patients have NO direct access to medication master
-- Only administrators can insert, update, or deactivate master catalog items
CREATE POLICY "meds_admin_insert" ON public.medications
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "meds_admin_update" ON public.medications
  FOR UPDATE USING (get_my_role() = 'admin');

CREATE POLICY "meds_admin_delete" ON public.medications
  FOR DELETE USING (get_my_role() = 'admin');
```

---

## 5. STATUTORY SOURCE DISCLAIMER

The following disclaimer is rendered on both the doctor prescription builder and the staff medication reference screen:

> **"Medication reference list supplied by the clinic. Medication selection, dose, frequency, duration, route and instructions must be determined by the treating clinician."**
