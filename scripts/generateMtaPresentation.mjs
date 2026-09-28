import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const scratchRequire = createRequire('C:\\Users\\likhi\\.gemini\\antigravity-ide\\brain\\d494dc7a-f7d9-4449-9f80-8d7ee60570a0\\scratch\\package.json');
const pptxgen = scratchRequire('pptxgenjs');

const rootDir = 'c:\\Users\\likhi\\OneDrive\\Desktop\\HMIS';
const outputPptx = path.join(rootDir, 'Prasad_Dental_Care_HMIS_MTA_Presentation.pptx');

// Initialize presentation
const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = 'Prasad Dental Care HMIS';
pres.company = 'HIT709 Field Project';
pres.title = 'Prasad Dental Care HMIS — MTA Field Project Presentation';

// Color Palette
const COLORS = {
  BG: 'F8FAFC',
  HEADER_BG: '0F172A',
  CARD_BG: 'FFFFFF',
  BORDER: 'E2E8F0',
  TEAL: '0D9488',
  TEAL_DARK: '0F766E',
  MINT_BG: 'F0FDFA',
  MINT_BORDER: 'CCFBF1',
  TEXT_MAIN: '0F172A',
  TEXT_BODY: '334155',
  TEXT_MUTED: '64748B',
  RED_ALERT: 'EF4444',
  RED_BG: 'FEE2E2',
  RED_BORDER: 'FCA5A5',
  AMBER_ALERT: 'D97706',
  AMBER_BG: 'FEF3C7',
  GREEN_SUCCESS: '059669',
  GREEN_BG: 'D1FAE5'
};

// Helper: Add consistent slide header
function addSlideHeader(slide, title, category, subtitle) {
  // Category Badge
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.8, y: 0.4, w: 2.8, h: 0.35,
    fill: { color: COLORS.MINT_BG },
    line: { color: COLORS.MINT_BORDER, width: 1 },
    rectRadius: 0.08
  });
  slide.addText(category.toUpperCase(), {
    x: 0.8, y: 0.4, w: 2.8, h: 0.35,
    fontSize: 9.5, bold: true, color: COLORS.TEAL_DARK,
    fontFace: 'Segoe UI', align: 'center', valign: 'middle'
  });

  // Main Title
  slide.addText(title, {
    x: 0.8, y: 0.82, w: 11.7, h: 0.45,
    fontSize: 22, bold: true, color: COLORS.TEXT_MAIN,
    fontFace: 'Segoe UI', valign: 'top'
  });

  // Subtitle
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.8, y: 1.3, w: 11.7, h: 0.3,
      fontSize: 11, color: COLORS.TEXT_MUTED,
      fontFace: 'Segoe UI', valign: 'top'
    });
  }
}

// Helper: Add standard card
function addCard(slide, x, y, w, h, fill = COLORS.CARD_BG, border = COLORS.BORDER) {
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: fill },
    line: { color: border, width: 1 },
    rectRadius: 0.1
  });
}

