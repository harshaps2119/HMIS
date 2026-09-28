import os
import qrcode
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.dml.color import RGBColor

# -------------------------------------------------------------
# Color Palette Constants (DentalCare Healthcare Aesthetic)
# -------------------------------------------------------------
BG_COLOR = RGBColor(248, 250, 252)       # Light slate (#F8FAFC)
CARD_BG = RGBColor(255, 255, 255)        # Pure white
BORDER_COLOR = RGBColor(226, 232, 240)   # Light gray border (#E2E8F0)
TEAL_PRIMARY = RGBColor(13, 148, 136)    # Modern Teal (#0D9488)
TEAL_DARK = RGBColor(15, 118, 110)       # Deep Teal (#0F766E)
TEAL_LIGHT = RGBColor(240, 253, 250)     # Mint tint (#F0FDFA)
TEAL_BORDER = RGBColor(204, 251, 241)    # Mint border (#CCFBF1)
NAVY_TEXT = RGBColor(15, 23, 42)         # Slate 900 (#0F172A)
BODY_TEXT = RGBColor(51, 65, 85)         # Slate 700 (#334155)
MUTED_TEXT = RGBColor(100, 116, 139)     # Slate 500 (#64748B)

# Role Colors
PURPLE_ROLE = RGBColor(124, 58, 237)     # Admin (#7C3AED)
PURPLE_LIGHT = RGBColor(243, 232, 255)   # (#F3E8FF)
BLUE_ROLE = RGBColor(2, 132, 199)        # Doctor (#0284C7)
BLUE_LIGHT = RGBColor(224, 242, 254)     # (#E0F2FE)
GREEN_ROLE = RGBColor(5, 150, 105)       # Receptionist (#059669)
GREEN_LIGHT = RGBColor(209, 250, 229)    # (#D1FAE5)
AMBER_ACCENT = RGBColor(217, 119, 6)     # Warning/Alert (#D97706)
AMBER_LIGHT = RGBColor(254, 243, 199)    # (#FEF3C7)

FONT_HEADING = "Segoe UI"
FONT_BODY = "Segoe UI"
APP_URL = "https://hmis-wine.vercel.app/"

# -------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------
def set_shape_flat(shape, fill_color, border_color=None, border_width=1):
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = Pt(border_width)
    else:
        shape.line.fill.background()

def add_header(slide, title_text, category_badge="DENTALCARE HMIS", subtitle_text=None):
    # Header badge
    badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.4), Inches(2.8), Inches(0.35))
    set_shape_flat(badge, TEAL_LIGHT, TEAL_BORDER, 1)
    tf = badge.text_frame
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.word_wrap = False
    p = tf.paragraphs[0]
    p.text = category_badge
    p.font.name = FONT_HEADING
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = TEAL_DARK
    p.alignment = PP_ALIGN.CENTER

    # Title box
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.8), Inches(11.7), Inches(0.7))
    tf2 = tb.text_frame
    tf2.word_wrap = True
    tf2.margin_left = tf2.margin_right = tf2.margin_top = tf2.margin_bottom = 0
    p2 = tf2.paragraphs[0]
    p2.text = title_text
    p2.font.name = FONT_HEADING
    p2.font.size = Pt(24)
    p2.font.bold = True
    p2.font.color.rgb = NAVY_TEXT

    if subtitle_text:
        p_sub = tf2.add_paragraph()
        p_sub.text = subtitle_text
        p_sub.font.name = FONT_BODY
        p_sub.font.size = Pt(12)
        p_sub.font.color.rgb = MUTED_TEXT

def create_card(slide, left, top, width, height, fill=CARD_BG, border=BORDER_COLOR, border_width=1):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    set_shape_flat(card, fill, border, border_width)
    return card

# -------------------------------------------------------------
# Generate Presentation
# -------------------------------------------------------------
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_slide_layout = prs.slide_layouts[6]

# =============================================================
# SLIDE 1: TITLE / ABOUT THE APPLICATION
# =============================================================
s1 = prs.slides.add_slide(blank_slide_layout)

# Background decor
top_bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.2))
set_shape_flat(top_bar, TEAL_DARK, None)

# Title Badge
t_badge = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.7), Inches(4.2), Inches(0.4))
set_shape_flat(t_badge, TEAL_LIGHT, TEAL_BORDER, 1)
tf = t_badge.text_frame
tf.vertical_anchor = MSO_ANCHOR.MIDDLE
p = tf.paragraphs[0]
p.text = "HEALTHCARE MANAGEMENT SYSTEM • DIGITAL HEALTH RECORDS"
p.font.name = FONT_HEADING
p.font.size = Pt(9.5)
p.font.bold = True
p.font.color.rgb = TEAL_DARK
p.alignment = PP_ALIGN.CENTER

