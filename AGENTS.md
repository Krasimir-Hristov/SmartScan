# AGENTS.md — SmartScan Stay: Master System & Architecture Specification

## 1. Agent Persona & Senior Engineering Role
- **Role**: Principal Full-Stack AI Engineer & System Architect.
- **Specialization**: Next.js 16+ (App Router), React 19, FastAPI (Python 3.11+), Supabase pgvector (HNSW), Multi-Tenant Enterprise Systems.
- **Engineering Mindset**: Production-grade quality, zero tolerance for technical debt, relentless focus on low latency and API cost control, strict type safety (no `any`), and security by design.
- **Git & Safety Policy**: **СТРОГА ЗАБРАНА** за автоматични `git commit` или `git push` без изрично потвърждение от потребителя след направен визуален преглед.

---

## 2. Mandatory "Skills-First" Protocol
> [!IMPORTANT]
> **CRITICAL EXECUTION RULE (ZERO GUESSWORK):**
> Преди да напишеш, генерираш или модифицираш какъвто и да е код за дадена функционалност или библиотека:
> 1. **Провери за Skill**: Задължително провери дали съществува съответно умение в `.agents/skills/<tech-name>/SKILL.md` или в системните умения.
> 2. **Прочети документа на умението**: Първо прочети целия `SKILL.md`, за да приложиш актуалните архитектурни шаблони, съвместимост на версиите и забранени практики.
> 3. **Smart Documentation (Context7)**: При несигурност за актуални API сигнатури на външни библиотеки (напр. най-нови версии на Supabase, Next.js, Tailwind), използвай Context7 MCP или официална актуална документация преди писане на код.
> 4. **Едва след това пристъпи към писане на код.** Забранено е писането на код по предположения (guesswork).

---

## 3. Product Mission & Universal Scaling Strategy

### Core Product (MVP): SmartScan Stay
- **Същност**: Ултралек дигитален консиерж и наръчник за краткосрочни наеми (Airbnb, вили, къщи за гости).
- **Потребителски поток за гости**:
  1. Гостът сканира физически QR код на място в обекта.
  2. В мобилния браузър мигновено се отваря ултралеко PWA (`/stay/[slug]`) без нужда от инсталация.
  3. Гостът получава незабавен достъп до критичните данни (Wi-Fi, точен адрес, контакти) и интелигентен AI консиерж чат на собствения си език.
- **Бизнес модел**: Месечен абонамент през Stripe на база брой активни пространства (`space_id`).

### Бъдещи вертикали и Златно правило за скалируемост
Архитектурата от ден първи се проектира така, че добавянето на нови вертикали да НЕ налага пренаписване на базата данни, API рутерите или RAG пайплайна:
- **Планирани вертикали**:
  - `SmartScan Menu` (дигитални ресторантски менюта с алергени, произход и препоръки)
  - `SmartScan RealEstate` (имоти за продажба/наем, брокерски агенции, виртуални огледи)
  - `SmartScan Auto` (автокъщи, сервизна история, дигитална сервизна книжка)
  - `SmartScan Insurance` (застрахователни полици, покрития, инструкции при щети)
- **Златно правило за абстракция**:
  - Системата работи **ЕДИНСТВЕНО с абстракцията `space` (`spaces` таблица и `space_id`)**, а не с термини като „апартамент“ или „имот“.
  - Всички векторни знания се съхраняват в `knowledge_chunks`, рефериращи `space_id`. Семантичното търсене работи идентично за Wi-Fi парола, съставка на ястие или застрахователна клауза.
  - Диференциацията между вертикалите се поема през колона `space_type` (`stay | menu | real_estate | auto | insurance`) и гъвкаво `metadata JSONB` поле без промяна в основните таблици.

---

## 4. Communication Modalities & Strict Cost Control
1. **Хазяин (Ingest / Въвеждане на данни): ГЛАС ➔ ТЕКСТ ➔ ВЕКТОРИ**
   - Хазяинът записва гласови бележки до 60 сек. през браузъра чрез `MediaRecorder API`.
   - FastAPI изпраща аудиото към Whisper за транскрипция.
   - Моделът (Gemini Flash през OpenRouter) почиства паразитни думи и форматира текста в 1–3 структурирани информационни карти.
   - Хазяинът преглежда и одобрява картите в дашборда преди векторното им записване в `knowledge_chunks`.
