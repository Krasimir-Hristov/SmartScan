# SmartScan Stay — Проектен план и чек-лист за изпълнение

Този файл служи като официален наръчник и интерактивен чек-лист за поетапната разработка на **SmartScan Stay**. Всяка стъпка се изпълнява самостоятелно, верифицира се с тестове и визуален преглед в браузъра, и се маркира като завършена (`[x]`) само след изрично одобрение от потребителя.

---

## Статус на проекта

| Етап          | Модул                                                           | Статус       | Последна проверка |
| :------------ | :-------------------------------------------------------------- | :----------- | :---------------- |
| **Стъпка 1**  | Landing Page & Дизайн система                                   | 🟢 Завършена | 11.09.2026        |
| **Стъпка 2**  | Host Автентикация (1-Click Google OAuth & Дашборд)              | 🟢 Завършена | 12.09.2026        |
| **Стъпка 3**  | Гост PWA Преживяване (`/stay/[slug]`)                           | 🟢 Завършена | 13.09.2026        |
| **Стъпка 4**  | База данни, Supabase Миграции & DAL                             | 🟢 Завършена | 13.09.2026        |
| **Стъпка 5**  | FastAPI AI Concierge & Прокси слой                              | 🟢 Завършена | 14.09.2026        |
| **Стъпка 6**  | Хазяин Дашборд (`/dashboard`)                                   | 🟢 Завършена | 16.09.2026        |
| **Стъпка 7**  | Гласово въвеждане (Voice Ingest + Whisper)                      | ⚪ Очаква    | —                 |
| **Стъпка 8**  | Физически QR Табелки за печат (PDF A5/A6)                       | ⚪ Очаква    | —                 |
| **Стъпка 9**  | Stripe Granular Billing                                         | ⚪ Очаква    | —                 |
| **Стъпка 10** | Pre-Deployment Verification, E2E Testing & Production Hardening | ⚪ Очаква    | —                 |

---

## Подробен чек-лист по стъпки

### [x] Стъпка 1: Landing Page & Дизайн система (`design/00` & `design/05`)

- [x] Прилагане на Obsidian High-Tech Luxury естетиката (цветови токени `#09090b`, `#121216`, `#10b981`).
- [x] Интегриране на шрифтовете: `Space Grotesk` (заглавия), `Manrope` (основен текст), `JetBrains Mono` (код, баджове).
- [x] Hero секция с двойно CTA (`Start Free with Google` + интерактивно `Try Live Demo (as Guest)`).
- [x] Bento решетка "How It Works" (3 стъпки: Говорене/Въвеждане ➔ Печат на табелка ➔ Гост сканира).
- [x] Навигация с 10-езиков селектор (`EN`, `BG`, `RO`, `EL`, `RU`, `TR`, `DE`, `ES`, `IT`, `FR`) и SVG знамена (`flag-icons`).
- [x] Интерактивен демо модал със симулиран гост изглед.
- [x] Желязно спазване на правилата: `cursor-pointer` на всички интерактивни бутони, `bg-linear-to-*` градиенти, мобилна адаптивност (390px и 1440px).
- [x] **Верификация**: `npx tsc --noEmit` = 0 грешки, `next build` = 0 грешки, визуален преглед в браузъра и одобрение от потребителя след пълно CodeRabbit ревю.

---

### [x] Стъпка 2: Host Автентикация & Вход (`design/06`)

- [x] **Стъпка 2А**: Сървърна инфраструктура (`src/lib/supabase/server.ts`), Data Access Layer (`src/lib/auth/dal.ts`) с `server-only` и `cache()`.
- [x] **Стъпка 2А**: OAuth Route Handler (`src/app/auth/callback/route.ts`) с размяна на код за бисквитково-базирана сесия (`@supabase/ssr`).
- [x] **Стъпка 2А**: Защитен маршрут `/dashboard` (`src/app/dashboard/page.tsx`) с моментално сървърно блокиране и пренасочване при неавтентикиран достъп (No-Middleware архитектура).
- [x] **Стъпка 2Б**: Obsidian Luxury компактен модал за вход ([`AuthModal.tsx`](frontend/src/features/landing/components/AuthModal.tsx)) с Google 1-Click OAuth.
- [x] **Стъпка 2Б**: Интерактивен мок Дашборд ([`DashboardPage.tsx`](frontend/src/features/dashboard/DashboardPage.tsx)) с хост навигация, активни метрики и вила карта.
- [x] **Стъпка 2Б**: Динамичен навбар ([`LandingNavbar.tsx`](frontend/src/features/landing/components/LandingNavbar.tsx) / [`NavbarAuthAction.tsx`](frontend/src/features/landing/components/NavbarAuthAction.tsx)):
  - Нелогнат: "Вход с Google" (отваря модала).
  - Логнат: "Табло" (препраща към `/dashboard`) + "Изход" (прекратява сесията и опреснява).