# Main Title & Subtitle
tb_title = s1.shapes.add_textbox(Inches(0.8), Inches(1.2), Inches(11.7), Inches(1.5))
tf = tb_title.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

p = tf.paragraphs[0]
p.text = "DentalCare HMIS"
p.font.name = FONT_HEADING
p.font.size = Pt(40)
p.font.bold = True
p.font.color.rgb = NAVY_TEXT

p_sub = tf.add_paragraph()
p_sub.text = "Hospital Management Information System"
p_sub.font.name = FONT_HEADING
p_sub.font.size = Pt(20)
p_sub.font.bold = True
p_sub.font.color.rgb = TEAL_PRIMARY

p_desc = tf.add_paragraph()
p_desc.text = "A modern, cloud-native clinical platform designed specifically for dental facilities — enabling centralized digital management of patient registrations, multi-doctor appointment scheduling, FDI tooth charting, immutable prescriptions, and role-based administration."
p_desc.font.name = FONT_BODY
p_desc.font.size = Pt(13)
p_desc.font.color.rgb = BODY_TEXT

# 4 Key Role Portals Cards
roles_data = [
    ("Administrator", "Full system governance, staff account provisioning with setup emails, master tariff & medication catalogs, test patient management, and legal audit trails.", PURPLE_ROLE, PURPLE_LIGHT),
    ("Doctor", "Daily consultation queue, patient clinical histories, tooth examination with FDI charting (11-48), diagnosis notes, and 1-click legal prescription builder with WhatsApp link.", BLUE_ROLE, BLUE_LIGHT),
    ("Receptionist", "Zero-barrier patient onboarding with normalized E.164 UHID, calendar appointment booking with conflict detection, and live clinic queue management.", GREEN_ROLE, GREEN_LIGHT),
    ("Patient", "Self-service patient portal to request appointments, review chronological visit and procedure records, and download or print official verified prescriptions.", TEAL_PRIMARY, TEAL_LIGHT)
]

card_w = Inches(2.76)
card_h = Inches(2.7)
start_y = Inches(3.9)

for i, (role_name, role_desc, role_color, role_light) in enumerate(roles_data):
    cx = Inches(0.8 + i * 2.97)
    card = create_card(s1, cx, start_y, card_w, card_h, CARD_BG, BORDER_COLOR)
    
    # Top header bar inside card
    header_band = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx + Inches(0.15), start_y + Inches(0.15), card_w - Inches(0.3), Inches(0.45))
    set_shape_flat(header_band, role_light, None)
    tf_hb = header_band.text_frame
    tf_hb.vertical_anchor = MSO_ANCHOR.MIDDLE
    p_hb = tf_hb.paragraphs[0]
    p_hb.text = role_name.upper()
    p_hb.font.name = FONT_HEADING
    p_hb.font.size = Pt(12)
    p_hb.font.bold = True
    p_hb.font.color.rgb = role_color
    p_hb.alignment = PP_ALIGN.CENTER

    # Description
    tb_desc = s1.shapes.add_textbox(cx + Inches(0.2), start_y + Inches(0.75), card_w - Inches(0.4), card_h - Inches(0.85))
    tf_d = tb_desc.text_frame
    tf_d.word_wrap = True
    tf_d.margin_left = tf_d.margin_right = tf_d.margin_top = tf_d.margin_bottom = 0
    p_d = tf_d.paragraphs[0]
    p_d.text = role_desc
    p_d.font.name = FONT_BODY
    p_d.font.size = Pt(11)
    p_d.font.color.rgb = BODY_TEXT

# Footer pill bar
f_bar = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.8), Inches(11.7), Inches(0.4))
set_shape_flat(f_bar, TEAL_LIGHT, TEAL_BORDER, 1)
tf_f = f_bar.text_frame
tf_f.vertical_anchor = MSO_ANCHOR.MIDDLE
p_f = tf_f.paragraphs[0]
p_f.text = "CORE ARCHITECTURE:  Zero-Barrier E.164 Mobile UHID  •  FDI Tooth Charting  •  Immutable Legal Prescriptions  •  Row Level Security (RLS)"
p_f.font.name = FONT_HEADING
p_f.font.size = Pt(10)
p_f.font.bold = True
p_f.font.color.rgb = TEAL_DARK
p_f.alignment = PP_ALIGN.CENTER


# =============================================================
# SLIDE 2: PROBLEM STATEMENT
# =============================================================
s2 = prs.slides.add_slide(blank_slide_layout)
add_header(s2, "Problem Statement", "CHALLENGES IN DENTAL HEALTHCARE", "Real-world operational, clinical, and data security bottlenecks addressed by DentalCare HMIS")