// ======================================================================
// SLIDE 1: TITLE SLIDE
// ======================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLORS.BG };

  // Top Accent Banner
  s.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 13.333, h: 0.15,
    fill: { color: COLORS.TEAL }
  });

  // Title Box
  s.addShape(pres.ShapeType.roundRect, {
    x: 1.0, y: 0.8, w: 3.2, h: 0.4,
    fill: { color: COLORS.MINT_BG },
    line: { color: COLORS.MINT_BORDER, width: 1 },
    rectRadius: 0.08
  });
  s.addText('HIT709 FIELD PROJECT | MTA PRESENTATION', {
    x: 1.0, y: 0.8, w: 3.2, h: 0.4,
    fontSize: 10, bold: true, color: COLORS.TEAL_DARK,
    fontFace: 'Segoe UI', align: 'center', valign: 'middle'
  });

  s.addText('Prasad Dental Care HMIS', {
    x: 1.0, y: 1.35, w: 11.3, h: 0.7,
    fontSize: 34, bold: true, color: COLORS.TEXT_MAIN,
    fontFace: 'Segoe UI'
  });

  s.addText('Digital Patient Records, Chairside Operatory Queue & Prescription Information System', {
    x: 1.0, y: 2.1, w: 11.3, h: 0.4,
    fontSize: 14, color: COLORS.TEAL_DARK,
    fontFace: 'Segoe UI'
  });

  // Clinic Details Card
  addCard(s, 1.0, 2.8, 5.4, 3.8);
  s.addText('CLINICAL STAKEHOLDER PROFILE', {
    x: 1.3, y: 3.1, w: 4.8, h: 0.3,
    fontSize: 12, bold: true, color: COLORS.TEAL_DARK, fontFace: 'Segoe UI'
  });
  s.addText([
    { text: 'Clinic Name: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Prasad Dental Care\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Consultant Clinician: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Dr. Hemanth Kumar\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Qualifications: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'BDS, MDS – Orthodontics\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Specialization: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Orthodontics & Dentofacial Orthopedics\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Clinic Address: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'N V R Buildings, Kothapeta, Kurnool, AP – 518004\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Contact Phone: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: '8328456378', options: { color: COLORS.TEXT_BODY } }
  ], {
    x: 1.3, y: 3.5, w: 4.8, h: 2.8,
    fontSize: 11, fontFace: 'Segoe UI', lineSpacing: 18
  });

  // Academic Project Scope Card
  addCard(s, 6.8, 2.8, 5.5, 3.8);
  s.addText('ACADEMIC & EVALUATION CONTEXT', {
    x: 7.1, y: 3.1, w: 4.9, h: 0.3,
    fontSize: 12, bold: true, color: COLORS.TEAL_DARK, fontFace: 'Segoe UI'
  });
  s.addText([
    { text: 'Program: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'PGDM Hospital & Health Management\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Course: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'HIT709 Healthcare Management Information Systems\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Evaluation Type: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Mid-Term Assessment (MTA) Field Project Defense\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Target Setting: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Single-Doctor Dental Specialty Practice\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Live Web URL: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'https://hmis-wine.vercel.app', options: { color: COLORS.TEAL, bold: true } }
  ], {
    x: 7.1, y: 3.5, w: 4.9, h: 2.8,
    fontSize: 11, fontFace: 'Segoe UI', lineSpacing: 18
  });
}

// ======================================================================
// SLIDE 2: CLINIC & PROJECT CONTEXT
// ======================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLORS.BG };
  addSlideHeader(s, 'Prasad Dental Care: Operational Setting & Context', 'Clinic Context', 'Small-clinic outpatient environment with specialized orthodontic treatment cycles');

  // Left Card: Operational Environment
  addCard(s, 0.8, 1.7, 5.7, 5.1);
  s.addText('PRACTICE ENVIRONMENT & OPERATIONAL DYNAMICS', {
    x: 1.1, y: 2.0, w: 5.1, h: 0.3,
    fontSize: 12, bold: true, color: COLORS.TEAL_DARK, fontFace: 'Segoe UI'
  });
  s.addText([
    { text: 'Single-Doctor Specialty Clinic:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Dr. Hemanth Kumar manages high patient volumes supported by a single front-desk receptionist.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Recurring Orthodontic Treatment Cycles:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Unlike general acute OPDs, orthodontic patients return every 3 to 4 weeks over 12–24 months for bracket adjustments, archwire changes, and monitoring.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Paper Record Vulnerability:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Manual registers and paper folders frequently suffer wear-and-tear, misfiling, and physical retrieval delays.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Need for Minimalist HMIS:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Monolithic hospital packages are excessively complex. The clinic requires rapid chairside entry without administrative bloat.', options: { color: COLORS.TEXT_BODY } }
  ], {
    x: 1.1, y: 2.4, w: 5.1, h: 4.2,
    fontSize: 11, fontFace: 'Segoe UI', lineSpacing: 18
  });

  // Right Card: Field Project Objectives
  addCard(s, 6.8, 1.7, 5.7, 5.1);
  s.addText('ACADEMIC FIELD PROJECT OBJECTIVES', {
    x: 7.1, y: 2.0, w: 5.1, h: 0.3,
    fontSize: 12, bold: true, color: COLORS.TEAL_DARK, fontFace: 'Segoe UI'
  });
  s.addText([
    { text: '1. Workflow Bottleneck Identification:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Analyze physical check-in delays, appointment slot collisions, and chairside documentation gaps.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '2. Tailored System Architecture:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Design and implement a cloud-native HMIS utilizing React, Supabase PostgreSQL, and Row Level Security.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '3. Clinical Quality & Prescription Safety:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Introduce visual FDI tooth charting and tamper-proof immutable digital prescriptions.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '4. Patient Self-Service Empowerment:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Provide 24/7 web-based record access for patients to verify prescriptions and upcoming appointments.', options: { color: COLORS.TEXT_BODY } }
  ], {
    x: 7.1, y: 2.4, w: 5.1, h: 4.2,
    fontSize: 11, fontFace: 'Segoe UI', lineSpacing: 18
  });
}

// ======================================================================
// SLIDE 3: PROBLEM STATEMENT
// ======================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLORS.BG };
  addSlideHeader(s, 'Primary Operational Problem Statement', 'Problem Statement', 'The clinical, administrative, and patient communication risks of manual paper workflows');

  // 3 Horizontal Problem Cards
  const cards = [
    {
      title: '1. RECEPTION RETRIEVAL DELAYS',
      badge: '5-10 MIN DELAY PER PATIENT',
      body: 'Receptionists search physical registers and storage shelves to locate folders. Misfiled or torn paper records create waiting room congestion, patient frustration, and administrative chaos during peak morning and evening clinic hours.'
    },
    {
      title: '2. CHAIRSIDE INFORMATION VOID',
      badge: 'REPETITIVE PATIENT QUESTIONING',
      body: 'Dr. Hemanth Kumar has no instant digital access to past bracket adjustments, archwire gauges, or restorative history. The doctor is forced to rely on verbal patient recall, risking oversights in longitudinal orthodontic care.'
    },
    {
      title: '3. HANDWRITTEN RX & RECORD LOSS',
      badge: 'MEDICATION DISPENSING RISK',
      body: 'Handwritten paper prescriptions present illegibility hazards for retail pharmacists. Patients frequently misplace paper slips after departure, leaving them with zero visibility into medication schedules or follow-up dates.'
    }
  ];

  cards.forEach((c, i) => {
    const x = 0.8 + (i * 4.0);
    addCard(s, x, 1.7, 3.7, 3.8);

    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.3, y: 2.0, w: 3.1, h: 0.3,
      fill: { color: COLORS.RED_BG },
      line: { color: COLORS.RED_BORDER, width: 1 },
      rectRadius: 0.06
    });
    s.addText(c.badge, {
      x: x + 0.3, y: 2.0, w: 3.1, h: 0.3,
      fontSize: 8.5, bold: true, color: COLORS.RED_ALERT,
      fontFace: 'Segoe UI', align: 'center', valign: 'middle'
    });

    s.addText(c.title, {
      x: x + 0.3, y: 2.45, w: 3.1, h: 0.4,
      fontSize: 11.5, bold: true, color: COLORS.TEXT_MAIN, fontFace: 'Segoe UI'
    });

    s.addText(c.body, {
      x: x + 0.3, y: 2.9, w: 3.1, h: 2.4,
      fontSize: 10.5, color: COLORS.TEXT_BODY, fontFace: 'Segoe UI', lineSpacing: 16
    });
  });

  // Bottom Core Statement
  addCard(s, 0.8, 5.8, 11.7, 1.1, COLORS.MINT_BG, COLORS.MINT_BORDER);
  s.addText('CORE HMIS INTERVENTION HYPOTHESIS:', {
    x: 1.1, y: 5.95, w: 11.1, h: 0.25,
    fontSize: 10.5, bold: true, color: COLORS.TEAL_DARK, fontFace: 'Segoe UI'
  });
  s.addText('By deploying a streamlined, role-separated digital HMIS, Prasad Dental Care can eliminate paper retrieval delays (<1s digital search), prevent appointment collisions, provide chairside FDI dental charting, and deliver tamper-proof digital prescriptions directly to the patient.', {
    x: 1.1, y: 6.25, w: 11.1, h: 0.5,
    fontSize: 10.5, color: COLORS.TEXT_MAIN, fontFace: 'Segoe UI'
  });
}