- [x] **Верификация**: `npx tsc --noEmit` = 0 грешки, `npm run lint` = 0 грешки, `npm run build` = 0 грешки. Тестван защитен достъп (HTTP 307 Redirect при нелогнат опит).

---

### [x] Стъпка 3: Гост Мобилно PWA Преживяване (`/stay/[slug]`) (`design/01`)

- [x] Асинхронна Next.js 16 страница (`await params`) с поддръжка на slug.
- [x] Zero-Image правило: 100% векторни икони и типография (зареждане под 200ms).
- [x] 1-клик Wi-Fi карта с копиране и хаптична вибрация (`navigator.vibrate(50)`).
- [x] Бърза решетка с 4 плочки: Копиране на адрес за такси, обаждане на местно такси, WhatsApp контакт, Червен SOS бутон 112.
- [x] Часове за настаняване/напускане, код за сейф (keybox) и часове за тишина (нощна тишина + следобедна сиеста).
- [x] Zero-Empty-States: празни полета не се визуализират изобщо.
- [x] Десктоп контейнер (макет на телефон `max-w-md`) + мобилен safe area (`100dvh`).
- [x] 24/7 AI Concierge бар с 4 бързи чипа за въпроси и симулирани интерактивни отговори на езика на госта.
- [x] Истински векторни SVG QR кодове в Demo модала на Landing Page (`qrcode.react`) водещи към `/stay/villa-smartscan`.
- [x] **Верификация**: Тестване на мобилен изглед, преглед на хаптиката, 0 грешки при `next build` и `npm run lint`.

---

### [x] Стъпка 4: База данни, Supabase Миграции & Data Access Layer (DAL)

- [x] SQL миграционен файл `supabase/migrations/20260914000001_create_spaces_and_knowledge.sql` с DDL за `spaces` и `knowledge_chunks`.
- [x] Активиране на `pgvector` в схема `extensions` и създаване на HNSW индекс (`vector_cosine_ops`, `m=16`, `ef_construction=64`).
- [x] RPC функция `match_space_knowledge` със строг пре-филтър `WHERE space_id = filter_space_id`, `s.is_active = true` и `SECURITY DEFINER`.
- [x] Row Level Security (RLS) политики с кеширано `(SELECT auth.uid())` и публичен достъп за гости по slug.
- [x] Индексиране на всички външни ключове (`host_id`, `space_id`, `slug`) съгласно Supabase Postgres Best Practices.
- [x] Автоматичен тригер `handle_updated_at()` за двете таблици.
- [x] Стриктни TypeScript типове за базата данни в `src/lib/types/databaseTypes.ts`.
- [x] Сървърен Data Access Layer `src/lib/dal.ts` (`getAuthenticatedHost`, `getHostSpaces`, `getSpaceBySlug`, `getSpaceStayDataWithFallback`).
- [x] Интеграция с Next.js App Router (`/stay/[slug]`), защита със `'server-only'` и React `cache()`.
- [x] Финална верификация и ревю от CodeRabbit.

---

### [x] Стъпка 5: FastAPI AI Concierge (LangGraph StateGraph) & Прокси слой

- [x] **Стъпка 5А**: FastAPI ядро в `backend/app/` (Python 3.12, Pydantic v2 схеми, SlowAPI rate limiter: 30 req / 10 min).
- [x] **Стъпка 5А**: LangGraph `StateGraph` консиерж пайплайн (`sanitize_node` ➔ `retrieve_rag_node` ➔ `generate_stream_node`).
- [x] **Стъпка 5А**: Защита от Prompt Injection: нулева латентност с `TAG_SANITIZER_REGEX` + XML изолация в `<property_context>`.
- [x] **Стъпка 5А**: RAG контекст интеграция със Supabase (`spaces.stay_settings` + pgvector `match_space_knowledge` RPC) с флагмански fallback.
- [x] **Стъпка 5А**: OpenRouter SSE стрийминг с Gemini 2.5 Flash и LangGraph `StreamWriter` (`stream_mode="custom"`, `version="v2"`).
- [x] **Стъпка 5А**: No-Middleware прокси слой `frontend/src/lib/proxy.ts` и `app/api/py/[...path]/route.ts` с филтриране на `x-*` хедъри за защита от **CVE-2025-29927**.
- [x] **Стъпка 5А**: 11 автоматизирани теста (`pytest tests/ -v`: сигурност, валидация на графа, rate limit и SSE интеграция).
- [x] **Стъпка 5А**: Верификация: `uv run pytest` = 11 passed, `npx tsc --noEmit` = 0 грешки, `npm run lint` = 0 грешки, `npm run build` = 0 грешки.
- [x] **Стъпка 5Б**: Фронтенд SSE клиент `src/features/stay/api/chatStream.ts` с `ReadableStreamDefaultReader` и `AbortSignal`.
- [x] **Стъпка 5Б**: Custom React 19 хук `useConciergeChat.ts` с токен-по-токен акумулиране, sliding window и хаптична вибрация.
- [x] **Стъпка 5Б**: Рефакториране на `ConciergeBar.tsx` в гост PWA с реален чат стрийминг, бързи чипове и бутон Stop.
- [x] **Стъпка 5Б**: Пълна верификация: `npx tsc --noEmit` = 0 грешки, `npm run lint` = 0 грешки, `npm run build` = 0 грешки.