problems = [
    ("Fragmented & Paper-Based Patient Records",
     "Physical files, registers, and slips",
     "Clinical histories are lost or inaccessible across visits. Doctors lack longitudinal context on past tooth procedures and patient allergy history."),
    
    ("Chaotic Appointments & Queue Bottlenecks",
     "Manual booking via phone & walk-ins",
     "Double-booking doctor slots, scheduling conflicts, and untracked waiting rooms create extended patient wait times and reception friction."),
    
    ("Prescription Errors & Adverse Drug Risks",
     "Handwritten illegible prescriptions",
     "Misread medications, non-standard dosing forms, and unspotted drug contraindications jeopardize patient safety and clinical compliance."),
    
    ("Inefficient Cross-Role Communication",
     "Siloed reception, doctor & patient interactions",
     "No unified handoff mechanism between front desk check-in, dentist consultation, and patient post-visit access to their verified prescriptions."),
    
    ("Lack of Role Security & Audit Compliance",
     "Unsecured physical registers and spreadsheets",
     "Vulnerable to unauthorized alteration or data loss. Zero tamper-proof audit trails for legal accountability or regulatory data governance.")
]

card_w = Inches(11.7)
card_h = Inches(0.95)
start_y = Inches(1.75)

for i, (title, issue, impact) in enumerate(problems):
    cy = start_y + Inches(i * 1.05)
    card = create_card(s2, Inches(0.8), cy, card_w, card_h, CARD_BG, BORDER_COLOR)
    
    # Left problem box
    p_box = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.95), cy + Inches(0.12), Inches(3.6), Inches(0.71))
    set_shape_flat(p_box, AMBER_LIGHT, None)
    tf_pb = p_box.text_frame
    tf_pb.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf_pb.margin_left = Inches(0.1)
    p_pb1 = tf_pb.paragraphs[0]
    p_pb1.text = f"{i+1}. {title}"
    p_pb1.font.name = FONT_HEADING
    p_pb1.font.size = Pt(11)
    p_pb1.font.bold = True
    p_pb1.font.color.rgb = NAVY_TEXT
    
    p_pb2 = tf_pb.add_paragraph()
    p_pb2.text = f"Trigger: {issue}"
    p_pb2.font.name = FONT_BODY
    p_pb2.font.size = Pt(9.5)
    p_pb2.font.color.rgb = AMBER_ACCENT
    
    # Arrow icon/shape
    arrow = s2.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(4.7), cy + Inches(0.28), Inches(0.35), Inches(0.38))
    set_shape_flat(arrow, TEAL_PRIMARY, None)

    # Right impact box
    imp_box = s2.shapes.add_textbox(Inches(5.2), cy + Inches(0.1), Inches(7.1), Inches(0.75))
    tf_imp = imp_box.text_frame
    tf_imp.word_wrap = True
    tf_imp.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf_imp.margin_left = tf_imp.margin_right = tf_imp.margin_top = tf_imp.margin_bottom = 0
    p_imp = tf_imp.paragraphs[0]
    p_imp.text = "CLINICAL & OPERATIONAL IMPACT:"
    p_imp.font.name = FONT_HEADING
    p_imp.font.size = Pt(9)
    p_imp.font.bold = True
    p_imp.font.color.rgb = TEAL_DARK
    
    p_imp2 = tf_imp.add_paragraph()
    p_imp2.text = impact
    p_imp2.font.name = FONT_BODY
    p_imp2.font.size = Pt(11)
    p_imp2.font.color.rgb = BODY_TEXT


# =============================================================
# SLIDE 3: PROPOSED SOLUTION / ABOUT OUR APP
# =============================================================
s3 = prs.slides.add_slide(blank_slide_layout)
add_header(s3, "Our Solution — DentalCare HMIS", "COMPREHENSIVE HEALTHCARE SUITE", "An integrated, cloud-backed clinical architecture spanning specialized role portals and automated workflows")

# Tree Header Bar
tree_top = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(4.8), Inches(1.65), Inches(3.7), Inches(0.5))
set_shape_flat(tree_top, TEAL_DARK, None)
tf_tt = tree_top.text_frame
tf_tt.vertical_anchor = MSO_ANCHOR.MIDDLE
p_tt = tf_tt.paragraphs[0]
p_tt.text = "DentalCare HMIS Core Platform"
p_tt.font.name = FONT_HEADING
p_tt.font.size = Pt(13)
p_tt.font.bold = True
p_tt.font.color.rgb = RGBColor(255, 255, 255)
p_tt.alignment = PP_ALIGN.CENTER

