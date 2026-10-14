# Стъпка 13: Cookie Consent Banner & Политика за бисквитките (Куки ТТ)

> **Статус**: 🟢 Завършена и слята в `main` (commit `1228a38` и `c119b8f`)  
> **Дата на завършване**: 12 октомври 2026 г.  
> **Нормативна рамка**: Регламент (ЕС) 2016/679 (GDPR чл. 6 и чл. 7), Директива 2002/58/ЕО (ePrivacy Directive чл. 5(3)).  
> **Референтни документи**: [`ROADMAP.md`](../../ROADMAP.md), [`AGENTS.md`](../../AGENTS.md), [`docs/README.md`](../README.md).

---

## 1. Резюме и Правна рамка (Regulatory Framework)

SmartScan Stay оперира като мулти-тенант SaaS платформа за луксозни ваканционни имоти, вили и апартаменти в Европейския съюз. Съгласно европейското законодателство за защита на данните и електронната неприкосновеност:

1. **Директива за правото на неприкосновеност на личния живот в електронните комуникации (ePrivacy Directive, чл. 5(3))**:
   - Строго необходимите бисквитки (Strictly Necessary Cookies) за функциониране на услугата не изискват предварително съгласие.
   - Всички незадължителни, аналитични или рекламни бисквитки изискват изрично, информирано и свободно дадено предварително съгласие (*Opt-in*).
2. **Общ регламент за защита на данните (GDPR чл. 6(1)(a) и чл. 7)**:
   - Отказът от незадължителни бисквитки не трябва да блокира или ограничава достъпа до основната услуга.
   - Бутонът за отказ или приемане само на задължителни бисквитки трябва да бъде толкова лесно достъпен, колкото и бутонът за приемане на всички („Equal Prominence“ стандарт на Европейския комитет по защита на данните - EDPB).
3. **Стандарт за нулев рекламен трекинг (Zero-Marketing Policy)**:
   - В SmartScan Stay категорично не се използват маркетинг пиксели на трети страни (Google AdSense, Meta Pixel, TikTok Pixel, Criteo).
   - Гостите в мобилното PWA (`/stay/[slug]`) не се профилират и не се проследяват между различни посещения.

---

## 2. Класификация на използваните бисквитки и съхранение

| Име на ресурс | Тип / Слой | Продължителност | Предназначение | Задължителен статус |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_LOCALE` | Cookie (Http / Lax) | 365 дни | Запомня избрания език от потребителя измежду 10-те туристически локала (`en`, `bg`, `de`, `ro`, `el`, `ru`, `tr`, `es`, `it`, `fr`). | **Строго необходима** (ePrivacy exempt) |
| `sb-*-auth-token` | Cookie (HttpOnly / Secure) | Сесия / 30 дни | Криптиран JWT токен за автентикация на хазяина през Supabase Auth & Google OAuth 2.0. | **Строго необходима** (ePrivacy exempt) |
| `smartscan_proxy_shield` | Cookie / Header | Сесия | Вътрешен защитен валидационен токен за прокси слоя срещу CVE-2025-29927. | **Строго необходима** (ePrivacy exempt) |
| `smartscan_cookie_consent` | LocalStorage / Cookie | 180 дни | Съхранява потребителския избор за бисквитки (`all` или `essential`). | **Строго необходима** (Съхранява съгласието) |
| `smartscan_recent_space` | LocalStorage | 90 дни | Запомня последния активен `space_id` в Дашборда за бързо превключване. | **Функционална** |

---

## 3. Архитектура на модул `src/features/cookies/`

```text
frontend/src/
├── app/
│   ├── cookies/
│   │   └── page.tsx           # Асинхронен Next.js 16 route с generateMetadata()
│   └── layout.tsx             # Root Layout с инжектиран <CookieConsentBanner />
│
└── features/cookies/
    ├── components/
    │   ├── CookieConsentBanner.tsx # Плаващ Obsidian банер за съгласие с анимации
    │   └── CookieAuditTable.tsx    # Интерактивна одит таблица с категории бисквитки
    ├── hooks/
    │   └── useCookieConsent.ts     # Хук за управление на избора и съгласието
    ├── lib/
    │   └── cookieUtils.ts          # Четене, запис и слушател за отваряне на настройките
    ├── types/
    │   └── cookieTypes.ts          # ConsentChoice ('all' | 'essential'), CookieAuditItem
    └── index.ts                    # Barrel Export (CookieConsentBanner, triggerCookieSettings)
```

---

## 4. Ключови компоненти и функционалности

### 4.1. Cookie Consent Banner ([`CookieConsentBanner.tsx`](file:///d:/myProjects/smart_scan/frontend/src/features/cookies/components/CookieConsentBanner.tsx))
- **Разположение**: Фиксиран плаващ банер в долната част на екрана (`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 sm:max-w-md z-50`).
- **Obsidian High-Tech Luxury стил**:
  - Фоново стъкло `#09090b` с `backdrop-blur-xl`, бордюр `border-emerald-500/20` и акцентен горен бордюр `bg-linear-to-r from-emerald-500/40 via-teal-500/40 to-transparent`.
  - SVG икона `Cookie` от `lucide-react` с изумруден цвят.
- **Equal Prominence бутони**:
  - `Приеми всички` (`Accept All`): `bg-linear-to-r from-emerald-400 to-teal-500 text-zinc-950 font-bold`.
  - `Само задължителни` (`Essential Only`): `bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10`.
  - Равен визуален размер и достъпност с `cursor-pointer`.
- **Разгъване на детайли**:
  - Бутон „Персонализирай / Детайли“ за разгъване на подробните категории бисквитки и изрично потвърждение на нулевия рекламен трекинг.

### 4.2. Интерактивна одит таблица ([`CookieAuditTable.tsx`](file:///d:/myProjects/smart_scan/frontend/src/features/cookies/components/CookieAuditTable.tsx))
- Вградена в страницата [`/cookies`](file:///d:/myProjects/smart_scan/frontend/src/app/cookies/page.tsx).
- Показва всяка бисквитка, провайдър, техническо предназначение, продължителност и категория (Strictly Necessary vs Functional).
- Напълно преведена на 10-те европейски туристически езика.

### 4.3. Управление на съгласието и Повторно отваряне
- Съхранение в `smartscan_cookie_consent` за 180 дни (6 месеца).
- Бутон **„Настройки за бисквитки“** във футъра ([`LandingFooter.tsx`](file:///d:/myProjects/smart_scan/frontend/src/features/landing/components/LandingFooter.tsx)) извиква `triggerCookieSettings()`, което отваря банера повторно за промяна на избора по всяко време съгласно чл. 7(3) от GDPR.

---

## 5. Верификация и резултати от тестовете

- **TypeScript (`npx tsc --noEmit`)**: 0 грешки.
- **ESLint**: 0 грешки.
- **Next.js Production Build**: Страницата `/cookies` и банерът се компилират чисто в статични и динамични маршрути.
- **GDPR & ePrivacy съвместимост**: Проверена Equal Prominence на бутоните и 100% блокиране на външни тракери.
