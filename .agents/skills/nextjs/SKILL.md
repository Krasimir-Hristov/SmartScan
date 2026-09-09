---
name: nextjs-frontend
description: Master frontend engineering standard for Next.js 16 (App Router), React 19, Tailwind CSS v4, Motion micro-interactions, No-Middleware proxy.ts, and Mobile-First responsive design.
---

# Next.js 16, React 19 & Tailwind v4 Master Frontend Skill

This skill defines the authoritative architecture, component paradigms, mobile ergonomics, and styling rules for the frontend subsystem, strictly verified via Context7 and official Next.js 16 / Tailwind v4 documentation.

---

## 1. Component vs Function Architecture Standards

### A. React Components ➔ ЗАДЪЛЖИТЕЛНО Arrow Functions
All React components MUST be defined using typed arrow functions. The `function` keyword is strictly prohibited for components.
```typescript
interface WifiCardProps {
  ssid: string;
  password: string;
}

// ПРАВИЛНО:
export const WifiCard: React.FC<WifiCardProps> = ({ ssid, password }) => {
  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{ssid}</h3>
      <p className="text-sm text-zinc-500">{password}</p>
    </div>
  );
};
```

### B. Pure Logic, Helpers & Data Access (DAL) ➔ Нормални функции (`function`)
Pure utility functions, formatters, and server-side Data Access Layer (DAL) queries MUST be defined as regular named functions for clear stack traces and separation from UI components.
```typescript
// Чисти помощни функции:
export function formatPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

// Data Access Layer (DAL):
export async function getSpaceBySlug(slug: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw new Error(`Space not found: ${error.message}`);
  return data;
}
```

---

## 2. Next.js 16 (App Router) Asynchronous Page Props

> [!IMPORTANT]
> **Next.js 16 Breaking Change:** `params` and `searchParams` are asynchronous `Promise` objects. Never access `params.slug` directly without `await` or React `use()`.

### A. Thin Route Page (`app/stay/[slug]/page.tsx`)
```typescript
import { StayExperience } from '@/features/stay';

interface StayPageProps {
  params: Promise<{ slug: string }>;
}

const StayPage: React.FC<StayPageProps> = async ({ params }) => {
  // Await the Promise before accessing properties
  const { slug } = await params;

  return (
    <main className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <StayExperience slug={slug} />
    </main>
  );
};

export default StayPage;
```

---

## 3. Tailwind CSS v4 Standards & Desktop `cursor-pointer` Rule

### A. Желязно правило за интерактивни бутони (`cursor-pointer`)
> [!WARNING]
> **CRITICAL UI STANDARD (NO MISSING CURSORS):**
> Всички `<button>`, кликаеми карти, табове и интерактивни елементи ЗАДЪЛЖИТЕЛНО имат клас `cursor-pointer`. При деактивирано състояние се добавя `disabled:cursor-not-allowed`.

```tsx
<button
  type="button"
  aria-label="Копирай паролата за Wi-Fi"
  onClick={handleCopy}
  className="inline-flex items-center justify-center cursor-pointer rounded-xl px-4 py-2.5 bg-zinc-900 text-white font-medium hover:bg-zinc-800 active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-50"
>
  Копирай парола
</button>
```

### B. Tailwind v4 Gradients
Use the new Tailwind v4 `bg-linear-to-*` and `bg-linear-<angle>` syntax instead of legacy `bg-gradient-to-*`.
```html
<!-- ПРАВИЛНО (Tailwind v4): -->
<div class="bg-linear-to-b from-zinc-900 to-zinc-950"></div>
<div class="bg-linear-to-r from-emerald-500 to-teal-600"></div>
<div class="bg-linear-45 from-indigo-500 via-purple-500 to-pink-500"></div>

<!-- ГРЕШНО (v3): bg-gradient-to-b, bg-gradient-to-r -->
```

---

## 4. Mobile-First Responsive Engineering

Since 95%+ of guests scan QR codes on mobile smartphones, mobile ergonomics take absolute priority:

1. **Динамичен Viewport (`100dvh`) & Safe Areas:**
   - Always use `min-h-dvh` / `h-dvh` instead of `h-screen` / `100vh` to prevent jumping when browser URL bars expand/collapse.
   - Use `pt-[env(safe-area-inset-top)]` and `pb-[env(safe-area-inset-bottom)]` for edge-to-edge screens.
2. **Зона за докосване (Touch Targets):**
   - Minimum tap target: `44x44px` (`min-h-[44px] min-w-[44px]`).
   - Mobile inputs must have `text-base` (16px) minimum to prevent automatic iOS Safari zoom.
3. **Елегантен десктоп контейнер:**
   - When opened on large desktop screens, wrap the mobile guest experience in a sleek phone container:
     ```html
     <div class="w-full max-w-md mx-auto min-h-dvh bg-white dark:bg-zinc-900 shadow-2xl">
       ...
     </div>
     ```
4. **Хаптична обратна връзка (Haptic Feedback):**
   - Provide tactile confirmation on critical actions (copying Wi-Fi, starting navigation):
     ```typescript
     export function triggerHaptic(durationMs = 50): void {
       if (typeof window !== 'undefined' && 'vibrate' in navigator) {
         navigator.vibrate(durationMs);
       }
     }
     ```

---

## 5. Strict No-Middleware Architecture & `proxy.ts`

> [!CAUTION]
> **Strict No-Middleware Policy:** Do not create `middleware.ts`. All proxying, header scrubbing, and CVE-2025-29927 mitigations must reside in `src/lib/proxy.ts`.

### `src/lib/proxy.ts` (FastAPI Proxy & Header Scrubbing)
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function proxyToBackend(request: NextRequest, targetPath: string): Promise<NextResponse> {
  const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000';
  const url = new URL(targetPath, backendUrl);
  url.search = request.nextUrl.search;

  // Defensive Header Filtering (CVE-2025-29927 Mitigation)
  const cleanHeaders = new Headers(request.headers);
  for (const [key] of request.headers.entries()) {
    if (key.toLowerCase().startsWith('x-')) {
      cleanHeaders.delete(key);
    }
  }

  try {
    const backendResponse = await fetch(url.toString(), {
      method: request.method,
      headers: cleanHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.blob() : undefined,
    });

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: backendResponse.headers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Backend service temporarily unavailable' },
      { status: 502 }
    );
  }
}
```

---

## 6. Motion Micro-Interactions (`npm install motion`)

Use lightweight micro-animations to create an ultra-smooth, premium boutique feel without lag.

```tsx
'use client';

import { motion } from 'motion/react';

export const FadeInCard: React.FC<{ children: React.ReactNode; index?: number }> = ({ children, index = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: 'easeOut' }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
};
```

---

## 7. State & Data Fetching (TanStack Query)
- **Пълна забрана за `fetch` вътре в `useEffect`**.
- All client-side queries use `useQuery` with structured query keys: `['space', slug]`.
- Mutations use `useMutation` with optimistic UI updates for instant feedback.

---

## 8. Internationalization (next-intl 10-Locale Standard)

The platform supports 10 key tourism markets with automatic English fallback:
```typescript
// src/i18n/config.ts
export const locales = ['en', 'bg', 'ro', 'el', 'ru', 'tr', 'de', 'es', 'it', 'fr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
```

- **Language Switcher in Navbar:** Must be present in the header of the landing page and dashboard.
- **Graceful Fallback:** Any unsupported visitor language (e.g. `ja`, `ar`, `pl`) seamlessly falls back to `defaultLocale` (`'en'`).