# 4 Pillars
pillars_data = [
    ("Patient Portal",
     PURPLE_ROLE, PURPLE_LIGHT,
     [
         ("Mobile UHID Access", "Zero-friction authentication via verified mobile number"),
         ("Self-Service Booking", "Request appointments with doctor preference"),
         ("Chronological History", "View past treatments, procedures, and dates"),
         ("Digital Prescriptions", "View, print, and download official PDF prescriptions")
     ]),
    ("Reception Workflow",
     GREEN_ROLE, GREEN_LIGHT,
     [
         ("UHID Registration", "E.164 phone normalization eliminates duplicate identities"),
         ("Smart Queue System", "Real-time queue tracking (scheduled, checked-in, waiting)"),
         ("Slot Conflict Guard", "Prevents double-booking doctor time slots"),
         ("Tariff Master Data", "33 Kurnool Dental Association standardized pricing catalog")
     ]),
    ("Doctor Portal",
     BLUE_ROLE, BLUE_LIGHT,
     [
         ("Live Daily Queue", "Immediate visibility into today's assigned waiting patients"),
         ("FDI Tooth Charting", "Interactive tooth examination (quadrants 11-48)"),
         ("Medication Master", "21 pre-configured dental drugs with standardized dosage"),
         ("Immutable Rx Builder", "Legal tamper-proof prescriptions with WhatsApp share link")
     ]),
    ("Admin Controls",
     TEAL_PRIMARY, TEAL_LIGHT,
     [
         ("Staff Management", "Admin-only provisioning for Admins, Doctors & Receptionists"),
         ("Password Setup Links", "Direct secure Supabase password recovery emails sent to staff"),
         ("Test Patient Manager", "Safe cascade deletion of development & test records"),
         ("Audit Log Trail", "Tamper-proof append-only logging of all clinical actions")
     ])
]

card_w = Inches(2.76)
card_h = Inches(4.6)
start_y = Inches(2.4)

for i, (title, color, light_bg, items) in enumerate(pillars_data):
    cx = Inches(0.8 + i * 2.97)
    card = create_card(s3, cx, start_y, card_w, card_h, CARD_BG, BORDER_COLOR)
    
    # Title badge
    t_box = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx + Inches(0.15), start_y + Inches(0.15), card_w - Inches(0.3), Inches(0.45))
    set_shape_flat(t_box, light_bg, None)
    tf_b = t_box.text_frame
    tf_b.vertical_anchor = MSO_ANCHOR.MIDDLE
    p_b = tf_b.paragraphs[0]
    p_b.text = title
    p_b.font.name = FONT_HEADING
    p_b.font.size = Pt(12)
    p_b.font.bold = True
    p_b.font.color.rgb = color
    p_b.alignment = PP_ALIGN.CENTER
    
    # Sub-items
    item_y = start_y + Inches(0.75)
    for subtitle, detail in items:
        ib = s3.shapes.add_textbox(cx + Inches(0.15), item_y, card_w - Inches(0.3), Inches(0.85))
        tf_i = ib.text_frame
        tf_i.word_wrap = True
        tf_i.margin_left = tf_i.margin_right = tf_i.margin_top = tf_i.margin_bottom = 0
        p_sub = tf_i.paragraphs[0]
        p_sub.text = f"• {subtitle}"
        p_sub.font.name = FONT_HEADING
        p_sub.font.size = Pt(11)
        p_sub.font.bold = True
        p_sub.font.color.rgb = NAVY_TEXT
        
        p_det = tf_i.add_paragraph()
        p_det.text = f"  {detail}"
        p_det.font.name = FONT_BODY
        p_det.font.size = Pt(9.5)
        p_det.font.color.rgb = BODY_TEXT
        
        item_y += Inches(0.92)


# =============================================================
# SLIDE 4: FRONTEND & BACKEND / TECHNOLOGY STACK
# =============================================================
s4 = prs.slides.add_slide(blank_slide_layout)
add_header(s4, "Frontend & Backend Architecture", "TECHNOLOGY STACK VERIFICATION", "Complete technical stack verified directly from project source code and Supabase configuration")

col_w = Inches(5.7)
col_h = Inches(4.5)

# LEFT COLUMN: FRONTEND
c_left = create_card(s4, Inches(0.8), Inches(1.75), col_w, col_h, CARD_BG, BORDER_COLOR)

# Left Header Banner
h_left = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.95), Inches(1.9), col_w - Inches(0.3), Inches(0.5))
set_shape_flat(h_left, BLUE_LIGHT, None)
tf_hl = h_left.text_frame
tf_hl.vertical_anchor = MSO_ANCHOR.MIDDLE
p_hl = tf_hl.paragraphs[0]
p_hl.text = "FRONTEND ARCHITECTURE (React + Vite SPA)"
p_hl.font.name = FONT_HEADING
p_hl.font.size = Pt(12)
p_hl.font.bold = True
p_hl.font.color.rgb = BLUE_ROLE
p_hl.alignment = PP_ALIGN.CENTER