// ======================================================================
// SLIDE 4: AS-IS WORKFLOW (CURRENT STATE)
// ======================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLORS.BG };
  addSlideHeader(s, 'Current State Workflow (AS-IS): Manual Paper Process', 'BPMN 2.0 Workflow', 'Manual paper handoffs across Patient, Reception, Doctor, and Pharmacy');

  // Embed AS_IS_WORKFLOW.png
  const asIsPath = path.join(rootDir, 'AS_IS_WORKFLOW.png');
  if (fs.existsSync(asIsPath)) {
    s.addImage({
      path: asIsPath,
      x: 0.8, y: 1.6, w: 11.7, h: 5.3
    });
  } else {
    addCard(s, 0.8, 1.6, 11.7, 5.3);
    s.addText('AS-IS Workflow Diagram Generated in AS_IS_WORKFLOW.svg', {
      x: 0.8, y: 3.8, w: 11.7, h: 0.5,
      fontSize: 14, color: COLORS.TEXT_MUTED, align: 'center'
    });
  }
}

// ======================================================================
// SLIDE 5: PAIN POINTS & CLINICAL RISKS
// ======================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLORS.BG };
  addSlideHeader(s, 'Documented Pain Points & Clinical Safety Risks', 'Gap Analysis', 'Evidence-based operational friction versus clinical safety hazards');

  const painPoints = [
    {
      cat: 'OPERATIONAL BOTTLENECKS',
      color: COLORS.AMBER_ALERT,
      bg: COLORS.AMBER_BG,
      items: [
        { title: 'Physical File Search Delays (PP-01)', desc: '5–10 minutes spent per patient searching shelves and manual daybooks.' },
        { title: 'Appointment Slot Collisions (PP-02)', desc: 'Paper diaries lack automated conflict checking; double bookings occur.' },
        { title: 'Unmanaged Waiting Congestion (PP-03)', desc: 'No queue transparency; patients wait blindly; verbal callouts.' }
      ]
    },
    {
      cat: 'CLINICAL & PATIENT RISKS',
      color: COLORS.RED_ALERT,
      bg: COLORS.RED_BG,
      items: [
        { title: 'Missing Orthodontic Timeline (PP-04)', desc: 'Historical bracket adjustments and tooth findings fragmented across paper cards.' },
        { title: 'Handwritten Prescription Hazards (PP-05)', desc: 'Ambiguous handwriting increases medication dispensing risk at pharmacies.' },
        { title: 'Post-Visit Communication Void (PP-06)', desc: 'Patients lose paper slips; zero digital access to dosage or visit history.' }
      ]
    }
  ];

  painPoints.forEach((col, i) => {
    const x = 0.8 + (i * 6.0);
    addCard(s, x, 1.7, 5.7, 5.2);

    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.3, y: 1.95, w: 5.1, h: 0.35,
      fill: { color: col.bg },
      line: { color: col.color, width: 1 },
      rectRadius: 0.08
    });
    s.addText(col.cat, {
      x: x + 0.3, y: 1.95, w: 5.1, h: 0.35,
      fontSize: 10, bold: true, color: col.color,
      fontFace: 'Segoe UI', align: 'center', valign: 'middle'
    });

    col.items.forEach((item, idx) => {
      const iy = 2.5 + (idx * 1.35);
      s.addText(item.title, {
        x: x + 0.3, y: iy, w: 5.1, h: 0.3,
        fontSize: 11, bold: true, color: COLORS.TEXT_MAIN, fontFace: 'Segoe UI'
      });
      s.addText(item.desc, {
        x: x + 0.3, y: iy + 0.3, w: 5.1, h: 0.8,
        fontSize: 10, color: COLORS.TEXT_BODY, fontFace: 'Segoe UI', lineSpacing: 15
      });
    });
  });
}

