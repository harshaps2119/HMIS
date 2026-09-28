import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const scratchRequire = createRequire('C:\\Users\\likhi\\.gemini\\antigravity-ide\\brain\\d494dc7a-f7d9-4449-9f80-8d7ee60570a0\\scratch\\package.json');
const { createCanvas } = scratchRequire('canvas');

// Output directories
const rootDir = 'c:\\Users\\likhi\\OneDrive\\Desktop\\HMIS';

// ----------------------------------------------------------------------
// 1. GENERATE AS-IS WORKFLOW (Current State - Manual Paper Process)
// ----------------------------------------------------------------------
function generateAsIsSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 680" width="1200" height="680" style="background:#F8FAFC;font-family:'Segoe UI',sans-serif;">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0F172A" flood-opacity="0.08"/>
    </filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748B"/>
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#EF4444"/>
    </marker>
  </defs>

  <!-- Header Banner -->
  <rect x="0" y="0" width="1200" height="60" fill="#0F172A"/>
  <text x="30" y="38" fill="#F8FAFC" font-size="20" font-weight="bold">BPMN 2.0 WORKFLOW: CURRENT STATE (AS-IS) — MANUAL PAPER PROCESS</text>
  <text x="850" y="38" fill="#94A3B8" font-size="13">Prasad Dental Care | Kurnool, AP | Dr. Hemanth Kumar</text>

  <!-- Swimlanes -->
  <!-- Pool Backgrounds -->
  <rect x="30" y="80" width="1140" height="130" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5"/>
  <rect x="30" y="225" width="1140" height="140" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5"/>
  <rect x="30" y="380" width="1140" height="150" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5"/>
  <rect x="30" y="545" width="1140" height="110" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5"/>

  <!-- Lane Headers -->
  <path d="M 30 80 L 150 80 L 150 210 L 30 210 Z" fill="#F1F5F9" rx="8"/>
  <text x="90" y="150" fill="#334155" font-size="14" font-weight="bold" text-anchor="middle">PATIENT</text>

  <path d="M 30 225 L 150 225 L 150 365 L 30 365 Z" fill="#F1F5F9" rx="8"/>
  <text x="90" y="300" fill="#334155" font-size="14" font-weight="bold" text-anchor="middle">RECEPTION</text>

  <path d="M 30 380 L 150 380 L 150 530 L 30 530 Z" fill="#F1F5F9" rx="8"/>
  <text x="90" y="445" fill="#334155" font-size="14" font-weight="bold" text-anchor="middle">DOCTOR</text>
  <text x="90" y="465" fill="#64748B" font-size="11" text-anchor="middle">(Dr. Hemanth)</text>

  <path d="M 30 545 L 150 545 L 150 655 L 30 655 Z" fill="#F1F5F9" rx="8"/>
  <text x="90" y="605" fill="#334155" font-size="13" font-weight="bold" text-anchor="middle">PHARMACY / HOME</text>

  <!-- Flow 1: Patient Arrives -->
  <circle cx="190" cy="145" r="18" fill="#10B981" stroke="#059669" stroke-width="2"/>
  <text x="190" y="150" fill="#FFFFFF" font-size="10" font-weight="bold" text-anchor="middle">START</text>
  <text x="190" y="180" fill="#475569" font-size="11" text-anchor="middle">Walks in / Phone</text>

  <line x1="210" y1="145" x2="250" y2="145" stroke="#64748B" stroke-width="2" marker-end="url(#arrow)"/>

  <rect x="250" y="115" width="130" height="60" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5" filter="url(#shadow)"/>
  <text x="315" y="140" fill="#1E293B" font-size="11" font-weight="bold" text-anchor="middle">States Dental Issue</text>
  <text x="315" y="158" fill="#64748B" font-size="10" text-anchor="middle">&amp; Requests Token</text>

  <!-- Connect to Reception -->
  <path d="M 315 175 L 315 255" stroke="#64748B" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Reception Task 1: Check Register -->
  <rect x="250" y="255" width="140" height="60" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5" filter="url(#shadow)"/>
  <text x="320" y="280" fill="#1E293B" font-size="11" font-weight="bold" text-anchor="middle">Check Paper Register</text>
  <text x="320" y="298" fill="#64748B" font-size="10" text-anchor="middle">&amp; Physical Shelf</text>

  <!-- Pain Point 1 Badge -->
  <rect x="255" y="320" width="130" height="20" rx="4" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1"/>
  <text x="320" y="334" fill="#B91C1C" font-size="9" font-weight="bold" text-anchor="middle">PAIN: Misplaced Files (5-10m)</text>

  <line x1="390" y1="285" x2="430" y2="285" stroke="#64748B" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Reception Task 2: Write Token & Paper Slip -->
  <rect x="430" y="255" width="140" height="60" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5" filter="url(#shadow)"/>
  <text x="500" y="280" fill="#1E293B" font-size="11" font-weight="bold" text-anchor="middle">Write Paper Slip /</text>
  <text x="500" y="298" fill="#64748B" font-size="10" text-anchor="middle">Manual Token</text>

  <path d="M 500 255 L 500 175" stroke="#64748B" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Patient Waits -->
  <rect x="435" y="115" width="130" height="60" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5" filter="url(#shadow)"/>
  <text x="500" y="140" fill="#1E293B" font-size="11" font-weight="bold" text-anchor="middle">Waits in Waiting Area</text>
  <text x="500" y="158" fill="#64748B" font-size="10" text-anchor="middle">No queue visibility</text>

  <!-- Pain Point 2 Badge -->
  <rect x="440" y="90" width="120" height="20" rx="4" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1"/>
  <text x="500" y="104" fill="#B91C1C" font-size="9" font-weight="bold" text-anchor="middle">PAIN: Unmanaged Waiting</text>

  <!-- Verbal Call to Doctor Room -->
  <path d="M 565 145 L 610 145 L 610 420 L 640 420" stroke="#64748B" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Doctor Room: Consultation -->
  <rect x="640" y="395" width="150" height="65" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5" filter="url(#shadow)"/>
  <text x="715" y="420" fill="#1E293B" font-size="11" font-weight="bold" text-anchor="middle">Verbal History Recall &amp;</text>
  <text x="715" y="438" fill="#64748B" font-size="10" text-anchor="middle">Chairside Dental Exam</text>

  <!-- Pain Point 3 Badge -->
  <rect x="645" y="465" width="140" height="20" rx="4" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1"/>
  <text x="715" y="479" fill="#B91C1C" font-size="9" font-weight="bold" text-anchor="middle">PAIN: Missing Past Dental Notes</text>

  <line x1="790" y1="427" x2="830" y2="427" stroke="#64748B" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Doctor Task 2: Handwrite Rx -->
  <rect x="830" y="395" width="150" height="65" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5" filter="url(#shadow)"/>
  <text x="905" y="420" fill="#1E293B" font-size="11" font-weight="bold" text-anchor="middle">Handwrite Paper Rx &amp;</text>
  <text x="905" y="438" fill="#64748B" font-size="10" text-anchor="middle">Physical Record Entry</text>

  <!-- Pain Point 4 Badge -->
  <rect x="835" y="465" width="140" height="20" rx="4" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1"/>
  <text x="905" y="479" fill="#B91C1C" font-size="9" font-weight="bold" text-anchor="middle">PAIN: Illegible Handwriting</text>

  <!-- Hand paper Rx to Patient / Pharmacy -->
  <path d="M 905 460 L 905 570" stroke="#EF4444" stroke-width="2" marker-end="url(#arrow-red)"/>

  <!-- Pharmacy Task: Dispense -->
  <rect x="830" y="570" width="150" height="60" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5" filter="url(#shadow)"/>
  <text x="905" y="595" fill="#1E293B" font-size="11" font-weight="bold" text-anchor="middle">Pharmacy Deciphers Rx</text>
  <text x="905" y="613" fill="#64748B" font-size="10" text-anchor="middle">&amp; Dispenses Meds</text>

  <line x1="980" y1="600" x2="1030" y2="600" stroke="#64748B" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Patient Home -->
  <rect x="1030" y="570" width="120" height="60" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5" filter="url(#shadow)"/>
  <text x="1090" y="595" fill="#1E293B" font-size="11" font-weight="bold" text-anchor="middle">Takes Meds Home</text>
  <text x="1090" y="613" fill="#64748B" font-size="10" text-anchor="middle">Paper Rx easily lost</text>

  <!-- Pain Point 5 Badge -->
  <rect x="1025" y="545" width="130" height="20" rx="4" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1"/>
  <text x="1090" y="559" fill="#B91C1C" font-size="9" font-weight="bold" text-anchor="middle">PAIN: Zero Record Access</text>

  <!-- End Node -->
  <line x1="1090" y1="630" x2="1090" y2="640" stroke="#64748B" stroke-width="1.5"/>
  <circle cx="1090" cy="650" r="12" fill="#EF4444" stroke="#B91C1C" stroke-width="2"/>
  <text x="1090" y="654" fill="#FFFFFF" font-size="8" font-weight="bold" text-anchor="middle">END</text>
</svg>`;
}

// ----------------------------------------------------------------------
// 2. GENERATE TO-BE WORKFLOW (Proposed State - Prasad Dental Care HMIS)
// ----------------------------------------------------------------------
function generateToBeSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 680" width="1200" height="680" style="background:#F8FAFC;font-family:'Segoe UI',sans-serif;">
  <defs>
    <filter id="shadow-teal" x="-5%" y="-5%" width="110%" height="115%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0F766E" flood-opacity="0.1"/>
    </filter>
    <marker id="arrow-teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#0D9488"/>
    </marker>
  </defs>

  <!-- Header Banner -->
  <rect x="0" y="0" width="1200" height="60" fill="#0D9488"/>
  <text x="30" y="38" fill="#FFFFFF" font-size="20" font-weight="bold">BPMN 2.0 WORKFLOW: PROPOSED STATE (TO-BE) — PRASAD DENTAL CARE HMIS</text>
  <text x="850" y="38" fill="#CCFBF1" font-size="13">Prasad Dental Care | Kurnool, AP | Dr. Hemanth Kumar</text>

  <!-- Swimlanes -->
  <rect x="30" y="80" width="1140" height="120" rx="8" fill="#FFFFFF" stroke="#CCFBF1" stroke-width="1.5"/>
  <rect x="30" y="215" width="1140" height="135" rx="8" fill="#FFFFFF" stroke="#CCFBF1" stroke-width="1.5"/>
  <rect x="30" y="365" width="1140" height="145" rx="8" fill="#FFFFFF" stroke="#CCFBF1" stroke-width="1.5"/>
  <rect x="30" y="525" width="1140" height="130" rx="8" fill="#FFFFFF" stroke="#CCFBF1" stroke-width="1.5"/>

  <!-- Lane Headers -->
  <path d="M 30 80 L 150 80 L 150 200 L 30 200 Z" fill="#F0FDFA" rx="8"/>
  <text x="90" y="145" fill="#0F766E" font-size="14" font-weight="bold" text-anchor="middle">PATIENT</text>

  <path d="M 30 215 L 150 215 L 150 350 L 30 350 Z" fill="#F0FDFA" rx="8"/>
  <text x="90" y="275" fill="#0F766E" font-size="14" font-weight="bold" text-anchor="middle">RECEPTION</text>
  <text x="90" y="295" fill="#14B8A6" font-size="11" text-anchor="middle">(Staff Portal)</text>

  <path d="M 30 365 L 150 365 L 150 510 L 30 510 Z" fill="#F0FDFA" rx="8"/>
  <text x="90" y="430" fill="#0F766E" font-size="14" font-weight="bold" text-anchor="middle">DOCTOR</text>
  <text x="90" y="450" fill="#14B8A6" font-size="11" text-anchor="middle">(Dr. Hemanth)</text>

  <path d="M 30 525 L 150 525 L 150 655 L 30 655 Z" fill="#F0FDFA" rx="8"/>
  <text x="90" y="585" fill="#0F766E" font-size="13" font-weight="bold" text-anchor="middle">PATIENT PORTAL</text>
  <text x="90" y="605" fill="#14B8A6" font-size="11" text-anchor="middle">(Self-Service)</text>

  <!-- Step 1: Patient Arrival -->
  <circle cx="190" cy="140" r="18" fill="#0D9488" stroke="#0F766E" stroke-width="2"/>
  <text x="190" y="145" fill="#FFFFFF" font-size="10" font-weight="bold" text-anchor="middle">START</text>
  <text x="190" y="175" fill="#475569" font-size="11" text-anchor="middle">Arrives / Books</text>

  <line x1="210" y1="140" x2="250" y2="140" stroke="#0D9488" stroke-width="2" marker-end="url(#arrow-teal)"/>

  <!-- Step 2: Instant Patient Identification -->
  <rect x="250" y="110" width="140" height="60" rx="6" fill="#F0FDFA" stroke="#0D9488" stroke-width="1.5" filter="url(#shadow-teal)"/>
  <text x="320" y="135" fill="#0F766E" font-size="11" font-weight="bold" text-anchor="middle">Provides Phone /</text>
  <text x="320" y="153" fill="#115E59" font-size="10" text-anchor="middle">PDC Patient ID</text>

  <path d="M 320 170 L 320 240" stroke="#0D9488" stroke-width="2" marker-end="url(#arrow-teal)"/>

  <!-- Reception: Fast Search or Atomic Provisioning -->
  <rect x="250" y="240" width="150" height="70" rx="6" fill="#FFFFFF" stroke="#0D9488" stroke-width="1.5" filter="url(#shadow-teal)"/>
  <text x="325" y="265" fill="#0F766E" font-size="11" font-weight="bold" text-anchor="middle">Instant Lookup /</text>
  <text x="325" y="283" fill="#1E293B" font-size="10" text-anchor="middle">Atomic Registration</text>
  <text x="325" y="300" fill="#0D9488" font-size="9" font-weight="bold" text-anchor="middle">PDC-XXXXXX Sequence</text>

  <line x1="400" y1="275" x2="450" y2="275" stroke="#0D9488" stroke-width="2" marker-end="url(#arrow-teal)"/>

  <!-- Reception: Slot Conflict-Free Booking & Queue -->
  <rect x="450" y="240" width="150" height="70" rx="6" fill="#FFFFFF" stroke="#0D9488" stroke-width="1.5" filter="url(#shadow-teal)"/>
  <text x="525" y="265" fill="#0F766E" font-size="11" font-weight="bold" text-anchor="middle">Conflict-Free Booking</text>
  <text x="525" y="283" fill="#1E293B" font-size="10" text-anchor="middle">&amp; Live Queue Update</text>
  <text x="525" y="300" fill="#059669" font-size="9" font-weight="bold" text-anchor="middle">Checked-in &rarr; Waiting</text>

  <!-- Connect to Doctor Chairside -->
  <path d="M 525 310 L 525 390" stroke="#0D9488" stroke-width="2" marker-end="url(#arrow-teal)"/>

  <!-- Doctor: Live Queue & Medical Summary -->
  <rect x="450" y="390" width="160" height="75" rx="6" fill="#FFFFFF" stroke="#0D9488" stroke-width="1.5" filter="url(#shadow-teal)"/>
  <text x="530" y="415" fill="#0F766E" font-size="11" font-weight="bold" text-anchor="middle">Live Doctor Dashboard</text>
  <text x="530" y="433" fill="#1E293B" font-size="10" text-anchor="middle">1-Click Patient Summary</text>
  <text x="530" y="451" fill="#059669" font-size="9" font-weight="bold" text-anchor="middle">Full Dental &amp; Allergy History</text>

  <line x1="610" y1="427" x2="660" y2="427" stroke="#0D9488" stroke-width="2" marker-end="url(#arrow-teal)"/>

  <!-- Doctor: FDI Chart & Standardized Rx -->
  <rect x="660" y="390" width="170" height="75" rx="6" fill="#FFFFFF" stroke="#0D9488" stroke-width="1.5" filter="url(#shadow-teal)"/>
  <text x="745" y="415" fill="#0F766E" font-size="11" font-weight="bold" text-anchor="middle">FDI Tooth Charting &amp;</text>
  <text x="745" y="433" fill="#1E293B" font-size="10" text-anchor="middle">Master Drug Selection</text>
  <text x="745" y="451" fill="#059669" font-size="9" font-weight="bold" text-anchor="middle">Auto-calculated Dosage &amp; Diet</text>

  <line x1="830" y1="427" x2="880" y2="427" stroke="#0D9488" stroke-width="2" marker-end="url(#arrow-teal)"/>

  <!-- Doctor: Immutable Rx Generation -->
  <rect x="880" y="390" width="160" height="75" rx="6" fill="#F0FDFA" stroke="#0D9488" stroke-width="1.5" filter="url(#shadow-teal)"/>
  <text x="960" y="415" fill="#0F766E" font-size="11" font-weight="bold" text-anchor="middle">Immutable Digital Rx</text>
  <text x="960" y="433" fill="#1E293B" font-size="10" text-anchor="middle">Prasad Dental Letterhead</text>
  <text x="960" y="451" fill="#059669" font-size="9" font-weight="bold" text-anchor="middle">Dr. Hemanth Kumar (MDS)</text>

  <!-- Connect to Patient Portal -->
  <path d="M 960 465 L 960 550" stroke="#0D9488" stroke-width="2" marker-end="url(#arrow-teal)"/>

  <!-- Patient Portal: Instant Access -->
  <rect x="880" y="550" width="180" height="75" rx="6" fill="#FFFFFF" stroke="#0D9488" stroke-width="1.5" filter="url(#shadow-teal)"/>
  <text x="970" y="575" fill="#0F766E" font-size="11" font-weight="bold" text-anchor="middle">24/7 Patient Portal Access</text>
  <text x="970" y="593" fill="#1E293B" font-size="10" text-anchor="middle">View &amp; Print Prescriptions</text>
  <text x="970" y="611" fill="#059669" font-size="9" font-weight="bold" text-anchor="middle">Upcoming Visits &amp; Dental Record</text>

  <!-- End Node -->
  <line x1="1060" y1="587" x2="1100" y2="587" stroke="#0D9488" stroke-width="2" marker-end="url(#arrow-teal)"/>
  <circle cx="1120" cy="587" r="16" fill="#059669" stroke="#047857" stroke-width="2"/>
  <text x="1120" y="592" fill="#FFFFFF" font-size="9" font-weight="bold" text-anchor="middle">DONE</text>
</svg>`;
}

// ----------------------------------------------------------------------
// 3. RENDER SVG TO HIGH-RES PNG USING CANVAS
// ----------------------------------------------------------------------
function renderSvgToPng(svgString, outputPath, width = 1200, height = 680) {
  // Using node-canvas to draw diagram cleanly
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  // We write the SVG directly to disk as primary vector artifact
  const svgPath = outputPath.replace('.png', '.svg');
  fs.writeFileSync(svgPath, svgString, 'utf8');
  console.log(`[PASS] Wrote SVG vector artifact: ${svgPath}`);

  // Also save PNG placeholder using Canvas graphics for PPTX compatibility
  // (PPTX accepts PNG images with 100% reliability across all PowerPoint versions)
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, 60);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px Segoe UI';
  const isToBe = outputPath.includes('TO_BE');
  ctx.fillText(
    isToBe ? 'BPMN 2.0 WORKFLOW: PROPOSED STATE (TO-BE) — PRASAD DENTAL CARE HMIS' : 'BPMN 2.0 WORKFLOW: CURRENT STATE (AS-IS) — MANUAL PAPER PROCESS',
    30,
    38
  );

  ctx.fillStyle = '#94A3B8';
  ctx.font = '14px Segoe UI';
  ctx.fillText('Prasad Dental Care | Kurnool, AP | Dr. Hemanth Kumar', 820, 38);

  // Draw 4 lanes
  const lanes = [
    { title: 'PATIENT', y: 80, h: 125 },
    { title: 'RECEPTION', y: 220, h: 135 },
    { title: 'DOCTOR', y: 370, h: 140 },
    { title: isToBe ? 'PATIENT PORTAL' : 'PHARMACY / HOME', y: 525, h: 130 }
  ];

  lanes.forEach(l => {
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = isToBe ? '#CCFBF1' : '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(30, l.y, 1140, l.h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isToBe ? '#F0FDFA' : '#F1F5F9';
    ctx.beginPath();
    ctx.roundRect(30, l.y, 140, l.h, 8);
    ctx.fill();

    ctx.fillStyle = isToBe ? '#0F766E' : '#334155';
    ctx.font = 'bold 14px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(l.title, 100, l.y + (l.h / 2) + 5);
  });

  // Steps Boxes
  ctx.textAlign = 'center';
  if (!isToBe) {
    // AS-IS Steps
    drawBox(ctx, 230, 115, 150, 60, '1. Patient Arrival', 'Walk-in / Phone inquiry', '#F8FAFC', '#CBD5E1');
    drawBox(ctx, 230, 255, 160, 65, '2. Paper Search', 'Search shelves / physical files', '#FEE2E2', '#FCA5A5', 'PAIN: 5-10 min delay');
    drawBox(ctx, 440, 255, 150, 60, '3. Paper Register', 'Write name in manual book', '#F8FAFC', '#CBD5E1');
    drawBox(ctx, 440, 115, 150, 60, '4. Unmanaged Wait', 'Waiting room congestion', '#FEE2E2', '#FCA5A5', 'PAIN: No queue status');
    drawBox(ctx, 640, 405, 170, 70, '5. Verbal History', 'Oral exam / Doctor asks recall', '#FEE2E2', '#FCA5A5', 'PAIN: Missing past records');
    drawBox(ctx, 850, 405, 170, 70, '6. Handwritten Rx', 'Paper pad prescription', '#FEE2E2', '#FCA5A5', 'PAIN: Illegible handwriting');
    drawBox(ctx, 850, 560, 170, 60, '7. Pharmacy Decipher', 'Pharmacist dispenses meds', '#F8FAFC', '#CBD5E1');
    drawBox(ctx, 1040, 560, 115, 60, '8. Home', 'Paper lost / zero access', '#FEE2E2', '#FCA5A5');
  } else {
    // TO-BE Steps
    drawBox(ctx, 230, 110, 160, 60, '1. Patient Arrival', 'Provides Phone or PDC ID', '#F0FDFA', '#0D9488');
    drawBox(ctx, 230, 245, 170, 75, '2. Instant Lookup', 'PDC-XXXXXX auto-sequence\nAtomic portal provisioning', '#FFFFFF', '#0D9488', 'Instant (<1 sec)');
    drawBox(ctx, 450, 245, 170, 75, '3. Conflict-Free Booking', 'Automatic slot verification\nLive queue: Checked-in', '#FFFFFF', '#0D9488', 'Zero double-booking');
    drawBox(ctx, 450, 400, 170, 80, '4. Live Doctor Queue', '1-Click patient summary\nPrevious visits & allergies', '#FFFFFF', '#0D9488', 'Immediate chairside');
    drawBox(ctx, 670, 400, 180, 80, '5. FDI Tooth Charting', 'Visual FDI tooth finding\nStandardized dental drugs', '#FFFFFF', '#0D9488', 'Standardized dosage');
    drawBox(ctx, 900, 400, 180, 80, '6. Immutable Digital Rx', 'Prasad Dental letterhead\nDr. Hemanth Kumar (MDS)', '#F0FDFA', '#0D9488', 'Tamper-proof');
    drawBox(ctx, 900, 555, 190, 75, '7. 24/7 Patient Portal', 'Self-service Rx & appointments\nTreatment timeline view', '#FFFFFF', '#0D9488', 'Secure patient access');
  }

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`[PASS] Wrote PNG image artifact: ${outputPath}`);
}

function drawBox(ctx, x, y, w, h, title, subtitle, fill, stroke, badge) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 12px Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillText(title, x + (w / 2), y + 20);

  ctx.fillStyle = '#475569';
  ctx.font = '10px Segoe UI';
  const lines = subtitle.split('\n');
  lines.forEach((l, i) => {
    ctx.fillText(l, x + (w / 2), y + 36 + (i * 14));
  });

  if (badge) {
    ctx.fillStyle = stroke.includes('FCA5A5') ? '#B91C1C' : '#047857';
    ctx.font = 'bold 9px Segoe UI';
    ctx.fillText(badge, x + (w / 2), y + h - 6);
  }
  ctx.restore();
}

// Generate
const asIsSvg = generateAsIsSvg();
const toBeSvg = generateToBeSvg();

renderSvgToPng(asIsSvg, path.join(rootDir, 'AS_IS_WORKFLOW.png'));
renderSvgToPng(toBeSvg, path.join(rootDir, 'TO_BE_WORKFLOW.png'));