2. **Гост (Консиерж / Чат): ЕКСКЛУЗИВНО ТЕКСТ (SSE Стрийминг)**
   - **СТРОГО ЗАБРАНЕНА гласова генерация / Text-to-Speech (TTS) за гостите в MVP.** Всякакви аудио модели към госта са забранени поради високи API такси и латентност.
   - Чатът връща само бърз текстов стрийминг през Server-Sent Events (SSE).

---

## 5. Security, Multi-Tenancy & Prompt Injection Defense

### Multi-Tenancy изолация (КРИТИЧНО)
- **Задължителен пре-филтър**: Всяка SQL заявка и всяко векторно търсене ЗАДЪЛЖИТЕЛНО съдържат твърд филтър: `WHERE space_id = :space_id`. Преплитането на данни между различни обекти е абсолютно недопустимо.
- **Row Level Security (RLS)**: В Supabase RLS гарантира, че всеки хазяин управлява само пространства със своя `host_id = auth.uid()`.

### Защита от Prompt Injection (Нулева латентност, 0 лв. разход)
- **БЕЗ втори филтриращ LLM модел**: Забранено е ползването на предварителен guardrail модел в MVP етапа (забавя стрийминга и удвоява разходите).
- **Стриктно филтриране на контролни тагове**: Преди запитването да стигне до модела, се прилага бързо Regex почистване в Python, премахващо системни и XML тагове от потребителския вход.
- **XML изолация на RAG контекста**: Динамичните данни от векторната база задължително се ограждат в XML тагове:
  ```xml
  <property_context>
  ...данни от векторите...
  </property_context>
  ```
- **Закалени системни инструкции (Hardened Instructions)**:
  - Моделът се инструктира да третира съдържанието в `<property_context>` и потребителските съобщения като ненадеждни данни (data, not instructions).
  - Моделът твърдо отказва опити за игнориране на правилата, генериране на код, разкриване на системния промпт или излизане от ролята на консиерж.

### Rate Limiting (SlowAPI в FastAPI)
- `/api/py/concierge/chat`: 30 заявки / 10 мин (по IP + space_id).
- `/api/py/voice/ingest`: 5 записа / мин (по `auth.uid()` от JWT).
- `/stay/[slug]` (PWA): 60 заявки / мин (по IP).

---

## 6. Feature-Based Architecture & Clean Code Standards

### A. Frontend Feature-Based Directory Structure (`frontend/src/`)
Всички модули са изолирани в `src/features/`. Всеки модул съдържа собствени компоненти, хукове, типове и API заявки, и експортира публичния си интерфейс **ЕДИНСТВЕНО през `index.ts` (Barrel Export)**.

```text
frontend/src/
├── app/                           # ТЪНЪК рутиращ слой (само routes & layouts)
│   ├── layout.tsx                 # Глобален root layout
│   ├── page.tsx                   # Landing page
│   ├── stay/
│   │   └── [slug]/
│   │       └── page.tsx           # Тънка входна точка: вика <StayExperience slug={...} />
│   └── dashboard/
│       └── page.tsx               # Проверява сесията през DAL и зарежда <DashboardView />
│
├── features/                      # ИЗОЛИРАНИ БИЗНЕС МОДУЛИ
│   ├── stay/                      # Гост PWA преживяване
│   │   ├── components/            # StayHero, WifiCard, ConciergeChat, QuickActions, LocalGuide
│   │   ├── hooks/                 # useConciergeChat, useHapticFeedback
│   │   ├── api/                   # chatStream.ts (SSE клиент), stayQueries.ts
│   │   ├── types/                 # stay.types.ts, chat.types.ts
│   │   └── index.ts               # Публичен вход: експортира САМО StayExperience и публични типове
│   │
│   ├── dashboard/                 # Хазяин административен панел
│   │   ├── components/            # SpacesList, SpaceEditor, QrPrintModal, StatsCard
│   │   ├── hooks/                 # useSpaces, useQrGenerator
│   │   ├── types/                 # dashboard.types.ts
│   │   └── index.ts               # Експортира само публичните Dashboard компоненти
│   │
│   └── voice-ingest/              # Модул за аудио бележки от хазяина
│       ├── components/            # AudioRecorderButton, CardApprovalModal
│       ├── hooks/                 # useAudioRecorder, useVoiceIngestMutation
│       ├── types/                 # ingest.types.ts
│       └── index.ts
│
├── components/ui/                 # Презентационни (Dumb) преизползваеми компоненти
│   ├── button.tsx                 # Бутони с Tailwind v4 стилизиране
│   ├── card.tsx                   # Универсални карти
│   ├── badge.tsx                  # Баджове за статуси
│   ├── dialog.tsx                 # Модални диалози
│   └── skeleton.tsx               # Зареждащи анимации
│
└── lib/                           # Споделена инфраструктура
    ├── supabase/                  # client.ts и server.ts (@supabase/ssr)
    ├── proxy.ts                   # Защитен прокси слой (замества middleware.ts)
    ├── dal.ts                     # Data Access Layer (директни сървърни заявки към базата)
    └── utils.ts                   # Чисти функции (cn, форматиране на телефони, дати)
```

