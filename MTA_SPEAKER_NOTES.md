# MTA Presentation Speaker Notes
## Prasad Dental Care HMIS (Hospital Management Information System)
**Academic Context:** PGDM Hospital & Health Management / HIT709 Field Project  
**Target Duration:** 12 to 14 Minutes (15 Slides)  
**Presenter:** Student / Field Project Lead  

---

### Slide 1: Title & Academic Context
- **Duration:** 45 seconds
- **Key Point:** Setting the stage for a practical health informatics field project focused on a single-doctor dental clinic in Kurnool.
- **What to Say:**  
  "Good morning, esteemed faculty and evaluators. Today, I am presenting my HIT709 field project: the Hospital Management Information System developed for **Prasad Dental Care** in Kurnool, Andhra Pradesh. This project focuses on Dr. Hemanth Kumar’s orthodontic and dental practice. Our goal was not to design an over-engineered hospital package, but to solve real, day-to-day administrative and clinical bottlenecks using modern, lightweight health informatics."
- **Transition:** "Let us begin by examining the operational context of the clinic."

---

### Slide 2: Clinic & Project Context
- **Duration:** 50 seconds
- **Key Point:** Single-doctor outpatient dynamics with recurring orthodontic follow-up patients.
- **What to Say:**  
  "Prasad Dental Care operates as an outpatient dental clinic with a heavy concentration of orthodontic cases. Unlike general hospital OPDs, orthodontic patients visit repeatedly over 12 to 24 months for bracket adjustments, archwire changes, and monitoring. In a single-doctor setup, the doctor and receptionist must manage high patient volumes with minimal overhead. Our objective was to develop and evaluate a tailored digital solution that streamlines these repetitive encounters."
- **Transition:** "To understand why digital intervention was critical, let us look at the primary operational problem."

---

### Slide 3: Primary Operational Problem Statement
- **Duration:** 1 minute
- **Key Point:** Disconnected paper records cause reception bottlenecks, missing chairside history, and patient medication ambiguity.
- **What to Say:**  
  "Our operational analysis revealed three major pain points. First, physical record retrieval at reception caused 5 to 10 minute delays per visit, creating waiting room congestion. Second, during chairside orthodontic consultations, historical bracket and diagnosis notes were often fragmented across physical cards, forcing repetitive patient questioning. Third, handwritten paper prescriptions presented deciphering challenges for pharmacists and were frequently lost by patients after leaving the clinic, leaving them with zero post-consultation access to their treatment plans."
- **Transition:** "Let us map this visually using our AS-IS BPMN workflow."

---

### Slide 4: Current State (AS-IS) Workflow
- **Duration:** 1 minute
- **Key Point:** Walking through the paper-bound manual process from arrival to home departure.
- **What to Say:**  
  "Looking at our AS-IS BPMN diagram across the four swimlanes—Patient, Reception, Doctor, and Pharmacy—notice the continuous manual handoffs. The patient arrives, the receptionist manually hunts for a paper folder on the shelf, issues a paper token, and the patient waits blindly. Dr. Hemanth Kumar must rely on verbal patient memory, write clinical notes on paper cards, and handwrite prescriptions. When the patient departs, the digital trail is completely severed."
- **Transition:** "These operational friction points directly translated into our core client requirements."

---

### Slide 5: Pain Points & Clinical Risks
- **Duration:** 50 seconds
- **Key Point:** Clear separation between documented administrative delays and clinical safety hazards.
- **What to Say:**  
  "We categorized the observed pain points into operational friction and clinical risk. Operationally, misplaced paper records and unmanaged waiting queues create patient dissatisfaction. Clinically, handwritten prescriptions increase medication dispensing error risks, and the absence of a structured tooth charting system risks overlooking previous restorative findings. Furthermore, double-booking occurs because paper daybooks lack automated conflict detection."
- **Transition:** "Addressing these challenges defined our Functional and Non-Functional Requirements."

---

### Slide 6: Client Requirements (FR & NFR)
- **Duration:** 1 minute
- **Key Point:** Practical, prioritized requirements classified by verifiable evidence.
- **What to Say:**  
  "Our requirements were categorized into 15 Functional and 10 Non-Functional requirements. Functionally, the clinic needed a dual-portal gateway, atomic patient provisioning with sequential `PDC-XXXXXX` IDs, conflict-free scheduling, live reception queue tracking, an interactive FDI tooth chart, standardized dental drug prescribing, and a 24/7 patient portal. Non-functionally, the priority was strict patient data isolation, sub-second lookup performance, and guaranteed prescription immutability."
- **Transition:** "Here is how the proposed TO-BE workflow transforms these requirements into practice."

---

### Slide 7: Proposed State (TO-BE) Workflow
- **Duration:** 1 minute 15 seconds
- **Key Point:** Continuous digital chain connecting Reception, Doctor, and Patient Portal.
- **What to Say:**  
  "In the TO-BE BPMN workflow, the entire encounter is unified. The receptionist performs an instant lookup by Phone or `PDC-XXXXXX` ID. New patients are provisioned atomically with portal credentials. Appointments are checked against Dr. Hemanth Kumar’s schedule to prevent slot overlap. In the operatory, Dr. Hemanth opens the patient summary with one click, charts teeth visually using the FDI system, and generates a standardized, immutable digital prescription. Finally, the patient accesses their complete records from their phone at home."
