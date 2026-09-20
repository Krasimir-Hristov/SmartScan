# Стъпка 8: Физически QR Табелки за печат (A4/A5/A6) & Векторен PDF Генератор

> **Статус**: 🟢 Завършена (вкл. финален hardening от ревюто)  
> **Дата на завършване**: 19 септември 2026 г.  
> **Дизайн & Архитектурни референции**: [`design/02_qr_print_plate/DESIGN.md`](file:///d:/myProjects/smart_scan/design/02_qr_print_plate/DESIGN.md), [`AGENTS.md`](file:///d:/myProjects/smart_scan/AGENTS.md) (Секции 3, 4, 6, 7).  
> **Свързани документи**: [`ROADMAP.md`](file:///d:/myProjects/smart_scan/ROADMAP.md) (Стъпка 8), [`docs/README.md`](file:///d:/myProjects/smart_scan/docs/README.md).

---

## 1. Резюме на Стъпката

### Стъпка 8А — Интерактивен модал & истински WYSIWYG преглед

- **Портал-базиран модал** (`PlaqueModalShell`): `createPortal(document.body)`, Escape за затваряне, focus trap и възстановяване на фокуса към бутона „Печат на табелка“.
- **Основен формат по подразбиране A4 (210 × 297 mm)**, с опции A5 (148 × 210 mm) и A6 (105 × 148 mm). Всеки формат има собствен строго типизиран `PlaquePrintSpec`: mm размери, design width/padding в CSS px, размер на QR-а и Tailwind клас.
- **Две теми**: **Paper-Friendly Light** (по подразбиране — бял фон, пестене на мастило) и **Obsidian Dark Luxury** (`#09090b` + изумрудени акценти + бяла QR повърхност).
- **10 туристически езика** (EN, BG, DE, RO, EL, RU, TR, ES, IT, FR) с **векторни SVG знамена** (`flag-icons`) и кратки призиви към госта. **Нула емоджита.**
- **Нула критични данни на лицето**: без Wi-Fi парола, телефони, WhatsApp, адрес и сейф код — те се зареждат моментално в PWA гида след сканиране. Без технически надписи („Print spec 300 DPI“ е забранен).
- **Самостоятелен PNG QR код** (1024 × 1024) с **quiet zone от 4 модула**, файл `SmartScan_[slug]_QR_1024px.png`.
- **Директен печат с истински печатни стилове**:
  - `@page { size: <формат>; margin: 0 }` — динамичен размер на страницата според избрания формат;
  - `print-color-adjust: exact` — тъмният фон и SVG знамената се отпечатват (иначе Chrome ги премахва и тъмната тема излиза невидима);
  - табелката е `position: fixed` на `0,0` с mm-точни размери и се мащабира с `transform: scale()` от 1:1 design box → резултатът на хартия е идентичен с прегледа и **няма втора празна страница**;
  - safety фактор `0.995` срещу sub-pixel overflow при закръгляне.

### Стъпка 8Б — Векторен PDF генератор

- Декларативен документ с `@react-pdf/renderer`, зареждан динамично на клиента (`ssr: false`).
- Точни размери в типографски точки: A4 `595.28 × 841.89 pt`, A5 `419.53 × 595.28 pt`, A6 `297.64 × 419.53 pt`.
- **Истински векторен QR код**: модулната геометрия (`viewBox` + единствен `<path d>`) се извлича от живия QR SVG и се вгражда като `<Svg><Path/></Svg>`. При липса на геометрия се ползва 1200 px PNG fallback (≈430 DPI при A4).
- **Векторни знамена в PDF-а** (`PlaquePdfFlag`) за всичките 10 езика — GB, BG, DE, RO, GR, RU, TR, ES, IT, FR, рисувани с react-pdf примитиви (`Rect`, `Line`, `Circle`, `Polygon`). Без растер, без емоджита, без външни assets.
- **Локални Unicode шрифтове** `public/fonts/Roboto-Regular.ttf` и `Roboto-Bold.ttf` (Latin + Cyrillic + Greek). Регистрират се **само от локален път** (без CDN) и хифенацията е изключена, за да не се пренасят думи в чужд език.
- **Сваляне на готов файл**: `SmartScan_[slug]_[format]_[theme].pdf`.

### Финален hardening (след прегледа на кода)

- **Каноничен публичен домейн в QR кода**: `NEXT_PUBLIC_SITE_URL` → валидиран request host (`x-forwarded-host`, regex-проверка), резолвнат в server component и подаден надолу по веригата (`DashboardPage` → `SpaceEditor` → `QrPrintModal`). Ако линкът сочи локален/preview адрес, UI показва предупреждение — физическа табелка не бива да се печата с невалиден URL.
- **Ясна обратна връзка при грешки**: `qrError` и `pdfError` + локализиран PDF skeleton (преди беше тих `console.error`).
- **Единен източник на истина** `lib/plaqueConfig.ts` (езици, знамена, формати, размери, чисти helper-и) — премахнато е дублирането между preview-то и PDF-а.
- **Стилове и метрики на PDF-а** са изнесени в `lib/plaquePdfStyles.ts`; всички нови файлове са **под 300 реда** (спазва CodeRabbit политиката).
- **Премахнат неизползван emoji ключ** `flag` от `lib/i18n/config.ts` (0 емоджита в кода).
- **`PropertyCard.tsx` отклонение**: планът предвиждаше бутон и там, но компонентът е неизползван mock без реални `Space` данни; бутонът остава само в `SpaceEditor.tsx`.


---

## 2. Архитектура на компонентите

```text
frontend/src/features/dashboard/
├── lib/
│   ├── plaqueConfig.ts             # Единен източник: 10 езика, формати, размери, чисти helper-и
│   ├── plaquePdfStyles.ts          # Палитра + метрики по формат + memoized StyleSheet
│   └── qrCode.ts                   # Извличане на векторния QR, 1024/1200px растер, сваляне
│
├── hooks/
│   ├── useQrGenerator.ts           # PNG експорт, QR payload за PDF, window.print()
│   └── useModalFocus.ts            # Focus trap + възстановяване на фокуса
│
├── components/
│   ├── PlaqueVisualPreview.tsx     # 1:1 design box + CSS променливи за печат (A4/A5/A6, Light/Dark)
│   ├── QrPrintModal.tsx            # Тънък оркестратор: state + композиция (под 200 реда)
│   ├── SpaceEditor.tsx             # Бутон „Печат на табелка“ + подаване на canonicalOrigin
│   └── qr-print/
│       ├── PlaqueModalShell.tsx    # Portal, print stylesheet (@page), header, focus trap
│       ├── PlaqueFormatControls.tsx# Избор на формат и тема
│       ├── PlaqueGuestLinkField.tsx# Линк за госта + копиране + предупреждение за локален домейн
│       ├── PlaqueActionButtons.tsx # Печат, PNG експорт, PDF бутон + error/skeleton състояния
│       ├── PlaquePdfDocument.tsx   # Декларативен PDF документ (векторен QR + знамена)
│       ├── PlaquePdfFlag.tsx       # 10 векторни знамена с react-pdf SVG примитиви
│       └── PlaquePdfDownloadButton.tsx # Асинхронен PDF експорт + обратна връзка
│
└── index.ts                        # Публичен Barrel Export (QrPrintModal, PlaqueVisualPreview, типове)
```

---

## 3. Ключови инварианти (не нарушавай при бъдещи промени)

1. **QR селекторът е `#plaque-qr-svg`** (константа `PLAQUE_QR_ID`) — никога не се търси „първият SVG в табелката“ (той е иконката в бадж-а).
2. **Печатният контейнер е `#printable-plaque`** (константа `PLAQUE_PRINT_ID`) и публикува CSS променливите `--plaque-design-w/-h`, `--plaque-print-padding`, `--plaque-print-scale`.
3. **Quiet zone = 4 модула** (`marginSize={QR_QUIET_ZONE_MODULES}`) и `level="H"`, без overlay лого.
4. **PDF-ът не зависи от интернет** — само локални шрифтове; векторен QR с растерен fallback.
5. **Лицето на табелката не съдържа чувствителни данни** и не съдържа технически надписи.
6. **QR линкът винаги ползва каноничния домейн**, а не `window.location.origin` (освен като последен fallback в dev).

---

## 4. Резултати от верификацията

1. **TypeScript**: `npx tsc --noEmit` ➔ 0 грешки.
2. **ESLint 9**: `npm run lint` ➔ 0 грешки, 0 предупреждения.
3. **Next.js 16 Production Build**: `npm run build` ➔ успешно (Turbopack, App Router, всички рутове).
4. **i18n паритет**: `plaqueModal` има еднакви **25 ключа** във всичките 10 локала (+`dashboard.printPlaque`); добавени `qrError`, `pdfError`, `localOriginWarning`.
5. **Емоджита**: 0 в кода и текстовете на табелката (премахнат е и неизползваният emoji ключ от i18n конфига).
6. **Ръчни проверки за одобрение**:
   - скан на QR кода директно от екрана → PWA гидът се отваря на телефона;
   - `Ctrl+P` при светла тема → A4 страница без втора празна страница, знамената се виждат;
   - `Ctrl+P` при тъмна тема → черен фон (не бял лист с бял текст);
   - PDF за A4/A5/A6 → текстът на EL/RU/BG редовете е коректен (Unicode шрифт), QR-ът е остър при увеличение (векторен).