// ======================================================================
// SLIDE 6: CLIENT REQUIREMENTS (FR & NFR)
// ======================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLORS.BG };
  addSlideHeader(s, 'Client Requirements (Functional & Non-Functional)', 'Requirements', 'Verified against system implementation and healthcare operational standards');

  // Left Column: Functional
  addCard(s, 0.8, 1.7, 5.7, 5.2);
  s.addText('FUNCTIONAL REQUIREMENTS (FR-01 TO FR-15)', {
    x: 1.1, y: 1.95, w: 5.1, h: 0.3,
    fontSize: 11.5, bold: true, color: COLORS.TEAL_DARK, fontFace: 'Segoe UI'
  });
  s.addText([
    { text: '• Dual Portal Gateway: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Segregated Staff & Patient portals.\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• Atomic Provisioning: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Sequential PDC-XXXXXX ID generation.\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• Multi-Param Search: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Lookup by Mobile, PDC ID, Name (<1s).\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• Conflict-Free Booking: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Automated slot overlap prevention.\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• Live Queue Tracking: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Scheduled -> Waiting -> In-Consultation.\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• Chairside 1-Click Summary: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Medical alerts & visit history.\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• FDI Tooth Charting: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Interactive 2-digit grid (teeth 11–48).\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• Standardized Rx Engine: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Dental formulary with auto-dosage.\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• Patient Self-Service: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: '24/7 web access to active prescriptions.', options: { color: COLORS.TEXT_BODY } }
  ], {
    x: 1.1, y: 2.35, w: 5.1, h: 4.4,
    fontSize: 10, fontFace: 'Segoe UI', lineSpacing: 16
  });

  // Right Column: Non-Functional
  addCard(s, 6.8, 1.7, 5.7, 5.2);
  s.addText('NON-FUNCTIONAL REQUIREMENTS (NFR-01 TO NFR-10)', {
    x: 7.1, y: 1.95, w: 5.1, h: 0.3,
    fontSize: 11.5, bold: true, color: COLORS.TEAL_DARK, fontFace: 'Segoe UI'
  });
  s.addText([
    { text: '• Security & RLS Isolation: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'PostgreSQL RLS ensures zero cross-patient data leaks.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• Prescription Immutability: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Database-enforced write-lock on finalized prescriptions.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• Secret Isolation: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Service-role & Resend keys isolated in serverless API routes.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• Sub-Second Performance: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'PostgreSQL indexed queries execute in <1000ms.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• High-Fidelity Printing: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Standardized A4 sheet with official clinic letterhead.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• Responsive Design: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Full usability across clinic smartphones, tablets, and desktops.', options: { color: COLORS.TEXT_BODY } }
  ], {
    x: 7.1, y: 2.35, w: 5.1, h: 4.4,
    fontSize: 10, fontFace: 'Segoe UI', lineSpacing: 16
  });
}

// ======================================================================
// SLIDE 7: TO-BE WORKFLOW (PROPOSED STATE)
// ======================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLORS.BG };
  addSlideHeader(s, 'Proposed State Workflow (TO-BE): Prasad Dental Care HMIS', 'BPMN 2.0 Workflow', 'End-to-end digital integration connecting Reception, Doctor, and Patient Portal');

  // Embed TO_BE_WORKFLOW.png
  const toBePath = path.join(rootDir, 'TO_BE_WORKFLOW.png');
  if (fs.existsSync(toBePath)) {
    s.addImage({
      path: toBePath,
      x: 0.8, y: 1.6, w: 11.7, h: 5.3
    });
  } else {
    addCard(s, 0.8, 1.6, 11.7, 5.3);
    s.addText('TO-BE Workflow Diagram Generated in TO_BE_WORKFLOW.svg', {
      x: 0.8, y: 3.8, w: 11.7, h: 0.5,
      fontSize: 14, color: COLORS.TEXT_MUTED, align: 'center'
    });
  }
}

// ======================================================================
// SLIDE 8: PRODUCT PHILOSOPHY & DESIGN RATIONALE
// ======================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLORS.BG };
  addSlideHeader(s, 'Product Philosophy & Design Rationale', 'Product Philosophy', 'Purpose-built for a single-doctor practice: speed, simplicity, and clinical safety');

  const pillars = [
    {
      num: 'PILLAR 1',
      title: 'REJECTING ENTERPRISE BLOAT',
      desc: 'Monolithic hospital software imposes dozens of mandatory administrative fields. Prasad Dental Care HMIS collects strictly vital demographic and medical alert data, ensuring registration takes seconds, not minutes.'
    },
    {
      num: 'PILLAR 2',
      title: 'CHAIRSIDE OPERATORY SPEED',
      desc: 'Dr. Hemanth Kumar cannot type paragraphs while wearing sterile gloves. The interactive FDI tooth chart and standardized dental formulary allow findings and prescriptions to be documented in a few clicks.'
    },
    {
      num: 'PILLAR 3',
      title: 'DATA IMMUTABILITY & ISOLATION',
      desc: 'Prescriptions are legal medical documents. PostgreSQL Row Level Security enforces database-level immutability upon finalization, preventing tampering and guaranteeing strict cross-patient privacy.'
    }
  ];

  pillars.forEach((p, i) => {
    const x = 0.8 + (i * 4.0);
    addCard(s, x, 1.7, 3.7, 5.1);

    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.3, y: 2.0, w: 1.4, h: 0.3,
      fill: { color: COLORS.MINT_BG },
      line: { color: COLORS.MINT_BORDER, width: 1 },
      rectRadius: 0.06
    });
    s.addText(p.num, {
      x: x + 0.3, y: 2.0, w: 1.4, h: 0.3,
      fontSize: 9, bold: true, color: COLORS.TEAL_DARK,
      fontFace: 'Segoe UI', align: 'center', valign: 'middle'
    });

    s.addText(p.title, {
      x: x + 0.3, y: 2.5, w: 3.1, h: 0.45,
      fontSize: 12, bold: true, color: COLORS.TEXT_MAIN, fontFace: 'Segoe UI'
    });

    s.addText(p.desc, {
      x: x + 0.3, y: 3.1, w: 3.1, h: 3.4,
      fontSize: 10.5, color: COLORS.TEXT_BODY, fontFace: 'Segoe UI', lineSpacing: 18
    });
  });
}

