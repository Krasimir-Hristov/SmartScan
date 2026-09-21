# Design Spec: 02_qr_print_plate (Acrylic Tabletop Print Plate)

> **Superseded by the final Step 8 requirements (19.09.2026):**
> - The default and primary format is **A4 (210 × 297 mm)** — the European home/office standard. A5 (148 × 210 mm) and A6 (105 × 148 mm) remain available for acrylic stands.
> - The plaque face is **guest-only and minimal**: no Wi-Fi credentials, no phone numbers, no WhatsApp, no physical address and **no technical labels** (the old `A5 Print Spec · 300 DPI` footer is forbidden).
> - Those critical details are delivered instantly by the digital PWA guide after scanning the QR code.
> - Flags are **pure vector SVG** (`flag-icons` in the DOM preview, react-pdf `<Svg>` primitives in the PDF). Emoji are forbidden anywhere on the plaque.

- **Platform / Medium**: Physical Acrylic Stand / Print Plaque (A4 default; A5 / A6 optional, portrait)
- **Aesthetic**: Obsidian High-Tech Luxury (Matching `design/00_design_system`) for the dark acrylic theme, plus a Paper-Friendly Light theme for standard printers
- **Print Resolution**: Vector-first — the QR code and the flags are embedded as true vector geometry; raster fallbacks are 1024–1200 px (≈430+ DPI at A4)
- **Target Location**: Bedside table, living room coffee table, or entryway console

---

## Visual Preview
![QR Code Guest Print Plate](qr_print_plate.png)

> ⚠️ The PNG mockup above is an early A5-era concept (it still shows Wi-Fi/contacts). The shipped plaque is A4-first, credential-free and label-free as described below.

---

## 1. Color Palette Tokens

| Token | HEX / Value | Role |
|---|---|---|
| `plate-canvas` | `#09090B` | Obsidian deep black base plate background (Dark theme) |
| `card-surface` | `#121216` | Frosted smoky acrylic inner container cards |
| `card-border` | `rgba(255, 255, 255, 0.08)` | 1px crisp subtle hairline border |
| `accent-emerald` | `#10B981` | Cyber Emerald (QR brackets, brand badge, language codes) |
| `accent-emergency` | `#EF4444` | Reserved for in-PWA emergency escalation (not printed on the plaque) |
| `qr-surface` | `#FFFFFF` | Ultra-crisp high-contrast QR code surface for instant camera scan |
| `text-primary` | `#FFFFFF` / `#09090B` | Property name (dark / light theme) |
| `text-secondary` | `#D4D4D8` / `#3F3F46` | Language callouts and subtitles |
| `text-muted` | `#71717A` | Metadata and neutral subtitles (never technical print specs) |

---

## 2. Component Hierarchy

### A. Plate Header (Brand Identity)
- **Corner Mounts**: 4 subtle corner screw/bolt accents for realistic tabletop acrylic plaque feel.
- **Brand Badge**: `SMARTSCAN STAY` pill in Cyber Emerald (`#10B981`) with a vector sparkle icon.
- **Property Title**: `VILLA PIRIN` (bold display font, uppercase, tracking-tight, max. 2 lines).
- **Subtitle**: `DIGITAL GUEST GUIDE & 24/7 AI CONCIERGE`.
- **No tagline pill, no emoji, no technical labels on the face.**

### B. Hero QR Code Card (Center Focal Point)
- **Framing**: Bento card with Cyber Emerald targeting corner brackets (`[ ]`).
- **QR Code**: Centered high-contrast QR square (error correction level **H**, 4-module quiet zone, **no overlaid logo**), readable from 1.5–2 meters. The PDF embeds the module-exact geometry as true vector (`<Svg><Path/></Svg>`), with a 1200 px PNG fallback.
- **Call to Action**: `POINT CAMERA TO SCAN` (`#10B981` emerald accent, uppercase mono).
- **Language instructions**: 10 guest-facing callouts (EN, BG, DE, RO, EL / RU, TR, ES, IT, FR) — each one with a **pure vector flag** and a one-line invitation to scan for Wi-Fi, the digital guide and the 24/7 AI concierge.

### C. Wi-Fi, Emergency & Host Contacts — moved to the digital PWA
- **Not printed on the plaque.** Wi-Fi credentials, `112`, WhatsApp, phone numbers, the keybox code and the property address are served by the guest PWA (`/stay/[slug]`) instantly after scanning the QR code.
- Rationale: the physical plaque stays clean, luxury-looking and **leak-free** (no credentials in hotel rooms, no re-printing when a password rotates).

### D. Print Plate Footer — removed
- Any `SmartScan Stay · Digital Concierge System` / `A5 Print Spec · 300 DPI` footer was **removed by explicit product decision**.
- The only brand element on the face is the `SMARTSCAN STAY` badge above the property name.

---

## 3. Frontend & Print Implementation Notes (`@react-pdf/renderer`)
- Rendered from the Host Dashboard (`design/03_host_dashboard`) via `QrPrintModal`:
  - Output formats supported: **A4 (210 × 297 mm, default)**, A5 (148 × 210 mm) and A6 (105 × 148 mm).
  - The QR code is extracted from the live preview as module-exact vector geometry and embedded with `<Svg viewBox><Path/></Svg>`; the 1200 px PNG is used only as a fallback.
  - The 10 language flags are drawn with react-pdf SVG primitives (`PlaquePdfFlag`) — no emoji, no raster flag assets.
  - Both **Obsidian Dark Luxury** and **Paper-Friendly Light** themes are available; local Unicode Roboto (Latin + Cyrillic + Greek) is bundled in `frontend/public/fonts/`.
  - Direct browser printing uses a real print stylesheet: `@page { size: <format>; margin: 0 }`, `print-color-adjust: exact` and a `transform: scale()` of the 1:1 design box, so the paper output matches the on-screen WYSIWYG preview.
  - The QR link always encodes the canonical public origin (`NEXT_PUBLIC_SITE_URL`, falling back to the validated request host) — never a localhost or preview deployment URL.