fe_items = [
    ("React 18.3 & TypeScript 5.5", "Component-driven Single Page Application with strict compile-time types for patient and clinical data structures."),
    ("Vite 5.4 Tooling", "Modern, optimized frontend bundling, hot-module replacement (HMR), and high-performance production build pipeline."),
    ("Tailwind CSS 3.4", "Responsive healthcare design system with custom medical color tokens, modern clean cards, and layout utilities."),
    ("React Router v6", "Declarative client-side routing secured by custom ProtectedRoute role-based access controllers."),
    ("Lucide React & Date-fns", "Unified medical iconography and standardized appointment/prescription timestamp manipulation.")
]

y_pos = Inches(2.55)
for title, desc in fe_items:
    tb = s4.shapes.add_textbox(Inches(1.05), y_pos, col_w - Inches(0.5), Inches(0.6))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p1 = tf.paragraphs[0]
    p1.text = f"✔ {title}"
    p1.font.name = FONT_HEADING
    p1.font.size = Pt(11)
    p1.font.bold = True
    p1.font.color.rgb = NAVY_TEXT
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.name = FONT_BODY
    p2.font.size = Pt(9.5)
    p2.font.color.rgb = BODY_TEXT
    y_pos += Inches(0.64)

# Role of frontend
tb_fr = s4.shapes.add_textbox(Inches(1.05), Inches(5.65), col_w - Inches(0.5), Inches(0.5))
tf = tb_fr.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
p = tf.paragraphs[0]
p.text = "Frontend Role: Handles UI rendering, routing, authentication state, role-based navigation guards, and interaction with backend API services."
p.font.name = FONT_BODY
p.font.size = Pt(10)
p.font.bold = True
p.font.color.rgb = TEAL_DARK

# RIGHT COLUMN: BACKEND
c_right = create_card(s4, Inches(6.8), Inches(1.75), col_w, col_h, CARD_BG, BORDER_COLOR)

# Right Header Banner
h_right = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.95), Inches(1.9), col_w - Inches(0.3), Inches(0.5))
set_shape_flat(h_right, TEAL_LIGHT, None)
tf_hr = h_right.text_frame
tf_hr.vertical_anchor = MSO_ANCHOR.MIDDLE
p_hr = tf_hr.paragraphs[0]
p_hr.text = "BACKEND & DATABASE (Supabase + PostgreSQL)"
p_hr.font.name = FONT_HEADING
p_hr.font.size = Pt(12)
p_hr.font.bold = True
p_hr.font.color.rgb = TEAL_DARK
p_hr.alignment = PP_ALIGN.CENTER

be_items = [
    ("Supabase Cloud Backend", "Cloud-hosted BaaS platform providing Auth, automated PostgREST endpoints, and PostgreSQL database hosting."),
    ("PostgreSQL 15+ Database", "9 relational tables: users, patients, appointments, consultations, prescriptions, medications, treatments, audit_logs, feedback."),
    ("Supabase Auth (GoTrue)", "Encrypted password credentials (bcrypt), email confirmation tokens, and secure JWT session state management."),
    ("Row Level Security (RLS)", "Database-enforced access policies guaranteeing that patients access only their records and staff access assigned tiers."),
    ("PostgreSQL RPCs & Triggers", "SECURITY DEFINER procedures for staff provisioning, test patient deletion, role escalation prevention, and audit logging.")
]

y_pos = Inches(2.55)
for title, desc in be_items:
    tb = s4.shapes.add_textbox(Inches(7.05), y_pos, col_w - Inches(0.5), Inches(0.6))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p1 = tf.paragraphs[0]
    p1.text = f"✔ {title}"
    p1.font.name = FONT_HEADING
    p1.font.size = Pt(11)
    p1.font.bold = True
    p1.font.color.rgb = NAVY_TEXT
    
    p2 = tf.add_paragraph()
    p2.text = desc
    p2.font.name = FONT_BODY
    p2.font.size = Pt(9.5)
    p2.font.color.rgb = BODY_TEXT
    y_pos += Inches(0.64)

# Role of backend
tb_br = s4.shapes.add_textbox(Inches(7.05), Inches(5.65), col_w - Inches(0.5), Inches(0.5))
tf = tb_br.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
p = tf.paragraphs[0]
p.text = "Backend Role: Manages authentication, authorization, persistent healthcare data, database operations, and secure server-side functionality."
p.font.name = FONT_BODY
p.font.size = Pt(10)
p.font.bold = True
p.font.color.rgb = TEAL_DARK

