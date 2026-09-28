# MTA Working Product Video & Live Demo Script
## Prasad Dental Care HMIS (Hospital Management Information System)
**Target Demo Duration:** 4 to 5 Minutes  
**Demonstration Mode:** Live Web Application (`https://hmis-wine.vercel.app` or local preview `http://localhost:4173`)  
**Data Classification:** Verified Controlled Test Accounts (Explicitly Labeled as Demo Data)  

---

## 1. Pre-Demo Setup Checklist

1. Open clean browser window (Incognito or dedicated profile).
2. Ensure test accounts are active:
   - **Staff / Admin:** `admin@dentalcare.com` / `Password123!`
   - **Doctor:** `dr.sharma@dentalcare.com` / `Password123!`
   - **Patient:** `rahul.kumar@dentalcare.com` / `Password123!`
3. Verify printer dialog is enabled for prescription sheet demonstration.

---

## 2. Step-by-Step Demonstration Script

```
Total Duration: ~4:30 Minutes
├── 0:00 - 0:30 : Public Landing & Dual Portal Architecture
├── 0:30 - 1:30 : Reception Operations (Registration, PDC ID & Queue)
├── 1:30 - 2:45 : Doctor Operatory (Chairside FDI Charting & Digital Rx)
├── 2:45 - 3:45 : Printable Prescription Fidelity (Prasad Dental Letterhead)
└── 3:45 - 4:30 : Patient Self-Service Portal & Security Isolation
```

---

### Phase 1: Landing Page & Dual Portal Architecture (0:00 – 0:30)

| Time | Screen / Action | What to Demonstrate | What to Say | Expected Result |
| :---: | :--- | :--- | :--- | :--- |
| **0:00** | Navigate to `/` | Official clinic identity banner, doctor info, address, phone | "We begin at the public landing page. Notice the clinic identity: Prasad Dental Care, Dr. Hemanth Kumar, MDS Orthodontics, Kurnool address, and direct phone contact." | Page renders with consistent Prasad Dental Care branding. |
| **0:15** | Click **Staff Portal** | Entry point navigation | "The application separates staff and patient access at the gateway. Let us enter the Staff Portal." | Redirects cleanly to `/login?portal=staff`. |

---

### Phase 2: Receptionist Workflow & Patient Provisioning (0:30 – 1:30)

| Time | Screen / Action | What to Demonstrate | What to Say | Expected Result |
| :---: | :--- | :--- | :--- | :--- |
| **0:30** | Enter Admin credentials & Sign In | Secure GoTrue login | "Logging in as staff takes us immediately to the Reception Dashboard." | Lands on `/reception` with active navigation tabs. |
| **0:45** | Click **Register Patient** | Demographic input & portal provisioning toggle | "When registering a new patient, the system collects essential details. Notice the toggle: 'Provision Patient Portal Account'. Clicking register triggers an atomic PostgreSQL RPC." | Form displays input fields, medical alert checkboxes, and portal toggle. |
| **1:05** | View Created Patient | Sequential `PDC-XXXXXX` ID generation | "The patient is assigned a unique sequential ID: `PDC-00000X`. This ID is synchronized across all tables and serves as the patient's portal username." | Confirmation badge displays generated `PDC-XXXXXX` ID. |
| **1:15** | Navigate to **Book Appointment** | Real-time scheduling with conflict detection | "Booking an appointment allows time slot selection. If we select a slot that conflicts with an existing booking for Dr. Hemanth, the system alerts the receptionist immediately." | Slot conflict check passes; appointment created and status set to `waiting`. |

---

### Phase 3: Doctor Operatory & Chairside Clinical Consultation (1:30 – 2:45)

| Time | Screen / Action | What to Demonstrate | What to Say | Expected Result |
| :---: | :--- | :--- | :--- | :--- |
| **1:30** | Switch to Doctor session (`/doctor`) | Live waiting queue on Doctor Dashboard | "Switching to the doctor's perspective, Dr. Hemanth Kumar sees today's live waiting queue. The patient registered at reception appears instantly." | Doctor dashboard lists waiting patients with wait times. |
| **1:45** | Click **Start Consultation** | 1-Click Patient Summary | "Opening the consultation loads the patient's complete history, past visits, and drug allergies in a single click." | Clinical summary displays previous visits and alert flags. |
| **2:00** | Select Tooth in **FDI Chart** | Clickable two-digit tooth grid (e.g., Tooth 16 / 21) | "For dental documentation, we have an interactive FDI tooth chart. The doctor clicks tooth 16, selects 'Caries - Moderate', and adds clinical findings without typing paragraphs." | Selected tooth highlights with color-coded severity tag. |
| **2:20** | Add Medication from Catalog | Standardized formulary search (e.g., Amoxicillin 500mg) | "For prescriptions, the doctor selects from the standardized dental formulary. Route, frequency (TDS), duration (5 Days), and food instructions auto-populate." | Medication row added with pre-calculated dosage instructions. |

---

### Phase 4: Printable Prescription & Immutability (2:45 – 3:45)

| Time | Screen / Action | What to Demonstrate | What to Say | Expected Result |
| :---: | :--- | :--- | :--- | :--- |
| **2:45** | Click **Finalize Prescription** | Tamper-proof database persistence | "Finalizing the prescription commits the record to Supabase PostgreSQL. Database-level RLS rules ensure this prescription can never be edited or deleted." | Success notification; status changes to finalized. |
| **3:05** | Click **Print Prescription** | Official clinic letterhead format | "Clicking print opens the standardized prescription sheet. It features the official Prasad Dental Care clinic letterhead, Dr. Hemanth Kumar's BDS and MDS Orthodontics qualifications, Kurnool address, phone number, and clean tabular medication schedules." | Browser print preview renders high-fidelity A4 layout. |

---

### Phase 5: Patient Self-Service Portal & Security Isolation (3:45 – 4:30)

| Time | Screen / Action | What to Demonstrate | What to Say | Expected Result |
| :---: | :--- | :--- | :--- | :--- |
| **3:45** | Open `/login?portal=patient` | Patient portal login using PDC ID or email | "Now, let us examine the patient's experience. The patient logs into the Patient Portal using their credentials." | Patient portal login screen displays clean patient-friendly UI. |
| **4:00** | View **Patient Dashboard** | Self-service active prescriptions & treatment history | "Upon login, the patient sees their upcoming visits, dental history, and the prescription Dr. Hemanth just issued. They can view or print their prescription anytime from their mobile device." | Prescriptions tab shows active medication list with instructions. |
| **4:15** | Demonstrate Security Isolation | Attempt to view another patient's ID | "If a patient attempts to access another patient's record by modifying the URL ID, the system intercepts the request and displays an Access Denied barrier." | Access Denied security screen renders; zero cross-patient data exposure. |
| **4:25** | Click **Sign Out** | Clean session termination | "Logging out securely terminates the GoTrue session, returning to the landing page. This completes the end-to-end demonstration." | Redirects cleanly to `/`. |

---

## 3. Video Recording Tips

1. **Resolution:** Record at 1920x1080 (1080p), 60 FPS.
2. **Audio:** Use a noise-canceling USB microphone; speak clearly and deliberately.
3. **Cursor:** Enable mouse-click highlights to help evaluators follow navigation.
4. **Watermark:** Add a subtle corner tag: *"HIT709 Field Project — Prasad Dental Care HMIS"*.