---

### [x] Стъпка 6: Хазяин Дашборд (`/dashboard`) (`design/03`)

- [x] Защитен маршрут през Server Component и DAL сесия (`getHostSpaces`).
- [x] Изчистена навигация: лого, профил, селектор на език и метрики за активни обекти.
- [x] Списък на пространствата (`SpaceSelector`) с активни баджове и бутон/карта `+ Добави нов обект`.
- [x] Модал за създаване на нов обект (`SpaceCreateModal`) с автоматична кирилска транслитерация за slug.
- [x] Редактор на основни данни (`SpaceEditor`) със стриктна йерархия: Име ➔ Адрес ➔ Wi-Fi с 1-клик копиране ➔ Такси ➔ Контакти ➔ Тишина ➔ Сейф за ключ.
- [x] Показване на директен гост линк (`/stay/[slug]`) с бутон за копиране и бутон „Преглед като гост“.
- [x] Текстово добавяне на знания към AI консиержа (`KnowledgeManager`) с категории и преглед/изтриване.
- [x] **Верификация**: `npx tsc --noEmit` = 0 грешки, `npm run lint` = 0 грешки, `npm run build` = 0 грешки, `uv run pytest` = 11 passed.

---

### [X] Стъпка 7: Гласово въвеждане за хазяина (`voice-ingest`) (`design/04`)

- [x] Фронтенд бутон с `MediaRecorder API` и анимация на звукова вълна (до 60 сек).
- [x] Бекенд ендпойнт `/api/py/voice/ingest` с Whisper v3 транскрипция.
- [x] Структуриране на изговорения текст в 1–3 информационни карти чрез Gemini Flash.
- [x] Интерактивен модал за преглед, ръчна редакция и одобрение от хазяина преди запис в pgvector.
- [x] **Верификация**: Тест на реален аудио запис и записване на картите в базата данни, одобрение.

---

### [ ] Стъпка 8: Физически QR Табелки за печат (`design/02`)

- [ ] Модал за преглед и печат на табелка в дашборда на хазяина.
- [ ] Генерация на A4 (210x297mm), A5 (148x210mm) и A6 (105x148mm) векторни PDF табелки с `@react-pdf/renderer` (300+ DPI).
- [ ] Два стила: Obsidian Dark Luxury (черен акрил) и High-Contrast Light (за обикновен печат на бяла хартия).
- [ ] Динамичен SVG QR код насочващ към реалния URL на гост PWA.
- [ ] **Верификация**: Генериране на PDF, сканиране на QR кода от екран/разпечатка, одобрение.

---

### [ ] Стъпка 9: Stripe Granular Billing (`design/07`)

- [ ] Грануларно таксуване на ниво конкретен обект (`space_id`): €9/месец за Stay.
- [ ] 14-дневен безплатен пробен период без изискване на карта.
- [ ] Сезонен паузинг ("Summer/Winter hold" за запазване на данните без таксуване извън сезона).
- [ ] 1-клик бутон за Stripe Customer Portal за управление на карти и фактури.
- [ ] **Верификация**: Тест на абонаментен жизнен цикъл в Stripe Test Mode.

---

### [ ] Стъпка 10: Pre-Deployment Verification, E2E Testing & Production Hardening

- [ ] **Full-Flow E2E Smoke Test**: Пълен цикъл: Нов хазяин ➔ Обект ➔ Ингест (Глас/Текст) ➔ QR Печат ➔ Гост мобилен чат.
- [ ] **Multi-Tenancy Security Audit**: Верификация, че никое пространство не може да чете данни на друго пространство.
- [ ] **CVE-2025-29927 & Proxy Audit**: Проверка на почистването на `x-*` хедъри в `proxy.ts`.
- [ ] **Production Build Test**: `npm run build` във фронтенда без грешки и без изтичане на тайни ключове на клиента.
- [ ] **Performance & Core Web Vitals**: PWA зареждане под 200ms.
- [ ] **Финален преглед и одобрение за Deployment**.
