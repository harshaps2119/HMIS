# DentalCare — Digital Patient Record & Prescription Management System

A production-style, web-based Digital Health Record & Prescription Management System purpose-built for dental clinics. Built with **React**, **TypeScript**, **Tailwind CSS**, and **Firebase (Auth, Firestore, Hosting)**.

---

## 1. Project Background & Objective

Many dental clinics still maintain patient histories using physical registers and issue handwritten paper prescriptions. This creates several major challenges:
- Difficulty retrieving long-term tooth treatment history across multiple visits.
- Risk of adverse drug events due to unspotted patient allergies or handwriting illegibility.
- Lost, damaged, or unavailable paper records.
- Inconvenience for patients who need their prescription history for follow-ups or remote review.

**DentalCare HMIS** replaces physical paper files with a secure, cloud-backed clinical workflow:
- **Zero-barrier Unique Patient Identification (UHID)**: The patient's verified mobile number is the clinic's permanent UHID.
- **Role-Based Access Control**: Receptionists, Doctors, and Patients each operate within strictly separated, security-rule-enforced interfaces.
- **Clinical Tooth Charting & Consultation**: Structured documentation of FDI tooth numbers, findings, diagnoses, and treatments.
- **Medication Master & Standardized Prescription Builder**: Prevents medication spelling errors, formats dosing and duration clearly, and allows 1-click printing/PDF download.
- **Patient Portal**: Secure self-service access for patients to view appointments, clinical visit history, and official prescriptions from their phone.
- **WhatsApp Sharing**: Controlled workflow to share prescription links directly with the patient's verified mobile number.
- **Audit Logging**: Every patient registration, appointment status update, clinical finalization, and prescription share is logged.

---

## 2. Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Date-fns
- **Routing**: React Router v6 with Role-Based Route Guards
- **Backend & Database**: Firebase Firestore (NoSQL Document Store)
- **Authentication**: Firebase Phone Authentication with OTP & Recaptcha
- **Security**: Cloud Firestore Security Rules (enforced server-side)
- **Deployment**: Firebase Hosting ready (`firebase.json`, `.firebaserc`)

---

## 3. Core Architecture & Roles

```
                      +-----------------------------+
                      |   Unified Phone OTP Login   |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               | Role Detection via Firestore Profile       |
               v                                           v
      +-----------------+                         +-----------------+
      |   Receptionist  |                         |     Doctor      |
      +--------+--------+                         +--------+--------+
               |                                           |
  - Register Patient (OTP)                    - Today's Queue & Stats
  - Search by Name / UHID                     - Patient Clinical Profile
  - Schedule Appointments                     - Tooth Findings & Diagnoses
  - Real-time Queue Tracking                  - Rx Builder & Medication Master
               |                                           |
               +---------------------+---------------------+
                                     |
                                     v
                          +--------------------+
                          |   Patient Portal   |
                          +---------+----------+
                                    |
                    - Login with Verified Mobile (UHID)
                    - View Upcoming Appointments
                    - Chronological Treatment History
                    - View / Print Official Rx (PDF)
```

### Role-Based Permissions Matrix

| Feature / Action | Receptionist | Doctor | Patient |
| :--- | :---: | :---: | :---: |
| Register Patient & Verify Phone | ✅ | ❌ | ❌ |
| Search Patients by Name / UHID | ✅ | ✅ | ❌ |
| Book & Update Appointment Status | ✅ | ✅ | ❌ |
| View Assigned Daily Queue | ✅ | ✅ | ❌ |
| Enter Chief Complaints & History | ❌ | ✅ | ❌ |
| Dental Tooth Examination | ❌ | ✅ | ❌ |
| Enter Diagnoses & Treatment Plan | ❌ | ✅ | ❌ |
| Select Meds & Finalize Prescription | ❌ | ✅ | ❌ |
| View Own Clinical History & Rx | ❌ | ❌ | ✅ (Own Only) |
| Share Prescription via WhatsApp | ❌ | ✅ | ❌ |
| Provide Clinic Review / Feedback | ✅ | ✅ | ✅ |

---

## 4. Unique Patient Identification (UHID)

In this system:
$$\text{UHID} = \text{Verified Mobile Number (e.g. } +919876543210\text{)}$$

- The receptionist verifies the patient's phone number with Firebase Phone OTP during registration.
- Duplicate registrations on the same verified number are blocked at the database level.
- Patients log into their own portal using the exact same mobile number and OTP.
- Firestore Security Rules enforce that patient accounts can **only query documents where `patientPhone == request.auth.token.phone_number`**.

---

## 5. Local Setup & Quick Start