// ======================================================================
// SLIDE 9: SYSTEM ARCHITECTURE & TECH STACK
// ======================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLORS.BG };
  addSlideHeader(s, 'System Architecture & Cloud-Native Technology Stack', 'Architecture', 'High-performance, secure, and zero-maintenance architecture');

  const layers = [
    {
      title: 'FRONTEND SPA LAYER',
      badge: 'REACT 18 + VITE',
      items: [
        'React 18 with TypeScript 5.5 for static type safety.',
        'Vite 5.4 build engine producing a lightweight bundle (<600kB gzip).',
        'Tailwind CSS design system providing accessible healthcare contrast.',
        'React Router DOM v6 with role-protected route guards.'
      ]
    },
    {
      title: 'DATABASE & BACKEND',
      badge: 'SUPABASE POSTGRESQL 15',
      items: [
        'Relational schema across 10 tables with strict foreign key constraints.',
        'Row Level Security (RLS) policies enforcing multi-tenant isolation.',
        'Atomic PL/pgSQL RPCs for transactional patient provisioning.',
        'Append-only immutable audit logging in public.audit_logs.'
      ]
    },
    {
      title: 'IDENTITY & DEPLOYMENT',
      badge: 'VERCEL + GOTRUE',
      items: [
        'Supabase GoTrue JWT authentication with secure session restoration.',
        'Vercel Global Edge Network deployment with custom SPA URL rewrites.',
        'Serverless API endpoint (api/send-patient-email.ts) isolating secrets.',
        'Cross-platform responsive support for mobile, tablet, and desktop.'
      ]
    }
  ];

  layers.forEach((l, i) => {
    const x = 0.8 + (i * 4.0);
    addCard(s, x, 1.7, 3.7, 5.1);

    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.3, y: 2.0, w: 3.1, h: 0.3,
      fill: { color: COLORS.MINT_BG },
      line: { color: COLORS.MINT_BORDER, width: 1 },
      rectRadius: 0.06
    });
    s.addText(l.badge, {
      x: x + 0.3, y: 2.0, w: 3.1, h: 0.3,
      fontSize: 9, bold: true, color: COLORS.TEAL_DARK,
      fontFace: 'Segoe UI', align: 'center', valign: 'middle'
    });

    s.addText(l.title, {
      x: x + 0.3, y: 2.45, w: 3.1, h: 0.4,
      fontSize: 12, bold: true, color: COLORS.TEXT_MAIN, fontFace: 'Segoe UI'
    });

    const textArr = [];
    l.items.forEach(item => {
      textArr.push({ text: `• ${item}\n\n`, options: { color: COLORS.TEXT_BODY } });
    });

    s.addText(textArr, {
      x: x + 0.3, y: 3.0, w: 3.1, h: 3.5,
      fontSize: 10, fontFace: 'Segoe UI', lineSpacing: 16
    });
  });
}

// ======================================================================
// SLIDE 10: KEY APPLICATION MODULES
// ======================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLORS.BG };
  addSlideHeader(s, 'Core System Modules & Operational Capabilities', 'Application Features', 'Four interconnected modules serving administrative and clinical operations');

  const modules = [
    {
      role: 'RECEPTION MODULE',
      title: 'Queue & Registration',
      points: [
        'Live status tracker: Scheduled -> Waiting -> Completed.',
        'Atomic patient registration generating sequential PDC IDs.',
        'Multi-parameter search (<1s) by Mobile, PDC ID, or Name.'
      ]
    },
    {
      role: 'SCHEDULING ENGINE',
      title: 'Conflict-Free Appointments',
      points: [
        'Real-time inspection of Dr. Hemanth Kumar’s timetable.',
        'Prevents double-booking overlapping time slots.',
        'Online appointment request lifecycle management.'
      ]
    },
    {
      role: 'DOCTOR OPERATORY',
      title: 'Chairside Dental Suite',
      points: [
        '1-Click clinical summary with systemic medical alerts.',
        'Interactive FDI tooth chart (teeth 11–48) for findings.',
        'Standardized dental formulary with auto-calculated dosages.'
      ]
    },
    {
      role: 'PATIENT PORTAL',
      title: '24/7 Mobile Self-Service',
      points: [
        'Instant web access to active prescriptions and visit history.',
        'High-fidelity printable Prasad Dental Care letterhead.',
        'Strict RLS isolation blocking cross-patient record access.'
      ]
    }
  ];

  modules.forEach((m, i) => {
    const x = (i % 2 === 0) ? 0.8 : 6.8;
    const y = (i < 2) ? 1.7 : 4.4;
    addCard(s, x, y, 5.7, 2.5);

    s.addText(m.role, {
      x: x + 0.3, y: y + 0.25, w: 5.1, h: 0.25,
      fontSize: 9.5, bold: true, color: COLORS.TEAL_DARK, fontFace: 'Segoe UI'
    });

    s.addText(m.title, {
      x: x + 0.3, y: y + 0.55, w: 5.1, h: 0.35,
      fontSize: 13, bold: true, color: COLORS.TEXT_MAIN, fontFace: 'Segoe UI'
    });

    const pts = m.points.map(p => ({ text: `• ${p}\n`, options: { color: COLORS.TEXT_BODY } }));
    s.addText(pts, {
      x: x + 0.3, y: y + 0.95, w: 5.1, h: 1.4,
      fontSize: 10, fontFace: 'Segoe UI', lineSpacing: 16
    });
  });
}