- **Transition:** "This workflow is guided by our core product philosophy."

---

### Slide 8: Product Philosophy & Design Rationale
- **Duration:** 1 minute
- **Key Point:** Why enterprise software fails small clinics and why workflow-first design succeeds.
- **What to Say:**  
  "Our product philosophy rejects enterprise hospital software bloat. Dr. Hemanth Kumar does not need a 50-field inpatient billing module. The system was designed around chairside speed—minimizing mouse clicks while wearing sterile gloves, using a visual tooth grid, and standardizing dental dosages. We also mandated strict role separation and tamper-proof prescription immutability at the database level so clinical records cannot be manipulated post-consultation."
- **Transition:** "Let us examine the technical architecture that powers this philosophy."

---

### Slide 9: System Architecture & Tech Stack
- **Duration:** 55 seconds
- **Key Point:** High-performance, low-maintenance stack: React 18, Supabase PostgreSQL, and Vercel.
- **What to Say:**  
  "Architecturally, we selected a lightweight, cloud-native stack. The frontend is built in React 18 with TypeScript and Vite, delivering sub-second load times and static type safety. The backend leverages Supabase PostgreSQL 15, utilizing Row Level Security policies to enforce strict patient isolation directly at the database layer. Database triggers handle sequential `PDC-XXXXXX` ID generation, and the application is deployed on the Vercel edge network."
- **Transition:** "Now, let us examine the key features of the application."

---

### Slide 10: Key System Features
- **Duration:** 1 minute
- **Key Point:** Highlighting the four core modules: Reception Queue, Patient Demographics, Doctor Consult, and Patient Portal.
- **What to Say:**  
  "The application comprises four primary modules. The Reception Dashboard gives staff live operational visibility with status badges from check-in to completion. The Patient Registration engine guarantees unique PDC IDs and atomic account creation. The Doctor Operatory interface combines interactive dental charting with standard dosage selection. And the Patient Portal provides self-service transparency without requiring an app store download."
- **Transition:** "Let us trace the complete clinical workflow end-to-end."

---

### Slide 11: End-to-End Clinical & Operational Workflow
- **Duration:** 1 minute
- **Key Point:** Real-time synchronization across staff and patient views.
- **What to Say:**  
  "Here we see the full lifecycle: A patient is registered at reception, an appointment is scheduled with conflict checks, the patient transitions to the waiting queue, Dr. Hemanth Kumar initiates the consultation, records tooth findings, and finalizes the prescription. Notice the printable prescription: it automatically incorporates official Prasad Dental Care branding, Dr. Hemanth Kumar’s BDS and MDS Orthodontics credentials, and the Kurnool clinic contact details."
- **Transition:** "Underpinning this workflow is our strict security and data governance model."

---

### Slide 12: Security, Privacy & Data Integrity
- **Duration:** 50 seconds
- **Key Point:** RLS-enforced privacy, immutable prescriptions, and zero client secret exposure.
- **What to Say:**  
  "Security was built from the ground up. Patient data isolation is enforced at the PostgreSQL database level using Supabase Row Level Security—a patient can never query another patient’s records even if they manipulate URL parameters. Prescriptions are legally protected through database-level immutability rules that block updates and deletions once finalized. Private API keys, such as Resend email credentials, are strictly isolated in serverless API routes."
- **Transition:** "Let us look at the live deployed system."

---

### Slide 13: Working Product & Live Deployment
- **Duration:** 1 minute
- **Key Point:** Demonstrating the deployed application at `https://hmis-wine.vercel.app` and test suite results.
- **What to Say:**  
  "The application is live and accessible at `https://hmis-wine.vercel.app`. It has undergone rigorous automated testing, including a 60-assertion end-to-end test suite verifying role isolation, phone normalization, slot conflict detection, and prescription immutability with a 100% pass rate. The user interface has been tested across mobile and desktop breakpoints to ensure seamless clinic operatory use."
- **Transition:** "Next, I want to address client validation with complete academic honesty."

---

### Slide 14: Client Validation & Feedback Status
- **Duration:** 1 minute
- **Key Point:** Strict academic integrity: On-site evaluation in progress; feedback capture mechanism live.
- **What to Say:**  
  "In accordance with academic field project ethics, I want to state clearly that formal client validation is currently **in progress**. We do not present fabricated quotes or simulated testimonials. Instead, we have integrated a structured Clinic Feedback module directly into the HMIS to collect quantitative Likert ratings and qualitative workflow notes from Dr. Hemanth Kumar and clinic staff during live on-site clinical trials."
- **Transition:** "To conclude, let us review our achievements and immediate next steps."

---

### Slide 15: Conclusion & Next Steps
- **Duration:** 50 seconds
- **Key Point:** Summarizing practical delivery of a functional dental HMIS and remaining field objectives.
- **What to Say:**  
  "In conclusion, this project successfully addressed the operational inefficiencies of Prasad Dental Care by delivering a lightweight, secure, and tailored HMIS. We replaced paper bottlenecks with instant search, conflict-free scheduling, structured FDI charting, and immutable digital prescriptions. Our immediate next steps are to complete on-site staff training, collect formalized post-deployment feedback, and finalize printer calibration in the operatory. Thank you, and I look forward to your questions."