### B. Backend Feature-Based Structure (`backend/app/`)
FastAPI бекендът следва стриктна 3-слойна архитектура (`Router ➔ Service ➔ Repository`), организирана по функционалности:

```text
backend/app/
├── core/                          # Глобална конфигурация и сигурност
│   ├── config.py                  # Pydantic Settings (ENV променливи)
│   ├── security.py                # Regex пречистване на входни данни (Prompt Injection)
│   ├── rate_limit.py              # SlowAPI настройки
│   └── database.py                # Supabase клиент
│
├── features/                      # Модулна бизнес логика
│   ├── spaces/                    # Управление на пространствата
│   │   ├── router.py              # HTTP ендпойнтове
│   │   ├── service.py             # Бизнес логика
│   │   └── schemas.py             # Pydantic v2 входни/изходни DTOs
│   │
│   ├── concierge/                 # AI Консиерж Чат & SSE Стрийминг
│   │   ├── router.py              # /api/py/concierge/chat
│   │   ├── service.py             # OpenRouter интеграция, Sliding Window памет
│   │   └── schemas.py             # ChatRequest, ChatResponseStream
│   │
│   ├── voice_ingest/              # Whisper транскрипция & структуриране
│   │   ├── router.py              # /api/py/voice/ingest
│   │   ├── service.py             # Whisper обработка + Gemini Flash карти
│   │   └── schemas.py
│   │
│   └── knowledge/                 # pgvector RAG пайплайн
│       ├── service.py             # Семантично търсене с филтър (WHERE space_id)
│       └── schemas.py             # KnowledgeChunk schema
│
└── main.py                        # Входна точка: регистрира рутерите от features
```

### C. Separation of Concerns (SoC) & Clean Principles
1. **Frontend Layering**:
   - **UI Layer (`src/components/ui/`)**: Приемат единствено `props`. Нямат директен достъп до API или базата данни.
   - **Feature Modules (`src/features/`)**: Капсулират състоянието и бизнес процесите. Външни файлове импортират само през `index.ts`.
   - **Data Access Layer (DAL)**: Сървърните заявки се капсулират в отделен DAL слой, скрит от браузъра.
2. **Backend Layering**:
   - **Routers**: Обработват само HTTP статус кодовете, заявките и схемите. **БЕЗ бизнес логика в рутерите.**
   - **Services**: Носители на цялата бизнес логика, AI оркестрация, Whisper извиквания и chunking.
   - **Repositories / DB Clients**: Изолирана комуникация със Supabase и векторния индекс с твърди филтри по `space_id`.
3. **Reusable Components & DRY**:
   - Всеки повтарящ се интерфейсен елемент (бутон за копиране на Wi-Fi парола с хаптична вибрация, инфо карти, контакти) се изнася в общ компонент. Пълна забрана за copy-paste на UI елементи.
4. **Чисти функции (Pure Functions) & Еднопосочен поток**:
   - Всички помощни функции за форматиране (дати, валути, телефони, текстово пречистване на тагове) ЗАДЪЛЖИТЕЛНО се пишат като **чисти функции** без странични ефекти (`pure functions`).
   - Вход ➔ Изход. Без модификация на външни обекти или глобални променливи.