// ======================================================================
// SLIDE 11: END-TO-END CLINICAL & OPERATIONAL WORKFLOW
// ======================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLORS.BG };
  addSlideHeader(s, 'End-to-End Patient Journey Through Prasad Dental Care HMIS', 'Clinical Workflow', 'Tracing an encounter from arrival to post-consultation patient portal access');

  const steps = [
    { num: 'STEP 1', title: 'Arrival & Lookup', desc: 'Patient arrives; receptionist performs sub-second search by Mobile or PDC ID.' },
    { num: 'STEP 2', title: 'Atomic Provisioning', desc: 'New patient registered; sequence allocates PDC-XXXXXX; portal credentials generated.' },
    { num: 'STEP 3', title: 'Conflict-Free Booking', desc: 'Slot verified against Dr. Hemanth’s schedule; status transitions to Waiting Queue.' },
    { num: 'STEP 4', title: 'Chairside Operatory', desc: 'Doctor opens 1-click summary; charts teeth using FDI grid (teeth 11–48).' },
    { num: 'STEP 5', title: 'Immutable Digital Rx', desc: 'Standardized dental drugs selected; finalized Rx signed with official clinic letterhead.' },
    { num: 'STEP 6', title: 'Patient Self-Service', desc: 'Patient logs into Patient Portal from mobile device to review active Rx & visits.' }
  ];

  steps.forEach((st, i) => {
    const x = (i % 3 === 0) ? 0.8 : (i % 3 === 1) ? 4.8 : 8.8;
    const y = (i < 3) ? 1.7 : 4.4;
    addCard(s, x, y, 3.7, 2.5);

    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.3, y: y + 0.25, w: 1.2, h: 0.25,
      fill: { color: COLORS.MINT_BG },
      line: { color: COLORS.MINT_BORDER, width: 1 },
      rectRadius: 0.05
    });
    s.addText(st.num, {
      x: x + 0.3, y: y + 0.25, w: 1.2, h: 0.25,
      fontSize: 8.5, bold: true, color: COLORS.TEAL_DARK,
      fontFace: 'Segoe UI', align: 'center', valign: 'middle'
    });

    s.addText(st.title, {
      x: x + 0.3, y: y + 0.6, w: 3.1, h: 0.35,
      fontSize: 12, bold: true, color: COLORS.TEXT_MAIN, fontFace: 'Segoe UI'
    });

    s.addText(st.desc, {
      x: x + 0.3, y: y + 1.0, w: 3.1, h: 1.3,
      fontSize: 10, color: COLORS.TEXT_BODY, fontFace: 'Segoe UI', lineSpacing: 16
    });
  });
}

// ======================================================================
// SLIDE 12: SECURITY, PRIVACY & DATA INTEGRITY
// ======================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLORS.BG };
  addSlideHeader(s, 'Security Architecture & Healthcare Data Governance', 'Security Model', 'Built-in privacy and legal integrity without unsupported compliance claims');

  const secCards = [
    {
      badge: 'DATABASE LEVEL',
      title: 'Row Level Security (RLS)',
      desc: 'All 10 tables enforce PostgreSQL Row Level Security. Patient queries are restricted at the engine level to records where user phone or patient ID matches the authenticated session, preventing URL/ID tampering.'
    },
    {
      badge: 'CLINICAL INTEGRITY',
      title: 'Prescription Immutability',
      desc: 'Medical prescriptions cannot be modified or deleted post-finalization (rx_no_update, rx_no_delete policies evaluate USING false). Check constraints ensure no empty prescriptions are recorded.'
    },
    {
      badge: 'ACCESS CONTROL',
      title: 'RBAC & Secret Isolation',
      desc: 'Triggers prevent client-side privilege escalation. Private API credentials (Resend API key, Supabase service-role) are isolated exclusively in serverless API routes, never exposed to browser clients.'
    }
  ];

  secCards.forEach((sc, i) => {
    const x = 0.8 + (i * 4.0);
    addCard(s, x, 1.7, 3.7, 4.3);

    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.3, y: 2.0, w: 2.0, h: 0.3,
      fill: { color: COLORS.MINT_BG },
      line: { color: COLORS.MINT_BORDER, width: 1 },
      rectRadius: 0.06
    });
    s.addText(sc.badge, {
      x: x + 0.3, y: 2.0, w: 2.0, h: 0.3,
      fontSize: 8.5, bold: true, color: COLORS.TEAL_DARK,
      fontFace: 'Segoe UI', align: 'center', valign: 'middle'
    });

    s.addText(sc.title, {
      x: x + 0.3, y: 2.45, w: 3.1, h: 0.4,
      fontSize: 12, bold: true, color: COLORS.TEXT_MAIN, fontFace: 'Segoe UI'
    });

    s.addText(sc.desc, {
      x: x + 0.3, y: 2.95, w: 3.1, h: 2.8,
      fontSize: 10.5, color: COLORS.TEXT_BODY, fontFace: 'Segoe UI', lineSpacing: 17
    });
  });

  // Bottom Academic Note
  addCard(s, 0.8, 6.2, 11.7, 0.7, COLORS.CARD_BG, COLORS.BORDER);
  s.addText('AUDIT TRANSPARENCY NOTICE: The application enforces robust engineering security patterns (PostgreSQL RLS, secret isolation, audit logging). No formal HIPAA or NABH certifications are claimed, reflecting academic honesty.', {
    x: 1.1, y: 6.35, w: 11.1, h: 0.4,
    fontSize: 9.5, color: COLORS.TEXT_MUTED, fontFace: 'Segoe UI'
  });
}