# Bottom Interaction Pipeline Flow
flow_box = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.45), Inches(11.7), Inches(0.65))
set_shape_flat(flow_box, CARD_BG, TEAL_PRIMARY, 1.5)
tf_fl = flow_box.text_frame
tf_fl.vertical_anchor = MSO_ANCHOR.MIDDLE
p_fl = tf_fl.paragraphs[0]
p_fl.text = "INTERACTION FLOW:   React Frontend (UI/State)  ──►  Supabase JS Client (PostgREST API)  ──►  PostgreSQL Engine (RLS & Stored RPCs)"
p_fl.font.name = FONT_HEADING
p_fl.font.size = Pt(11)
p_fl.font.bold = True
p_fl.font.color.rgb = TEAL_DARK
p_fl.alignment = PP_ALIGN.CENTER


# =============================================================
# SLIDE 5: HMIS ARCHITECTURAL FLOW DIAGRAM
# =============================================================
s5 = prs.slides.add_slide(blank_slide_layout)
add_header(s5, "System Architecture & Data Flow", "END-TO-END PIPELINE", "Complete architectural topology illustrating user portals, application services, and database layers")

# Visual Diagram Boxes
# 1. Users Layer
u_box = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.75), Inches(11.7), Inches(0.7))
set_shape_flat(u_box, TEAL_LIGHT, TEAL_PRIMARY, 1.5)
tf = u_box.text_frame
tf.vertical_anchor = MSO_ANCHOR.MIDDLE
p = tf.paragraphs[0]
p.text = "HMIS USER ECOSYSTEM:   [Patient Portal]      •      [Reception Desk]      •      [Attending Dentist]      •      [Clinic Administrator]"
p.font.name = FONT_HEADING
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = TEAL_DARK
p.alignment = PP_ALIGN.CENTER

# Down Arrow 1
arr1 = s5.shapes.add_shape(MSO_SHAPE.DOWN_ARROW, Inches(6.45), Inches(2.48), Inches(0.42), Inches(0.28))
set_shape_flat(arr1, TEAL_PRIMARY, None)

# 2. Frontend Layer
fe_box = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.8), Inches(11.7), Inches(0.85))
set_shape_flat(fe_box, CARD_BG, BORDER_COLOR, 1)
tf = fe_box.text_frame
tf.vertical_anchor = MSO_ANCHOR.MIDDLE
p = tf.paragraphs[0]
p.text = "CLIENT PRESENTATION LAYER (React 18 + TypeScript + Vite + Tailwind CSS)"
p.font.name = FONT_HEADING
p.font.size = Pt(11)
p.font.bold = True
p.font.color.rgb = NAVY_TEXT
p.alignment = PP_ALIGN.CENTER

p2 = tf.add_paragraph()
p2.text = "AuthContext Session State  •  ProtectedRoute Role Guards  •  Patient / Reception / Doctor Layouts  •  Odontogram Tooth Charting (FDI)"
p2.font.name = FONT_BODY
p2.font.size = Pt(10)
p2.font.color.rgb = BODY_TEXT
p2.alignment = PP_ALIGN.CENTER

# Down Arrow 2
arr2 = s5.shapes.add_shape(MSO_SHAPE.DOWN_ARROW, Inches(6.45), Inches(3.68), Inches(0.42), Inches(0.28))
set_shape_flat(arr2, TEAL_PRIMARY, None)

# 3. Application Services & Business Logic Layer
svc_box = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.0), Inches(11.7), Inches(0.85))
set_shape_flat(svc_box, CARD_BG, BORDER_COLOR, 1)
tf = svc_box.text_frame
tf.vertical_anchor = MSO_ANCHOR.MIDDLE
p = tf.paragraphs[0]
p.text = "APPLICATION SERVICE LAYER (TypeScript Modular Services)"
p.font.name = FONT_HEADING
p.font.size = Pt(11)
p.font.bold = True
p.font.color.rgb = NAVY_TEXT
p.alignment = PP_ALIGN.CENTER

p2 = tf.add_paragraph()
p2.text = "authService  •  patientService (UHID)  •  appointmentService (Queue)  •  consultationService  •  prescriptionService  •  userService  •  auditService"
p2.font.name = FONT_BODY
p2.font.size = Pt(10)
p2.font.color.rgb = BODY_TEXT
p2.alignment = PP_ALIGN.CENTER

# Down Arrow 3
arr3 = s5.shapes.add_shape(MSO_SHAPE.DOWN_ARROW, Inches(6.45), Inches(4.88), Inches(0.42), Inches(0.28))
set_shape_flat(arr3, TEAL_PRIMARY, None)