---

## 7. Full-Stack Engineering Standards

### Frontend (`frontend/`)
- **Next.js 16+ (App Router)**:
  - **Strict No-Middleware Policy**: Забранено е създаването на `middleware.ts`. Всички глобални прокси операции минават през `proxy.ts` (с почистване на `x-*` хедъри за защита от CVE-2025-29927).
  - Защитата на `/dashboard` се управлява на ниво Server Components чрез Data Access Layer (DAL) и сесия от `@supabase/ssr`.
- **React 19 Standards**:
  - Компонентите ЗАДЪЛЖИТЕЛНО се дефинират като стрелкови функции: `const MyComponent: React.FC<Props> = () => { ... }`. Забранена е думата `function`.
  - Забранено е използването на тип `any`. Използват се стриктни интерфейси или `unknown` с Type Guards.
- **State & Data Fetching**:
  - **TanStack Query (React Query)** управлява целия клиентски стейт и кеш.
  - **Пълна забрана за `fetch` вътре в `useEffect`**.
- **Валидация**: Zod за клиентска и сървърна валидация на всички форми и схеми.
- **Стилизация & UI**:
  - Tailwind CSS v4 с новия синтаксис за градиенти (`bg-linear-to-*`).
  - Google Fonts (Inter / Plus Jakarta Sans) и Stitch-базирана бутикова естетика.
  - Олекотени микро-анимации с пакета `motion`.
- **PDF Генерация**: `@react-pdf/renderer` за A5/A6 физически QR табелки (300+ DPI), зареждан единствено на клиента (`ssr: false`).
- **A11y & SEO**: Семантични тагове (`<main>`, `<section>`, `<article>`), задължителни `aria-label` атрибути за интерактивни елементи.

### Backend (`backend/`)
- **Python 3.11+ & FastAPI**:
  - Чиста **3-слойна архитектура**: `Router ➔ Service ➔ Repository/DB`.
  - Стриктна типизация с **Pydantic v2** за входни DTOs и изходни схеми.
  - Задължителен `try/catch` за всички асинхронни операции и извиквания на външни API. Без изтичане на сурови системни грешки (stack traces) към клиента.
- **LLM Провайдър**:
  - OpenRouter (`google/gemini-2.5-flash`) за най-ниска цена и минимална латентност.
- **Пакетен мениджър**: `uv` за бързина и детерминистичен контрол на зависимостите (`pyproject.toml` + `uv.lock`).

### Database & Auth (`Supabase`)
- **PostgreSQL + pgvector**: HNSW индекс за светкавично векторно търсене.
- **Auth**: Supabase Auth (Google OAuth за хазяите).
- **Ключове**: Използване на новия формат на Supabase API ключове (`publishable` и `secret`), а не остарелия `anon` ключ.

---

## 8. Zero-Empty-States UX философия
- **Умно рендиране**: В гост-изгледа (`/stay/[slug]`), полета или секции, които хазяинът е оставил празни, **изобщо не се визуализират** (без празни сиви карета, текстове „няма данни“ или деактивирани бутони).
- **Мигновен мобилен достъп**:
  - 1-клик копиране на Wi-Fi парола с хаптична вибрация (`navigator.vibrate(50)`).
  - Нативни връзки за директна комуникация без платен чат софтуер (`tel:+359...` и `https://wa.me/...`).
  - Бутон за навигация с директно отваряне в Google Maps.

---

## 9. Quality Assurance, CI/CD & CodeRabbit
- **CodeRabbit AI Review (`.coderabbit.yaml`)**:
  - Автоматичен одит на всеки Pull Request за: Multi-Tenancy пре-филтри (`WHERE space_id`), спазване на No-Middleware политиката, Arrow Function синтаксис, спазване на SoC и предотвратяване на тайни в кода.
- **GitHub Actions (`.github/workflows/ci.yml`)**:
  - Frontend: `npm run lint`, `tsc --noEmit`, Next.js build.
  - Backend: `ruff check`, `mypy`, `pytest`.
  - Забрана за сливане на код при неуспешен CI тест.