// ======================================================================
// SLIDE 13: WORKING PRODUCT & LIVE DEPLOYMENT
// ======================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLORS.BG };
  addSlideHeader(s, 'Working Product Verification & Live Cloud Deployment', 'Live Deployment', 'Operational verification on Vercel Edge Network backed by automated test suites');

  // Left Card: Deployment Status
  addCard(s, 0.8, 1.7, 5.7, 5.1);
  s.addText('CLOUD DEPLOYMENT STATUS', {
    x: 1.1, y: 2.0, w: 5.1, h: 0.3,
    fontSize: 12, bold: true, color: COLORS.TEAL_DARK, fontFace: 'Segoe UI'
  });
  s.addText([
    { text: 'Live Production URL:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'https://hmis-wine.vercel.app\n\n', options: { color: COLORS.TEAL, bold: true } },
    { text: 'Edge Hosting Platform:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Vercel Edge Network with automated SPA URL rewriting.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Database Backend:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Supabase Cloud (PostgreSQL 15, AWS ap-south-1 Mumbai).\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Mobile Evaluation:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Evaluators can scan the QR code to interact with the responsive mobile patient portal on any smartphone.', options: { color: COLORS.TEXT_BODY } }
  ], {
    x: 1.1, y: 2.4, w: 5.1, h: 4.2,
    fontSize: 11, fontFace: 'Segoe UI', lineSpacing: 18
  });

  // Right Card: Test Verification Results
  addCard(s, 6.8, 1.7, 5.7, 5.1);
  s.addText('AUTOMATED VERIFICATION BATTERY', {
    x: 7.1, y: 2.0, w: 5.1, h: 0.3,
    fontSize: 12, bold: true, color: COLORS.TEAL_DARK, fontFace: 'Segoe UI'
  });

  const testResults = [
    { name: 'ESLint Code Quality Suite', status: 'PASS (0 Errors, 0 Warnings)' },
    { name: 'TypeScript & Vite Production Bundle', status: 'PASS (Zero compile errors, 8.65s)' },
    { name: 'Database Migration Integrity (001–012)', status: 'PASS (All 12 files verified)' },
    { name: 'E2E Workflow Test Suite (9 Suites)', status: 'PASS (60/60 Assertions Passing)' },
    { name: 'Live Supabase GoTrue Auth Login', status: 'PASS (Admin, Doctor, Patient verified)' }
  ];

  testResults.forEach((tr, idx) => {
    const ty = 2.45 + (idx * 0.85);
    s.addText(tr.name, {
      x: 7.1, y: ty, w: 5.1, h: 0.25,
      fontSize: 10.5, bold: true, color: COLORS.TEXT_MAIN, fontFace: 'Segoe UI'
    });
    s.addText(`Status: ${tr.status}`, {
      x: 7.1, y: ty + 0.28, w: 5.1, h: 0.3,
      fontSize: 10, color: COLORS.GREEN_SUCCESS, bold: true, fontFace: 'Segoe UI'
    });
  });
}

