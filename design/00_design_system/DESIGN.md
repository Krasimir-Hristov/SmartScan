# Design System: Obsidian Alpine Concierge

## 1. Brand Identity & Visual Philosophy
- **Aesthetic**: *Obsidian High-Tech Luxury* — combines deep space black, smoked frosted glass, and cyber emerald luminescence (`#10B981`).
- **Zero-Image Rule (MVP)**: Strictly **NO photos or raster artwork** in the guest mobile PWA or host core UI to guarantee sub-200ms load times and zero monthly cloud storage costs.
- **Visual Richness**: Generated entirely via CSS backdrop filters (`backdrop-blur-md`), hairline borders (`rgba(255, 255, 255, 0.08)`), micro-gradients (`bg-linear-to-r`), and clean geometric typography.
- **Stitch MCP Reference**: Project ID `8895207196413320667`, Asset `assets/1b7408b177b64c67b1bc0ecbd8776541`.

---

## 2. Color Tokens (Hex, RGB & Tailwind v4)

| Role | Token Name | Hex Value | CSS / Tailwind Class | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas Deep** | `--color-canvas` | `#09090B` | `bg-[#09090b]` | Deep base background |
| **Surface Card** | `--color-surface` | `#121216` | `bg-[#121216]/78` + `backdrop-blur-xl` | Smoked Bento cards & modals |
| **Surface Elevated** | `--color-elevated` | `#18181B` | `bg-[#18181b]` | Badges, input containers, secondary cards |
| **Primary Emerald** | `--color-primary` | `#10B981` | `text-emerald-500` / `bg-emerald-500` | Primary action buttons & brand identity |
| **Secondary Forest**| `--color-secondary`| `#059669` | `to-emerald-600` | Anchor for button linear gradients |
| **Cyber Mint** | `--color-mint` | `#4EDEA3` | `text-[#4edea3]` / `border-[#4edea3]/40`| Glowing borders & active state rings |
| **Text High Contrast**| `--color-text-high`| `#FFFFFF` / `#F4F4F5` | `text-white` / `text-zinc-100` | Primary headlines & card titles |
| **Text Muted** | `--color-text-muted`| `#A1A1AA` | `text-zinc-400` | Secondary descriptions, timestamps |
| **Emergency Red** | `--color-emergency`| `#EF4444` | `bg-red-950/30 text-red-400 border-red-500/30` | 112 emergency calls |

### Tailwind v4 Gradient Standard
- Always use Tailwind v4 syntax: `bg-linear-to-r from-emerald-500 to-emerald-600` (replaces deprecated `bg-gradient-to-r`).

---

## 3. Typography Hierarchy

| Style Level | Font Family | Size / Line Height | Weight | Tailwind Classes |
| :--- | :--- | :--- | :--- | :--- |
| **Display Hero** | Space Grotesk | `48px` / `52px` (Mobile: `36px`/`40px`) | `700` Bold | `font-display text-3xl sm:text-4xl font-bold tracking-tight` |
| **Headline LG** | Space Grotesk | `32px` / `38px` (Mobile: `26px`/`32px`) | `600` SemiBold | `font-display text-2xl font-semibold tracking-tight` |
| **Headline MD** | Space Grotesk | `22px` / `28px` | `500` Medium | `font-display text-lg sm:text-xl font-medium` |
| **Title SM** | Manrope | `18px` / `24px` | `600` SemiBold | `font-sans text-lg font-semibold` |
| **Body Regular** | Manrope | `14px` / `20px` | `400` Regular | `font-sans text-sm text-zinc-300 leading-relaxed` |
| **Label / Code** | JetBrains Mono | `12px` / `16px` | `500` Medium | `font-mono text-xs tracking-wider uppercase` |
| **Micro Caps** | JetBrains Mono | `10px` / `14px` | `600` SemiBold | `font-mono text-[10px] tracking-widest uppercase` |

---

## 4. Component States & Cursor Standard

> [!IMPORTANT]
> **Mandatory Desktop Cursor Standard:**
> Tailwind v4 preflight does **NOT** enforce `cursor: pointer` on button elements. Every `<button>`, clickable card, toggle, or interactive element **MUST** explicitly include the `cursor-pointer` class (and `disabled:cursor-not-allowed` when disabled).

### A. Primary Action Button (Emerald Glow)
- **Default**: `cursor-pointer px-5 py-3 rounded-xl bg-linear-to-r from-emerald-500 to-emerald-600 text-black font-display font-semibold text-sm shadow-[0_4px_20px_-2px_rgba(16,185,129,0.35)] transition-all`
- **Hover**: `hover:brightness-110 hover:shadow-[0_0_24px_rgba(16,185,129,0.5)]`
- **Active / Pressed**: `active:scale-[0.98] ring-2 ring-emerald-400`
- **Disabled**: `disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none`

### B. Secondary Button (Smoked Border)
- **Default**: `cursor-pointer px-4 py-2.5 rounded-xl bg-[#18181b] text-zinc-200 font-medium text-sm border border-white/10 transition-all`
- **Hover**: `hover:bg-[#201f22] hover:text-white hover:border-emerald-500/40`
- **Disabled**: `disabled:cursor-not-allowed disabled:opacity-40`

### C. Ghost / Outline Button
- **Default**: `cursor-pointer px-4 py-2.5 rounded-xl bg-transparent text-emerald-400 font-medium text-sm border border-emerald-500/30 transition-all`
- **Hover**: `hover:bg-emerald-500/10 hover:border-emerald-500/60`

### D. Telemetry Chips & Badges
- **Live AI Online**: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono` with a 6px pulsing emerald dot.
- **Time/Quiet Hours**: `inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 border border-white/10 text-zinc-300 text-xs font-mono`.

---

## 5. Mobile Layout & Safe Zones
- **Max Container Width**: `480px` centered on desktop/tablets with dark obsidian borders.
- **Safe Area Bottom**: `calc(env(safe-area-inset-bottom, 0px) + 5rem)` for floating action and chat bar.
- **Haptic Vibration**: `navigator.vibrate?.(50)` upon 1-click credential copying.