### Prerequisites
- Node.js (v18 or higher recommended) & npm

### Installation Steps

1. **Clone or open the project folder in VS Code**:
   ```bash
   cd HMIS
   ```

2. **Install all dependencies**:
   ```bash
   npm install
   ```

3. **Configure Firebase Environment**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Fill in your Firebase web app keys from the Firebase Console (detailed in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)).

4. **Run Vite Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 6. Testing & Acceptance Verification

Follow these step-by-step verification flows to validate the complete clinical pipeline:

### TEST 1: Receptionist Workflow
1. Navigate to `/login`. Enter Receptionist test number: `+91 98222 00001` (OTP: `123456`).
2. Land on Reception Dashboard.
3. Click **Register Patient**:
   - Enter patient's mobile number: `9876543210` -> Click **Send OTP**.
   - Enter OTP `123456` -> Click **Verify OTP**.
   - Notice verified banner: `UHID: +919876543210`.
   - Enter patient demographic information, allergies, medical history.
   - Click **Register Patient**.
4. Click **Book Appointment** for this patient with Dr. Ramesh Sharma for Today.
5. In **Today's Queue**, change status from `scheduled` to `checked-in` and then `waiting`.

### TEST 2: Doctor Workflow
1. Log out, then log in as Doctor: `+91 98111 00001` (OTP: `123456`).
2. On Doctor Dashboard, observe today's assigned patient in `waiting` status.
3. Click **Open Consultation**:
   - Chief Complaint: *"Severe throbbing toothache in lower right molar for 3 days."*
   - Dental Examination: Add Tooth `#46`, Finding: *Pulpitis*, Severity: *Severe*.
   - Diagnoses: Select *Pulpitis* and *Dental Caries*.
   - Treatment: Select *Root Canal Treatment*.
   - Prescription Builder: Select *Augmentin 625mg* (1 tab BD for 5 days after food), click **Add Medication**.
   - Advice: *"Avoid chewing on right side. Warm saline rinses."*
   - Toggle **Follow-up Required** -> Select date 1 week later.
   - Click **Finalize Consultation & Generate Rx**.
4. Review the official prescription sheet. Click **Print / Save PDF** or **Share via WhatsApp**.

### TEST 3: Patient Portal Self-Service
1. Log out, then log in as the Patient using their mobile number: `+91 98765 43210` (OTP: `123456`).
2. Observe Patient Dashboard:
   - Greeting with UHID: `+91 98765 43210`.
   - Next Follow-up appointment date.
   - Latest Consultation summary.
   - Active Prescriptions banner.
3. Navigate to **My Prescriptions**:
   - Click **View & Print** to inspect the finalized digital prescription.
4. Navigate to **Treatment History**:
   - Expand the consultation timeline to view procedure notes and tooth findings.

### TEST 4: Security & Access Isolation
- As a Patient, attempt to change URL to another patient's prescription ID (`/patient/prescriptions/{otherId}`).
  - The application and Firestore security rules detect phone mismatch and block access immediately.
- As a Receptionist, navigate to `/doctor/dashboard` or consultation forms.
  - Role-based route guard redirects to `/reception/dashboard`.
- In Firestore, write attempts to clinical collections by non-doctors are rejected by `firestore.rules`.

### TEST 5: Audit Logging
- Navigate to the Firebase Console -> Firestore -> `auditLogs` collection.
- Verify timestamped audit records for:
  - `patient_registered`
  - `appointment_created`
  - `appointment_updated`
  - `consultation_finalized`
  - `prescription_generated`
  - `prescription_shared`

---

## 7. Clinic Usability Review

A dedicated clinic evaluation form is integrated at `/feedback`. Authorized reviewers from the clinic can provide:
- 1–5 Star Usability Ratings
- Feature usefulness selections
- Identified clinical gaps
- Suggestions for future upgrades (Billing, Imaging, Dental Charting, WhatsApp Business API)
- All feedback is saved to the `clinicFeedback` Firestore collection.

---

## 8. Deployment

### Firebase Hosting
```bash
# 1. Install Firebase tools
npm install -g firebase-tools

# 2. Login & initialize
firebase login
firebase init hosting

# 3. Build project
npm run build

# 4. Deploy rules and hosting
firebase deploy
```

---

## 9. Privacy & Healthcare Disclaimer

> [!NOTE]
> Patient data is sensitive healthcare information. The application utilizes authentication, role authorization, server-side security rules, minimal necessary data collection, and audit logging.
> This software is an academic demonstration and must undergo jurisdiction-specific compliance audits (such as HIPAA in the US or DPDP Act in India) prior to handling real-world production medical records.