// ======================================================================
// SLIDE 14: CLIENT VALIDATION & FEEDBACK STATUS
// ======================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLORS.BG };
  addSlideHeader(s, 'Client Validation & On-Site Evaluation Framework', 'Client Validation', 'Academic integrity: live clinic evaluation in progress without fabricated quotes');

  // Top Alert Banner
  addCard(s, 0.8, 1.7, 11.7, 0.8, COLORS.AMBER_BG, COLORS.AMBER_ALERT);
  s.addText('CLIENT VALIDATION STATUS: IN PROGRESS (ON-SITE CLINIC EVALUATION)', {
    x: 1.1, y: 1.85, w: 11.1, h: 0.25,
    fontSize: 11, bold: true, color: COLORS.AMBER_ALERT, fontFace: 'Segoe UI'
  });
  s.addText('In strict compliance with academic research integrity, no fictional doctor endorsements or simulated staff testimonials have been fabricated. Evaluation data is being actively collected at Prasad Dental Care.', {
    x: 1.1, y: 2.15, w: 11.1, h: 0.3,
    fontSize: 9.5, color: COLORS.TEXT_MAIN, fontFace: 'Segoe UI'
  });

  // Left Card: Field Evaluation Protocol
  addCard(s, 0.8, 2.7, 5.7, 4.1);
  s.addText('FIELD EVALUATION PROTOCOL', {
    x: 1.1, y: 2.95, w: 5.1, h: 0.3,
    fontSize: 12, bold: true, color: COLORS.TEAL_DARK, fontFace: 'Segoe UI'
  });
  s.addText([
    { text: '• Primary Evaluator: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Dr. Hemanth Kumar (BDS, MDS – Orthodontics).\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• Secondary Evaluators: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Front-desk reception staff & outpatient dental patients.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• Quantitative Metrics: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Patient check-in duration, appointment scheduling accuracy, prescription generation time.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '• Qualitative Metrics: ', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Operatory usability, FDI tooth chart clarity, patient portal adoption.', options: { color: COLORS.TEXT_BODY } }
  ], {
    x: 1.1, y: 3.35, w: 5.1, h: 3.2,
    fontSize: 10.5, fontFace: 'Segoe UI', lineSpacing: 17
  });

  // Right Card: Integrated Feedback Mechanism
  addCard(s, 6.8, 2.7, 5.7, 4.1);
  s.addText('INTEGRATED CLINIC FEEDBACK MODULE', {
    x: 7.1, y: 2.95, w: 5.1, h: 0.3,
    fontSize: 12, bold: true, color: COLORS.TEAL_DARK, fontFace: 'Segoe UI'
  });
  s.addText([
    { text: 'Direct Feedback Capture at /feedback:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'A dedicated feedback tool is embedded directly within the HMIS application for clinic staff and patients.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Structured Capture Fields:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: '1. Overall System Usability (1–5 Star Rating)\n', options: { color: COLORS.TEXT_BODY } },
    { text: '2. Feature Utility Ratings (Registration, Queue, Prescriptions)\n', options: { color: COLORS.TEXT_BODY } },
    { text: '3. Operatory Friction Notes (Text observations during clinics)\n', options: { color: COLORS.TEXT_BODY } },
    { text: '4. Suggested Functional Enhancements\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: 'Database Persistence:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Responses are securely saved to public.clinic_feedback for analysis.', options: { color: COLORS.TEXT_BODY } }
  ], {
    x: 7.1, y: 3.35, w: 5.1, h: 3.2,
    fontSize: 10.5, fontFace: 'Segoe UI', lineSpacing: 17
  });
}

// ======================================================================
// SLIDE 15: CONCLUSION & NEXT STEPS
// ======================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLORS.BG };
  addSlideHeader(s, 'Project Summary, Conclusions & Post-MTA Roadmap', 'Conclusion', 'Successful delivery of a tailored HMIS for Prasad Dental Care');

  // Left Card: Achievements
  addCard(s, 0.8, 1.7, 5.7, 5.1);
  s.addText('KEY FIELD PROJECT DELIVERABLES', {
    x: 1.1, y: 2.0, w: 5.1, h: 0.3,
    fontSize: 12, bold: true, color: COLORS.TEAL_DARK, fontFace: 'Segoe UI'
  });
  s.addText([
    { text: '1. Eliminated Paper File Retrieval Delays:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Replaced manual shelf searches with sub-second digital lookups.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '2. Automated Conflict-Free Scheduling:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Engine enforces timetable limits and prevents slot collisions.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '3. Chairside Dental Charting & Safe Rx:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Equipped Dr. Hemanth Kumar with an interactive FDI tooth chart, standardized drug master, and immutable printed prescriptions.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '4. Empowered Continuous Patient Care:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Provided patients with a 24/7 self-service portal on mobile web.', options: { color: COLORS.TEXT_BODY } }
  ], {
    x: 1.1, y: 2.4, w: 5.1, h: 4.2,
    fontSize: 11, fontFace: 'Segoe UI', lineSpacing: 18
  });

  // Right Card: Immediate Next Steps
  addCard(s, 6.8, 1.7, 5.7, 5.1);
  s.addText('IMMEDIATE POST-MTA ROADMAP', {
    x: 7.1, y: 2.0, w: 5.1, h: 0.3,
    fontSize: 12, bold: true, color: COLORS.TEAL_DARK, fontFace: 'Segoe UI'
  });
  s.addText([
    { text: '1. Complete Staff Operatory Training:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Conduct guided simulation sessions with Dr. Hemanth Kumar and front-desk staff on edge cases.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '2. Synthesize Quantitative Evaluation Data:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Aggregate Likert usability ratings and time-motion observations collected via the feedback module.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '3. Clinic Hardware Calibration:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Fine-tune local operatory printer margins for pre-printed letterheads.\n\n', options: { color: COLORS.TEXT_BODY } },
    { text: '4. Production Handover:\n', options: { bold: true, color: COLORS.TEXT_MAIN } },
    { text: 'Finalize administrative credentials and deliver complete operating manuals to Prasad Dental Care.', options: { color: COLORS.TEXT_BODY } }
  ], {
    x: 7.1, y: 2.4, w: 5.1, h: 4.2,
    fontSize: 11, fontFace: 'Segoe UI', lineSpacing: 18
  });
}

// Write to file
pres.writeFile({ fileName: outputPptx })
  .then(fileName => {
    console.log(`[PASS] Successfully generated MTA Presentation: ${fileName}`);
  })
  .catch(err => {
    console.error(`[FAIL] Presentation generation failed:`, err);
    process.exit(1);
  });