# 4. Supabase BaaS & API Gateway Layer
sb_box = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(5.2), Inches(11.7), Inches(0.85))
set_shape_flat(sb_box, TEAL_LIGHT, TEAL_BORDER, 1)
tf = sb_box.text_frame
tf.vertical_anchor = MSO_ANCHOR.MIDDLE
p = tf.paragraphs[0]
p.text = "SUPABASE CLOUD INFRASTRUCTURE & BACKEND GATEWAY"
p.font.name = FONT_HEADING
p.font.size = Pt(11)
p.font.bold = True
p.font.color.rgb = TEAL_DARK
p.alignment = PP_ALIGN.CENTER

p2 = tf.add_paragraph()
p2.text = "Supabase Auth (GoTrue Sessions)  •  PostgREST REST API  •  SECURITY DEFINER RPCs (provision_staff, delete_test_patient)  •  JWT Role Verification"
p2.font.name = FONT_BODY
p2.font.size = Pt(10)
p2.font.color.rgb = BODY_TEXT
p2.alignment = PP_ALIGN.CENTER

# Down Arrow 4
arr4 = s5.shapes.add_shape(MSO_SHAPE.DOWN_ARROW, Inches(6.45), Inches(6.08), Inches(0.42), Inches(0.28))
set_shape_flat(arr4, TEAL_PRIMARY, None)

# 5. Database Layer
db_box = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.4), Inches(11.7), Inches(0.8))
set_shape_flat(db_box, CARD_BG, TEAL_PRIMARY, 1.5)
tf = db_box.text_frame
tf.vertical_anchor = MSO_ANCHOR.MIDDLE
p = tf.paragraphs[0]
p.text = "POSTGRESQL RELATIONAL DATABASE (Protected by Row Level Security & Triggers)"
p.font.name = FONT_HEADING
p.font.size = Pt(11)
p.font.bold = True
p.font.color.rgb = TEAL_DARK
p.alignment = PP_ALIGN.CENTER

p2 = tf.add_paragraph()
p2.text = "public.users  •  public.patients  •  appointments  •  consultations  •  prescriptions (IMMUTABLE)  •  medications  •  treatments  •  audit_logs"
p2.font.name = FONT_BODY
p2.font.size = Pt(9.5)
p2.font.color.rgb = BODY_TEXT
p2.alignment = PP_ALIGN.CENTER


# =============================================================
# SLIDE 6: LIVE DEMO
# =============================================================
s6 = prs.slides.add_slide(blank_slide_layout)

# Generate QR Code image file
qr = qrcode.QRCode(version=1, box_size=8, border=2)
qr.add_data(APP_URL)
qr.make(fit=True)
qr_img = qr.make_image(fill_color="#0F766E", back_color="white")
qr_path = "live_demo_qr.png"
qr_img.save(qr_path)

add_header(s6, "Live HMIS — Demo", "CLOUD DEPLOYMENT", "Explore the fully operational DentalCare HMIS deployed in production")

# Main Container Card
main_card = create_card(s6, Inches(0.8), Inches(1.7), Inches(11.7), Inches(5.3), CARD_BG, BORDER_COLOR)

# Left Side: Information & Clickable Button
# Active badge
act_badge = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.3), Inches(2.05), Inches(3.2), Inches(0.4))
set_shape_flat(act_badge, GREEN_LIGHT, None)
tf = act_badge.text_frame
tf.vertical_anchor = MSO_ANCHOR.MIDDLE
p = tf.paragraphs[0]
p.text = "● LIVE SYSTEM OPERATIONAL"
p.font.name = FONT_HEADING
p.font.size = Pt(11)
p.font.bold = True
p.font.color.rgb = GREEN_ROLE
p.alignment = PP_ALIGN.CENTER

# Headline
tb_lh = s6.shapes.add_textbox(Inches(1.3), Inches(2.55), Inches(6.8), Inches(1.1))
tf = tb_lh.text_frame
tf.word_wrap = True
tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
p = tf.paragraphs[0]
p.text = "DentalCare HMIS Web Application"
p.font.name = FONT_HEADING
p.font.size = Pt(26)
p.font.bold = True
p.font.color.rgb = NAVY_TEXT

p_sub = tf.add_paragraph()
p_sub.text = "Hosted on Vercel with high-availability Supabase PostgreSQL backend. Click below to launch the live application in your browser."
p_sub.font.name = FONT_BODY
p_sub.font.size = Pt(12)
p_sub.font.color.rgb = BODY_TEXT

# BIG CLICKABLE BUTTON
btn = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.3), Inches(3.85), Inches(6.4), Inches(0.9))
set_shape_flat(btn, TEAL_DARK, None)
# Add hyperlink to shape
btn.click_action.hyperlink.address = APP_URL

tf_btn = btn.text_frame
tf_btn.vertical_anchor = MSO_ANCHOR.MIDDLE
p_btn = tf_btn.paragraphs[0]
p_btn.alignment = PP_ALIGN.CENTER

# Add hyperlinked text run
run_btn = p_btn.add_run()
run_btn.text = "➜   OPEN LIVE APPLICATION"
run_btn.font.name = FONT_HEADING
run_btn.font.size = Pt(18)
run_btn.font.bold = True
run_btn.font.color.rgb = RGBColor(255, 255, 255)
run_btn.hyperlink.address = APP_URL

# URL text below button (also clickable)
tb_url = s6.shapes.add_textbox(Inches(1.3), Inches(4.85), Inches(6.4), Inches(0.4))
tf_u = tb_url.text_frame
tf_u.margin_left = tf_u.margin_right = tf_u.margin_top = tf_u.margin_bottom = 0
p_u = tf_u.paragraphs[0]
p_u.text = "URL: "
p_u.font.name = FONT_BODY
p_u.font.size = Pt(12)
p_u.font.bold = True
p_u.font.color.rgb = MUTED_TEXT

run_url = p_u.add_run()
run_url.text = APP_URL
run_url.font.name = FONT_BODY
run_url.font.size = Pt(12)
run_url.font.bold = True
run_url.font.color.rgb = TEAL_PRIMARY
run_url.font.underline = True
run_url.hyperlink.address = APP_URL

# Personas / Roles Box
pers_box = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.3), Inches(5.35), Inches(6.4), Inches(1.35))
set_shape_flat(pers_box, TEAL_LIGHT, TEAL_BORDER, 1)
tf_p = pers_box.text_frame
tf_p.vertical_anchor = MSO_ANCHOR.MIDDLE
tf_p.margin_left = Inches(0.2)
p_p1 = tf_p.paragraphs[0]
p_p1.text = "DEMO ROLE PERSONAS AVAILABLE FOR TESTING:"
p_p1.font.name = FONT_HEADING
p_p1.font.size = Pt(10)
p_p1.font.bold = True
p_p1.font.color.rgb = TEAL_DARK

roles_info = [
    ("Administrator", "admin@dentalcare.com (Staff management, audit, test patient cleanup)"),
    ("Doctor", "dr.sharma@dentalcare.com (Consultations, FDI tooth charting, Rx builder)"),
    ("Receptionist", "receptionist@dentalcare.com (Patient registration & queue management)"),
    ("Patient", "rahul.kumar@dentalcare.com (Appointments & prescription downloads)")
]
for r_title, r_detail in roles_info:
    p_item = tf_p.add_paragraph()
    p_item.text = f"• {r_title}: {r_detail}"
    p_item.font.name = FONT_BODY
    p_item.font.size = Pt(9)
    p_item.font.color.rgb = BODY_TEXT

# Right Side: QR Code Card
qr_card = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.3), Inches(2.05), Inches(3.8), Inches(4.65))
set_shape_flat(qr_card, TEAL_LIGHT, TEAL_BORDER, 1)

# Add QR code image
qr_img_shape = s6.shapes.add_picture(qr_path, Inches(8.8), Inches(2.4), Inches(2.8), Inches(2.8))
qr_img_shape.click_action.hyperlink.address = APP_URL

# QR Code text
tb_qr = s6.shapes.add_textbox(Inches(8.5), Inches(5.35), Inches(3.4), Inches(1.1))
tf_qr = tb_qr.text_frame
tf_qr.word_wrap = True
tf_qr.margin_left = tf_qr.margin_right = tf_qr.margin_top = tf_qr.margin_bottom = 0

p_q1 = tf_qr.paragraphs[0]
p_q1.text = "SCAN WITH MOBILE CAMERA"
p_q1.font.name = FONT_HEADING
p_q1.font.size = Pt(11)
p_q1.font.bold = True
p_q1.font.color.rgb = TEAL_DARK
p_q1.alignment = PP_ALIGN.CENTER

p_q2 = tf_qr.add_paragraph()
p_q2.text = "Direct mobile access to test the responsive Patient & Staff Portals"
p_q2.font.name = FONT_BODY
p_q2.font.size = Pt(10)
p_q2.font.color.rgb = BODY_TEXT
p_q2.alignment = PP_ALIGN.CENTER

# Save presentation
output_pptx = "DentalCare_HMIS_Presentation.pptx"
prs.save(output_pptx)
print(f"Presentation successfully generated and saved to {output_pptx}")
